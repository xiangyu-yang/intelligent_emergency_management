import fetch from 'node-fetch';
import { createInterface } from 'readline';
import { SystemConfigDAO } from '../db/dao.js';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  reasoning?: string;
}

interface LLMConfig {
  apiBaseUrl: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  enableDeepThinking?: boolean;
}

const defaultConfig: LLMConfig = {
  apiBaseUrl: 'http://localhost:11434/v1',
  model: 'qwen3.6:35b-a3b-q8_0',
  apiKey: '',
  temperature: 0.7,
  maxTokens: 4096,
};

function getConfig(): LLMConfig {
  const dbConfigs = SystemConfigDAO.getAllConfigs();
  
  return {
    apiBaseUrl: dbConfigs['llm.apiBaseUrl'] || defaultConfig.apiBaseUrl,
    model: dbConfigs['llm.model'] || defaultConfig.model,
    apiKey: dbConfigs['llm.apiKey'] || defaultConfig.apiKey,
    temperature: parseFloat(dbConfigs['llm.temperature'] || String(defaultConfig.temperature)),
    maxTokens: parseInt(dbConfigs['llm.maxTokens'] || String(defaultConfig.maxTokens)),
    enableDeepThinking: dbConfigs['llm.enableDeepThinking'] === 'true',
  };
}

export interface StreamChunk {
  content: string;
  reasoning?: string;
  done: boolean;
}

