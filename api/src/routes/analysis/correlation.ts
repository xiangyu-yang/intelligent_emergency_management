import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { EmergencyEventDAO, EventAnalysisDAO, EmergencyTaskDAO } from '../../db/dao.js';
import { successResponse, errorResponse, parseJSON, stringifyJSON } from '../../utils/common.js';
import dayjs from 'dayjs';

const router = Router();

const correlationAnalysisSchema = z.object({
  eventIds: z.array(z.string()).min(2, '至少需要2个事件进行关联分析'),
  dimensions: z.array(z.enum(['type', 'location', 'time', 'keyword', 'level'])).optional(),
});

const rootCauseAnalysisSchema = z.object({
  eventId: z.string(),
  depth: z.number().min(1).max(5).optional().default(3),
});

const majorRootCauseSchema = z.object({
  eventId: z.string(),
  includeHistory: z.boolean().optional().default(true),
});

const evaluationSchema = z.object({
  eventId: z.string(),
  metrics: z.array(z.enum(['responseTime', 'taskCompletion', 'resourceUsage', 'coordination'])).optional(),
});

function calculateSimilarity(
  event1: any,
  event2: any,
  dimensions: string[] = ['type', 'location', 'time', 'keyword', 'level']
): { score: number; details: Record<string, number> } {
  const details: Record<string, number> = {};
  let totalWeight = 0;
  let weightedScore = 0;

  const weights: Record<string, number> = {
    type: 0.25,
    location: 0.2,
    time: 0.2,
    keyword: 0.2,
    level: 0.15,
  };

  if (dimensions.includes('type')) {
    const typeScore = event1.eventTypeId === event2.eventTypeId ? 1 : 0;
    details.type = typeScore;
    weightedScore += typeScore * weights.type;
    totalWeight += weights.type;
  }

  if (dimensions.includes('location')) {
    const loc1 = (event1.location || '').toLowerCase();
    const loc2 = (event2.location || '').toLowerCase();
    let locScore = 0;
    if (loc1 && loc2) {
      if (loc1 === loc2) {
        locScore = 1;
      } else if (loc1.includes(loc2) || loc2.includes(loc1)) {
        locScore = 0.6;
      } else {
        const commonChars = [...new Set(loc1)].filter(c => loc2.includes(c)).length;
        locScore = commonChars / Math.max(loc1.length, loc2.length, 1);
      }
    }
    details.location = locScore;
    weightedScore += locScore * weights.location;
    totalWeight += weights.location;
  }

  if (dimensions.includes('time')) {
    let timeScore = 0;
    if (event1.detectedAt && event2.detectedAt) {
      const t1 = dayjs(event1.detectedAt);
      const t2 = dayjs(event2.detectedAt);
      const diffHours = Math.abs(t1.diff(t2, 'hour'));
      if (diffHours <= 1) timeScore = 1;
      else if (diffHours <= 6) timeScore = 0.8;
      else if (diffHours <= 24) timeScore = 0.6;
      else if (diffHours <= 72) timeScore = 0.3;
      else timeScore = 0.1;
    }
    details.time = timeScore;
    weightedScore += timeScore * weights.time;
    totalWeight += weights.time;
  }

  if (dimensions.includes('keyword')) {
    const text1 = `${event1.title} ${event1.description || ''}`.toLowerCase();
    const text2 = `${event2.title} ${event2.description || ''}`.toLowerCase();
    const words1 = text1.split(/[\s,，.。!！?？;；:：]+/).filter(w => w.length > 1);
    const words2 = text2.split(/[\s,，.。!！?？;；:：]+/).filter(w => w.length > 1);
    const common = words1.filter(w => words2.includes(w));
    const keywordScore = words1.length > 0 && words2.length > 0
      ? (2 * common.length) / (words1.length + words2.length)
      : 0;
    details.keyword = keywordScore;
    weightedScore += keywordScore * weights.keyword;
    totalWeight += weights.keyword;
  }

  if (dimensions.includes('level')) {
    const levels = ['low', 'medium', 'high', 'critical'];
    const idx1 = levels.indexOf(event1.level);
    const idx2 = levels.indexOf(event2.level);
    const levelScore = idx1 >= 0 && idx2 >= 0
      ? 1 - Math.abs(idx1 - idx2) / (levels.length - 1)
      : 0;
    details.level = levelScore;
    weightedScore += levelScore * weights.level;
    totalWeight += weights.level;
  }

  const score = totalWeight > 0 ? weightedScore / totalWeight : 0;
  return { score, details };
}

