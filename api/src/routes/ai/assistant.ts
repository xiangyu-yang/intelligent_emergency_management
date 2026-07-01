import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { chatWithLLM, checkLLMStatus, getSystemPrompt, llmConfig, getDefaultConfig, ensureModelLoaded } from '../../ai/llm.js';
import { SystemConfigDAO, ChatSessionDAO, ChatMessageDAO } from '../../db/dao.js';
import { successResponse, errorResponse } from '../../utils/common.js';
import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';

const SKILLS_DIR = path.join(process.cwd(), 'data', 'skills');

function getSkillInstruction(skillId: string): string {
  try {
    const skillDir = path.join(SKILLS_DIR, skillId);
    const skillMdPath = path.join(skillDir, 'skill.md');
    
    if (!fs.existsSync(skillMdPath)) {
      return '';
    }
    
    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const instructionMatch = content.match(/##\s*instruction\s*\n([\s\S]*?)(?=\n##\s*resource|$)/);
    return instructionMatch ? instructionMatch[1].trim() : '';
  } catch {
    return '';
  }
}

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1, '消息不能为空'),
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      reasoning: z.string().optional(),
    })
  ).optional(),
  scenario: z.enum(['general', 'qna', 'data_query', 'dispatch', 'report']).optional(),
  stream: z.boolean().optional().default(true),
  sessionId: z.string().optional(),
  enableDeepThinking: z.boolean().optional(),
  skill: z.string().optional(),
});

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await checkLLMStatus();
    res.json(successResponse(status));
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message, 500));
  }
});

router.get('/sessions', async (_req: Request, res: Response) => {
  try {
    const sessions = ChatSessionDAO.findByStatus('active');
    res.json(successResponse(sessions));
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message, 500));
  }
});

router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const session = ChatSessionDAO.findById(req.params.id);
    if (!session) {
      return res.status(404).json(errorResponse('会话不存在', 404));
    }
    const messages = ChatMessageDAO.findBySessionId(req.params.id);
    res.json(successResponse({ ...session, messages }));
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message, 500));
  }
});

router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      title: z.string().min(1, '会话标题不能为空'),
      scenario: z.enum(['general', 'qna', 'data_query', 'dispatch', 'report']).optional(),
    });
    const body = schema.parse(req.body);

    const session = ChatSessionDAO.create({
      title: body.title,
      scenario: body.scenario || 'general',
      status: 'active',
      messageCount: 0,
    });

    res.json(successResponse(session, '会话创建成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '会话创建失败', 500));
    }
  }
});

