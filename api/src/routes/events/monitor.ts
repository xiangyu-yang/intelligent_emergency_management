import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { EmergencyEventDAO, EmergencyEvent } from '../../db/dao.js';
import { successResponse, errorResponse, now, parseJSON, stringifyJSON } from '../../utils/common.js';

const router = Router();

const detectEventSchema = z.object({
  videoSource: z.string().min(1, '视频源不能为空'),
  eventType: z.string().optional(),
  eventTypeId: z.string().optional(),
  title: z.string().min(1, '事件标题不能为空'),
  description: z.string().optional(),
  location: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  detectedObjects: z.array(z.any()).optional(),
  screenshotUrl: z.string().optional(),
});

const verifyEventSchema = z.object({
  verified: z.boolean(),
  remark: z.string().optional(),
  level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const levelJudgeSchema = z.object({
  level: z.enum(['low', 'medium', 'high', 'critical']),
  reason: z.string().optional(),
});

const eventListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.string().optional(),
  eventTypeId: z.string().optional(),
  keyword: z.string().optional(),
});

const updateEventSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.string().optional(),
  eventTypeId: z.string().optional(),
  source: z.string().optional(),
});

function formatEvent(event: any) {
  return {
    ...event,
    data: parseJSON(event.data),
  };
}

router.post('/detect', (req: Request, res: Response) => {
  try {
    const body = detectEventSchema.parse(req.body);

    const eventData = {
      videoSource: body.videoSource,
      confidence: body.confidence || 0.85,
      detectedObjects: body.detectedObjects || [],
      screenshotUrl: body.screenshotUrl,
    };

    const event = EmergencyEventDAO.create({
      eventTypeId: body.eventTypeId,
      title: body.title,
      description: body.description,
      location: body.location,
      level: 'medium',
      status: 'detected',
      source: 'cv_detection',
      detectedAt: now(),
      data: stringifyJSON(eventData) ?? undefined,
    });

    res.json(successResponse(formatEvent(event), '事件检测成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '事件检测失败', 500));
    }
  }
});

router.post('/:id/verify', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = verifyEventSchema.parse(req.body);

    const event = EmergencyEventDAO.findById(id);
    if (!event) {
      res.status(404).json(errorResponse('事件不存在', 404));
      return;
    }

    if (event.status !== 'detected') {
      res.status(400).json(errorResponse('当前事件状态不支持验证', 400));
      return;
    }

    const updateData: Partial<EmergencyEvent> = {
      status: body.verified ? 'verified' : 'closed',
      verifiedAt: now(),
    };

    if (body.level) {
      updateData.level = body.level;
    }

    const updated = EmergencyEventDAO.update(id, updateData);

    res.json(successResponse(formatEvent(updated), body.verified ? '事件验证通过' : '事件已关闭'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '事件验证失败', 500));
    }
  }
});

router.post('/:id/level-judge', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = levelJudgeSchema.parse(req.body);

    const event = EmergencyEventDAO.findById(id);
    if (!event) {
      res.status(404).json(errorResponse('事件不存在', 404));
      return;
    }

    const existingData = parseJSON(event.data) || {};
    const newData = {
      ...existingData,
      levelJudge: {
        level: body.level,
        reason: body.reason,
        judgedAt: now(),
      },
    };

    const updated = EmergencyEventDAO.update(id, {
      level: body.level,
      data: stringifyJSON(newData) ?? undefined,
    });

    res.json(successResponse(formatEvent(updated), '事件等级判定成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '等级判定失败', 500));
    }
  }
});

router.get('/', (req: Request, res: Response) => {
  try {
    const query = eventListSchema.parse(req.query);
    const { page, pageSize, level, status, eventTypeId, keyword } = query;

    const where: Record<string, any> = {};
    if (level) where.level = level;
    if (status) where.status = status;
    if (eventTypeId) where.eventTypeId = eventTypeId;

    const allEvents = EmergencyEventDAO.findAll({
      orderBy: 'createdAt',
      order: 'DESC',
    });

    let filtered = allEvents;

    if (Object.keys(where).length > 0) {
      filtered = allEvents.filter((event: any) => {
        return Object.entries(where).every(([key, value]) => event[key] === value);
      });
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter((event: any) =>
        event.title?.toLowerCase().includes(kw) ||
        event.description?.toLowerCase().includes(kw) ||
        event.location?.toLowerCase().includes(kw)
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const list = filtered.slice(start, start + pageSize).map(formatEvent);

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
      res.status(500).json(errorResponse(err.message || '获取事件列表失败', 500));
    }
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = EmergencyEventDAO.findById(id);
    if (!event) {
      res.status(404).json(errorResponse('事件不存在', 404));
      return;
    }

    res.json(successResponse(formatEvent(event)));
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message || '获取事件详情失败', 500));
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = updateEventSchema.parse(req.body);

    const event = EmergencyEventDAO.findById(id);
    if (!event) {
      res.status(404).json(errorResponse('事件不存在', 404));
      return;
    }

    const updated = EmergencyEventDAO.update(id, body);

    res.json(successResponse(formatEvent(updated), '事件更新成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '事件更新失败', 500));
    }
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = EmergencyEventDAO.findById(id);
    if (!event) {
      res.status(404).json(errorResponse('事件不存在', 404));
      return;
    }

    const deleted = EmergencyEventDAO.delete(id);

    res.json(successResponse({ deleted }, '事件删除成功'));
  } catch (err: any) {
    res.status(500).json(errorResponse(err.message || '事件删除失败', 500));
  }
});

export default router;
