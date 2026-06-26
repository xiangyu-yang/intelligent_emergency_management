import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Search, Calendar, Filter, TrendingUp, AlertTriangle, Link2, Lightbulb, ChevronRight } from 'lucide-react';

const mockEvents = [
  { id: '1', name: '城市内涝事件', level: '重大', type: '自然灾害', time: '2024-01-15 08:30' },
  { id: '2', name: '交通瘫痪事件', level: '较大', type: '事故灾难', time: '2024-01-15 09:15' },
  { id: '3', name: '电力中断事件', level: '一般', type: '事故灾难', time: '2024-01-15 10:00' },
  { id: '4', name: '供水中断事件', level: '较大', type: '公共卫生', time: '2024-01-15 10:30' },
  { id: '5', name: '通讯中断事件', level: '一般', type: '事故灾难', time: '2024-01-15 11:00' },
  { id: '6', name: '商场踩踏事件', level: '重大', type: '社会安全', time: '2024-01-15 14:20' },
  { id: '7', name: '医疗救援事件', level: '较大', type: '公共卫生', time: '2024-01-15 14:45' },
];

const correlationData = [
  { id: '1', name: '城市内涝事件', relation: '源事件', degree: 100, type: '自然灾害', level: '重大' },
  { id: '2', name: '交通瘫痪事件', relation: '直接关联', degree: 92, type: '事故灾难', level: '较大' },
  { id: '3', name: '电力中断事件', relation: '间接关联', degree: 78, type: '事故灾难', level: '一般' },
  { id: '4', name: '供水中断事件', relation: '间接关联', degree: 65, type: '公共卫生', level: '较大' },
  { id: '5', name: '通讯中断事件', relation: '间接关联', degree: 58, type: '事故灾难', level: '一般' },
  { id: '6', name: '商场踩踏事件', relation: '衍生事件', degree: 85, type: '社会安全', level: '重大' },
  { id: '7', name: '医疗救援事件', relation: '衍生事件', degree: 72, type: '公共卫生', level: '较大' },
];

const dimensions = [
  { value: 'time', label: '时间维度' },
  { value: 'space', label: '空间维度' },
  { value: 'type', label: '类型维度' },
  { value: 'resource', label: '资源维度' },
  { value: 'impact', label: '影响维度' },
];