router.delete('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const session = ChatSessionDAO.findById(req.params.id);
    if (!session) {
      return res.status(404).json(errorResponse('会话不存在', 404));
    }

    ChatMessageDAO.deleteBySessionId(req.params.id);
    ChatSessionDAO.deleteById(req.params.id);

    res.json(successResponse(null, '会话删除成功'));
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message, 500));
  }
});

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const body = chatSchema.parse(req.body);

    let sessionId = body.sessionId;
    let session = sessionId ? ChatSessionDAO.findById(sessionId) : null;

    if (!session) {
      const title = body.message.length > 20 ? body.message.substring(0, 20) + '...' : body.message;
      session = ChatSessionDAO.create({
        title,
        scenario: body.scenario || 'general',
        status: 'active',
        messageCount: 0,
      });
      sessionId = session.id;
    }

    const history = body.history || [];
    const messages = history.map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
      reasoning: h.reasoning,
    }));

    messages.push({ role: 'user', content: body.message, reasoning: undefined });

    let systemPrompt = getSystemPrompt(body.scenario || 'general');
    
    if (body.skill) {
      const skillInstruction = getSkillInstruction(body.skill);
      if (skillInstruction) {
        systemPrompt = `以下是你需要遵循的技能指令：\n\n${skillInstruction}\n\n${systemPrompt}`;
      }
    }

    const now = dayjs().toISOString();
    ChatMessageDAO.create({
      sessionId: sessionId as string,
      role: 'user',
      content: body.message,
    });
    ChatSessionDAO.incrementMessageCount(sessionId as string, now);

    if (body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const stream = await chatWithLLM(messages, true, systemPrompt, body.enableDeepThinking);
        
        let assistantContent = '';
        let assistantReasoning = '';
        
        for await (const chunk of stream as AsyncGenerator<{ content: string; reasoning?: string; done: boolean }>) {
          assistantContent += chunk.content;
          if (chunk.reasoning) {
            assistantReasoning += chunk.reasoning;
          }
          res.write(`data: ${JSON.stringify({ content: chunk.content, reasoning: chunk.reasoning, sessionId: sessionId as string, done: chunk.done })}\n\n`);
        }
        
        ChatMessageDAO.create({
          sessionId: sessionId as string,
          role: 'assistant',
          content: assistantContent,
        });
        ChatSessionDAO.incrementMessageCount(sessionId as string, dayjs().toISOString());

        const sessionTitle = assistantContent.length > 20 ? assistantContent.substring(0, 20) + '...' : assistantContent;
        if (session.messageCount === 1) {
          ChatSessionDAO.update(sessionId as string, { title: sessionTitle });
        }
        
        res.write(`data: ${JSON.stringify({ finished: true, sessionId: sessionId as string })}\n\n`);
        res.end();
      } catch (err: any) {
        res.write(`data: ${JSON.stringify({ error: err.message, sessionId: sessionId as string })}\n\n`);
        res.end();
      }
    } else {
      const response = await chatWithLLM(messages, false, systemPrompt, body.enableDeepThinking) as { content: string; reasoning?: string };
      
      ChatMessageDAO.create({
        sessionId: sessionId as string,
        role: 'assistant',
        content: response.content,
      });
      ChatSessionDAO.incrementMessageCount(sessionId as string, dayjs().toISOString());

      const sessionTitle = response.content.length > 20 ? response.content.substring(0, 20) + '...' : response.content;
      if (session.messageCount === 1) {
        ChatSessionDAO.update(sessionId as string, { title: sessionTitle });
      }

      res.json(successResponse({ content: response.content, reasoning: response.reasoning, sessionId: sessionId as string }));
    }
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '对话失败', 500));
    }
  }
});

router.post('/qna', async (req: Request, res: Response) => {
  try {
    const body = chatSchema.parse(req.body);

    let sessionId = body.sessionId;
    let session = sessionId ? ChatSessionDAO.findById(sessionId) : null;

    if (!session) {
      const title = body.message.length > 20 ? body.message.substring(0, 20) + '...' : body.message;
      session = ChatSessionDAO.create({
        title,
        scenario: 'qna',
        status: 'active',
        messageCount: 0,
      });
      sessionId = session.id;
    }

    const history = body.history || [];
    const messages = history.map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
      reasoning: h.reasoning,
    }));

    messages.push({ role: 'user', content: body.message, reasoning: undefined });

    let systemPrompt = getSystemPrompt('qna');
    
    if (body.skill) {
      const skillInstruction = getSkillInstruction(body.skill);
      if (skillInstruction) {
        systemPrompt = `以下是你需要遵循的技能指令：\n\n${skillInstruction}\n\n${systemPrompt}`;
      }
    }

    const now = dayjs().toISOString();
    ChatMessageDAO.create({
      sessionId: sessionId as string,
      role: 'user',
      content: body.message,
    });
    ChatSessionDAO.incrementMessageCount(sessionId as string, now);

    if (body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const stream = await chatWithLLM(messages, true, systemPrompt, body.enableDeepThinking);
        
        let assistantContent = '';
        let assistantReasoning = '';
        
        for await (const chunk of stream as AsyncGenerator<{ content: string; reasoning?: string; done: boolean }>) {
          assistantContent += chunk.content;
          if (chunk.reasoning) {
            assistantReasoning += chunk.reasoning;
          }
          res.write(`data: ${JSON.stringify({ content: chunk.content, reasoning: chunk.reasoning, sessionId: sessionId as string })}\n\n`);
        }
        
        ChatMessageDAO.create({
          sessionId: sessionId as string,
          role: 'assistant',
          content: assistantContent,
        });
        ChatSessionDAO.incrementMessageCount(sessionId as string, dayjs().toISOString());

        const sessionTitle = assistantContent.length > 20 ? assistantContent.substring(0, 20) + '...' : assistantContent;
        if (session.messageCount === 1) {
          ChatSessionDAO.update(sessionId as string, { title: sessionTitle });
        }
        
        res.write(`data: ${JSON.stringify({ finished: true, sessionId: sessionId as string })}\n\n`);
        res.end();
      } catch (err: any) {
        res.write(`data: ${JSON.stringify({ error: err.message, sessionId: sessionId as string })}\n\n`);
        res.end();
      }
    } else {
      const response = await chatWithLLM(messages, false, systemPrompt) as { content: string; reasoning?: string };
      
      ChatMessageDAO.create({
        sessionId: sessionId as string,
        role: 'assistant',
        content: response.content,
      });
      ChatSessionDAO.incrementMessageCount(sessionId as string, dayjs().toISOString());

      const sessionTitle = response.content.length > 20 ? response.content.substring(0, 20) + '...' : response.content;
      if (session.messageCount === 1) {
        ChatSessionDAO.update(sessionId as string, { title: sessionTitle });
      }

      res.json(successResponse({ content: response.content, sessionId: sessionId as string }));
    }
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '问答失败', 500));
    }
  }
});

