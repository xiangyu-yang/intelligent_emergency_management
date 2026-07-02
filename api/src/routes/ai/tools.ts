import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  executeSkillScript,
  readSkillFile,
  getSkillPermissions,
  ToolExecutionResult,
  ToolPermission,
} from '../../ai/toolExecutor.js';
import { successResponse, errorResponse } from '../../utils/common.js';
import { ChatSessionDAO, ChatMessageDAO } from '../../db/dao.js';
import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';

const router = Router();

const SKILLS_DIR = path.join(process.cwd(), 'data', 'skills');

router.get('/skills/:skillId/permissions', (req: Request, res: Response) => {
  try {
    const { skillId } = req.params;
    const skillDir = path.join(SKILLS_DIR, skillId);

    if (!fs.existsSync(skillDir)) {
      res.json(errorResponse('技能不存在', 404));
      return;
    }

    const permissions = getSkillPermissions(skillId);
    res.json(successResponse(permissions, '获取技能权限成功'));
  } catch (err: any) {
    res.json(errorResponse(err.message || '获取权限失败', 500));
  }
});

router.post('/skills/:skillId/execute', async (req: Request, res: Response) => {
  try {
    const { skillId } = req.params;
    const { script, args } = req.body;

    if (!script) {
      res.json(errorResponse('请指定要执行的脚本', 400));
      return;
    }

    const skillDir = path.join(SKILLS_DIR, skillId);
    if (!fs.existsSync(skillDir)) {
      res.json(errorResponse('技能不存在', 404));
      return;
    }

    const result = await executeSkillScript(skillId, script, args || []);
    if (result.success) {
      res.json(successResponse(result.output, '脚本执行成功'));
    } else {
      res.json(errorResponse(result.error || '脚本执行失败', 500));
    }
  } catch (err: any) {
    res.json(errorResponse(err.message || '执行脚本失败', 500));
  }
});

router.post('/skills/:skillId/read-file', async (req: Request, res: Response) => {
  try {
    const { skillId } = req.params;
    const { filePath } = req.body;

    if (!filePath) {
      res.json(errorResponse('请指定要读取的文件路径', 400));
      return;
    }

    const skillDir = path.join(SKILLS_DIR, skillId);
    if (!fs.existsSync(skillDir)) {
      res.json(errorResponse('技能不存在', 404));
      return;
    }

    const result = await readSkillFile(skillId, filePath);
    if (result.success) {
      res.json(successResponse(result.output, '文件读取成功'));
    } else {
      res.json(errorResponse(result.error || '文件读取失败', 500));
    }
  } catch (err: any) {
    res.json(errorResponse(err.message || '读取文件失败', 500));
  }
});

router.post('/skills/:skillId/run', async (req: Request, res: Response) => {
  try {
    const { skillId } = req.params;
    const { action, params, sessionId } = req.body;

    const skillDir = path.join(SKILLS_DIR, skillId);
    if (!fs.existsSync(skillDir)) {
      res.json(errorResponse('技能不存在', 404));
      return;
    }

    let result: ToolExecutionResult;

    switch (action) {
      case 'search':
        const keyword = params?.keyword || '';
        const category = params?.category || '';
        const args: string[] = [];
        if (keyword) args.push(`--keyword="${keyword}"`);
        if (category) args.push(`--category="${category}"`);
        result = await executeSkillScript(skillId, 'search_policies.py', args);
        break;

      case 'download':
        result = await executeSkillScript(skillId, 'download_policies.py', ['--urls=assets/policy_urls.txt', '--output=downloads/']);
        break;

      case 'parse':
        result = await executeSkillScript(skillId, 'parse_policies.py', ['--input=downloads/', '--output=parsed/']);
        break;

      case 'import':
        result = await executeSkillScript(skillId, 'import_to_db.py', ['--input=parsed/', '--db=policy.db']);
        break;

      case 'read_reference':
        const refFile = params?.file || 'policy_categories.txt';
        result = await readSkillFile(skillId, `reference/${refFile}`);
        break;

      case 'read_asset':
        const assetFile = params?.file || 'policy_collection_template.json';
        result = await readSkillFile(skillId, `assets/${assetFile}`);
        break;

      default:
        res.json(errorResponse(`不支持的操作: ${action}`, 400));
        return;
    }

    const timestamp = dayjs().toISOString();

    if (sessionId) {
      const session = ChatSessionDAO.findById(sessionId);
      if (session) {
        ChatMessageDAO.create({
          sessionId,
          role: 'user',
          content: `执行技能操作: ${action}`,
        });

        if (result.success) {
          ChatMessageDAO.create({
            sessionId,
            role: 'assistant',
            content: `技能执行结果：\n${result.output}`,
          });
        } else {
          ChatMessageDAO.create({
            sessionId,
            role: 'assistant',
            content: `技能执行失败：${result.error || '操作执行失败'}`,
          });
        }

        ChatSessionDAO.incrementMessageCount(sessionId, timestamp);
      }
    }

    if (result.success) {
      res.json(successResponse(result.output, '操作执行成功'));
    } else {
      res.json(errorResponse(result.error || '操作执行失败', 500));
    }
  } catch (err: any) {
    res.json(errorResponse(err.message || '执行操作失败', 500));
  }
});

router.post('/execute', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      toolName: z.string(),
      arguments: z.record(z.string(), z.any()),
      sessionId: z.string(),
    });
    const body = schema.parse(req.body);

    const { toolName, arguments: args, sessionId } = body;

    const session = ChatSessionDAO.findById(sessionId);
    if (!session) {
      res.json(errorResponse('会话不存在', 404));
      return;
    }

    let result: ToolExecutionResult;

    switch (toolName) {
      case 'execute_policy_collection':
        const keyword = args.keyword || '';
        const category = args.category || '';
        const searchArgs: string[] = [];
        if (keyword) searchArgs.push(`--keyword="${keyword}"`);
        if (category) searchArgs.push(`--category="${category}"`);
        result = await executeSkillScript('policy-collection', 'search_policies.py', searchArgs);
        break;

      case 'read_downloaded_file':
        const filePath = args.filePath || '';
        if (!filePath) {
          result = { success: false, error: '请指定文件路径' };
        } else {
          result = await readSkillFile('policy-collection', filePath);
        }
        break;

      default:
        result = { success: false, error: `不支持的工具: ${toolName}` };
    }

    const timestamp = dayjs().toISOString();

    ChatMessageDAO.create({
      sessionId,
      role: 'user',
      content: `执行技能操作: ${toolName}`,
    });

    if (result.success) {
      ChatMessageDAO.create({
        sessionId,
        role: 'assistant',
        content: `技能执行结果：\n${result.output}`,
      });
    } else {
      ChatMessageDAO.create({
        sessionId,
        role: 'assistant',
        content: `技能执行失败：${result.error || '操作执行失败'}`,
      });
    }

    ChatSessionDAO.incrementMessageCount(sessionId, timestamp);

    if (result.success) {
      res.json(successResponse({ output: result.output }, '操作执行成功'));
    } else {
      res.json(errorResponse(result.error || '操作执行失败', 500));
    }
  } catch (err: any) {
    res.json(errorResponse(err.message || '执行操作失败', 500));
  }
});

export default router;