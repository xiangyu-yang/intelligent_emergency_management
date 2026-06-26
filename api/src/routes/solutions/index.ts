import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  EmergencySolutionDAO,
  EmergencyEventDAO,
  EmergencyTaskDAO,
  EmergencySolution,
} from '../../db/dao.js';
import {
  successResponse,
  errorResponse,
  now,
  parseJSON,
  stringifyJSON,
} from '../../utils/common.js';

const router = Router();

const solutionListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  eventId: z.string().optional(),
  eventTypeId: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  keyword: z.string().optional(),
});

const createSolutionSchema = z.object({
  eventId: z.string().optional(),
  eventTypeId: z.string().optional(),
  planTemplateId: z.string().optional(),
  solutionTemplateId: z.string().optional(),
  title: z.string().min(1, '方案标题不能为空'),
  description: z.string().optional(),
  content: z.any().optional(),
  level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  createdBy: z.string().optional(),
});

const updateSolutionSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  content: z.any().optional(),
  level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  eventId: z.string().optional(),
  eventTypeId: z.string().optional(),
  planTemplateId: z.string().optional(),
  solutionTemplateId: z.string().optional(),
  version: z.string().optional(),
});

const publishSolutionSchema = z.object({
  approvedBy: z.string().optional(),
});

const generateTasksSchema = z.object({
  assigneeName: z.string().optional(),
});

function formatSolution(solution: any) {
  return {
    ...solution,
    content: parseJSON(solution.content),
  };
}

router.get('/', (req: Request, res: Response) => {
  try {
    const query = solutionListSchema.parse(req.query);
    const { page, pageSize, eventId, eventTypeId, status, level, keyword } = query;

    const where: Record<string, any> = {};
    if (eventId) where.eventId = eventId;
    if (eventTypeId) where.eventTypeId = eventTypeId;
    if (status) where.status = status;
    if (level) where.level = level;

    const allSolutions = EmergencySolutionDAO.findAll({
      orderBy: 'createdAt',
      order: 'DESC',
    });

    let filtered = allSolutions;

    if (Object.keys(where).length > 0) {
      filtered = allSolutions.filter((solution: any) => {
        return Object.entries(where).every(
          ([key, value]) => solution[key] === value
        );
      });
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(
        (solution: any) =>
          solution.title?.toLowerCase().includes(kw) ||
          solution.description?.toLowerCase().includes(kw)
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const list = filtered.slice(start, start + pageSize).map(formatSolution);

    res.json(
      successResponse({
        list,
        total,
        page,
        pageSize,
        totalPages,
      })
    );
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '获取方案列表失败', 500));
    }
  }
});

