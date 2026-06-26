import { useState, useEffect } from 'react';
import {
  Play,
  Plus,
  Filter,
  Search,
  AlertTriangle,
  Clock,
  MapPin,
  Eye,
  CheckCircle,
  FileText,
  Trash2,
  X,
  Video,
  ChevronDown,
  Calendar,
  Activity,
  Users,
  ClipboardList,
} from 'lucide-react';
import apiClient from '../api/client';

type EventLevel = 'low' | 'medium' | 'high' | 'critical';
type EventStatus = 'detected' | 'verified' | 'handling' | 'resolved' | 'closed';
type EventType = 'fire' | 'flood' | 'earthquake' | 'traffic' | 'medical' | 'other';

interface TimelineItem {
  time: string;
  status: string;
  description: string;
}

interface TaskItem {
  id: string;
  title: string;
  assigneeName: string;
  status: string;
  priority: string;
  deadline: string;
}

interface Event {
  id: string;
  title: string;
  eventTypeId?: string;
  type?: EventType;
  level: EventLevel;
  location?: string;
  time?: string;
  status: EventStatus;
  source?: string;
  description?: string;
  detectedAt?: string;
  verifiedAt?: string;
  resolvedAt?: string;
  timeline?: TimelineItem[];
  tasks?: TaskItem[];
}

interface Camera {
  id: string;
  name: string;
  location: string;
  hasAlert: boolean;
  alertLevel?: EventLevel;
}

