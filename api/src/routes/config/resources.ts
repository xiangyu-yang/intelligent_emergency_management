import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { EmergencyResourceDAO } from '../../db/dao.js';

const router = Router();

const querySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v, 10) : 1),
  pageSize: z.string().optional().transform(v => v ? parseInt(v, 10) : 10),
  keyword: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  type: z.string().optional(),
  category: z.string().optional(),
  quantity: z.number().optional().default(0),
  unit: z.string().optional(),
  location: z.string().optional(),
  manager: z.string().optional(),
  phone: z.string().optional(),
  status: z.string().optional().default('available'),
});

const updateSchema = z.object({
  name: z.string().min(1, '名称不能为空').optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  location: z.string().optional(),
  manager: z.string().optional(),
  phone: z.string().optional(),
  status: z.string().optional(),
});

router.get('/', (req: Request, res: Response) => {
  try {
    const query = querySchema.parse(req.query);
    const { page, pageSize, keyword, type, category } = query;

    const where: Record<string, any> = {};
    if (type) {
      where.type = type;
    }
    if (category) {
      where.category = category;
    }

    const allItems = EmergencyResourceDAO.findAll({ where, orderBy: 'createdAt', order: 'DESC' });

    let filteredItems = allItems;
    if (keyword) {
      const kw = keyword.toLowerCase();
      filteredItems = allItems.filter(
        item =>
          item.name.toLowerCase().includes(kw) ||
          (item.type && item.type.toLowerCase().includes(kw)) ||
          (item.category && item.category.toLowerCase().includes(kw)) ||
          (item.location && item.location.toLowerCase().includes(kw)) ||
          (item.manager && item.manager.toLowerCase().includes(kw))
      );
    }

    const total = filteredItems.length;
    const start = (page - 1) * pageSize;
    const list = filteredItems.slice(start, start + pageSize);

    res.json({
      success: true,
      data: {
        list,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '查询失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = EmergencyResourceDAO.findById(id);

    if (!item) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || '查询失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const data = createSchema.parse(req.body);
    const item = EmergencyResourceDAO.create(data);
    res.json({ success: true, data: item, message: '创建成功' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0]?.message || '参数错误' });
    }
    res.status(500).json({ success: false, message: error.message || '创建失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateSchema.parse(req.body);

    const existing = EmergencyResourceDAO.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    const updated = EmergencyResourceDAO.update(id, data);
    res.json({ success: true, data: updated, message: '更新成功' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0]?.message || '参数错误' });
    }
    res.status(500).json({ success: false, message: error.message || '更新失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = EmergencyResourceDAO.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    const result = EmergencyResourceDAO.delete(id);
    res.json({ success: result, message: result ? '删除成功' : '删除失败' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || '删除失败' });
  }
});

export default router;