router.post('/data-query', async (req: Request, res: Response) => {
  try {
    const body = chatSchema.parse(req.body);

    let sessionId = body.sessionId;
    let session = sessionId ? ChatSessionDAO.findById(sessionId) : null;

    if (!session) {
      const title = body.message.length > 20 ? body.message.substring(0, 20) + '...' : body.message;
      session = ChatSessionDAO.create({
        title,
        scenario: 'data_query',
        status: 'active',
        messageCount: 0,
      });
      sessionId = session.id;
    }

    const history = body.history || [];
    const messages = history.map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
      reasoning: h.reasoning,
    }));

    messages.push({ role: 'user', content: body.message, reasoning: undefined });

    let systemPrompt = getSystemPrompt('data_query');
    
    if (body.skill) {
      const skillInstruction = getSkillInstruction(body.skill);
      if (skillInstruction) {
        systemPrompt = `以下是你需要遵循的技能指令：\n\n${skillInstruction}\n\n${systemPrompt}`;
      }
    }

    const now = dayjs().toISOString();
    ChatMessageDAO.create({
      sessionId: sessionId as string,
      role: 'user',
      content: body.message,
    });
    ChatSessionDAO.incrementMessageCount(sessionId as string, now);

    if (body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const stream = await chatWithLLM(messages, true, systemPrompt, body.enableDeepThinking);
        
        let assistantContent = '';
        let assistantReasoning = '';
        
        for await (const chunk of stream as AsyncGenerator<{ content: string; reasoning?: string; done: boolean }>) {
          assistantContent += chunk.content;
          if (chunk.reasoning) {
            assistantReasoning += chunk.reasoning;
          }
          res.write(`data: ${JSON.stringify({ content: chunk.content, reasoning: chunk.reasoning, sessionId: sessionId as string })}\n\n`);
        }
        
        ChatMessageDAO.create({
          sessionId: sessionId as string,
          role: 'assistant',
          content: assistantContent,
        });
        ChatSessionDAO.incrementMessageCount(sessionId as string, dayjs().toISOString());

        const sessionTitle = assistantContent.length > 20 ? assistantContent.substring(0, 20) + '...' : assistantContent;
        if (session.messageCount === 1) {
          ChatSessionDAO.update(sessionId as string, { title: sessionTitle });
        }
        
        res.write(`data: ${JSON.stringify({ finished: true, sessionId: sessionId as string })}\n\n`);
        res.end();
      } catch (err: any) {
        res.write(`data: ${JSON.stringify({ error: err.message, sessionId: sessionId as string })}\n\n`);
        res.end();
      }
    } else {
      const response = await chatWithLLM(messages, false, systemPrompt) as { content: string; reasoning?: string };
      
      ChatMessageDAO.create({
        sessionId: sessionId as string,
        role: 'assistant',
        content: response.content,
      });
      ChatSessionDAO.incrementMessageCount(sessionId as string, dayjs().toISOString());

      const sessionTitle = response.content.length > 20 ? response.content.substring(0, 20) + '...' : response.content;
      if (session.messageCount === 1) {
        ChatSessionDAO.update(sessionId as string, { title: sessionTitle });
      }

      res.json(successResponse({ content: response.content, sessionId: sessionId as string }));
    }
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '数据分析失败', 500));
    }
  }
});