const levelConfig = {
  low: { label: '低', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  medium: { label: '较大', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  high: { label: '重大', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  critical: { label: '特别重大', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
};

const statusConfig = {
  detected: { label: '待验证', bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
  verified: { label: '已验证', bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle },
  handling: { label: '处置中', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Activity },
  resolved: { label: '已完成', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  closed: { label: '已关闭', bg: 'bg-gray-100', text: 'text-gray-500', icon: X },
};

const typeConfig: Record<string, string> = {
  fire: '火灾',
  flood: '洪涝',
  earthquake: '地震',
  traffic: '交通事故',
  medical: '医疗急救',
  other: '其他',
};

const taskStatusMap: Record<string, string> = {
  pending: '待派发',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

const mockCameras: Camera[] = [
  { id: 'cam1', name: '监控-01', location: '东门入口', hasAlert: true, alertLevel: 'critical' },
  { id: 'cam2', name: '监控-02', location: '中心广场', hasAlert: false },
  { id: 'cam3', name: '监控-03', location: '西区仓库', hasAlert: true, alertLevel: 'medium' },
  { id: 'cam4', name: '监控-04', location: '北区办公楼', hasAlert: false },
];

function EventMonitorPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    try {
      const result = await apiClient.get('/events');
      if (result.code === 0) {
        const eventList = result.data.list.map((event: any) => ({
          ...event,
          time: event.detectedAt ? new Date(event.detectedAt).toLocaleString('zh-CN') : new Date(event.createdAt).toLocaleString('zh-CN'),
          timeline: event.data?.timeline || [
            { time: event.detectedAt ? new Date(event.detectedAt).toLocaleTimeString('zh-CN') : new Date(event.createdAt).toLocaleTimeString('zh-CN'), status: '检测', description: '系统检测到异常事件' },
          ],
        }));
        setEvents(eventList);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  const fetchEventTasks = async (eventId: string): Promise<TaskItem[]> => {
    try {
      const result = await apiClient.get('/tasks', { params: { eventId, pageSize: 100 } });
      if (result.code === 0) {
        return result.data.list;
      }
    } catch (err) {
      console.error('Failed to fetch event tasks:', err);
    }
    return [];
  };

  const handleVerify = async (id: string) => {
    try {
      const result = await apiClient.post(`/events/${id}/verify`, { verified: true });
      if (result.code === 0) {
        fetchEvents();
      }
    } catch (err) {
      console.error('Failed to verify event:', err);
    }
  };

  const handleGeneratePlan = async (id: string) => {
    try {
      const result = await apiClient.post(`/events/${id}/level-judge`, { level: 'high', reason: '自动生成处置方案' });
      if (result.code === 0) {
        const updateResult = await apiClient.put(`/events/${id}`, { status: 'handling' });
        if (updateResult.code === 0) {
          fetchEvents();
        }
      }
    } catch (err) {
      console.error('Failed to generate plan:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await apiClient.delete(`/events/${id}`);
      if (result.code === 0) {
        fetchEvents();
      }
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const handleSimulateDetection = async () => {
    setLoading(true);
    try {
      const types = ['fire', 'flood', 'traffic', 'medical', 'other'] as EventType[];
      const locations = ['东区', '西区', '南区', '北区'];
      
      const randomType = types[Math.floor(Math.random() * types.length)];
      const randomLocation = locations[Math.floor(Math.random() * locations.length)];

      const result = await apiClient.post('/events/detect', {
        videoSource: 'simulated',
        title: `新检测事件 - ${typeConfig[randomType]}`,
        description: '这是一条模拟生成的检测事件，用于演示系统的事件检测和通知功能。',
        location: `${randomLocation}随机位置`,
        confidence: 0.85 + Math.random() * 0.14,
      });

      if (result.code === 0) {
        fetchEvents();
      }
    } catch (err) {
      console.error('Failed to simulate detection:', err);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (event: Event) => {
    const tasks = await fetchEventTasks(event.id);
    setSelectedEvent({ ...event, tasks });
    setShowDetailModal(true);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = events.filter((event) => {
    if (searchText && !event.title.includes(searchText) && !(event.location || '').includes(searchText)) {
      return false;
    }
    if (filterLevel && event.level !== filterLevel) return false;
    if (filterStatus && event.status !== filterStatus) return false;
    if (filterType && (event.type || '') !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">事件监测</h1>
          <p className="mt-1 text-sm text-gray-500">实时监测和管理应急事件</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulateDetection}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={18} />
            {loading ? '检测中...' : '模拟检测'}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Plus size={18} />
            手动上报
          </button>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-220px)] min-h-[600px]">
        <div className="w-1/2 flex flex-col gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Video size={20} className="text-primary-600" />
                视频监控
              </h3>
              <span className="text-sm text-gray-500">共4路监控</span>
            </div>
            <div className="grid grid-cols-2 gap-4 flex-1">
              {mockCameras.map((camera) => (
                <div
                  key={camera.id}
                  className={`relative rounded-lg overflow-hidden border-2 ${
                    camera.hasAlert && camera.alertLevel
                      ? levelConfig[camera.alertLevel].border
                      : 'border-gray-200'
                  } bg-gray-900`}
                >
                  <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    <Video size={32} className="text-gray-600" />
                  </div>
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${camera.hasAlert ? 'animate-pulse' : 'bg-green-500'}`}
                      style={{ backgroundColor: camera.hasAlert && camera.alertLevel ? undefined : '#22c55e' }}
                    ></span>
                    <span className="text-xs text-white bg-black/50 px-1.5 py-0.5 rounded">{camera.name}</span>
                  </div>
                  {camera.hasAlert && camera.alertLevel && (
                    <div className={`absolute top-2 right-2 ${levelConfig[camera.alertLevel].bg} ${levelConfig[camera.alertLevel].text} text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1`}>
                      <AlertTriangle size={12} />
                      告警
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                    <p className="text-xs text-gray-300">{camera.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-1/2 flex flex-col gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-primary-600" />
                  事件列表
                </h3>
                <span className="text-sm text-gray-500">共 {filteredEvents.length} 条</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="搜索事件标题、地点..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
                <button
                  onClick={() => setShowFilter(!showFilter)}
                  className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-colors ${
                    showFilter || filterLevel || filterStatus || filterType
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Filter size={16} />
                  筛选
                  <ChevronDown size={14} />
                </button>
              </div>
              {showFilter && (
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">事件等级</label>
                    <select
                      value={filterLevel}
                      onChange={(e) => setFilterLevel(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">全部等级</option>
                      <option value="low">低</option>
                      <option value="medium">较大</option>
                      <option value="high">重大</option>
                      <option value="critical">特别重大</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">事件状态</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">全部状态</option>
                      <option value="detected">待验证</option>
                      <option value="verified">已验证</option>
                      <option value="handling">处置中</option>
                      <option value="resolved">已完成</option>
                      <option value="closed">已关闭</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">事件类型</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">全部类型</option>
                      <option value="fire">火灾</option>
                      <option value="flood">洪涝</option>
                      <option value="earthquake">地震</option>
                      <option value="traffic">交通事故</option>
                      <option value="medical">医疗急救</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredEvents.map((event) => {
                const level = levelConfig[event.level];
                const status = statusConfig[event.status];
                const StatusIcon = status.icon;
                return (
                  <div
                    key={event.id}
                    className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${level.border}`}
                    onClick={() => openDetail(event)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${level.dot}`}></span>
                        <h4 className="font-medium text-gray-900 text-sm">{event.title}</h4>
                      </div>
                      <span className={`${level.bg} ${level.text} text-xs px-2 py-0.5 rounded-full font-medium`}>
                        {level.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {event.location || '未知位置'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {event.time?.split(' ')[1] || '-'}
                      </span>
                      <span>{event.type ? typeConfig[event.type] : '其他'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`${status.bg} ${status.text} text-xs px-2 py-0.5 rounded-full flex items-center gap-1`}>
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openDetail(event)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="查看详情"
                        >
                          <Eye size={14} />
                        </button>
                        {event.status === 'detected' && (
                          <button
                            onClick={() => handleVerify(event.id)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="验证"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                        {(event.status === 'verified' || event.status === 'detected') && (
                          <button
                            onClick={() => handleGeneratePlan(event.id)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="生成方案"
                          >
                            <FileText size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredEvents.length === 0 && (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                  暂无符合条件的事件
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDetailModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`${levelConfig[selectedEvent.level].bg} ${levelConfig[selectedEvent.level].text} text-sm px-3 py-1 rounded-full font-medium`}>
                    {levelConfig[selectedEvent.level].label}级
                  </span>
                  <span className={`${statusConfig[selectedEvent.status].bg} ${statusConfig[selectedEvent.status].text} text-sm px-3 py-1 rounded-full font-medium`}>
                    {statusConfig[selectedEvent.status].label}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{selectedEvent.title}</h2>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">基本信息</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">事件类型</span>
                      <span className="text-gray-900 font-medium">{selectedEvent.type ? typeConfig[selectedEvent.type] : '其他'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">发生地点</span>
                      <span className="text-gray-900 font-medium">{selectedEvent.location || '未知位置'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">发生时间</span>
                      <span className="text-gray-900 font-medium">{selectedEvent.time || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">事件来源</span>
                      <span className="text-gray-900 font-medium">{selectedEvent.source || '-'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">事件描述</h4>
                  <div className="bg-gray-50 rounded-lg p-4 h-[calc(100%-24px)]">
                    <p className="text-sm text-gray-700 leading-relaxed">{selectedEvent.description || '暂无描述'}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <Activity size={16} />
                  处置时间线
                </h4>
                <div className="relative pl-6">
                  <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-200"></div>
                  {(selectedEvent.timeline || []).map((item, index) => (
                    <div key={index} className="relative mb-4 last:mb-0">
                      <div className="absolute -left-6 w-4 h-4 bg-primary-500 rounded-full border-2 border-white"></div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{item.status}</span>
                          <span className="text-xs text-gray-500">{item.time}</span>
                        </div>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <ClipboardList size={16} />
                  相关任务
                </h4>
                {(selectedEvent.tasks || []).length > 0 ? (
                  <div className="space-y-2">
                    {(selectedEvent.tasks || []).map((task) => (
                      <div key={task.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <Users size={14} className="text-primary-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{task.title}</p>
                            <p className="text-xs text-gray-500">指派人：{task.assigneeName || '-'}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full border ${
                          task.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          task.status === 'cancelled' ? 'bg-gray-100 text-gray-500 border-gray-200' :
                          'bg-yellow-100 text-yellow-700 border-yellow-200'
                        }`}>
                          {taskStatusMap[task.status] || task.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-400 text-sm">
                    暂无相关任务
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                关闭
              </button>
              {selectedEvent.status === 'detected' && (
                <button
                  onClick={() => {
                    handleVerify(selectedEvent.id);
                    setShowDetailModal(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  验证事件
                </button>
              )}
              {(selectedEvent.status === 'verified' || selectedEvent.status === 'detected') && (
                <button
                  onClick={() => {
                    handleGeneratePlan(selectedEvent.id);
                    setShowDetailModal(false);
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                >
                  生成处置方案
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventMonitorPage;