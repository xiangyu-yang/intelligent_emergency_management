import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { EmergencyOrganizationDAO } from '../../db/dao.js';

const router = Router();

const querySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v, 10) : 1),
  pageSize: z.string().optional().transform(v => v ? parseInt(v, 10) : 10),
  keyword: z.string().optional(),
  department: z.string().optional(),
  role: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  position: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional().default('active'),
});

const updateSchema = z.object({
  name: z.string().min(1, '姓名不能为空').optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
});

router.get('/', (req: Request, res: Response) => {
  try {
    const query = querySchema.parse(req.query);
    const { page, pageSize, keyword, department, role } = query;

    const where: Record<string, any> = {};
    if (department) {
      where.department = department;
    }
    if (role) {
      where.role = role;
    }

    const allItems = EmergencyOrganizationDAO.findAll({ where, orderBy: 'createdAt', order: 'DESC' });

    let filteredItems = allItems;
    if (keyword) {
      const kw = keyword.toLowerCase();
      filteredItems = allItems.filter(
        item =>
          item.name.toLowerCase().includes(kw) ||
          (item.position && item.position.toLowerCase().includes(kw)) ||
          (item.department && item.department.toLowerCase().includes(kw)) ||
          (item.phone && item.phone.includes(kw)) ||
          (item.email && item.email.toLowerCase().includes(kw))
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
    const item = EmergencyOrganizationDAO.findById(id);

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
    const item = EmergencyOrganizationDAO.create(data);
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

    const existing = EmergencyOrganizationDAO.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    const updated = EmergencyOrganizationDAO.update(id, data);
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

    const existing = EmergencyOrganizationDAO.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    const result = EmergencyOrganizationDAO.delete(id);
    res.json({ success: result, message: result ? '删除成功' : '删除失败' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || '删除失败' });
  }
});

export default router;
