import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { EmergencyTaskDAO, EmergencyEventDAO, EmergencyTask } from '../../db/dao.js';
import { successResponse, errorResponse, now, parseJSON, stringifyJSON } from '../../utils/common.js';

const router = Router();

const taskListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  status: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  eventId: z.string().optional(),
  assigneeId: z.string().optional(),
  keyword: z.string().optional(),
});

const createTaskSchema = z.object({
  eventId: z.string().min(1, '事件ID不能为空'),
  title: z.string().min(1, '任务标题不能为空'),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  assigneeName: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  deadline: z.string().optional(),
  solutionData: z.any().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  deadline: z.string().optional(),
  solutionData: z.any().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  remark: z.string().optional(),
});

const assignTaskSchema = z.object({
  assigneeId: z.string().min(1, '指派人ID不能为空'),
  assigneeName: z.string().min(1, '指派人姓名不能为空'),
});

const completeTaskSchema = z.object({
  remark: z.string().optional(),
  result: z.string().optional(),
});

function formatTask(task: any) {
  return {
    ...task,
    solutionData: parseJSON(task.solutionData),
  };
}

router.get('/', (req: Request, res: Response) => {
  try {
    const query = taskListSchema.parse(req.query);
    const { page, pageSize, status, priority, eventId, assigneeId, keyword } = query;

    const where: Record<string, any> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (eventId) where.eventId = eventId;
    if (assigneeId) where.assigneeId = assigneeId;

    const allTasks = EmergencyTaskDAO.findAll({
      orderBy: 'createdAt',
      order: 'DESC',
    });

    let filtered = allTasks;

    if (Object.keys(where).length > 0) {
      filtered = allTasks.filter((task: any) => {
        return Object.entries(where).every(([key, value]) => task[key] === value);
      });
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter((task: any) =>
        task.title?.toLowerCase().includes(kw) ||
        task.description?.toLowerCase().includes(kw) ||
        task.assigneeName?.toLowerCase().includes(kw)
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const list = filtered.slice(start, start + pageSize).map(formatTask);

    res.json(successResponse({
      list,
      total,
      page,
      pageSize,
      totalPages,
    }));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '获取任务列表失败', 500));
    }
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = EmergencyTaskDAO.findById(id);
    if (!task) {
      res.status(404).json(errorResponse('任务不存在', 404));
      return;
    }

    res.json(successResponse(formatTask(task)));
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message || '获取任务详情失败', 500));
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const body = createTaskSchema.parse(req.body);

    const event = EmergencyEventDAO.findById(body.eventId);
    if (!event) {
      res.status(404).json(errorResponse('关联事件不存在', 404));
      return;
    }

    const task = EmergencyTaskDAO.create({
      eventId: body.eventId,
      title: body.title,
      description: body.description,
      assigneeId: body.assigneeId,
      assigneeName: body.assigneeName,
      status: 'pending',
      priority: body.priority,
      deadline: body.deadline,
      solutionData: body.solutionData ? stringifyJSON(body.solutionData) ?? undefined : undefined,
    });

    res.json(successResponse(formatTask(task), '任务创建成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '任务创建失败', 500));
    }
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = updateTaskSchema.parse(req.body);

    const task = EmergencyTaskDAO.findById(id);
    if (!task) {
      res.status(404).json(errorResponse('任务不存在', 404));
      return;
    }

    const updateData: Partial<EmergencyTask> = { ...body };
    if (body.solutionData !== undefined) {
      updateData.solutionData = stringifyJSON(body.solutionData) ?? undefined;
    }

    const updated = EmergencyTaskDAO.update(id, updateData);

    res.json(successResponse(formatTask(updated), '任务更新成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '任务更新失败', 500));
    }
  }
});

router.put('/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = updateStatusSchema.parse(req.body);

    const task = EmergencyTaskDAO.findById(id);
    if (!task) {
      res.status(404).json(errorResponse('任务不存在', 404));
      return;
    }

    const existingData = parseJSON(task.solutionData) || {};
    const newData = {
      ...existingData,
      statusHistory: [
        ...(existingData.statusHistory || []),
        {
          status: body.status,
          remark: body.remark,
          changedAt: now(),
        },
      ],
    };

    const updateData: Partial<EmergencyTask> = {
      status: body.status,
      solutionData: stringifyJSON(newData) ?? undefined,
    };

    if (body.status === 'completed') {
      updateData.completedAt = now();
    }

    const updated = EmergencyTaskDAO.update(id, updateData);

    res.json(successResponse(formatTask(updated), '任务状态更新成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '任务状态更新失败', 500));
    }
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = EmergencyTaskDAO.findById(id);
    if (!task) {
      res.status(404).json(errorResponse('任务不存在', 404));
      return;
    }

    const deleted = EmergencyTaskDAO.delete(id);

    res.json(successResponse({ deleted }, '任务删除成功'));
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message || '任务删除失败', 500));
  }
});

router.post('/:id/assign', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = assignTaskSchema.parse(req.body);

    const task = EmergencyTaskDAO.findById(id);
    if (!task) {
      res.status(404).json(errorResponse('任务不存在', 404));
      return;
    }

    const existingData = parseJSON(task.solutionData) || {};
    const newData = {
      ...existingData,
      assignHistory: [
        ...(existingData.assignHistory || []),
        {
          assigneeId: body.assigneeId,
          assigneeName: body.assigneeName,
          assignedAt: now(),
        },
      ],
    };

    const updated = EmergencyTaskDAO.update(id, {
      assigneeId: body.assigneeId,
      assigneeName: body.assigneeName,
      status: 'in_progress',
      solutionData: stringifyJSON(newData) ?? undefined,
    });

    res.json(successResponse(formatTask(updated), '任务指派成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '任务指派失败', 500));
    }
  }
});

router.post('/:id/complete', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = completeTaskSchema.parse(req.body);

    const task = EmergencyTaskDAO.findById(id);
    if (!task) {
      res.status(404).json(errorResponse('任务不存在', 404));
      return;
    }

    if (task.status === 'completed') {
      res.status(400).json(errorResponse('任务已完成，无需重复操作', 400));
      return;
    }

    const existingData = parseJSON(task.solutionData) || {};
    const newData = {
      ...existingData,
      completion: {
        remark: body.remark,
        result: body.result,
        completedAt: now(),
      },
      statusHistory: [
        ...(existingData.statusHistory || []),
        {
          status: 'completed',
          remark: body.remark,
          changedAt: now(),
        },
      ],
    };

    const updated = EmergencyTaskDAO.update(id, {
      status: 'completed',
      completedAt: now(),
      solutionData: stringifyJSON(newData) ?? undefined,
    });

    res.json(successResponse(formatTask(updated), '任务完成成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '任务完成失败', 500));
    }
  }
});

export default router;
