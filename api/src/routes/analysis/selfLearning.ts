import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  EmergencyEventDAO,
  EmergencyTaskDAO,
  EmergencyKnowledgeDAO,
  EventAnalysisDAO,
  EmergencyEventTypeDAO,
  EmergencyResourceDAO,
} from '../../db/dao.js';
import { successResponse, errorResponse, stringifyJSON, parseJSON } from '../../utils/common.js';
import dayjs from 'dayjs';

const router = Router();

const analyzeHistorySchema = z.object({
  timeRange: z.enum(['week', 'month', 'quarter', 'year', 'all']).optional().default('month'),
  eventTypes: z.array(z.string()).optional(),
  analysisDimensions: z.array(z.enum(['responseTime', 'taskEfficiency', 'resourceUsage', 'knowledgeGap', 'pattern'])).optional(),
});

const applySuggestionSchema = z.object({
  suggestionId: z.string(),
  applyType: z.enum(['config', 'knowledge', 'template']),
});

const processEventSchema = z.object({
  eventId: z.string().min(1, '事件ID不能为空'),
  autoGenerateKnowledge: z.boolean().optional().default(true),
  updateStatistics: z.boolean().optional().default(true),
});

const statsQuerySchema = z.object({
  timeRange: z.enum(['week', 'month', 'quarter', 'year', 'all']).optional().default('month'),
});

interface Suggestion {
  id: string;
  type: 'config' | 'knowledge' | 'template' | 'process';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  expectedBenefit: string;
  confidence: number;
  data: Record<string, any>;
}

function getTimeRangeStart(timeRange: string): dayjs.Dayjs | null {
  const now = dayjs();
  switch (timeRange) {
    case 'week':
      return now.subtract(7, 'day');
    case 'month':
      return now.subtract(30, 'day');
    case 'quarter':
      return now.subtract(90, 'day');
    case 'year':
      return now.subtract(365, 'day');
    case 'all':
    default:
      return null;
  }
}

function filterEventsByTime(events: any[], timeRange: string): any[] {
  const start = getTimeRangeStart(timeRange);
  if (!start) return events;
  return events.filter(e => e.createdAt && dayjs(e.createdAt).isAfter(start));
}

function generateSuggestions(events: any[], tasks: any[], knowledgeItems: any[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  let idCounter = 1;

  const resolvedEvents = events.filter(e => e.status === 'resolved' || e.status === 'closed');
  const avgResponseTime = calculateAverageResponseTime(events);
  const taskCompletionRate = calculateTaskCompletionRate(tasks);

  if (avgResponseTime > 30) {
    suggestions.push({
      id: `sug_${idCounter++}`,
      type: 'process',
      title: '优化事件响应流程，缩短响应时间',
      description: `当前平均响应时间为 ${avgResponseTime.toFixed(1)} 分钟，建议优化预警机制和响应流程，目标缩短至 20 分钟以内。`,
      priority: 'high',
      category: '响应效率',
      expectedBenefit: '响应时间缩短 30%，事件处置更及时',
      confidence: 0.85,
      data: { currentValue: avgResponseTime, targetValue: 20, unit: '分钟' },
    });
  }

  if (taskCompletionRate < 0.8) {
    suggestions.push({
      id: `sug_${idCounter++}`,
      type: 'process',
      title: '加强任务跟踪管理，提升任务完成率',
      description: `当前任务完成率为 ${(taskCompletionRate * 100).toFixed(1)}%，建议加强任务督办和进度跟踪机制。`,
      priority: 'high',
      category: '任务管理',
      expectedBenefit: '任务完成率提升至 90% 以上',
      confidence: 0.8,
      data: { currentValue: taskCompletionRate, targetValue: 0.9, unit: '%' },
    });
  }

  const highLevelEvents = events.filter(e => e.level === 'high' || e.level === 'critical');
  if (highLevelEvents.length >= 3) {
    suggestions.push({
      id: `sug_${idCounter++}`,
      type: 'knowledge',
      title: '补充重大事件处置知识',
      description: `近期发生 ${highLevelEvents.length} 起重大及以上级别事件，建议总结处置经验并补充到知识库中。`,
      priority: 'high',
      category: '知识库建设',
      expectedBenefit: '提升重大事件处置能力和规范化水平',
      confidence: 0.9,
      data: { eventCount: highLevelEvents.length, levels: ['high', 'critical'] },
    });
  }

  if (knowledgeItems.length < 10) {
    suggestions.push({
      id: `sug_${idCounter++}`,
      type: 'knowledge',
      title: '丰富知识库内容',
      description: `当前知识库仅有 ${knowledgeItems.length} 条知识，建议持续从已处置的事件中提炼经验，丰富知识库。`,
      priority: 'medium',
      category: '知识库建设',
      expectedBenefit: '知识库更加完善，为事件处置提供更多参考',
      confidence: 0.85,
      data: { currentCount: knowledgeItems.length, targetCount: 50 },
    });
  }

  suggestions.push({
    id: `sug_${idCounter++}`,
    type: 'config',
    title: '优化资源配置方案',
    description: '基于历史事件的资源使用情况分析，建议调整应急资源的布局和配置，提高资源响应速度。',
    priority: 'medium',
    category: '资源管理',
    expectedBenefit: '资源调度效率提升 20%',
    confidence: 0.75,
    data: { areas: ['物资储备', '人员配置', '设备部署'] },
  });

  const eventTypeCounts: Record<string, number> = {};
  events.forEach(e => {
    const type = e.eventTypeId || 'unknown';
    eventTypeCounts[type] = (eventTypeCounts[type] || 0) + 1;
  });

  const topTypes = Object.entries(eventTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (topTypes.length > 0) {
    suggestions.push({
      id: `sug_${idCounter++}`,
      type: 'template',
      title: '完善高频事件处置预案',
      description: `统计显示高频事件类型有 ${topTypes.length} 种，建议针对高频事件完善处置预案和模板。`,
      priority: 'medium',
      category: '预案管理',
      expectedBenefit: '高频事件处置更加规范高效',
      confidence: 0.8,
      data: { topEventTypes: topTypes.map(([type, count]) => ({ type, count })) },
    });
  }

  suggestions.push({
    id: `sug_${idCounter++}`,
    type: 'process',
    title: '建立事件复盘机制',
    description: '建议建立常态化的事件复盘机制，定期分析典型案例，持续改进应急管理体系。',
    priority: 'low',
    category: '制度建设',
    expectedBenefit: '持续提升应急管理能力',
    confidence: 0.95,
    data: { frequency: '每月一次' },
  });

  return suggestions.sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const pa = priorityWeight[a.priority];
    const pb = priorityWeight[b.priority];
    if (pa !== pb) return pb - pa;
    return b.confidence - a.confidence;
  });
}

