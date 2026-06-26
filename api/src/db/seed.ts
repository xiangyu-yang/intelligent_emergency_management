import { getDb } from './sqlite.js';
import { nanoid } from 'nanoid';
import dayjs from 'dayjs';

function now() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss');
}

function daysAgo(days: number) {
  return dayjs().subtract(days, 'day').format('YYYY-MM-DD HH:mm:ss');
}

export function seedDatabase() {
  const db = getDb();

  const eventTypeCount = db.prepare('SELECT COUNT(*) as count FROM emergency_event_types').get() as { count: number };
  if (eventTypeCount.count > 0) {
    console.log('[Seed] 数据已存在，跳过初始化');
    return;
  }

  console.log('[Seed] 开始初始化示例数据...');

  const eventTypes = [
    { id: nanoid(), name: '火灾事故', code: 'FIRE', description: '施工现场、办公区域等发生的火灾事故', level: 'high', category: '安全事故', status: 'active' },
    { id: nanoid(), name: '洪涝灾害', code: 'FLOOD', description: '暴雨、洪水等引发的洪涝灾害', level: 'high', category: '自然灾害', status: 'active' },
    { id: nanoid(), name: '地震灾害', code: 'EARTHQUAKE', description: '地震引发的灾害及次生灾害', level: 'critical', category: '自然灾害', status: 'active' },
    { id: nanoid(), name: '高空坠落', code: 'FALL', description: '高处作业人员坠落事故', level: 'high', category: '安全事故', status: 'active' },
    { id: nanoid(), name: '物体打击', code: 'STRIKE', description: '物体坠落打击造成的伤害事故', level: 'medium', category: '安全事故', status: 'active' },
    { id: nanoid(), name: '触电事故', code: 'ELECTRIC', description: '电气设备或线路引发的触电事故', level: 'high', category: '安全事故', status: 'active' },
    { id: nanoid(), name: '机械伤害', code: 'MACHINE', description: '机械设备操作引发的伤害事故', level: 'medium', category: '安全事故', status: 'active' },
    { id: nanoid(), name: '坍塌事故', code: 'COLLAPSE', description: '建筑物、脚手架等坍塌事故', level: 'critical', category: '安全事故', status: 'active' },
    { id: nanoid(), name: '危险化学品泄漏', code: 'CHEMICAL', description: '危险化学品泄漏、爆炸事故', level: 'critical', category: '安全事故', status: 'active' },
    { id: nanoid(), name: '群体性事件', code: 'MASS', description: '群体性突发事件', level: 'medium', category: '公共安全', status: 'active' },
  ];

  const insertEventType = db.prepare(`
    INSERT INTO emergency_event_types (id, name, code, description, level, category, status, createdAt, updatedAt)
    VALUES (@id, @name, @code, @description, @level, @category, @status, @createdAt, @updatedAt)
  `);

  const eventTypeMap = new Map<string, string>();
  for (const et of eventTypes) {
    const data = { ...et, createdAt: now(), updatedAt: now() };
    insertEventType.run(data);
    eventTypeMap.set(et.code, et.id);
  }
  console.log('[Seed] 事件类型数据初始化完成');

  const planTemplates = [
    { name: '火灾事故应急预案', eventTypeCode: 'FIRE', description: '针对施工现场及办公区域火灾的应急处置预案', version: '1.2' },
    { name: '洪涝灾害应急预案', eventTypeCode: 'FLOOD', description: '针对暴雨洪水等洪涝灾害的应急处置预案', version: '1.0' },
    { name: '地震灾害应急预案', eventTypeCode: 'EARTHQUAKE', description: '针对地震及次生灾害的应急处置预案', version: '1.1' },
    { name: '高空坠落事故应急预案', eventTypeCode: 'FALL', description: '针对高空坠落事故的应急处置预案', version: '1.0' },
    { name: '触电事故应急预案', eventTypeCode: 'ELECTRIC', description: '针对触电事故的应急处置预案', version: '1.0' },
  ];

  const insertPlanTemplate = db.prepare(`
    INSERT INTO emergency_plan_templates (id, name, eventTypeId, description, content, version, status, createdAt, updatedAt)
    VALUES (@id, @name, @eventTypeId, @description, @content, @version, @status, @createdAt, @updatedAt)
  `);

  const planTemplateMap = new Map<string, string>();
  for (const pt of planTemplates) {
    const id = nanoid();
    const data = {
      id,
      name: pt.name,
      eventTypeId: eventTypeMap.get(pt.eventTypeCode),
      description: pt.description,
      content: JSON.stringify({
        purpose: '规范应急处置流程，最大限度减少人员伤亡和财产损失',
        scope: pt.name + '适用范围',
        organization: [
          { role: '总指挥', duty: '全面指挥应急处置工作' },
          { role: '副总指挥', duty: '协助总指挥，负责现场指挥' },
          { role: '抢险救援组', duty: '负责现场抢险救援' },
          { role: '医疗救护组', duty: '负责伤员救治和转运' },
          { role: '后勤保障组', duty: '负责物资和后勤保障' },
          { role: '通讯联络组', duty: '负责内外通讯联络' },
        ],
        responseProcess: [
          '接警与报告',
          '启动应急预案',
          '成立应急指挥部',
          '开展抢险救援',
          '医疗救护',
          '人员疏散',
          '现场保护',
          '应急结束',
        ],
      }),
      version: pt.version,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    };
    insertPlanTemplate.run(data);
    planTemplateMap.set(pt.name, id);
  }
  console.log('[Seed] 预案模板数据初始化完成');

  const solutionTemplates = [
    { name: '一般火灾处置方案', eventTypeCode: 'FIRE', planName: '火灾事故应急预案', level: 'low' },
    { name: '较大火灾处置方案', eventTypeCode: 'FIRE', planName: '火灾事故应急预案', level: 'medium' },
    { name: '重大火灾处置方案', eventTypeCode: 'FIRE', planName: '火灾事故应急预案', level: 'high' },
    { name: '一般洪涝处置方案', eventTypeCode: 'FLOOD', planName: '洪涝灾害应急预案', level: 'medium' },
    { name: '重大洪涝处置方案', eventTypeCode: 'FLOOD', planName: '洪涝灾害应急预案', level: 'high' },
    { name: '地震应急处置方案', eventTypeCode: 'EARTHQUAKE', planName: '地震灾害应急预案', level: 'critical' },
    { name: '高空坠落处置方案', eventTypeCode: 'FALL', planName: '高空坠落事故应急预案', level: 'high' },
  ];

  const insertSolutionTemplate = db.prepare(`
    INSERT INTO emergency_solution_templates (id, name, eventTypeId, planTemplateId, description, content, level, status, createdAt, updatedAt)
    VALUES (@id, @name, @eventTypeId, @planTemplateId, @description, @content, @level, @status, @createdAt, @updatedAt)
  `);

  for (const st of solutionTemplates) {
    const id = nanoid();
    const data = {
      id,
      name: st.name,
      eventTypeId: eventTypeMap.get(st.eventTypeCode),
      planTemplateId: planTemplateMap.get(st.planName),
      description: st.name + '，适用于对应等级的应急事件',
      content: JSON.stringify({
        steps: [
          { order: 1, title: '确认事件', description: '核实事件真实性，初步判断等级' },
          { order: 2, title: '上报信息', description: '按规定程序向上级报告' },
          { order: 3, title: '启动响应', description: '启动相应等级的应急响应' },
          { order: 4, title: '现场处置', description: '按照预案开展现场处置工作' },
          { order: 5, title: '善后处理', description: '处置结束后开展善后工作' },
        ],
        resources: [
          { name: '灭火器', quantity: 10, unit: '具' },
          { name: '消防水带', quantity: 5, unit: '条' },
          { name: '急救箱', quantity: 2, unit: '个' },
          { name: '对讲机', quantity: 6, unit: '台' },
        ],
        personnel: [
          { role: '现场指挥', count: 1 },
          { role: '抢险人员', count: 4 },
          { role: '医护人员', count: 2 },
          { role: '后勤人员', count: 2 },
        ],
        notes: [
          '确保人员安全第一',
          '严格按照操作规程执行',
          '注意观察现场情况变化',
          '及时上报进展情况',
        ],
      }),
      level: st.level,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    };
    insertSolutionTemplate.run(data);
  }
  console.log('[Seed] 方案模板数据初始化完成');

  const organization = [
    { name: '张志强', position: '应急总指挥', department: '安全管理部', phone: '13800138001', email: 'zhangzq@example.com', role: 'commander' },
    { name: '李明华', position: '应急副总指挥', department: '安全管理部', phone: '13800138002', email: 'limh@example.com', role: 'deputy_commander' },
    { name: '王建国', position: '抢险救援组组长', department: '工程部', phone: '13800138003', email: 'wangjg@example.com', role: 'rescue_lead' },
    { name: '赵晓燕', position: '医疗救护组组长', department: '医务室', phone: '13800138004', email: 'zhaoxy@example.com', role: 'medical_lead' },
    { name: '陈大伟', position: '后勤保障组组长', department: '后勤部', phone: '13800138005', email: 'chendw@example.com', role: 'logistics_lead' },
    { name: '刘芳', position: '通讯联络组组长', department: '办公室', phone: '13800138006', email: 'liuf@example.com', role: 'comms_lead' },
    { name: '周强', position: '抢险队员', department: '工程部', phone: '13800138007', email: 'zhouq@example.com', role: 'rescue' },
    { name: '吴磊', position: '抢险队员', department: '工程部', phone: '13800138008', email: 'wul@example.com', role: 'rescue' },
    { name: '孙丽', position: '医护人员', department: '医务室', phone: '13800138009', email: 'sunl@example.com', role: 'medical' },
    { name: '郑涛', position: '安全员', department: '安全管理部', phone: '13800138010', email: 'zhengt@example.com', role: 'safety' },
  ];

  const insertOrganization = db.prepare(`
    INSERT INTO emergency_organization (id, name, position, department, phone, email, role, status, createdAt, updatedAt)
    VALUES (@id, @name, @position, @department, @phone, @email, @role, @status, @createdAt, @updatedAt)
  `);

  for (const org of organization) {
    const data = {
      id: nanoid(),
      ...org,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    };
    insertOrganization.run(data);
  }
  console.log('[Seed] 应急组织人员数据初始化完成');

  const resources = [
    { name: '干粉灭火器', type: '消防器材', category: '灭火设备', quantity: 50, unit: '具', location: '各楼层消防栓', manager: '张师傅', phone: '13900139001' },
    { name: '消防水带', type: '消防器材', category: '灭火设备', quantity: 20, unit: '条', location: '消防器材室', manager: '张师傅', phone: '13900139001' },
    { name: '应急照明灯', type: '应急设备', category: '照明设备', quantity: 30, unit: '个', location: '各楼层通道', manager: '李工', phone: '13900139002' },
    { name: '急救箱', type: '医疗用品', category: '急救用品', quantity: 10, unit: '个', location: '各楼层值班室', manager: '赵医生', phone: '13900139003' },
    { name: '担架', type: '医疗用品', category: '急救用品', quantity: 5, unit: '副', location: '医务室', manager: '赵医生', phone: '13900139003' },
    { name: '对讲机', type: '通讯设备', category: '通讯设备', quantity: 20, unit: '台', location: '值班室', manager: '刘主任', phone: '13900139004' },
    { name: '安全帽', type: '防护用品', category: '头部防护', quantity: 100, unit: '顶', location: '物资仓库', manager: '陈主管', phone: '13900139005' },
    { name: '防毒面具', type: '防护用品', category: '呼吸防护', quantity: 30, unit: '个', location: '物资仓库', manager: '陈主管', phone: '13900139005' },
    { name: '防汛沙袋', type: '防汛物资', category: '防汛设备', quantity: 200, unit: '袋', location: '地下室入口', manager: '王师傅', phone: '13900139006' },
    { name: '应急广播系统', type: '预警设备', category: '预警设备', quantity: 1, unit: '套', location: '消控室', manager: '刘主任', phone: '13900139004' },
    { name: '逃生绳', type: '逃生设备', category: '逃生设备', quantity: 10, unit: '条', location: '各楼层窗口', manager: '李工', phone: '13900139002' },
    { name: '应急发电机', type: '应急设备', category: '电力设备', quantity: 2, unit: '台', location: '配电室', manager: '李工', phone: '13900139002' },
  ];

  const insertResource = db.prepare(`
    INSERT INTO emergency_resources (id, name, type, category, quantity, unit, location, manager, phone, status, createdAt, updatedAt)
    VALUES (@id, @name, @type, @category, @quantity, @unit, @location, @manager, @phone, @status, @createdAt, @updatedAt)
  `);

  for (const res of resources) {
    const data = {
      id: nanoid(),
      ...res,
      status: 'available',
      createdAt: now(),
      updatedAt: now(),
    };
    insertResource.run(data);
  }
  console.log('[Seed] 应急资源数据初始化完成');

  const events = [
    {
      title: 'A栋3层烟雾报警',
      eventTypeCode: 'FIRE',
      description: '视频监控发现A栋3层走廊有烟雾产生，疑似发生火灾，需要立即核实处置。',
      location: 'A栋3层东侧走廊',
      level: 'high',
      status: 'handling',
      source: 'video_ai',
      daysAgo: 0,
    },
    {
      title: 'B区脚手架倾斜',
      eventTypeCode: 'COLLAPSE',
      description: '巡检发现B区北侧脚手架出现倾斜，存在坍塌风险，需紧急处置。',
      location: 'B区北侧施工区域',
      level: 'critical',
      status: 'verified',
      source: 'manual',
      daysAgo: 0,
    },
    {
      title: 'C栋工人高空坠落',
      eventTypeCode: 'FALL',
      description: 'C栋5层作业人员不慎从脚手架坠落，已启动应急响应。',
      location: 'C栋5层作业面',
      level: 'high',
      status: 'handling',
      source: 'manual',
      daysAgo: 1,
    },
    {
      title: '地下车库积水',
      eventTypeCode: 'FLOOD',
      description: '暴雨导致地下车库入口积水，约15cm深，影响车辆通行。',
      location: '地下车库B2层入口',
      level: 'medium',
      status: 'resolved',
      source: 'video_ai',
      daysAgo: 2,
    },
    {
      title: '配电箱短路冒烟',
      eventTypeCode: 'ELECTRIC',
      description: 'D栋二层配电箱短路产生烟雾，已切断电源，无人员伤亡。',
      location: 'D栋二层配电室',
      level: 'medium',
      status: 'resolved',
      source: 'sensor',
      daysAgo: 3,
    },
    {
      title: '建筑材料坠落',
      eventTypeCode: 'STRIKE',
      description: 'E栋施工区域高处掉落钢管，击中地面防护棚，未造成人员伤亡。',
      location: 'E栋南侧施工区',
      level: 'low',
      status: 'detected',
      source: 'video_ai',
      daysAgo: 1,
    },
  ];

  const insertEvent = db.prepare(`
    INSERT INTO emergency_events (id, eventTypeId, title, description, location, level, status, source, detectedAt, verifiedAt, resolvedAt, data, createdAt, updatedAt)
    VALUES (@id, @eventTypeId, @title, @description, @location, @level, @status, @source, @detectedAt, @verifiedAt, @resolvedAt, @data, @createdAt, @updatedAt)
  `);

  const eventIds: string[] = [];
  for (const evt of events) {
    const id = nanoid();
    eventIds.push(id);
    const detected = daysAgo(evt.daysAgo);
    const verified = evt.status !== 'detected' ? daysAgo(evt.daysAgo + 0.1) : null;
    const resolved = evt.status === 'resolved' ? daysAgo(evt.daysAgo - 0.5) : null;
    const data = {
      cameraId: 'CAM-' + Math.floor(Math.random() * 100).toString().padStart(3, '0'),
      confidence: (0.85 + Math.random() * 0.14).toFixed(2),
      imageUrl: null,
    };
    const eventData = {
      id,
      eventTypeId: eventTypeMap.get(evt.eventTypeCode),
      title: evt.title,
      description: evt.description,
      location: evt.location,
      level: evt.level,
      status: evt.status,
      source: evt.source,
      detectedAt: detected,
      verifiedAt: verified,
      resolvedAt: resolved,
      data: JSON.stringify(data),
      createdAt: detected,
      updatedAt: now(),
    };
    insertEvent.run(eventData);
  }
  console.log('[Seed] 应急事件数据初始化完成');

  const solutions = [
    {
      eventIndex: 0,
      eventTypeCode: 'FIRE',
      planName: '火灾事故应急预案',
      solutionTemplateName: '重大火灾处置方案',
      title: 'A栋3层火灾处置方案',
      description: '针对A栋3层烟雾报警事件的应急处置方案',
      status: 'published',
      level: 'high',
      version: '1.0',
      createdBy: '张志强',
      approvedBy: '李明华',
      daysAgo: 0,
      content: {
        steps: [
          { order: 1, title: '现场核实', description: '立即派人前往A栋3层核实火情，确认火灾等级' },
          { order: 2, title: '启动预案', description: '根据核实结果，启动火灾事故应急预案' },
          { order: 3, title: '人员疏散', description: '组织A栋3层及以上楼层人员有序疏散' },
          { order: 4, title: '初期灭火', description: '使用现场消防器材进行初期灭火' },
          { order: 5, title: '报警求援', description: '拨打119报警，请求消防支援' },
          { order: 6, title: '现场保护', description: '保护火灾现场，配合消防部门调查' },
        ],
        resources: [
          { name: '干粉灭火器', quantity: 20, unit: '具' },
          { name: '消防水带', quantity: 10, unit: '条' },
          { name: '应急照明灯', quantity: 15, unit: '个' },
          { name: '急救箱', quantity: 5, unit: '个' },
          { name: '对讲机', quantity: 10, unit: '台' },
        ],
        personnel: [
          { role: '现场总指挥', count: 1, name: '张志强' },
          { role: '抢险救援组', count: 6, name: '王建国带队' },
          { role: '医疗救护组', count: 3, name: '赵晓燕带队' },
          { role: '疏散引导组', count: 4, name: '陈大伟带队' },
          { role: '通讯联络组', count: 2, name: '刘芳带队' },
        ],
      },
    },
    {
      eventIndex: 1,
      eventTypeCode: 'COLLAPSE',
      planName: null,
      solutionTemplateName: null,
      title: 'B区脚手架坍塌应急处置方案',
      description: '针对B区北侧脚手架倾斜事件的紧急处置方案',
      status: 'draft',
      level: 'critical',
      version: '1.0',
      createdBy: '王建国',
      approvedBy: null,
      daysAgo: 0,
      content: {
        steps: [
          { order: 1, title: '设置警戒', description: '立即在B区北侧设置警戒区域，禁止人员靠近' },
          { order: 2, title: '风险评估', description: '安排专业人员对脚手架倾斜情况进行评估' },
          { order: 3, title: '人员撤离', description: '组织B区施工人员全部撤离至安全区域' },
          { order: 4, title: '加固处理', description: '根据评估结果，采取临时加固措施' },
          { order: 5, title: '专家论证', description: '邀请结构专家到场论证处置方案' },
          { order: 6, title: '拆除重建', description: '制定拆除方案，安全拆除危险脚手架' },
        ],
        resources: [
          { name: '警戒带', quantity: 10, unit: '卷' },
          { name: '安全帽', quantity: 50, unit: '顶' },
          { name: '安全绳', quantity: 20, unit: '条' },
          { name: '对讲机', quantity: 8, unit: '台' },
          { name: '急救箱', quantity: 3, unit: '个' },
        ],
        personnel: [
          { role: '现场指挥', count: 1, name: '张志强' },
          { role: '警戒人员', count: 4, name: '郑涛带队' },
          { role: '技术评估组', count: 3, name: '李工带队' },
          { role: '抢险组', count: 8, name: '王建国带队' },
        ],
      },
    },
    {
      eventIndex: 2,
      eventTypeCode: 'FALL',
      planName: '高空坠落事故应急预案',
      solutionTemplateName: '高空坠落处置方案',
      title: 'C栋高空坠落事故处置方案',
      description: '针对C栋5层作业人员高空坠落事故的处置方案',
      status: 'archived',
      level: 'high',
      version: '1.0',
      createdBy: '赵晓燕',
      approvedBy: '张志强',
      daysAgo: 1,
      content: {
        steps: [
          { order: 1, title: '现场急救', description: '医护人员立即赶赴现场，对伤员进行紧急救治' },
          { order: 2, title: '伤员转运', description: '联系救护车，将伤员转运至最近医院' },
          { order: 3, title: '现场保护', description: '保护事故现场，禁止无关人员进入' },
          { order: 4, title: '事故报告', description: '按规定向上级主管部门报告事故情况' },
          { order: 5, title: '原因调查', description: '组织事故调查组，查明事故原因' },
          { order: 6, title: '善后处理', description: '做好伤员家属安抚及善后工作' },
        ],
        resources: [
          { name: '急救箱', quantity: 3, unit: '个' },
          { name: '担架', quantity: 2, unit: '副' },
          { name: '救护车', quantity: 1, unit: '辆' },
          { name: '警戒带', quantity: 5, unit: '卷' },
        ],
        personnel: [
          { role: '现场指挥', count: 1, name: '张志强' },
          { role: '医疗救护组', count: 4, name: '赵晓燕带队' },
          { role: '现场保护组', count: 3, name: '郑涛带队' },
          { role: '后勤保障组', count: 3, name: '陈大伟带队' },
        ],
      },
    },
    {
      eventIndex: 3,
      eventTypeCode: 'FLOOD',
      planName: '洪涝灾害应急预案',
      solutionTemplateName: '一般洪涝处置方案',
      title: '地下车库积水处置方案',
      description: '针对地下车库B2层入口积水的处置方案',
      status: 'published',
      level: 'medium',
      version: '1.0',
      createdBy: '陈大伟',
      approvedBy: '李明华',
      daysAgo: 2,
      content: {
        steps: [
          { order: 1, title: '现场勘察', description: '立即前往地下车库查看积水情况，判断积水原因' },
          { order: 2, title: '堆放沙袋', description: '在地下车库入口堆放防汛沙袋，防止积水扩大' },
          { order: 3, title: '启动排水', description: '启动地下车库排水泵，排除积水' },
          { order: 4, title: '车辆转移', description: '通知车主将地下车辆转移至安全区域' },
          { order: 5, title: '设备检查', description: '检查地下配电设备是否受积水影响' },
          { order: 6, title: '清洁消毒', description: '积水排除后，进行清洁消毒工作' },
        ],
        resources: [
          { name: '防汛沙袋', quantity: 200, unit: '袋' },
          { name: '排水泵', quantity: 3, unit: '台' },
          { name: '水鞋', quantity: 20, unit: '双' },
          { name: '手电筒', quantity: 15, unit: '个' },
          { name: '对讲机', quantity: 6, unit: '台' },
        ],
        personnel: [
          { role: '现场指挥', count: 1, name: '李明华' },
          { role: '抢险组', count: 6, name: '王建国带队' },
          { role: '后勤组', count: 4, name: '陈大伟带队' },
          { role: '设备组', count: 2, name: '李工带队' },
        ],
      },
    },
    {
      eventIndex: 4,
      eventTypeCode: 'ELECTRIC',
      planName: '触电事故应急预案',
      solutionTemplateName: null,
      title: 'D栋配电箱短路处置方案',
      description: '针对D栋二层配电箱短路冒烟事件的处置方案',
      status: 'archived',
      level: 'medium',
      version: '1.0',
      createdBy: '李工',
      approvedBy: '张志强',
      daysAgo: 3,
      content: {
        steps: [
          { order: 1, title: '切断电源', description: '立即切断D栋二层电源，防止事故扩大' },
          { order: 2, title: '现场核实', description: '电工赶赴现场，核实短路情况及原因' },
          { order: 3, title: '人员疏散', description: '疏散D栋二层及受影响区域人员' },
          { order: 4, title: '灭火处置', description: '如发生火情，使用干粉灭火器灭火' },
          { order: 5, title: '检修排查', description: '对配电箱及线路进行全面检修排查' },
          { order: 6, title: '恢复供电', description: '确认安全后，逐步恢复供电' },
        ],
        resources: [
          { name: '干粉灭火器', quantity: 10, unit: '具' },
          { name: '绝缘手套', quantity: 10, unit: '副' },
          { name: '绝缘靴', quantity: 5, unit: '双' },
          { name: '测电笔', quantity: 5, unit: '支' },
          { name: '对讲机', quantity: 6, unit: '台' },
        ],
        personnel: [
          { role: '现场指挥', count: 1, name: '张志强' },
          { role: '电工组', count: 4, name: '李工带队' },
          { role: '疏散组', count: 4, name: '陈大伟带队' },
          { role: '医疗组', count: 2, name: '赵晓燕带队' },
        ],
      },
    },
    {
      eventIndex: null,
      eventTypeCode: 'FIRE',
      planName: '火灾事故应急预案',
      solutionTemplateName: '一般火灾处置方案',
      title: '通用火灾应急处置方案（模板）',
      description: '适用于一般火灾事故的通用处置方案',
      status: 'draft',
      level: 'low',
      version: '1.0',
      createdBy: '安全管理部',
      approvedBy: null,
      daysAgo: 5,
      content: {
        steps: [
          { order: 1, title: '报警', description: '发现火情立即报警，说明火灾地点、燃烧物质、火势大小' },
          { order: 2, title: '疏散', description: '组织人员有序疏散，确保人员安全' },
          { order: 3, title: '灭火', description: '使用合适的灭火器材进行初期灭火' },
          { order: 4, title: '求援', description: '拨打119请求消防支援' },
          { order: 5, title: '配合', description: '配合消防部门开展灭火救援工作' },
        ],
        resources: [
          { name: '灭火器', quantity: 10, unit: '具' },
          { name: '消防水带', quantity: 5, unit: '条' },
          { name: '急救箱', quantity: 2, unit: '个' },
          { name: '对讲机', quantity: 4, unit: '台' },
        ],
        personnel: [
          { role: '现场指挥', count: 1 },
          { role: '灭火组', count: 4 },
          { role: '疏散组', count: 3 },
          { role: '医疗组', count: 2 },
        ],
      },
    },
  ];

  const insertSolution = db.prepare(`
    INSERT INTO emergency_solutions (id, eventId, eventTypeId, planTemplateId, solutionTemplateId, title, description, content, status, level, version, createdBy, approvedBy, publishedAt, archivedAt, createdAt, updatedAt)
    VALUES (@id, @eventId, @eventTypeId, @planTemplateId, @solutionTemplateId, @title, @description, @content, @status, @level, @version, @createdBy, @approvedBy, @publishedAt, @archivedAt, @createdAt, @updatedAt)
  `);

  for (const sol of solutions) {
    const id = nanoid();
    const created = daysAgo(sol.daysAgo);
    const published = sol.status === 'published' || sol.status === 'archived' ? daysAgo(sol.daysAgo - 0.2) : null;
    const archived = sol.status === 'archived' ? daysAgo(sol.daysAgo - 0.5) : null;

    let planTemplateId = null;
    if (sol.planName && planTemplateMap.has(sol.planName)) {
      planTemplateId = planTemplateMap.get(sol.planName);
    }

    let solutionTemplateId = null;
    if (sol.solutionTemplateName) {
      const st = db.prepare('SELECT id FROM emergency_solution_templates WHERE name = ?').get(sol.solutionTemplateName);
      if (st) solutionTemplateId = (st as any).id;
    }

    const solutionData = {
      id,
      eventId: sol.eventIndex !== null ? eventIds[sol.eventIndex] : null,
      eventTypeId: eventTypeMap.get(sol.eventTypeCode),
      planTemplateId,
      solutionTemplateId,
      title: sol.title,
      description: sol.description,
      content: JSON.stringify(sol.content),
      status: sol.status,
      level: sol.level,
      version: sol.version,
      createdBy: sol.createdBy,
      approvedBy: sol.approvedBy,
      publishedAt: published,
      archivedAt: archived,
      createdAt: created,
      updatedAt: now(),
    };
    insertSolution.run(solutionData);
  }
  console.log('[Seed] 应急方案数据初始化完成');

  const tasks = [
    { eventIndex: 0, title: '现场核实现场情况', description: '立即派人前往A栋3层核实烟雾情况，确认是否为火灾。', assignee: '周强', priority: 'high', status: 'completed' },
    { eventIndex: 0, title: '启动消防应急预案', description: '根据核实结果，启动相应等级的消防应急预案。', assignee: '张志强', priority: 'critical', status: 'in_progress' },
    { eventIndex: 0, title: '组织人员疏散', description: '组织A栋3层及以上楼层人员有序疏散至安全区域。', assignee: '王建国', priority: 'high', status: 'in_progress' },
    { eventIndex: 0, title: '调集灭火器材', description: '调集A栋附近消防器材和人员赶赴现场。', assignee: '陈大伟', priority: 'high', status: 'pending' },
    { eventIndex: 1, title: '设置警戒区域', description: '在B区北侧设置警戒区域，禁止人员靠近。', assignee: '郑涛', priority: 'critical', status: 'in_progress' },
    { eventIndex: 1, title: '评估坍塌风险', description: '安排专业人员对脚手架倾斜情况进行评估。', assignee: '王建国', priority: 'critical', status: 'pending' },
    { eventIndex: 2, title: '伤员紧急救治', description: '医护人员立即赶赴现场，对坠落伤员进行紧急救治。', assignee: '赵晓燕', priority: 'critical', status: 'completed' },
    { eventIndex: 2, title: '转运伤员至医院', description: '联系救护车，将伤员转运至最近医院进一步治疗。', assignee: '孙丽', priority: 'high', status: 'completed' },
    { eventIndex: 3, title: '堆放防汛沙袋', description: '在地下车库入口堆放防汛沙袋，防止积水扩大。', assignee: '王建国', priority: 'medium', status: 'completed' },
    { eventIndex: 3, title: '启动排水泵', description: '启动地下车库排水泵，排除积水。', assignee: '李工', priority: 'medium', status: 'completed' },
    { eventIndex: 4, title: '切断电源', description: '立即切断D栋二层电源，防止事故扩大。', assignee: '李工', priority: 'high', status: 'completed' },
    { eventIndex: 4, title: '检修配电箱', description: '安排电工检修故障配电箱，排查原因。', assignee: '李工', priority: 'medium', status: 'completed' },
  ];

  const insertTask = db.prepare(`
    INSERT INTO emergency_tasks (id, eventId, title, description, assigneeName, status, priority, deadline, solutionData, completedAt, createdAt, updatedAt)
    VALUES (@id, @eventId, @title, @description, @assigneeName, @status, @priority, @deadline, @solutionData, @completedAt, @createdAt, @updatedAt)
  `);

  for (const task of tasks) {
    const id = nanoid();
    const created = daysAgo(events[task.eventIndex].daysAgo + Math.random() * 0.2);
    const completed = task.status === 'completed' ? daysAgo(events[task.eventIndex].daysAgo - 0.3 + Math.random() * 0.3) : null;
    const deadline = daysAgo(events[task.eventIndex].daysAgo - 1);
    const taskData = {
      id,
      eventId: eventIds[task.eventIndex],
      title: task.title,
      description: task.description,
      assigneeName: task.assignee,
      status: task.status,
      priority: task.priority,
      deadline,
      solutionData: null,
      completedAt: completed,
      createdAt: created,
      updatedAt: now(),
    };
    insertTask.run(taskData);
  }
  console.log('[Seed] 应急任务数据初始化完成');

  const knowledgeItems = [
    { title: '火灾逃生自救要点', category: '安全知识', tags: ['火灾', '逃生', '自救'], source: '应急管理部' },
    { title: '高空坠落预防措施', category: '事故预防', tags: ['高空作业', '坠落', '预防'], source: '安全管理部' },
    { title: '触电急救方法', category: '急救知识', tags: ['触电', '急救', '心肺复苏'], source: '医务室' },
    { title: '汛期安全注意事项', category: '自然灾害', tags: ['防汛', '汛期', '安全'], source: '气象局' },
    { title: '脚手架安全检查要点', category: '安全知识', tags: ['脚手架', '检查', '安全'], source: '工程部' },
    { title: '危险化学品储存规范', category: '安全管理', tags: ['危化品', '储存', '规范'], source: '安全管理部' },
    { title: '应急疏散演练方案', category: '应急预案', tags: ['疏散', '演练', '预案'], source: '安全管理部' },
    { title: '地震应急避险常识', category: '自然灾害', tags: ['地震', '避险', '应急'], source: '地震局' },
    { title: '灭火器使用方法', category: '消防知识', tags: ['灭火器', '使用方法', '消防'], source: '消防大队' },
    { title: '2024年安全事故案例分析', category: '案例分析', tags: ['事故案例', '分析', '教训'], source: '安全管理部' },
  ];

  const insertKnowledge = db.prepare(`
    INSERT INTO emergency_knowledge (id, title, category, tags, content, source, eventId, createdAt, updatedAt)
    VALUES (@id, @title, @category, @tags, @content, @source, @eventId, @createdAt, @updatedAt)
  `);

  for (const item of knowledgeItems) {
    const id = nanoid();
    const data = {
      id,
      title: item.title,
      category: item.category,
      tags: JSON.stringify(item.tags),
      content: `# ${item.title}\n\n## 概述\n\n这是关于${item.title}的详细知识内容。\n\n## 主要内容\n\n### 一、基本概念\n\n${item.title}是应急管理中的重要知识领域，对于预防和处置相关事件具有重要意义。\n\n### 二、关键要点\n\n1. **预防为主**：坚持预防为主的方针，加强日常检查和培训\n2. **快速响应**：发生突发事件时，能够快速响应、有效处置\n3. **科学处置**：遵循科学规律，采取正确的处置方法\n4. **持续改进**：总结经验教训，不断完善应急预案和处置流程\n\n### 三、注意事项\n\n- 严格遵守相关规章制度\n- 定期开展培训和演练\n- 确保应急物资完好有效\n- 加强信息沟通和协调配合\n\n## 结语\n\n${item.title}知识的掌握和应用，对于提高应急管理水平、保障人员生命财产安全具有重要作用。`,
      source: item.source,
      eventId: null,
      createdAt: daysAgo(Math.floor(Math.random() * 30)),
      updatedAt: daysAgo(Math.floor(Math.random() * 10)),
    };
    insertKnowledge.run(data);
  }
  console.log('[Seed] 应急知识库数据初始化完成');

  console.log('[Seed] 所有示例数据初始化完成！');
}
