import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { EmergencyEventDAO, EmergencyTaskDAO, EmergencySolutionTemplateDAO, EmergencyEventTypeDAO } from '../../db/dao.js';
import { successResponse, errorResponse, now, parseJSON, stringifyJSON } from '../../utils/common.js';

const router = Router();

const generateSolutionSchema = z.object({
  eventId: z.string().min(1, '事件ID不能为空'),
  extraRequirements: z.string().optional(),
});

const generateTaskSchema = z.object({
  eventId: z.string().min(1, '事件ID不能为空'),
  solution: z.any().optional(),
});

const solutionFromTemplateSchema = z.object({
  eventId: z.string().min(1, '事件ID不能为空'),
  templateId: z.string().optional(),
});

const solutionTemplates: Record<string, Record<string, any>> = {
  fire: {
    low: {
      name: '小型火灾应急方案',
      steps: [
        '确认火情位置和范围',
        '使用就近灭火器进行初期扑救',
        '疏散周边人员到安全区域',
        '上报应急管理部门',
      ],
      resources: [
        { type: '灭火器', quantity: 2, unit: '具' },
        { type: '消防水带', quantity: 1, unit: '套' },
      ],
      personnel: [
        { role: '现场指挥员', count: 1 },
        { role: '灭火人员', count: 2 },
        { role: '疏散引导员', count: 1 },
      ],
      notes: [
        '注意人身安全，火势扩大立即撤离',
        '保持通讯畅通',
        '禁止乘坐电梯',
      ],
    },
    medium: {
      name: '中型火灾应急方案',
      steps: [
        '立即启动火灾应急预案',
        '拨打119报警并说明详细情况',
        '组织人员有序疏散',
        '切断电源和气源',
        '使用消防设施进行初期控制',
        '设立警戒线，禁止无关人员进入',
        '接应消防救援人员并提供现场信息',
      ],
      resources: [
        { type: '灭火器', quantity: 5, unit: '具' },
        { type: '消防水带', quantity: 3, unit: '套' },
        { type: '防烟面具', quantity: 10, unit: '个' },
        { type: '应急照明', quantity: 5, unit: '个' },
      ],
      personnel: [
        { role: '现场总指挥', count: 1 },
        { role: '灭火组', count: 4 },
        { role: '疏散组', count: 4 },
        { role: '通讯联络组', count: 2 },
        { role: '医疗救护组', count: 2 },
      ],
      notes: [
        '优先保障人员生命安全',
        '确保疏散通道畅通',
        '做好现场保护，便于事故调查',
        '及时向上级汇报进展',
      ],
    },
    high: {
      name: '重大火灾应急方案',
      steps: [
        '立即启动最高级别应急预案',
        '拨打119、120、110等应急电话',
        '成立现场应急指挥部',
        '组织全员疏散，清点人数',
        '切断所有电源、气源',
        '开启消防广播系统',
        '组织专业灭火力量进行扑救',
        '设立多层警戒线',
        '协调周边救援资源',
        '及时发布官方信息',
        '做好伤员救治和转运',
      ],
      resources: [
        { type: '灭火器', quantity: 10, unit: '具' },
        { type: '消防水带', quantity: 6, unit: '套' },
        { type: '防烟面具', quantity: 30, unit: '个' },
        { type: '应急照明', quantity: 15, unit: '个' },
        { type: '担架', quantity: 3, unit: '副' },
        { type: '急救箱', quantity: 3, unit: '个' },
        { type: '对讲机', quantity: 10, unit: '部' },
      ],
      personnel: [
        { role: '总指挥', count: 1 },
        { role: '副总指挥', count: 2 },
        { role: '灭火行动组', count: 8 },
        { role: '疏散引导组', count: 8 },
        { role: '通讯联络组', count: 3 },
        { role: '医疗救护组', count: 5 },
        { role: '后勤保障组', count: 4 },
        { role: '安保警戒组', count: 6 },
      ],
      notes: [
        '人员生命安全是第一位的',
        '统一指挥，协同作战',
        '防止次生灾害发生',
        '做好舆情监测和信息发布',
        '确保救援人员自身安全',
        '事后及时总结评估',
      ],
    },
    critical: {
      name: '特别重大火灾应急方案',
      steps: [
        '立即启动国家级/省级应急预案',
        '上报上级政府和应急管理部门',
        '成立省级现场应急指挥部',
        '协调多部门联合救援',
        '组织大规模人员疏散转移',
        '调集周边消防力量增援',
        '启动医疗应急响应',
        '开辟应急绿色通道',
        '调集应急物资和装备',
        '做好环境监测',
        '及时召开新闻发布会',
        '组织善后处理工作',
      ],
      resources: [
        { type: '灭火器', quantity: 20, unit: '具' },
        { type: '消防水带', quantity: 10, unit: '套' },
        { type: '防烟面具', quantity: 50, unit: '个' },
        { type: '应急照明', quantity: 30, unit: '个' },
        { type: '担架', quantity: 10, unit: '副' },
        { type: '急救箱', quantity: 10, unit: '个' },
        { type: '对讲机', quantity: 30, unit: '部' },
        { type: '消防车', quantity: 5, unit: '辆' },
        { type: '救护车', quantity: 5, unit: '辆' },
      ],
      personnel: [
        { role: '总指挥', count: 1 },
        { role: '副总指挥', count: 4 },
        { role: '灭火行动组', count: 20 },
        { role: '疏散引导组', count: 20 },
        { role: '通讯联络组', count: 6 },
        { role: '医疗救护组', count: 15 },
        { role: '后勤保障组', count: 10 },
        { role: '安保警戒组', count: 15 },
        { role: '新闻宣传组', count: 5 },
        { role: '专家组', count: 5 },
      ],
      notes: [
        '坚持以人为本，生命至上',
        '统一指挥，分级负责',
        '区域联动，资源共享',
        '科学施救，确保安全',
        '及时公开信息，回应社会关切',
        '做好灾后重建准备',
        '全面调查事故原因',
      ],
    },
  },
  flood: {
    low: {
      name: '小型洪涝应急方案',
      steps: [
        '监测水位变化趋势',
        '转移低洼区域物资',
        '疏通排水管道',
        '设置警示标志',
      ],
      resources: [
        { type: '沙袋', quantity: 50, unit: '袋' },
        { type: '抽水泵', quantity: 1, unit: '台' },
        { type: '雨衣雨鞋', quantity: 10, unit: '套' },
      ],
      personnel: [
        { role: '现场负责人', count: 1 },
        { role: '巡查人员', count: 2 },
      ],
      notes: [
        '注意用电安全',
        '避免涉水行走',
        '关注天气预报',
      ],
    },
    medium: {
      name: '中型洪涝应急方案',
      steps: [
        '启动防汛应急预案',
        '加密水位监测频次',
        '组织低洼地区人员转移',
        '加固堤防和危险区域',
        '开启排水设施',
        '设置安全警戒线',
        '做好物资调度准备',
      ],
      resources: [
        { type: '沙袋', quantity: 200, unit: '袋' },
        { type: '抽水泵', quantity: 3, unit: '台' },
        { type: '雨衣雨鞋', quantity: 30, unit: '套' },
        { type: '手电筒', quantity: 20, unit: '个' },
        { type: '救生衣', quantity: 20, unit: '件' },
      ],
      personnel: [
        { role: '现场总指挥', count: 1 },
        { role: '巡查监测组', count: 4 },
        { role: '人员转移组', count: 6 },
        { role: '工程抢险组', count: 6 },
        { role: '后勤保障组', count: 3 },
      ],
      notes: [
        '确保转移人员基本生活保障',
        '保持通讯畅通',
        '注意防止触电事故',
        '做好卫生防疫工作',
      ],
    },
    high: {
      name: '重大洪涝应急方案',
      steps: [
        '启动重大洪涝应急预案',
        '上报上级防汛指挥部',
        '成立现场应急指挥部',
        '组织危险区域全员转移',
        '调集抢险力量和物资',
        '实施堤防加固和抢险',
        '开启全部排水设施',
        '设置临时安置点',
        '组织医疗救护队伍',
        '做好后勤保障供应',
      ],
      resources: [
        { type: '沙袋', quantity: 500, unit: '袋' },
        { type: '抽水泵', quantity: 8, unit: '台' },
        { type: '雨衣雨鞋', quantity: 100, unit: '套' },
        { type: '手电筒', quantity: 50, unit: '个' },
        { type: '救生衣', quantity: 100, unit: '件' },
        { type: '冲锋舟', quantity: 2, unit: '艘' },
        { type: '应急食品', quantity: 500, unit: '份' },
        { type: '饮用水', quantity: 1000, unit: '瓶' },
      ],
      personnel: [
        { role: '总指挥', count: 1 },
        { role: '副总指挥', count: 2 },
        { role: '巡查监测组', count: 8 },
        { role: '人员转移组', count: 15 },
        { role: '工程抢险组', count: 15 },
        { role: '医疗救护组', count: 8 },
        { role: '后勤保障组', count: 10 },
        { role: '安保组', count: 8 },
      ],
      notes: [
        '人民生命安全放在首位',
        '统一指挥，协同作战',
        '确保转移群众基本生活',
        '做好卫生防疫工作',
        '及时发布预警信息',
      ],
    },
    critical: {
      name: '特别重大洪涝应急方案',
      steps: [
        '启动国家级/省级防汛应急预案',
        '上报国家防汛抗旱总指挥部',
        '成立省级应急指挥部',
        '协调解放军和武警部队支援',
        '组织大规模人员转移安置',
        '调集全国防汛物资支援',
        '实施大规模抢险救灾',
        '设立临时安置点和医疗点',
        '启动生活必需品应急供应',
        '做好卫生防疫工作',
        '组织灾后恢复重建',
        '及时发布权威信息',
      ],
      resources: [
        { type: '沙袋', quantity: 2000, unit: '袋' },
        { type: '抽水泵', quantity: 20, unit: '台' },
        { type: '雨衣雨鞋', quantity: 300, unit: '套' },
        { type: '手电筒', quantity: 200, unit: '个' },
        { type: '救生衣', quantity: 300, unit: '件' },
        { type: '冲锋舟', quantity: 10, unit: '艘' },
        { type: '应急食品', quantity: 5000, unit: '份' },
        { type: '饮用水', quantity: 10000, unit: '瓶' },
        { type: '帐篷', quantity: 200, unit: '顶' },
        { type: '棉被', quantity: 500, unit: '床' },
      ],
      personnel: [
        { role: '总指挥', count: 1 },
        { role: '副总指挥', count: 5 },
        { role: '巡查监测组', count: 20 },
        { role: '人员转移组', count: 50 },
        { role: '工程抢险组', count: 50 },
        { role: '医疗救护组', count: 30 },
        { role: '后勤保障组', count: 30 },
        { role: '安保组', count: 30 },
        { role: '新闻宣传组', count: 10 },
        { role: '专家组', count: 10 },
      ],
      notes: [
        '坚持生命至上，安全第一',
        '全国一盘棋，统一调度',
        '军地协同，军民联防',
        '科学防控，精准施策',
        '做好灾后重建规划',
        '及时公开信息，回应社会关切',
      ],
    },
  },
  earthquake: {
    low: {
      name: '小型地震应急方案',
      steps: [
        '保持镇静，就地避险',
        '远离窗户和高大家具',
        '检查是否有人员受伤',
        '检查建筑结构安全',
      ],
      resources: [
        { type: '急救箱', quantity: 2, unit: '个' },
        { type: '手电筒', quantity: 5, unit: '个' },
        { type: '应急食品', quantity: 20, unit: '份' },
      ],
      personnel: [
        { role: '现场负责人', count: 1 },
        { role: '急救人员', count: 2 },
      ],
      notes: [
        '不要惊慌乱跑',
        '注意余震',
        '关闭燃气阀门',
      ],
    },
    medium: {
      name: '中型地震应急方案',
      steps: [
        '启动地震应急预案',
        '组织人员疏散到安全地带',
        '清点人数，搜救被困人员',
        '检查建筑损坏情况',
        '切断电源、气源，防止火灾',
        '设立临时避难场所',
        '调配应急物资',
        '上报灾情信息',
      ],
      resources: [
        { type: '急救箱', quantity: 5, unit: '个' },
        { type: '手电筒', quantity: 20, unit: '个' },
        { type: '应急食品', quantity: 100, unit: '份' },
        { type: '饮用水', quantity: 200, unit: '瓶' },
        { type: '帐篷', quantity: 20, unit: '顶' },
        { type: '担架', quantity: 5, unit: '副' },
      ],
      personnel: [
        { role: '现场总指挥', count: 1 },
        { role: '搜救组', count: 8 },
        { role: '医疗救护组', count: 6 },
        { role: '疏散安置组', count: 8 },
        { role: '后勤保障组', count: 4 },
      ],
      notes: [
        '优先搜救被困人员',
        '注意余震危险',
        '确保避难场所基本生活条件',
        '做好心理疏导工作',
      ],
    },
    high: {
      name: '重大地震应急方案',
      steps: [
        '启动重大地震应急预案',
        '上报上级地震部门和政府',
        '成立现场应急指挥部',
        '组织大规模搜救行动',
        '调集医疗救援力量',
        '设置临时医疗点',
        '建立临时安置区',
        '调配应急物资',
        '组织危房排查',
        '做好卫生防疫',
      ],
      resources: [
        { type: '急救箱', quantity: 20, unit: '个' },
        { type: '手电筒', quantity: 100, unit: '个' },
        { type: '应急食品', quantity: 1000, unit: '份' },
        { type: '饮用水', quantity: 2000, unit: '瓶' },
        { type: '帐篷', quantity: 200, unit: '顶' },
        { type: '担架', quantity: 20, unit: '副' },
        { type: '生命探测仪', quantity: 2, unit: '台' },
        { type: '挖掘机', quantity: 3, unit: '台' },
      ],
      personnel: [
        { role: '总指挥', count: 1 },
        { role: '副总指挥', count: 3 },
        { role: '搜救组', count: 30 },
        { role: '医疗救护组', count: 20 },
        { role: '疏散安置组', count: 25 },
        { role: '工程抢险组', count: 20 },
        { role: '后勤保障组', count: 15 },
        { role: '卫生防疫组', count: 10 },
      ],
      notes: [
        '生命第一，救人优先',
        '科学施救，防止次生灾害',
        '统一指挥，协同作战',
        '保障基本生活需求',
        '做好疫情防控',
      ],
    },
    critical: {
      name: '特别重大地震应急方案',
      steps: [
        '启动国家级地震应急预案',
        '上报国务院和国家地震局',
        '成立国家抗震救灾指挥部',
        '协调解放军和武警部队参与救援',
        '组织全国医疗力量支援',
        '开展大规模生命搜救',
        '建立临时医院和安置点',
        '调集全国救灾物资',
        '抢修基础设施',
        '组织卫生防疫工作',
        '启动灾后恢复重建',
        '及时发布权威信息',
      ],
      resources: [
        { type: '急救箱', quantity: 100, unit: '个' },
        { type: '手电筒', quantity: 500, unit: '个' },
        { type: '应急食品', quantity: 10000, unit: '份' },
        { type: '饮用水', quantity: 20000, unit: '瓶' },
        { type: '帐篷', quantity: 2000, unit: '顶' },
        { type: '担架', quantity: 100, unit: '副' },
        { type: '生命探测仪', quantity: 20, unit: '台' },
        { type: '挖掘机', quantity: 30, unit: '台' },
        { type: '救护车', quantity: 50, unit: '辆' },
        { type: '直升机', quantity: 5, unit: '架' },
      ],
      personnel: [
        { role: '总指挥', count: 1 },
        { role: '副总指挥', count: 6 },
        { role: '搜救组', count: 200 },
        { role: '医疗救护组', count: 100 },
        { role: '疏散安置组', count: 100 },
        { role: '工程抢险组', count: 100 },
        { role: '后勤保障组', count: 80 },
        { role: '卫生防疫组', count: 50 },
        { role: '新闻宣传组', count: 20 },
        { role: '专家组', count: 20 },
      ],
      notes: [
        '人民生命高于一切',
        '全国一盘棋，集中力量办大事',
        '军地协同，上下联动',
        '科学救灾，精准施策',
        '做好灾后重建总体规划',
        '及时公开信息，回应社会关切',
      ],
    },
  },
  default: {
    low: {
      name: '一般突发事件应急方案',
      steps: [
        '确认事件性质和影响范围',
        '采取初步控制措施',
        '上报相关部门',
        '做好记录和现场保护',
      ],
      resources: [
        { type: '急救箱', quantity: 1, unit: '个' },
        { type: '手电筒', quantity: 3, unit: '个' },
      ],
      personnel: [
        { role: '现场负责人', count: 1 },
        { role: '工作人员', count: 2 },
      ],
      notes: [
        '保持冷静，妥善处置',
        '注意人身安全',
        '及时上报',
      ],
    },
    medium: {
      name: '较大突发事件应急方案',
      steps: [
        '启动应急预案',
        '组织人员疏散',
        '控制事态发展',
        '调集应急资源',
        '上报上级部门',
        '做好信息记录',
      ],
      resources: [
        { type: '急救箱', quantity: 3, unit: '个' },
        { type: '手电筒', quantity: 10, unit: '个' },
        { type: '应急食品', quantity: 50, unit: '份' },
      ],
      personnel: [
        { role: '现场总指挥', count: 1 },
        { role: '处置组', count: 6 },
        { role: '疏散组', count: 4 },
        { role: '后勤组', count: 3 },
      ],
      notes: [
        '确保人员安全',
        '控制事态扩大',
        '保持通讯畅通',
      ],
    },
    high: {
      name: '重大突发事件应急方案',
      steps: [
        '启动重大突发事件应急预案',
        '成立应急指挥部',
        '组织人员疏散转移',
        '调集专业救援力量',
        '设置临时安置点',
        '调配应急物资',
        '做好医疗救护',
        '及时上报情况',
      ],
      resources: [
        { type: '急救箱', quantity: 10, unit: '个' },
        { type: '手电筒', quantity: 30, unit: '个' },
        { type: '应急食品', quantity: 500, unit: '份' },
        { type: '饮用水', quantity: 1000, unit: '瓶' },
        { type: '帐篷', quantity: 50, unit: '顶' },
        { type: '担架', quantity: 10, unit: '副' },
      ],
      personnel: [
        { role: '总指挥', count: 1 },
        { role: '副总指挥', count: 2 },
        { role: '救援组', count: 20 },
        { role: '疏散组', count: 15 },
        { role: '医疗组', count: 10 },
        { role: '后勤组', count: 10 },
        { role: '安保组', count: 10 },
      ],
      notes: [
        '生命至上，安全第一',
        '统一指挥，快速响应',
        '科学处置，协同应对',
      ],
    },
    critical: {
      name: '特别重大突发事件应急方案',
      steps: [
        '启动特别重大突发事件应急预案',
        '上报党中央、国务院',
        '成立国家应急指挥部',
        '协调全国资源支援',
        '组织大规模救援行动',
        '安置受灾群众',
        '调集全国医疗力量',
        '抢修基础设施',
        '做好卫生防疫',
        '组织灾后重建',
        '发布权威信息',
      ],
      resources: [
        { type: '急救箱', quantity: 50, unit: '个' },
        { type: '手电筒', quantity: 200, unit: '个' },
        { type: '应急食品', quantity: 5000, unit: '份' },
        { type: '饮用水', quantity: 10000, unit: '瓶' },
        { type: '帐篷', quantity: 500, unit: '顶' },
        { type: '担架', quantity: 50, unit: '副' },
        { type: '救护车', quantity: 20, unit: '辆' },
      ],
      personnel: [
        { role: '总指挥', count: 1 },
        { role: '副总指挥', count: 5 },
        { role: '救援组', count: 100 },
        { role: '疏散组', count: 80 },
        { role: '医疗组', count: 50 },
        { role: '后勤组', count: 50 },
        { role: '安保组', count: 50 },
        { role: '宣传组', count: 15 },
        { role: '专家组', count: 15 },
      ],
      notes: [
        '坚持以人民为中心',
        '统一领导，统一指挥',
        '全国动员，全民参与',
        '科学应对，精准施策',
        '及时公开，透明发布',
      ],
    },
  },
};

const eventTypeMapping: Record<string, string> = {
  fire: 'fire',
  flood: 'flood',
  earthquake: 'earthquake',
  traffic: 'default',
  chemical: 'default',
  public_health: 'default',
  public_security: 'default',
};

function generateSolution(event: any, extraRequirements?: string) {
  const eventType = event.eventTypeId || 'default';
  const level = event.level || 'medium';

  let typeKey = 'default';
  for (const [key, value] of Object.entries(eventTypeMapping)) {
    if (eventType.toLowerCase().includes(key)) {
      typeKey = value;
      break;
    }
  }

  const template = solutionTemplates[typeKey]?.[level] || solutionTemplates.default[level];

  const solution = {
    ...template,
    eventId: event.id,
    eventTitle: event.title,
    eventLevel: level,
    eventDescription: event.description,
    eventLocation: event.location,
    generatedAt: now(),
    extraRequirements: extraRequirements || null,
    estimatedDuration: getEstimatedDuration(level),
  };

  return solution;
}

function getEstimatedDuration(level: string): string {
  const durationMap: Record<string, string> = {
    low: '1-2小时',
    medium: '4-8小时',
    high: '24-48小时',
    critical: '72小时以上',
  };
  return durationMap[level] || '2-4小时';
}

function generateTasksFromSolution(eventId: string, solution: any) {
  const tasks: any[] = [];

  solution.steps.forEach((step: string, index: number) => {
    const priority = index < 2 ? 'high' : index < 5 ? 'medium' : 'low';

    tasks.push({
      eventId,
      title: `第${index + 1}步：${step}`,
      description: step,
      status: 'pending',
      priority,
      solutionData: {
        stepIndex: index,
        stepDescription: step,
        solutionName: solution.name,
      },
    });
  });

  return tasks;
}