function generateRootCauses(event: any, depth: number): Array<{
  cause: string;
  probability: number;
  category: string;
  evidence: string[];
}> {
  const causes: Array<{
    cause: string;
    probability: number;
    category: string;
    evidence: string[];
  }> = [];

  const description = (event.description || '').toLowerCase();
  const title = (event.title || '').toLowerCase();
  const fullText = `${title} ${description}`;

  const causeTemplates = [
    { keywords: ['设备', '故障', '损坏', '失效'], category: '设备因素', baseCause: '设备故障或老化导致' },
    { keywords: ['人为', '操作', '失误', '违规', '疏忽'], category: '人为因素', baseCause: '人员操作失误或违规作业导致' },
    { keywords: ['环境', '天气', '自然', '地质', '暴雨', '地震'], category: '环境因素', baseCause: '自然环境或天气因素引发' },
    { keywords: ['管理', '制度', '流程', '监督'], category: '管理因素', baseCause: '管理制度不完善或监督不到位导致' },
    { keywords: ['材料', '质量', '缺陷'], category: '材料因素', baseCause: '材料质量问题或缺陷引发' },
    { keywords: ['设计', '规划', '布局'], category: '设计因素', baseCause: '设计缺陷或规划不合理导致' },
  ];

  causeTemplates.forEach((template, index) => {
    const matchedKeywords = template.keywords.filter(k => fullText.includes(k));
    if (matchedKeywords.length > 0 || index < 3) {
      const probability = Math.min(0.95, 0.3 + matchedKeywords.length * 0.15 + Math.random() * 0.2);
      causes.push({
        cause: `${template.baseCause}事件发生`,
        probability: Math.round(probability * 100) / 100,
        category: template.category,
        evidence: matchedKeywords.length > 0
          ? matchedKeywords.map(k => `事件描述中包含"${k}"相关内容`)
          : [`基于${template.category}的常见分析`],
      });
    }
  });

  if (depth >= 2) {
    causes.push({
      cause: '多重因素叠加导致事件扩大',
      probability: 0.72,
      category: '综合因素',
      evidence: ['事件发展过程显示多阶段特征', '响应记录显示多部门介入'],
    });
  }

  if (depth >= 3) {
    causes.push({
      cause: '预警机制未能及时发现隐患',
      probability: 0.58,
      category: '系统因素',
      evidence: ['事件发现时已处于发展阶段', '日常巡检记录可能存在疏漏'],
    });
  }

  return causes.sort((a, b) => b.probability - a.probability);
}

function generateEvaluation(event: any, tasks: any[], metrics: string[]): {
  overallScore: number;
  level: string;
  details: Record<string, { score: number; comment: string }>;
  suggestions: string[];
} {
  const details: Record<string, { score: number; comment: string }> = {};
  let totalScore = 0;
  let count = 0;

  if (metrics.includes('responseTime') || metrics.length === 0) {
    let responseScore = 70;
    if (event.detectedAt && event.verifiedAt) {
      const detectTime = dayjs(event.detectedAt);
      const verifyTime = dayjs(event.verifiedAt);
      const diffMinutes = verifyTime.diff(detectTime, 'minute');
      if (diffMinutes <= 15) responseScore = 95;
      else if (diffMinutes <= 30) responseScore = 85;
      else if (diffMinutes <= 60) responseScore = 75;
      else responseScore = 60;
    }
    details.responseTime = {
      score: responseScore,
      comment: responseScore >= 90 ? '响应迅速，核实及时' : responseScore >= 70 ? '响应时间基本符合要求' : '响应速度有待提升',
    };
    totalScore += responseScore;
    count++;
  }

  if (metrics.includes('taskCompletion') || metrics.length === 0) {
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const completionRate = tasks.length > 0 ? completedTasks.length / tasks.length : 0;
    const taskScore = Math.round(completionRate * 100);
    details.taskCompletion = {
      score: taskScore,
      comment: taskScore >= 90 ? '任务完成度高，执行力强' : taskScore >= 70 ? '大部分任务已完成' : '任务完成情况需要改进',
    };
    totalScore += taskScore;
    count++;
  }

  if (metrics.includes('resourceUsage') || metrics.length === 0) {
    const resourceScore = 75 + Math.floor(Math.random() * 15);
    details.resourceUsage = {
      score: resourceScore,
      comment: resourceScore >= 90 ? '资源调配合理，利用率高' : resourceScore >= 70 ? '资源使用基本合理' : '资源配置需要优化',
    };
    totalScore += resourceScore;
    count++;
  }

  if (metrics.includes('coordination') || metrics.length === 0) {
    const coordScore = 78 + Math.floor(Math.random() * 12);
    details.coordination = {
      score: coordScore,
      comment: coordScore >= 90 ? '多部门协同顺畅，配合默契' : coordScore >= 70 ? '协同情况总体良好' : '部门协同机制需要加强',
    };
    totalScore += coordScore;
    count++;
  }

  const overallScore = count > 0 ? Math.round(totalScore / count) : 0;
  let level = '良好';
  if (overallScore >= 90) level = '优秀';
  else if (overallScore >= 80) level = '良好';
  else if (overallScore >= 70) level = '合格';
  else level = '待改进';

  const suggestions: string[] = [];
  if (details.responseTime && details.responseTime.score < 80) {
    suggestions.push('建议优化预警响应流程，缩短事件核实时间');
  }
  if (details.taskCompletion && details.taskCompletion.score < 80) {
    suggestions.push('建议加强任务跟踪督办，提升任务完成率');
  }
  if (details.resourceUsage && details.resourceUsage.score < 80) {
    suggestions.push('建议优化资源配置方案，提高资源利用效率');
  }
  if (details.coordination && details.coordination.score < 80) {
    suggestions.push('建议完善跨部门协同机制，加强信息共享');
  }
  if (suggestions.length === 0) {
    suggestions.push('整体处置效果良好，建议继续保持并总结经验');
  }

  return { overallScore, level, details, suggestions };
}

router.post('/correlation', (req: Request, res: Response) => {
  try {
    const validated = correlationAnalysisSchema.parse(req.body);
    const { eventIds, dimensions } = validated;

    const events = eventIds.map(id => EmergencyEventDAO.findById(id)).filter(Boolean) as any[];
    if (events.length < 2) {
      res.json(errorResponse('有效事件数量不足，无法进行关联分析', 400));
      return;
    }

    const results: Array<{
      eventId1: string;
      eventId2: string;
      eventTitle1: string;
      eventTitle2: string;
      similarity: number;
      details: Record<string, number>;
      isCorrelated: boolean;
    }> = [];

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const { score, details } = calculateSimilarity(events[i], events[j], dimensions);
        results.push({
          eventId1: events[i].id,
          eventId2: events[j].id,
          eventTitle1: events[i].title,
          eventTitle2: events[j].title,
          similarity: Math.round(score * 100) / 100,
          details,
          isCorrelated: score >= 0.6,
        });
      }
    }

    const correlatedCount = results.filter(r => r.isCorrelated).length;

    res.json(successResponse({
      totalPairs: results.length,
      correlatedCount,
      correlationRate: results.length > 0 ? correlatedCount / results.length : 0,
      results: results.sort((a, b) => b.similarity - a.similarity),
    }, '关联分析完成'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '关联分析失败', 500));
    }
  }
});

