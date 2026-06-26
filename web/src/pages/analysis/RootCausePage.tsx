import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Play, GitBranch, FileText, Clock, AlertCircle, ThumbsUp, History, Scale } from 'lucide-react';

const mockEvents = [
  { id: '1', name: '城市内涝事件', level: '重大', date: '2024-01-15' },
  { id: '2', name: '化工园区爆炸事件', level: '重大', date: '2024-02-20' },
  { id: '3', name: '地铁运营故障事件', level: '较大', date: '2024-03-10' },
];

const rootCauseTree = {
  name: '城市内涝事件',
  children: [
    {
      name: '直接原因',
      children: [
        { name: '短时强降雨（200mm/h）' },
        { name: '排水管网排水能力不足' },
        { name: '地势低洼区域积水' },
      ],
    },
    {
      name: '间接原因',
      children: [
        { name: '城市排水系统设计标准偏低' },
        { name: '管网老化堵塞严重' },
        { name: '防洪预警发布不及时' },
        { name: '应急响应启动滞后' },
      ],
    },
    {
      name: '根本原因',
      children: [
        { name: '城市规划不合理，硬化面积过大' },
        { name: '排水设施建设投入不足' },
        { name: '应急管理体系不完善' },
        { name: '多部门协同机制不健全' },
      ],
    },
  ],
};

const rootCauseDetails = [
  {
    id: '1',
    level: '根本原因',
    title: '城市规划不合理，硬化面积过大',
    description: '城市建设过程中过度追求经济效益，大量硬化路面导致雨水无法自然渗透，地表径流系数增大，加剧了内涝风险。',
    impact: '高',
    responsibility: '规划部门',
  },
  {
    id: '2',
    level: '根本原因',
    title: '排水设施建设投入不足',
    description: '排水管网建设历史欠账多，改造升级资金投入不足，导致排水系统整体能力与城市发展不匹配。',
    impact: '高',
    responsibility: '住建部门',
  },
  {
    id: '3',
    level: '间接原因',
    title: '城市排水系统设计标准偏低',
    description: '现有排水系统按照3-5年一遇标准设计，无法应对极端天气条件下的强降雨事件。',
    impact: '中',
    responsibility: '设计单位',
  },
  {
    id: '4',
    level: '间接原因',
    title: '管网老化堵塞严重',
    description: '部分管网使用年限超过30年，老化破损严重，加上日常维护不到位，管网淤积堵塞情况普遍。',
    impact: '中',
    responsibility: '市政部门',
  },
];

const similarEvents = [
  {
    id: '1',
    name: '2023年7月城市内涝事件',
    date: '2023-07-20',
    similarity: 85,
    cause: '强降雨+排水不畅',
    casualties: '3人受伤',
    economicLoss: '约1.2亿元',
  },
  {
    id: '2',
    name: '2022年8月城区积水事件',
    date: '2022-08-12',
    similarity: 72,
    cause: '台风暴雨+管网老化',
    casualties: '无人员伤亡',
    economicLoss: '约5000万元',
  },
  {
    id: '3',
    name: '2021年6月内涝灾害事件',
    date: '2021-06-25',
    similarity: 68,
    cause: '持续降雨+排水系统不足',
    casualties: '1人死亡',
    economicLoss: '约8000万元',
  },
];

const suggestions = [
  { id: '1', content: '加快城市排水系统升级改造，提高设计标准至50年一遇', priority: '高', category: '基础设施' },
  { id: '2', content: '建立完善的城市内涝监测预警系统，提升预警准确性', priority: '高', category: '预警体系' },
  { id: '3', content: '加强多部门应急联动机制，明确各部门职责分工', priority: '中', category: '管理体系' },
  { id: '4', content: '增加城市绿地和透水路面比例，提高雨水自然渗透能力', priority: '中', category: '城市规划' },
  { id: '5', content: '定期开展排水管网清淤维护，确保管网通畅', priority: '低', category: '日常运维' },
];