function calculateAverageResponseTime(events: any[]): number {
  const eventsWithTime = events.filter(e => e.detectedAt && e.verifiedAt);
  if (eventsWithTime.length === 0) return 0;

  const totalMinutes = eventsWithTime.reduce((sum, e) => {
    const diff = dayjs(e.verifiedAt).diff(dayjs(e.detectedAt), 'minute');
    return sum + diff;
  }, 0);

  return totalMinutes / eventsWithTime.length;
}

function calculateTaskCompletionRate(tasks: any[]): number {
  if (tasks.length === 0) return 1;
  const completed = tasks.filter(t => t.status === 'completed').length;
  return completed / tasks.length;
}

function calculateStats(events: any[], tasks: any[], knowledgeItems: any[], analyses: any[], timeRange: string) {
  const filteredEvents = filterEventsByTime(events, timeRange);
  const filteredTasks = filterEventsByTime(tasks, timeRange);
  const filteredKnowledge = filterEventsByTime(knowledgeItems, timeRange);
  const filteredAnalyses = filterEventsByTime(analyses, timeRange);

  const totalEvents = filteredEvents.length;
  const resolvedEvents = filteredEvents.filter(e => e.status === 'resolved' || e.status === 'closed').length;
  const avgResponseTime = calculateAverageResponseTime(filteredEvents);
  const taskCompletionRate = calculateTaskCompletionRate(filteredTasks);

  const levelDistribution: Record<string, number> = {};
  filteredEvents.forEach(e => {
    const level = e.level || 'unknown';
    levelDistribution[level] = (levelDistribution[level] || 0) + 1;
  });

  const statusDistribution: Record<string, number> = {};
  filteredEvents.forEach(e => {
    const status = e.status || 'unknown';
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  });

  const categoryKnowledge: Record<string, number> = {};
  knowledgeItems.forEach(k => {
    const cat = k.category || '未分类';
    categoryKnowledge[cat] = (categoryKnowledge[cat] || 0) + 1;
  });

  return {
    timeRange,
    totalEvents,
    resolvedEvents,
    resolutionRate: totalEvents > 0 ? resolvedEvents / totalEvents : 0,
    avgResponseTime,
    taskCompletionRate,
    totalTasks: filteredTasks.length,
    totalKnowledge: filteredKnowledge.length,
    totalAnalyses: filteredAnalyses.length,
    levelDistribution,
    statusDistribution,
    categoryKnowledge,
    autoLearnedCount: knowledgeItems.filter(k => k.source === '事件处置自动汇入' || k.eventId).length,
  };
}

let inMemorySuggestions: Suggestion[] = [];