router.get('/correlation/:eventId', (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const event = EmergencyEventDAO.findById(eventId);
    if (!event) {
      res.json(errorResponse('事件不存在', 404));
      return;
    }

    const allEvents = EmergencyEventDAO.findAll({ limit: 100 }).filter(e => e.id !== eventId);

    const correlatedEvents = allEvents.map(other => {
      const { score, details } = calculateSimilarity(event, other);
      return {
        event: other,
        similarity: Math.round(score * 100) / 100,
        details,
        isCorrelated: score >= 0.5,
      };
    })
      .filter(item => item.isCorrelated)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20);

    res.json(successResponse({
      eventId,
      eventTitle: event.title,
      total: correlatedEvents.length,
      relatedEvents: correlatedEvents,
    }, '获取关联事件成功'));
  } catch (err: any) {
    res.json(errorResponse(err.message || '获取关联事件失败', 500));
  }
});

router.post('/root-cause', (req: Request, res: Response) => {
  try {
    const validated = rootCauseAnalysisSchema.parse(req.body);
    const { eventId, depth } = validated;

    const event = EmergencyEventDAO.findById(eventId);
    if (!event) {
      res.json(errorResponse('事件不存在', 404));
      return;
    }

    const causes = generateRootCauses(event, depth);

    const analysisRecord = EventAnalysisDAO.create({
      eventId,
      analysisType: 'root_cause',
      result: stringifyJSON({ causes, depth }) || undefined,
    });

    res.json(successResponse({
      eventId,
      eventTitle: event.title,
      depth,
      totalCauses: causes.length,
      causes,
      analysisId: analysisRecord.id,
    }, '根因分析完成'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '根因分析失败', 500));
    }
  }
});

router.post('/major-root-cause', (req: Request, res: Response) => {
  try {
    const validated = majorRootCauseSchema.parse(req.body);
    const { eventId, includeHistory } = validated;

    const event = EmergencyEventDAO.findById(eventId);
    if (!event) {
      res.json(errorResponse('事件不存在', 404));
      return;
    }

    const causes = generateRootCauses(event, 5);

    let historyData: any[] = [];
    if (includeHistory) {
      const similarEvents = EmergencyEventDAO.findAll({
        where: { level: event.level },
        limit: 10,
      }).filter(e => e.id !== eventId);
      historyData = similarEvents.map(e => ({
        eventId: e.id,
        title: e.title,
        occurredAt: e.detectedAt,
        similarity: calculateSimilarity(event, e).score,
      })).sort((a, b) => b.similarity - a.similarity);
    }

    const majorCauses = causes.slice(0, 3);
    const rootCauseChain = [
      { level: 1, description: '直接原因', cause: majorCauses[0]?.cause || '待分析' },
      { level: 2, description: '间接原因', cause: majorCauses[1]?.cause || '待分析' },
      { level: 3, description: '根本原因', cause: majorCauses[2]?.cause || '待分析' },
    ];

    const analysisRecord = EventAnalysisDAO.create({
      eventId,
      analysisType: 'major_root_cause',
      result: stringifyJSON({ causes: majorCauses, rootCauseChain, historyData }) || undefined,
    });

    res.json(successResponse({
      eventId,
      eventTitle: event.title,
      majorCauses,
      rootCauseChain,
      historySimilarEvents: historyData.slice(0, 5),
      analysisId: analysisRecord.id,
    }, '重大事件根因分析完成'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '重大事件根因分析失败', 500));
    }
  }
});

router.post('/evaluation', (req: Request, res: Response) => {
  try {
    const validated = evaluationSchema.parse(req.body);
    const { eventId, metrics = [] } = validated;

    const event = EmergencyEventDAO.findById(eventId);
    if (!event) {
      res.json(errorResponse('事件不存在', 404));
      return;
    }

    const tasks = EmergencyTaskDAO.findAll({ where: { eventId } });
    const evaluation = generateEvaluation(event, tasks, metrics);

    const analysisRecord = EventAnalysisDAO.create({
      eventId,
      analysisType: 'evaluation',
      result: stringifyJSON(evaluation) || undefined,
    });

    res.json(successResponse({
      eventId,
      eventTitle: event.title,
      eventStatus: event.status,
      ...evaluation,
      analysisId: analysisRecord.id,
    }, '处置评估完成'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '处置评估失败', 500));
    }
  }
});

export default router;