router.get('/event/:eventId', (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = EmergencyEventDAO.findById(eventId);
    if (!event) {
      res.status(404).json(errorResponse('事件不存在', 404));
      return;
    }

    const solutions = EmergencySolutionDAO.findByEventId(eventId).map(formatSolution);

    res.json(successResponse(solutions));
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message || '获取事件方案失败', 500));
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const solution = EmergencySolutionDAO.findById(id);
    if (!solution) {
      res.status(404).json(errorResponse('方案不存在', 404));
      return;
    }

    let eventInfo: any = null;
    if (solution.eventId) {
      const event = EmergencyEventDAO.findById(solution.eventId);
      if (event) {
        eventInfo = {
          ...event,
          data: parseJSON(event.data),
        };
      }
    }

    const tasks = EmergencyTaskDAO.findAll({
      where: { eventId: solution.eventId },
      orderBy: 'createdAt',
      order: 'DESC',
    }).map((task: any) => ({
      ...task,
      solutionData: parseJSON(task.solutionData),
    }));

    const result = {
      ...formatSolution(solution),
      event: eventInfo,
      tasks,
    };

    res.json(successResponse(result));
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message || '获取方案详情失败', 500));
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const body = createSolutionSchema.parse(req.body);

    if (body.eventId) {
      const event = EmergencyEventDAO.findById(body.eventId);
      if (!event) {
        res.status(404).json(errorResponse('关联事件不存在', 404));
        return;
      }
    }

    const solution = EmergencySolutionDAO.create({
      eventId: body.eventId,
      eventTypeId: body.eventTypeId,
      planTemplateId: body.planTemplateId,
      solutionTemplateId: body.solutionTemplateId,
      title: body.title,
      description: body.description,
      content: body.content ? stringifyJSON(body.content) ?? undefined : undefined,
      status: 'draft',
      level: body.level,
      version: '1.0',
      createdBy: body.createdBy,
    });

    res.json(successResponse(formatSolution(solution), '方案创建成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '方案创建失败', 500));
    }
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = updateSolutionSchema.parse(req.body);

    const solution = EmergencySolutionDAO.findById(id);
    if (!solution) {
      res.status(404).json(errorResponse('方案不存在', 404));
      return;
    }

    if (solution.status === 'published' || solution.status === 'archived') {
      res.status(400).json(errorResponse('已发布或已归档的方案不能修改', 400));
      return;
    }

    const updateData: Partial<EmergencySolution> = { ...body };
    if (body.content !== undefined) {
      updateData.content = stringifyJSON(body.content) ?? undefined;
    }

    const updated = EmergencySolutionDAO.update(id, updateData);

    res.json(successResponse(formatSolution(updated), '方案更新成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '方案更新失败', 500));
    }
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const solution = EmergencySolutionDAO.findById(id);
    if (!solution) {
      res.status(404).json(errorResponse('方案不存在', 404));
      return;
    }

    const deleted = EmergencySolutionDAO.delete(id);

    res.json(successResponse({ deleted }, '方案删除成功'));
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message || '方案删除失败', 500));
  }
});

router.post('/:id/publish', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = publishSolutionSchema.parse(req.body);

    const solution = EmergencySolutionDAO.findById(id);
    if (!solution) {
      res.status(404).json(errorResponse('方案不存在', 404));
      return;
    }

    if (solution.status !== 'draft') {
      res.status(400).json(errorResponse('只有草稿状态的方案才能发布', 400));
      return;
    }

    const updated = EmergencySolutionDAO.publish(id, body.approvedBy);

    res.json(successResponse(formatSolution(updated), '方案发布成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '方案发布失败', 500));
    }
  }
});

router.post('/:id/archive', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const solution = EmergencySolutionDAO.findById(id);
    if (!solution) {
      res.status(404).json(errorResponse('方案不存在', 404));
      return;
    }

    if (solution.status !== 'published') {
      res.status(400).json(errorResponse('只有发布状态的方案才能归档', 400));
      return;
    }

    const updated = EmergencySolutionDAO.archive(id);

    res.json(successResponse(formatSolution(updated), '方案归档成功'));
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message || '方案归档失败', 500));
  }
});

router.post('/:id/generate-tasks', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = generateTasksSchema.parse(req.body);

    const solution = EmergencySolutionDAO.findById(id);
    if (!solution) {
      res.status(404).json(errorResponse('方案不存在', 404));
      return;
    }

    if (!solution.eventId) {
      res.status(400).json(errorResponse('方案未关联事件，无法生成任务', 400));
      return;
    }

    const event = EmergencyEventDAO.findById(solution.eventId);
    if (!event) {
      res.status(404).json(errorResponse('关联事件不存在', 404));
      return;
    }

    const content = parseJSON(solution.content);
    const steps = content?.steps || [];

    if (steps.length === 0) {
      res.status(400).json(errorResponse('方案中没有处置步骤，无法生成任务', 400));
      return;
    }

    const createdTasks: any[] = [];

    for (const step of steps) {
      const task = EmergencyTaskDAO.create({
        eventId: solution.eventId,
        title: step.title || `处置任务-${step.order || ''}`,
        description: step.description || '',
        assigneeName: body.assigneeName,
        status: 'pending',
        priority: solution.level || 'medium',
        solutionData: stringifyJSON({
          solutionId: id,
          stepOrder: step.order,
          stepTitle: step.title,
        }) ?? undefined,
      });
      createdTasks.push({
        ...task,
        solutionData: parseJSON(task.solutionData),
      });
    }

    res.json(successResponse(createdTasks, '任务生成成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '任务生成失败', 500));
    }
  }
});

export default router;