function RootCausePage() {
  const [selectedEvent, setSelectedEvent] = useState('1');
  const [analysisType, setAnalysisType] = useState('major');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'tree' | 'details' | 'similar'>('tree');

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 1500);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case '根本原因': return 'bg-red-100 text-red-700 border-red-200';
      case '间接原因': return 'bg-orange-100 text-orange-700 border-orange-200';
      case '直接原因': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case '高': return 'text-red-600 bg-red-50';
      case '中': return 'text-orange-600 bg-orange-50';
      case '低': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '高': return 'bg-red-500';
      case '中': return 'bg-yellow-500';
      case '低': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const treeOption = {
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
    },
    series: [
      {
        type: 'tree',
        data: [rootCauseTree],
        top: '5%',
        left: '15%',
        bottom: '5%',
        right: '15%',
        symbolSize: 12,
        orient: 'TB',
        label: {
          position: 'top',
          rotate: 0,
          verticalAlign: 'middle',
          align: 'center',
          fontSize: 12,
        },
        leaves: {
          label: {
            position: 'bottom',
            rotate: 0,
            verticalAlign: 'top',
            align: 'center',
          },
        },
        emphasis: {
          focus: 'descendant',
        },
        expandAndCollapse: true,
        animationDuration: 550,
        animationDurationUpdate: 750,
        lineStyle: {
          color: '#cbd5e1',
          width: 2,
        },
        itemStyle: {
          color: '#3b82f6',
          borderColor: '#2563eb',
          borderWidth: 2,
        },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">根因分析</h1>
        <p className="mt-1 text-sm text-gray-500">深入分析事件的根本原因和形成机制</p>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">分析类型</label>
            <select
              value={analysisType}
              onChange={(e) => setAnalysisType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="normal">普通分析</option>
              <option value="major">重大分析</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  分析中...
                </>
              ) : (
                <>
                  <Play size={18} />
                  开始分析
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
          <button
            onClick={() => setActiveDetailTab('tree')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeDetailTab === 'tree'
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <GitBranch size={18} />
            根因树状图
          </button>
          <button
            onClick={() => setActiveDetailTab('details')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeDetailTab === 'details'
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FileText size={18} />
            根因详情
          </button>
          <button
            onClick={() => setActiveDetailTab('similar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeDetailTab === 'similar'
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <History size={18} />
            历史相似事件
          </button>
        </div>

        {activeDetailTab === 'tree' && (
          <div className="h-96">
            <ReactECharts option={treeOption} style={{ height: '100%', width: '100%' }} />
          </div>
        )}

        {activeDetailTab === 'details' && (
          <div className="space-y-4">
            {rootCauseDetails.map((item) => (
              <div
                key={item.id}
                className="p-4 border border-gray-100 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getLevelColor(item.level)}`}>
                      {item.level}
                    </span>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-xs text-gray-500 mb-1">影响程度</div>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getImpactColor(item.impact)}`}>
                      {item.impact}
                    </span>
                    <div className="text-xs text-gray-500 mt-2 mb-1">责任部门</div>
                    <span className="text-xs text-gray-700">{item.responsibility}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeDetailTab === 'similar' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">事件名称</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">发生时间</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">相似度</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">主要原因</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">人员伤亡</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">经济损失</th>
                </tr>
              </thead>
              <tbody>
                {similarEvents.map((event) => (
                  <tr key={event.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-orange-500" />
                        <span className="text-sm font-medium text-gray-900">{event.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock size={14} />
                        {event.date}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full"
                            style={{ width: `${event.similarity}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-primary-600">{event.similarity}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{event.cause}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{event.casualties}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{event.economicLoss}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <ThumbsUp size={24} className="text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">改进建议</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 font-medium">{item.content}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Scale size={12} />
                          {item.category}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">优先级:</span>
                          <span className={`w-2 h-2 rounded-full ${getPriorityColor(item.priority)}`}></span>
                          <span className="text-xs text-gray-600">{item.priority}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RootCausePage;