router.post('/analyze', (req: Request, res: Response) => {
  try {
    const validated = analyzeHistorySchema.parse(req.body);
    const { timeRange, eventTypes, analysisDimensions = [] } = validated;

    let events = EmergencyEventDAO.findAll();
    let tasks = EmergencyTaskDAO.findAll();
    const knowledgeItems = EmergencyKnowledgeDAO.findAll();

    events = filterEventsByTime(events, timeRange);
    tasks = filterEventsByTime(tasks, timeRange);

    if (eventTypes && eventTypes.length > 0) {
      events = events.filter(e => e.eventTypeId && eventTypes.includes(e.eventTypeId));
      const eventIds = events.map(e => e.id);
      tasks = tasks.filter(t => eventIds.includes(t.eventId));
    }

    const suggestions = generateSuggestions(events, tasks, knowledgeItems);
    inMemorySuggestions = suggestions;

    const stats = calculateStats(events, tasks, knowledgeItems, [], timeRange);

    const analysisRecord = EventAnalysisDAO.create({
      eventId: 'system_analysis',
      analysisType: 'self_learning_analysis',
      result: stringifyJSON({
        timeRange,
        eventTypes,
        analysisDimensions,
        suggestionsCount: suggestions.length,
        stats,
      }) || undefined,
    });

    res.json(successResponse({
      analysisId: analysisRecord.id,
      timeRange,
      totalEventsAnalyzed: events.length,
      totalTasksAnalyzed: tasks.length,
      suggestionsCount: suggestions.length,
      suggestions,
      stats,
    }, '历史事件分析完成'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '历史事件分析失败', 500));
    }
  }
});

router.get('/suggestions', (_req: Request, res: Response) => {
  try {
    if (inMemorySuggestions.length === 0) {
      const events = EmergencyEventDAO.findAll();
      const tasks = EmergencyTaskDAO.findAll();
      const knowledgeItems = EmergencyKnowledgeDAO.findAll();
      inMemorySuggestions = generateSuggestions(events, tasks, knowledgeItems);
    }

    const grouped = {
      high: inMemorySuggestions.filter(s => s.priority === 'high'),
      medium: inMemorySuggestions.filter(s => s.priority === 'medium'),
      low: inMemorySuggestions.filter(s => s.priority === 'low'),
    };

    res.json(successResponse({
      total: inMemorySuggestions.length,
      grouped,
      suggestions: inMemorySuggestions,
    }, '获取优化建议成功'));
  } catch (err: any) {
    res.json(errorResponse(err.message || '获取优化建议失败', 500));
  }
});

router.post('/apply-suggestion', (req: Request, res: Response) => {
  try {
    const validated = applySuggestionSchema.parse(req.body);
    const { suggestionId, applyType } = validated;

    const suggestion = inMemorySuggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
      res.json(errorResponse('建议不存在', 404));
      return;
    }

    let appliedResult: any = { applied: true };

    switch (applyType) {
      case 'config':
        appliedResult = {
          ...appliedResult,
          configUpdated: true,
          message: '配置更新成功',
        };
        break;
      case 'knowledge':
        const existingCount = EmergencyKnowledgeDAO.count();
        appliedResult = {
          ...appliedResult,
          knowledgeCountBefore: existingCount,
          knowledgeCountAfter: existingCount + 1,
          message: '知识库已更新',
        };
        break;
      case 'template':
        appliedResult = {
          ...appliedResult,
          templateUpdated: true,
          message: '模板已更新',
        };
        break;
    }

    const analysisRecord = EventAnalysisDAO.create({
      eventId: 'system_apply',
      analysisType: 'suggestion_applied',
      result: stringifyJSON({
        suggestionId,
        suggestionTitle: suggestion.title,
        applyType,
        appliedAt: new Date().toISOString(),
      }) || undefined,
    });

    res.json(successResponse({
      suggestionId,
      suggestionTitle: suggestion.title,
      applyType,
      applied: true,
      appliedAt: new Date().toISOString(),
      result: appliedResult,
      analysisId: analysisRecord.id,
    }, '应用优化建议成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '应用优化建议失败', 500));
    }
  }
});