router.post('/dispatch', async (req: Request, res: Response) => {
  try {
    const body = chatSchema.parse(req.body);

    let sessionId = body.sessionId;
    let session = sessionId ? ChatSessionDAO.findById(sessionId) : null;

    if (!session) {
      const title = body.message.length > 20 ? body.message.substring(0, 20) + '...' : body.message;
      session = ChatSessionDAO.create({
        title,
        scenario: 'dispatch',
        status: 'active',
        messageCount: 0,
      });
      sessionId = session.id;
    }

    const history = body.history || [];
    const messages = history.map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
      reasoning: h.reasoning,
    }));

    messages.push({ role: 'user', content: body.message, reasoning: undefined });

    const systemPrompt = getSystemPrompt('dispatch');

    const now = dayjs().toISOString();
    ChatMessageDAO.create({
      sessionId: sessionId as string,
      role: 'user',
      content: body.message,
    });
    ChatSessionDAO.incrementMessageCount(sessionId as string, now);

    if (body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const stream = await chatWithLLM(messages, true, systemPrompt);
        
        let assistantContent = '';
        
        for await (const chunk of stream as AsyncGenerator<{ content: string; reasoning?: string; done: boolean }>) {
          assistantContent += chunk.content;
          res.write(`data: ${JSON.stringify({ content: chunk.content, sessionId: sessionId as string })}\n\n`);
        }
        
        ChatMessageDAO.create({
          sessionId: sessionId as string,
          role: 'assistant',
          content: assistantContent,
        });
        ChatSessionDAO.incrementMessageCount(sessionId as string, dayjs().toISOString());

        const sessionTitle = assistantContent.length > 20 ? assistantContent.substring(0, 20) + '...' : assistantContent;
        if (session.messageCount === 1) {
          ChatSessionDAO.update(sessionId as string, { title: sessionTitle });
        }
        
        res.write(`data: ${JSON.stringify({ finished: true, sessionId: sessionId as string })}\n\n`);
        res.end();
      } catch (err: any) {
        res.write(`data: ${JSON.stringify({ error: err.message, sessionId: sessionId as string })}\n\n`);
        res.end();
      }
    } else {
      const response = await chatWithLLM(messages, false, systemPrompt) as { content: string; reasoning?: string };
      
      ChatMessageDAO.create({
        sessionId: sessionId as string,
        role: 'assistant',
        content: response.content,
      });
      ChatSessionDAO.incrementMessageCount(sessionId as string, dayjs().toISOString());

      const sessionTitle = response.content.length > 20 ? response.content.substring(0, 20) + '...' : response.content;
      if (session.messageCount === 1) {
        ChatSessionDAO.update(sessionId as string, { title: sessionTitle });
      }

      res.json(successResponse({ content: response.content, sessionId: sessionId as string }));
    }
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '调度失败', 500));
    }
  }
});