export async function chatWithLLM(
  messages: ChatMessage[],
  stream: boolean = false,
  systemPrompt?: string,
  enableDeepThinking?: boolean
): Promise<{ content: string; reasoning?: string } | AsyncGenerator<StreamChunk>> {
  const config = getConfig();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const requestMessages: ChatMessage[] = [];
  
  if (systemPrompt) {
    requestMessages.push({ role: 'system', content: systemPrompt });
  }
  
  requestMessages.push(...messages);

  const baseUrl = config.apiBaseUrl.replace('/v1', '');
  
  const body = {
    model: config.model,
    messages: requestMessages,
    stream,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    think: enableDeepThinking ?? config.enableDeepThinking,
  };

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} ${errorText}`);
  }

  if (stream) {
    return streamResponse(response);
  }

  const json = (await response.json()) as { message: { content: string; thinking?: string } };
  return {
    content: json.message?.content || '',
    reasoning: json.message?.thinking,
  };
}

async function* streamResponse(response: any): AsyncGenerator<StreamChunk> {
  const decoder = new TextDecoder();
  let buffer = '';

  if (response.body?.getReader) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      yield* parseBuffer(buffer);
      buffer = buffer.slice(buffer.lastIndexOf('\n') + 1);
    }
  } else if (response.body?.on) {
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      yield* parseBuffer(buffer);
      buffer = buffer.slice(buffer.lastIndexOf('\n') + 1);
    }
  } else {
    throw new Error('Response body is not readable');
  }

  if (buffer) {
    yield* parseBuffer(buffer);
  }
}

function* parseBuffer(buffer: string): Generator<StreamChunk> {
  const lines = buffer.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') {
        yield { content: '', reasoning: '', done: true };
        return;
      }
      try {
        const json = JSON.parse(data) as { message?: { content?: string; thinking?: string }; done?: boolean };
        yield {
          content: json.message?.content || '',
          reasoning: json.message?.thinking,
          done: json.done === true,
        };
      } catch {
        continue;
      }
    }
  }
}

export async function checkLLMStatus(config?: LLMConfig): Promise<{
  online: boolean;
  model?: string;
  error?: string;
  availableModels?: string[];
  modelLoaded?: boolean;
  status?: 'connected' | 'model_not_found' | 'model_error' | 'service_error' | 'connection_refused' | 'error';
  message?: string;
}> {
  const currentConfig = config || getConfig();

  try {
    const baseUrlNoV1 = currentConfig.apiBaseUrl.replace('/v1', '');

    const modelListResponse = await fetch(`${baseUrlNoV1}/api/tags`);
    if (!modelListResponse.ok) {
      return {
        online: false,
        error: `无法获取模型列表 (状态码: ${modelListResponse.status})`,
        modelLoaded: false,
        status: 'service_error',
        message: `❌ 无法获取模型列表 (状态码: ${modelListResponse.status})`
      };
    }

    const modelData = (await modelListResponse.json()) as { models?: Array<{ name: string }> };
    const availableModels = (modelData.models || []).map((m) => m.name);

    if (!availableModels.includes(currentConfig.model)) {
      return {
        online: true,
        model: currentConfig.model,
        availableModels,
        error: `Model '${currentConfig.model}' 未找到`,
        modelLoaded: false,
        status: 'model_not_found',
        message: `❌ 模型 '${currentConfig.model}' 未找到。可用模型: ${availableModels.join(', ') || '无'}`
      };
    }

    const baseUrl = currentConfig.apiBaseUrl.replace('/v1', '');
    
    const chatResponse = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: currentConfig.model,
        messages: [{ role: 'user', content: 'hello' }],
        max_tokens: 10,
        stream: false,
      }),
    });

    if (chatResponse.ok) {
      const result = (await chatResponse.json()) as { message?: { content?: string } };
      if (result.message?.content) {
        return {
          online: true,
          model: currentConfig.model,
          availableModels,
          modelLoaded: true,
          status: 'connected',
          message: `✅ 连接成功！模型 '${currentConfig.model}' 响应正常`
        };
      }
    }

    let errorMsg = `状态码: ${chatResponse.status}`;
    try {
      const errorData = (await chatResponse.json()) as { error?: { message?: string } };
      if (errorData.error?.message) {
        errorMsg = errorData.error.message;
      }
    } catch {}

    return {
      online: true,
      model: currentConfig.model,
      availableModels,
      error: `模型响应异常: ${errorMsg}`,
      modelLoaded: false,
      status: 'model_error',
      message: `❌ 模型 '${currentConfig.model}' 响应异常: ${errorMsg}`
    };
  } catch (error: any) {
    if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
      return {
        online: false,
        error: '无法连接到服务',
        modelLoaded: false,
        status: 'connection_refused',
        message: '❌ 无法连接到服务，请确认服务地址正确且Ollama正在运行'
      };
    }
    return {
      online: false,
      error: error.message,
      modelLoaded: false,
      status: 'error',
      message: `❌ 连接测试失败: ${error.message}`
    };
  }
}

export async function ensureModelLoaded(config?: LLMConfig): Promise<{ success: boolean; error?: string }> {
  const currentConfig = config || getConfig();

  try {
    const response = await fetch(`${currentConfig.apiBaseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: currentConfig.model,
        prompt: 'hello',
        stream: false,
      }),
    });

    if (response.ok) {
      return { success: true };
    }

    const errorText = await response.text();
    return { success: false, error: errorText || `HTTP ${response.status}` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function pullModel(modelName: string, apiBaseUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    });

    if (response.ok) {
      return { success: true };
    }

    const errorText = await response.text();
    return { success: false, error: errorText || `HTTP ${response.status}` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export function getSystemPrompt(scenario: string): string {
  const prompts: Record<string, string> = {
    general: `你是一个智能应急管理助手，专门为应急管理领域提供专业的智能问答服务。

你的任务是：
1. 回答用户关于应急管理的各类问题
2. 提供专业的应急知识和建议
3. 帮助用户理解和应对各种突发事件
4. 根据知识库内容提供准确的信息

请用简洁、专业、易懂的语言回答问题。`,

    qna: `你是一个智能应急问答助手，专门回答应急管理相关的问题。

请遵循以下原则：
1. 针对用户的问题提供专业、准确的应急知识
2. 回答要简洁明了，重点突出
3. 如果涉及具体的应急预案，请说明适用场景
4. 对于安全操作建议，务必强调注意事项

回答格式：
- 问题分析：简要说明问题的核心
- 解决方案：提供具体的应对措施
- 注意事项：提醒关键的安全要点`,

    data_query: `你是一个智能应急数据分析助手，擅长处理和分析应急管理数据。

请遵循以下原则：
1. 帮助用户理解各类应急数据的含义
2. 提供数据趋势分析和预测
3. 识别潜在的风险和异常情况
4. 给出数据驱动的决策建议

回答格式：
- 数据概览：提供关键指标的统计信息
- 趋势分析：分析数据的变化趋势
- 风险预警：识别潜在风险
- 建议措施：基于数据提出改进建议`,

    dispatch: `你是一个智能应急调度助手，负责协助应急资源的调度和分配。

请遵循以下原则：
1. 根据事件类型和级别，推荐合适的资源配置
2. 优化资源调度方案，提高响应效率
3. 考虑资源的可用性和地理位置
4. 协调多部门、多单位的协同工作

回答格式：
- 需求评估：分析事件的资源需求
- 资源配置：推荐资源种类和数量
- 调度方案：制定资源调配计划
- 协同建议：协调多方力量`,

    report: `你是一个智能应急报告助手，负责生成各类应急报告。

请遵循以下原则：
1. 根据事件信息生成规范的报告
2. 报告结构清晰，内容详实
3. 包含关键信息：时间、地点、人员、措施、进展等
4. 语言专业、正式

报告模板：
【事件概述】
【基本信息】
【处置措施】
【进展情况】
【存在问题】
【下一步计划】`,
  };

  return prompts[scenario] || prompts.general;
}

export function getDefaultConfig(): LLMConfig {
  return defaultConfig;
}

export { getConfig as llmConfig };
