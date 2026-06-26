import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { EmergencyKnowledgeDAO, EmergencyEventDAO, EmergencyTaskDAO } from '../../db/dao.js';
import { successResponse, errorResponse, parseJSON } from '../../utils/common.js';

const router = Router();

const knowledgeQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(100).optional().default(10),
  category: z.string().optional(),
  tag: z.string().optional(),
  keyword: z.string().optional(),
});

const knowledgeCreateSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  content: z.string().optional(),
  source: z.string().optional(),
  eventId: z.string().optional(),
});

const knowledgeUpdateSchema = z.object({
  title: z.string().min(1, '标题不能为空').optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  content: z.string().optional(),
  source: z.string().optional(),
});

const knowledgeSearchSchema = z.object({
  keyword: z.string().min(1, '搜索关键词不能为空'),
  category: z.string().optional(),
  page: z.number().min(1).optional().default(1),
  pageSize: z.number().min(1).max(100).optional().default(10),
});

const importFromEventSchema = z.object({
  eventId: z.string().min(1, '事件ID不能为空'),
  category: z.string().optional(),
  includeTasks: z.boolean().optional().default(true),
});

function parseTags(tagsStr: string | undefined): string[] {
  if (!tagsStr) return [];
  try {
    const parsed = JSON.parse(tagsStr);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  return tagsStr.split(',').map(t => t.trim()).filter(Boolean);
}

function formatKnowledgeItem(item: any) {
  return {
    ...item,
    tags: parseTags(item.tags),
  };
}

router.get('/', (req: Request, res: Response) => {
  try {
    const validated = knowledgeQuerySchema.parse(req.query);
    const { page, pageSize, category, tag, keyword } = validated;

    const allKnowledge = EmergencyKnowledgeDAO.findAll({
      orderBy: 'createdAt',
      order: 'DESC',
    });

    let filtered = allKnowledge;

    if (category) {
      filtered = filtered.filter(item => item.category === category);
    }

    if (tag) {
      filtered = filtered.filter(item => {
        const tags = parseTags(item.tags);
        return tags.includes(tag);
      });
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(item => {
        const title = (item.title || '').toLowerCase();
        const content = (item.content || '').toLowerCase();
        const categoryStr = (item.category || '').toLowerCase();
        const tagsStr = (item.tags || '').toLowerCase();
        return title.includes(kw) || content.includes(kw) || categoryStr.includes(kw) || tagsStr.includes(kw);
      });
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const list = filtered.slice(start, start + pageSize).map(formatKnowledgeItem);

    const categories = [...new Set(allKnowledge.map(item => item.category).filter(Boolean))];
    const allTags = [...new Set(allKnowledge.flatMap(item => parseTags(item.tags)))];

    res.json(successResponse({
      list,
      total,
      page,
      pageSize,
      totalPages,
      categories,
      allTags,
    }, '获取知识库列表成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '获取知识库列表失败', 500));
    }
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const knowledge = EmergencyKnowledgeDAO.findById(id);

    if (!knowledge) {
      res.json(errorResponse('知识不存在', 404));
      return;
    }

    const result = formatKnowledgeItem(knowledge);

    let relatedEvent = null;
    if (knowledge.eventId) {
      relatedEvent = EmergencyEventDAO.findById(knowledge.eventId);
    }

    res.json(successResponse({
      ...result,
      relatedEvent,
    }, '获取知识详情成功'));
  } catch (err: any) {
    res.json(errorResponse(err.message || '获取知识详情失败', 500));
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const validated = knowledgeCreateSchema.parse(req.body);
    const { title, category, tags, content, source, eventId } = validated;

    if (eventId) {
      const event = EmergencyEventDAO.findById(eventId);
      if (!event) {
        res.json(errorResponse('关联事件不存在', 400));
        return;
      }
    }

    const created = EmergencyKnowledgeDAO.create({
      title,
      category,
      tags: tags ? JSON.stringify(tags) : undefined,
      content,
      source,
      eventId,
    });

    res.json(successResponse(formatKnowledgeItem(created), '新增知识成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '新增知识失败', 500));
    }
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validated = knowledgeUpdateSchema.parse(req.body);

    const existing = EmergencyKnowledgeDAO.findById(id);
    if (!existing) {
      res.json(errorResponse('知识不存在', 404));
      return;
    }

    const updateData: any = { ...validated };
    if (validated.tags !== undefined) {
      updateData.tags = JSON.stringify(validated.tags);
    }

    const updated = EmergencyKnowledgeDAO.update(id, updateData);

    res.json(successResponse(formatKnowledgeItem(updated), '更新知识成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '更新知识失败', 500));
    }
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = EmergencyKnowledgeDAO.findById(id);
    if (!existing) {
      res.json(errorResponse('知识不存在', 404));
      return;
    }

    const deleted = EmergencyKnowledgeDAO.delete(id);

    res.json(successResponse({ deleted }, '删除知识成功'));
  } catch (err: any) {
    res.json(errorResponse(err.message || '删除知识失败', 500));
  }
});

router.post('/search', (req: Request, res: Response) => {
  try {
    const validated = knowledgeSearchSchema.parse(req.body);
    const { keyword, category, page, pageSize } = validated;

    const allKnowledge = EmergencyKnowledgeDAO.findAll({
      orderBy: 'createdAt',
      order: 'DESC',
    });

    const kw = keyword.toLowerCase();
    let filtered = allKnowledge.filter(item => {
      const title = (item.title || '').toLowerCase();
      const content = (item.content || '').toLowerCase();
      const categoryStr = (item.category || '').toLowerCase();
      const tagsStr = (item.tags || '').toLowerCase();
      return title.includes(kw) || content.includes(kw) || categoryStr.includes(kw) || tagsStr.includes(kw);
    });

    if (category) {
      filtered = filtered.filter(item => item.category === category);
    }

    const scored = filtered.map(item => {
      const title = (item.title || '').toLowerCase();
      const content = (item.content || '').toLowerCase();
      let score = 0;
      if (title.includes(kw)) score += 50;
      if (content.includes(kw)) score += 30;
      if (title.startsWith(kw)) score += 20;
      return { item: formatKnowledgeItem(item), score };
    });

    scored.sort((a, b) => b.score - a.score);

    const total = scored.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const list = scored.slice(start, start + pageSize);

    res.json(successResponse({
      list,
      total,
      page,
      pageSize,
      totalPages,
    }, '搜索知识成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '搜索知识失败', 500));
    }
  }
});

router.post('/import-from-event', (req: Request, res: Response) => {
  try {
    const validated = importFromEventSchema.parse(req.body);
    const { eventId, category, includeTasks } = validated;

    const event = EmergencyEventDAO.findById(eventId);
    if (!event) {
      res.json(errorResponse('事件不存在', 404));
      return;
    }

    const existingKnowledge = EmergencyKnowledgeDAO.findOne({
      where: { eventId },
    });
    if (existingKnowledge) {
      res.json(errorResponse('该事件已汇入知识库', 400));
      return;
    }

    let content = `## 事件概述\n\n标题：${event.title}\n`;
    if (event.description) {
      content += `描述：${event.description}\n`;
    }
    if (event.location) {
      content += `地点：${event.location}\n`;
    }
    content += `级别：${event.level}\n`;
    content += `状态：${event.status}\n`;
    if (event.detectedAt) {
      content += `发现时间：${event.detectedAt}\n`;
    }
    if (event.resolvedAt) {
      content += `解决时间：${event.resolvedAt}\n`;
    }

    const tags = ['事件处置', event.level];

    if (includeTasks) {
      const tasks = EmergencyTaskDAO.findAll({ where: { eventId } });
      if (tasks.length > 0) {
        content += `\n## 处置任务\n\n`;
        tasks.forEach((task, index) => {
          content += `${index + 1}. ${task.title}`;
          if (task.description) {
            content += ` - ${task.description}`;
          }
          content += ` [${task.status}]\n`;
        });

        const completedCount = tasks.filter(t => t.status === 'completed').length;
        content += `\n任务完成情况：${completedCount}/${tasks.length}\n`;
      }
    }

    content += `\n## 经验总结\n\n`;
    content += `- 本次事件处置的关键措施和方法\n`;
    content += `- 遇到的主要问题及应对策略\n`;
    content += `- 可优化改进的方向和建议\n`;

    const created = EmergencyKnowledgeDAO.create({
      title: `【处置经验】${event.title}`,
      category: category || '事件处置',
      tags: JSON.stringify(tags),
      content,
      source: '事件处置自动汇入',
      eventId,
    });

    res.json(successResponse({
      knowledge: formatKnowledgeItem(created),
      eventTitle: event.title,
    }, '从事件汇入知识库成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '从事件汇入知识库失败', 500));
    }
  }
});

export default router;
