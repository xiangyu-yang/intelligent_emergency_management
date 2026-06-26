import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Play, Gauge, Target, FileText, Lightbulb, Clock, Users, Wrench, Shield, ClipboardCheck } from 'lucide-react';

const mockEvents = [
  { id: '1', name: '城市内涝事件处置评估', level: '重大', date: '2024-01-15' },
  { id: '2', name: '化工园区爆炸事件处置评估', level: '重大', date: '2024-02-20' },
  { id: '3', name: '地铁运营故障事件处置评估', level: '较大', date: '2024-03-10' },
];

const evaluationScores = {
  overall: 82,
  responseSpeed: 85,
  disposalEfficiency: 78,
  resourceAllocation: 88,
  coordination: 75,
  planExecution: 84,
};

const evaluationReport = `## 事件处置评估报告

### 一、事件概述
本次城市内涝事件发生于2024年1月15日，受短时强降雨影响，我市主城区多处发生积水内涝，最深处达1.5米。事件造成交通大面积瘫痪，部分区域水电通讯中断，商场发生踩踏事件。

### 二、处置过程
1. **预警阶段**（8:00-8:30）：气象部门发布暴雨红色预警，应急管理部门启动四级响应
2. **响应阶段**（8:30-10:00）：各部门陆续到位，开展人员疏散和交通疏导
3. **处置阶段**（10:00-18:00）：全面开展抢险救援，排水排涝，救治伤员
4. **恢复阶段**（18:00-24:00）：逐步恢复交通、水电、通讯等基础设施

### 三、评估结论
本次应急处置工作总体良好，综合评分为**82分**（优秀）。各部门响应及时，协同配合有序，有效控制了事态发展，最大限度减少了人员伤亡和财产损失。

### 四、主要亮点
- 预警发布及时，为应急响应争取了宝贵时间
- 指挥体系运转高效，决策部署准确到位
- 救援力量调配合理，资源保障有力
- 信息发布及时，舆情引导得当

### 五、存在问题
- 部分区域排水设施能力不足，内涝消退较慢
- 部门间协同机制仍需完善，存在信息传递延迟
- 基层应急队伍装备有待加强
- 公众应急意识和自救能力有待提升
`;

const improvementSuggestions = [
  { id: '1', category: '响应速度', content: '优化预警信息传递流程，缩短预警到响应的时间', priority: '高', status: '待整改' },
  { id: '2', category: '处置效率', content: '加强排水设施建设和改造，提高内涝处置效率', priority: '高', status: '待整改' },
  { id: '3', category: '资源调配', content: '建立应急物资动态管理系统，实现资源精准调配', priority: '中', status: '整改中' },
  { id: '4', category: '协同配合', content: '完善多部门联动机制，定期开展联合演练', priority: '中', status: '待整改' },
  { id: '5', category: '预案执行', content: '修订完善应急预案，增强预案的针对性和可操作性', priority: '中', status: '整改中' },
  { id: '6', category: '基层能力', content: '加强基层应急队伍建设，配备必要的装备器材', priority: '低', status: '待整改' },
];