router.post('/generate-solution', (req: Request, res: Response) => {
  try {
    const body = generateSolutionSchema.parse(req.body);

    const event = EmergencyEventDAO.findById(body.eventId);
    if (!event) {
      res.status(404).json(errorResponse('事件不存在', 404));
      return;
    }

    const solution = generateSolution(event, body.extraRequirements);

    const existingData = parseJSON(event.data) || {};
    const newData = {
      ...existingData,
      solution,
    };

    EmergencyEventDAO.update(body.eventId, {
      data: stringifyJSON(newData) ?? undefined,
    });

    res.json(successResponse({
      solution,
    }, '应急方案生成成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '方案生成失败', 500));
    }
  }
});

router.post('/generate-task', (req: Request, res: Response) => {
  try {
    const body = generateTaskSchema.parse(req.body);

    const event = EmergencyEventDAO.findById(body.eventId);
    if (!event) {
      res.status(404).json(errorResponse('事件不存在', 404));
      return;
    }

    let solution = body.solution;
    if (!solution) {
      solution = generateSolution(event);
    }

    const taskDatas = generateTasksFromSolution(body.eventId, solution);

    const createdTasks = taskDatas.map((taskData: any) => {
      return EmergencyTaskDAO.create({
        eventId: taskData.eventId,
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        solutionData: stringifyJSON(taskData.solutionData) ?? undefined,
      });
    });

    const formattedTasks = createdTasks.map((task: any) => ({
      ...task,
      solutionData: parseJSON(task.solutionData),
    }));

    res.json(successResponse({
      tasks: formattedTasks,
      count: createdTasks.length,
    }, '任务生成成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '任务生成失败', 500));
    }
  }
});

router.post('/solution-from-template', (req: Request, res: Response) => {
  try {
    const body = solutionFromTemplateSchema.parse(req.body);

    const event = EmergencyEventDAO.findById(body.eventId);
    if (!event) {
      res.status(404).json(errorResponse('事件不存在', 404));
      return;
    }

    let template = null;

    if (body.templateId) {
      const templateEntity = EmergencySolutionTemplateDAO.findById(body.templateId);
      if (templateEntity) {
        template = {
          ...parseJSON(templateEntity.content),
          name: templateEntity.name,
          templateId: templateEntity.id,
        };
      }
    }

    if (!template) {
      if (event.eventTypeId) {
        const eventType = EmergencyEventTypeDAO.findById(event.eventTypeId);
        if (eventType) {
          const templates = EmergencySolutionTemplateDAO.findAll({
            where: { eventTypeId: event.eventTypeId, status: 'active' },
          });
          if (templates.length > 0) {
            const t = templates[0];
            template = {
              ...parseJSON(t.content),
              name: t.name,
              templateId: t.id,
            };
          }
        }
      }
    }

    if (!template) {
      template = generateSolution(event);
    }

    const taskDatas = generateTasksFromSolution(body.eventId, template);

    const createdTasks = taskDatas.map((taskData: any) => {
      return EmergencyTaskDAO.create({
        eventId: taskData.eventId,
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        solutionData: stringifyJSON(taskData.solutionData) ?? undefined,
      });
    });

    const formattedTasks = createdTasks.map((task: any) => ({
      ...task,
      solutionData: parseJSON(task.solutionData),
    }));

    const existingData = parseJSON(event.data) || {};
    const newData = {
      ...existingData,
      solution: template,
    };

    EmergencyEventDAO.update(body.eventId, {
      data: stringifyJSON(newData) ?? undefined,
    });

    res.json(successResponse({
      solution: template,
      tasks: formattedTasks,
      count: createdTasks.length,
    }, '基于模板的任务生成成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json(errorResponse(err.errors[0].message, 400));
    } else {
      res.status(500).json(errorResponse(err.message || '模板方案生成失败', 500));
    }
  }
});

export default router;