function CorrelationAnalysisPage() {
  const [selectedEvent, setSelectedEvent] = useState('1');
  const [selectedDimension, setSelectedDimension] = useState('time');
  const [timeRange, setTimeRange] = useState('7d');

  const graphOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          return `<div class="font-semibold">${params.name}</div><div>类型: ${params.data.type || '-'}</div><div>级别: ${params.data.level || '-'}</div>`;
        }
        return `<div>关联度: ${params.value}%</div>`;
      },
    },
    legend: {
      data: ['源事件', '直接关联', '间接关联', '衍生事件'],
      bottom: 10,
    },
    series: [
      {
        type: 'graph',
        layout: 'force',
        force: {
          repulsion: 300,
          edgeLength: [80, 150],
          gravity: 0.1,
        },
        roam: true,
        label: {
          show: true,
          position: 'right',
          formatter: '{b}',
          fontSize: 12,
        },
        edgeLabel: {
          show: true,
          formatter: (params: any) => `${params.value}%`,
          fontSize: 10,
        },
        lineStyle: {
          color: 'source',
          curveness: 0.2,
          width: 2,
          opacity: 0.6,
        },
        data: [
          { id: '1', name: '城市内涝事件', category: 0, symbolSize: 60, itemStyle: { color: '#ef4444' }, type: '自然灾害', level: '重大' },
          { id: '2', name: '交通瘫痪事件', category: 1, symbolSize: 50, itemStyle: { color: '#f97316' }, type: '事故灾难', level: '较大' },
          { id: '3', name: '电力中断事件', category: 2, symbolSize: 40, itemStyle: { color: '#3b82f6' }, type: '事故灾难', level: '一般' },
          { id: '4', name: '供水中断事件', category: 2, symbolSize: 45, itemStyle: { color: '#3b82f6' }, type: '公共卫生', level: '较大' },
          { id: '5', name: '通讯中断事件', category: 2, symbolSize: 35, itemStyle: { color: '#3b82f6' }, type: '事故灾难', level: '一般' },
          { id: '6', name: '商场踩踏事件', category: 3, symbolSize: 55, itemStyle: { color: '#8b5cf6' }, type: '社会安全', level: '重大' },
          { id: '7', name: '医疗救援事件', category: 3, symbolSize: 45, itemStyle: { color: '#8b5cf6' }, type: '公共卫生', level: '较大' },
        ],
        links: [
          { source: '1', target: '2', value: 92, lineStyle: { color: '#ef4444' } },
          { source: '1', target: '3', value: 78, lineStyle: { color: '#f97316' } },
          { source: '1', target: '4', value: 65, lineStyle: { color: '#f97316' } },
          { source: '1', target: '5', value: 58, lineStyle: { color: '#f97316' } },
          { source: '2', target: '6', value: 85, lineStyle: { color: '#8b5cf6' } },
          { source: '6', target: '7', value: 72, lineStyle: { color: '#8b5cf6' } },
          { source: '3', target: '5', value: 68, lineStyle: { color: '#3b82f6' } },
        ],
        categories: [
          { name: '源事件' },
          { name: '直接关联' },
          { name: '间接关联' },
          { name: '衍生事件' },
        ],
      },
    ],
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case '重大': return 'bg-red-100 text-red-700';
      case '较大': return 'bg-orange-100 text-orange-700';
      case '一般': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRelationColor = (relation: string) => {
    switch (relation) {
      case '源事件': return 'text-red-600';
      case '直接关联': return 'text-orange-600';
      case '间接关联': return 'text-blue-600';
      case '衍生事件': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">事件关联分析</h1>
        <p className="mt-1 text-sm text-gray-500">分析事件之间的关联关系和影响范围</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">分析配置</h3>
        </div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">分析维度</label>
            <select
              value={selectedDimension}
              onChange={(e) => setSelectedDimension(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {dimensions.map((dim) => (
                <option key={dim.value} value={dim.value}>{dim.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">时间范围</label>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-400 absolute ml-3" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="24h">近24小时</option>
                <option value="7d">近7天</option>
                <option value="30d">近30天</option>
                <option value="90d">近90天</option>
              </select>
            </div>
          </div>
          <div className="flex items-end">
            <button className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2">
              <Search size={18} />
              开始分析
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Link2 size={18} className="text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">事件关系图谱</h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>共 {correlationData.length} 个关联事件</span>
            </div>
          </div>
          <div className="h-96">
            <ReactECharts option={graphOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">关联事件列表</h3>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {correlationData.map((item) => (
              <div
                key={item.id}
                className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                      <ChevronRight size={14} className="text-gray-400" />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getLevelColor(item.level)}`}>
                        {item.level}
                      </span>
                      <span className={`text-xs font-medium ${getRelationColor(item.relation)}`}>
                        {item.relation}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary-600">{item.degree}%</div>
                    <div className="text-xs text-gray-500">关联度</div>
                  </div>
                </div>
                <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-primary-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${item.degree}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg border border-primary-100 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Lightbulb size={24} className="text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">分析结果说明与建议</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-orange-500" />
                  关键发现
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    城市内涝事件为核心源事件，已引发6起关联事件
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    交通瘫痪与源事件关联度最高（92%），为最直接影响
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    衍生事件商场踩踏级别为重大，需重点关注
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    电力、供水、通讯三大基础设施存在连锁中断风险
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                  <Lightbulb size={16} className="text-green-500" />
                  处置建议
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    优先保障交通枢纽通行，疏导拥堵路段
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    启动基础设施应急预案，确保水电通讯供应
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    增派医疗救援力量，应对踩踏事件伤员
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    加强人员密集场所安保，防止次生事件发生
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CorrelationAnalysisPage;