router.post('/report', async (req: Request, res: Response) => {
  try {
    const body = chatSchema.parse(req.body);

    let sessionId = body.sessionId;
    let session = sessionId ? ChatSessionDAO.findById(sessionId) : null;

    if (!session) {
      const title = body.message.length > 20 ? body.message.substring(0, 20) + '...' : body.message;
      session = ChatSessionDAO.create({
        title,
        scenario: 'report',
        status: 'active',
        messageCount: 0,
      });
      sessionId = session.id;
    }

    const history = body.history || [];
    const messages = history.map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
      reasoning: h.reasoning,
    }));

    messages.push({ role: 'user', content: body.message, reasoning: undefined });

    const systemPrompt = getSystemPrompt('report');

    const now = dayjs().toISOString();
    ChatMessageDAO.create({
      sessionId: sessionId as string,
      role: 'user',
      content: body.message,
    });
    ChatSessionDAO.incrementMessageCount(sessionId as string, now);

    if (body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const stream = await chatWithLLM(messages, true, systemPrompt);
        
        let assistantContent = '';
        
        for await (const chunk of stream as AsyncGenerator<{ content: string; reasoning?: string; done: boolean }>) {
          assistantContent += chunk.content;
          res.write(`data: ${JSON.stringify({ content: chunk.content, sessionId: sessionId as string })}\n\n`);
        }
        
        ChatMessageDAO.create({
          sessionId: sessionId as string,
          role: 'assistant',
          content: assistantContent,
        });
        ChatSessionDAO.incrementMessageCount(sessionId as string, dayjs().toISOString());

        const sessionTitle = assistantContent.length > 20 ? assistantContent.substring(0, 20) + '...' : assistantContent;
        if (session.messageCount === 1) {
          ChatSessionDAO.update(sessionId as string, { title: sessionTitle });
        }
        
        res.write(`data: ${JSON.stringify({ finished: true, sessionId: sessionId as string })}\n\n`);
        res.end();
      } catch (err: any) {
        res.write(`data: ${JSON.stringify({ error: err.message, sessionId: sessionId as string })}\n\n`);
        res.end();
      }
    } else {
      const response = await chatWithLLM(messages, false, systemPrompt) as { content: string; reasoning?: string };
      
      ChatMessageDAO.create({
        sessionId: sessionId as string,
        role: 'assistant',
        content: response.content,
      });
      ChatSessionDAO.incrementMessageCount(sessionId as string, dayjs().toISOString());

      const sessionTitle = response.content.length > 20 ? response.content.substring(0, 20) + '...' : response.content;
      if (session.messageCount === 1) {
        ChatSessionDAO.update(sessionId as string, { title: sessionTitle });
      }

      res.json(successResponse({ content: response.content, sessionId: sessionId as string }));
    }
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '报告生成失败', 500));
    }
  }
});

const configSchema = z.object({
  apiBaseUrl: z.string().url('无效的URL格式'),
  model: z.string().min(1, '模型名称不能为空'),
  apiKey: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(100).max(16384).optional(),
  enableDeepThinking: z.boolean().optional(),
});

router.get('/config', (_req: Request, res: Response) => {
  try {
    const config = llmConfig();
    res.json(successResponse(config));
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message, 500));
  }
});

router.post('/config', async (req: Request, res: Response) => {
  try {
    const body = configSchema.parse(req.body);

    SystemConfigDAO.updateByKey('llm.apiBaseUrl', body.apiBaseUrl, 'LLM API基础地址');
    SystemConfigDAO.updateByKey('llm.model', body.model, 'LLM模型名称');
    
    if (body.apiKey !== undefined) {
      SystemConfigDAO.updateByKey('llm.apiKey', body.apiKey, 'LLM API密钥');
    }
    if (body.temperature !== undefined) {
      SystemConfigDAO.updateByKey('llm.temperature', String(body.temperature), '温度参数');
    }
    if (body.maxTokens !== undefined) {
      SystemConfigDAO.updateByKey('llm.maxTokens', String(body.maxTokens), '最大输出Token数');
    }
    if (body.enableDeepThinking !== undefined) {
      SystemConfigDAO.updateByKey('llm.enableDeepThinking', String(body.enableDeepThinking), '深度思考开关');
    }

    const newConfig = llmConfig();
    res.json(successResponse(newConfig, '配置保存成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '配置保存失败', 500));
    }
  }
});

router.post('/test-config', async (req: Request, res: Response) => {
  try {
    const body = configSchema.parse(req.body);

    const status = await checkLLMStatus({
      apiBaseUrl: body.apiBaseUrl,
      model: body.model,
      apiKey: body.apiKey || '',
      temperature: body.temperature || 0.7,
      maxTokens: body.maxTokens || 4096,
    });

    res.json(successResponse(status));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '测试失败', 500));
    }
  }
});

router.get('/default-config', (_req: Request, res: Response) => {
  try {
    const config = getDefaultConfig();
    res.json(successResponse(config));
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message, 500));
  }
});

router.post('/start-model', async (req: Request, res: Response) => {
  try {
    const { model, apiBaseUrl } = req.body;
    let currentConfig = llmConfig();
    
    if (model) {
      currentConfig = { ...currentConfig, model };
    }
    if (apiBaseUrl) {
      currentConfig = { ...currentConfig, apiBaseUrl };
    }
    
    const result = await ensureModelLoaded(currentConfig);
    
    if (result.success) {
      res.json(successResponse({ started: true }, '模型已启动'));
    } else {
      res.status(400).json(errorResponse(result.error || '模型启动失败', 400));
    }
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message || '模型启动失败', 500));
  }
});

export default router;