function EvaluationPage() {
  const [selectedEvent, setSelectedEvent] = useState('1');
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleEvaluate = () => {
    setIsEvaluating(true);
    setTimeout(() => setIsEvaluating(false), 1500);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 80) return '#3b82f6';
    if (score >= 70) return '#f59e0b';
    if (score >= 60) return '#f97316';
    return '#ef4444';
  };

  const getScoreLevel = (score: number) => {
    if (score >= 90) return '优秀';
    if (score >= 80) return '良好';
    if (score >= 70) return '中等';
    if (score >= 60) return '及格';
    return '不及格';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '高': return 'bg-red-100 text-red-700';
      case '中': return 'bg-yellow-100 text-yellow-700';
      case '低': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待整改': return 'bg-orange-100 text-orange-700';
      case '整改中': return 'bg-blue-100 text-blue-700';
      case '已完成': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const gaugeOption = {
    series: [
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        splitNumber: 10,
        itemStyle: {
          color: getScoreColor(evaluationScores.overall),
        },
        progress: {
          show: true,
          width: 20,
        },
        pointer: {
          show: false,
        },
        axisLine: {
          lineStyle: {
            width: 20,
            color: [[1, '#e5e7eb']],
          },
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        title: {
          show: false,
        },
        detail: {
          valueAnimation: true,
          width: '60%',
          lineHeight: 40,
          borderRadius: 8,
          offsetCenter: [0, '0%'],
          fontSize: 48,
          fontWeight: 'bold',
          formatter: '{value}',
          color: getScoreColor(evaluationScores.overall),
        },
        data: [
          {
            value: evaluationScores.overall,
          },
        ],
      },
    ],
  };

  const radarOption = {
    tooltip: {
      trigger: 'item',
    },
    radar: {
      indicator: [
        { name: '响应速度', max: 100 },
        { name: '处置效率', max: 100 },
        { name: '资源调配', max: 100 },
        { name: '协同配合', max: 100 },
        { name: '预案执行', max: 100 },
      ],
      shape: 'polygon',
      splitNumber: 5,
      axisName: {
        color: '#4b5563',
        fontSize: 12,
      },
      splitLine: {
        lineStyle: {
          color: '#e5e7eb',
        },
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af'],
          opacity: 0.3,
        },
      },
      axisLine: {
        lineStyle: {
          color: '#d1d5db',
        },
      },
    },
    series: [
      {
        name: '评估得分',
        type: 'radar',
        data: [
          {
            value: [
              evaluationScores.responseSpeed,
              evaluationScores.disposalEfficiency,
              evaluationScores.resourceAllocation,
              evaluationScores.coordination,
              evaluationScores.planExecution,
            ],
            name: '本次评估',
            areaStyle: {
              color: 'rgba(59, 130, 246, 0.2)',
            },
            lineStyle: {
              color: '#3b82f6',
              width: 2,
            },
            itemStyle: {
              color: '#3b82f6',
            },
          },
        ],
      },
    ],
  };

  const dimensionCards = [
    { icon: Clock, label: '响应速度', score: evaluationScores.responseSpeed, desc: '从接报到启动响应的时间效率' },
    { icon: Target, label: '处置效率', score: evaluationScores.disposalEfficiency, desc: '事件处置的时效性和效果' },
    { icon: Wrench, label: '资源调配', score: evaluationScores.resourceAllocation, desc: '应急资源的调配和保障能力' },
    { icon: Users, label: '协同配合', score: evaluationScores.coordination, desc: '多部门间的协同联动效果' },
    { icon: Shield, label: '预案执行', score: evaluationScores.planExecution, desc: '应急预案的执行和落实情况' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">处置评估</h1>
        <p className="mt-1 text-sm text-gray-500">评估应急处置效果和响应效率</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择事件</label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {mockEvents.map((event) => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleEvaluate}
              disabled={isEvaluating}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isEvaluating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  评估中...
                </>
              ) : (
                <>
                  <Play size={18} />
                  开始评估
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Gauge size={18} className="text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">综合评分</h3>
          </div>
          <div className="h-56">
            <ReactECharts option={gaugeOption} style={{ height: '100%', width: '100%' }} />
          </div>
          <div className="text-center mt-2">
            <span
              className="inline-block px-4 py-1 rounded-full text-sm font-semibold"
              style={{ backgroundColor: `${getScoreColor(evaluationScores.overall)}20`, color: getScoreColor(evaluationScores.overall) }}
            >
              {getScoreLevel(evaluationScores.overall)}
            </span>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className="text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">各维度评分</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {dimensionCards.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="text-center p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full bg-white shadow-sm">
                    <Icon size={20} style={{ color: getScoreColor(item.score) }} />
                  </div>
                  <div className="text-2xl font-bold" style={{ color: getScoreColor(item.score) }}>
                    {item.score}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{item.label}</div>
                </div>
              );
            })}
          </div>
          <div className="h-64 mt-4">
            <ReactECharts option={radarOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={18} className="text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">详细评估报告</h3>
        </div>
        <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
          <div className="prose prose-sm max-w-none">
            {evaluationReport.split('\n').map((line, index) => {
              if (line.startsWith('## ')) {
                return <h2 key={index} className="text-lg font-bold text-gray-900 mt-4 mb-3">{line.replace('## ', '')}</h2>;
              }
              if (line.startsWith('### ')) {
                return <h3 key={index} className="text-base font-semibold text-gray-800 mt-3 mb-2">{line.replace('### ', '')}</h3>;
              }
              if (line.match(/^\d+\./)) {
                return <p key={index} className="text-sm text-gray-600 ml-4 my-1">{line}</p>;
              }
              if (line.startsWith('- ')) {
                return (
                  <p key={index} className="text-sm text-gray-600 ml-4 my-1 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    {line.replace('- ', '')}
                  </p>
                );
              }
              if (line.trim() === '') {
                return <div key={index} className="h-2"></div>;
              }
              return <p key={index} className="text-sm text-gray-600 my-1">{line}</p>;
            })}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-100 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Lightbulb size={24} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">改进建议</h3>
            <div className="space-y-3">
              {improvementSuggestions.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <ClipboardCheck size={16} className="text-primary-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {item.category}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(item.priority)}`}>
                          {item.priority}优先级
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{item.content}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${getStatusColor(item.status)} flex-shrink-0`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EvaluationPage;