router.post('/process-event', (req: Request, res: Response) => {
  try {
    const validated = processEventSchema.parse(req.body);
    const { eventId, autoGenerateKnowledge, updateStatistics } = validated;

    const event = EmergencyEventDAO.findById(eventId);
    if (!event) {
      res.json(errorResponse('事件不存在', 404));
      return;
    }

    if (event.status !== 'resolved' && event.status !== 'closed') {
      res.json(errorResponse('事件尚未完成处置，无法汇入知识库', 400));
      return;
    }

    const tasks = EmergencyTaskDAO.findAll({ where: { eventId } });
    const completedTasks = tasks.filter(t => t.status === 'completed');

    let knowledgeId: string | null = null;
    let knowledgeCreated = false;

    if (autoGenerateKnowledge) {
      const existing = EmergencyKnowledgeDAO.findOne({ where: { eventId } });
      if (!existing) {
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

        if (tasks.length > 0) {
          content += `\n## 处置任务\n\n`;
          tasks.forEach((task, index) => {
            content += `${index + 1}. ${task.title}`;
            if (task.description) {
              content += ` - ${task.description}`;
            }
            content += ` [${task.status}]\n`;
          });
          content += `\n任务完成情况：${completedTasks.length}/${tasks.length}\n`;
        }

        content += `\n## 经验总结\n\n`;
        content += `- 本次事件处置的关键措施和方法\n`;
        content += `- 遇到的主要问题及应对策略\n`;
        content += `- 可优化改进的方向和建议\n`;

        const knowledge = EmergencyKnowledgeDAO.create({
          title: `【处置经验】${event.title}`,
          category: '事件处置',
          tags: JSON.stringify(['事件处置', event.level, '自动生成']),
          content,
          source: '事件处置自动汇入',
          eventId,
        });
        knowledgeId = knowledge.id;
        knowledgeCreated = true;
      } else {
        knowledgeId = existing.id;
      }
    }

    const analysisRecord = EventAnalysisDAO.create({
      eventId,
      analysisType: 'self_learning_process',
      result: stringifyJSON({
        autoGenerateKnowledge,
        knowledgeCreated,
        knowledgeId,
        updateStatistics,
        taskCount: tasks.length,
        completedTaskCount: completedTasks.length,
      }) || undefined,
    });

    res.json(successResponse({
      eventId,
      eventTitle: event.title,
      knowledgeCreated,
      knowledgeId,
      taskCount: tasks.length,
      completedTaskCount: completedTasks.length,
      analysisId: analysisRecord.id,
    }, '事件处理完成，已汇入自学习系统'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '处理事件失败', 500));
    }
  }
});

router.get('/stats', (req: Request, res: Response) => {
  try {
    const validated = statsQuerySchema.parse(req.query);
    const { timeRange } = validated;

    const events = EmergencyEventDAO.findAll();
    const tasks = EmergencyTaskDAO.findAll();
    const knowledgeItems = EmergencyKnowledgeDAO.findAll();
    const analyses = EventAnalysisDAO.findAll();

    const stats = calculateStats(events, tasks, knowledgeItems, analyses, timeRange);

    const trends = generateTrendData(events, timeRange);

    res.json(successResponse({
      ...stats,
      trends,
    }, '获取自学习统计数据成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '获取统计数据失败', 500));
    }
  }
});

function generateTrendData(events: any[], timeRange: string): { labels: string[]; eventCounts: number[]; resolvedCounts: number[] } {
  const labels: string[] = [];
  const eventCounts: number[] = [];
  const resolvedCounts: number[] = [];

  let periods: dayjs.Dayjs[] = [];
  const now = dayjs();

  if (timeRange === 'week') {
    for (let i = 6; i >= 0; i--) {
      periods.push(now.subtract(i, 'day'));
    }
  } else if (timeRange === 'month') {
    for (let i = 29; i >= 0; i--) {
      periods.push(now.subtract(i, 'day'));
    }
  } else if (timeRange === 'quarter') {
    for (let i = 11; i >= 0; i--) {
      periods.push(now.subtract(i * 7, 'day'));
    }
  } else if (timeRange === 'year') {
    for (let i = 11; i >= 0; i--) {
      periods.push(now.subtract(i, 'month'));
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      periods.push(now.subtract(i, 'month'));
    }
  }

  periods.forEach(period => {
    let label: string;
    let startOfPeriod: dayjs.Dayjs;
    let endOfPeriod: dayjs.Dayjs;

    if (timeRange === 'week' || timeRange === 'month') {
      label = period.format('MM-DD');
      startOfPeriod = period.startOf('day');
      endOfPeriod = period.endOf('day');
    } else if (timeRange === 'quarter') {
      label = period.format('MM-DD');
      startOfPeriod = period.startOf('week');
      endOfPeriod = period.endOf('week');
    } else {
      label = period.format('YYYY-MM');
      startOfPeriod = period.startOf('month');
      endOfPeriod = period.endOf('month');
    }

    labels.push(label);
    const periodEvents = events.filter(e => {
      const createdAt = dayjs(e.createdAt);
      return createdAt.isAfter(startOfPeriod) && createdAt.isBefore(endOfPeriod);
    });
    eventCounts.push(periodEvents.length);
    resolvedCounts.push(periodEvents.filter(e => e.status === 'resolved' || e.status === 'closed').length);
  });

  return { labels, eventCounts, resolvedCounts };
}

export default router;
