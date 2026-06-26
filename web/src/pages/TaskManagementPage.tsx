import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Filter,
  Search,
  ChevronDown,
  Calendar,
  User,
  AlertTriangle,
  Clock,
  Play,
  CheckCircle,
  XCircle,
  X,
  FileText,
  List,
  LayoutGrid,
  UserPlus,
  Activity,
  Flag,
  Check,
  AlertCircle,
  Save,
  Target,
  CalendarDays,
  MessageSquare,
  GripVertical,
} from 'lucide-react';
import apiClient from '../api/client';

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

interface Task {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeName: string;
  deadline: string;
  eventTitle?: string;
  eventId: string;
  description: string;
  solutionData?: any;
  createdAt: string;
}

interface Person {
  id: string;
  name: string;
  position: string;
  department: string;
  phone: string;
}

interface NewTaskForm {
  title: string;
  description: string;
  eventId: string;
  priority: TaskPriority;
  deadline: string;
  assigneeId: string;
  assigneeName: string;
}

const priorityConfig = {
  high: { label: '高', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-200' },
  medium: { label: '中', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500', border: 'border-yellow-200' },
  low: { label: '低', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-200' },
  urgent: { label: '紧急', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-600', border: 'border-red-300' },
  critical: { label: '特别重大', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-600', border: 'border-red-300' },
};

const statusConfig = {
  pending: { label: '待派发', bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
  in_progress: { label: '进行中', bg: 'bg-blue-100', text: 'text-blue-700', icon: Play },
  completed: { label: '已完成', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  cancelled: { label: '已取消', bg: 'bg-gray-100', text: 'text-gray-500', icon: XCircle },
};

const columns: { status: TaskStatus; title: string; color: string }[] = [
  { status: 'pending', title: '待派发', color: 'bg-gray-500' },
  { status: 'in_progress', title: '进行中', color: 'bg-blue-500' },
  { status: 'completed', title: '已完成', color: 'bg-green-500' },
  { status: 'cancelled', title: '已取消', color: 'bg-gray-400' },
];

const taskStatusMap: Record<string, string> = {
  pending: '待派发',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};


function TaskManagementPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState<NewTaskForm>({
    title: '',
    description: '',
    eventId: '',
    priority: 'medium',
    deadline: '',
    assigneeId: '',
    assigneeName: '',
  });
  const [buttonStates, setButtonStates] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});

  const setButtonState = (action: string, state: 'idle' | 'loading' | 'success' | 'error') => {
    setButtonStates(prev => ({ ...prev, [action]: state }));
    if (state === 'success' || state === 'error') {
      setTimeout(() => setButtonStates(prev => ({ ...prev, [action]: 'idle' })), 2000);
    }
  };

  const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setActiveTask(task);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverColumn(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setOverColumn(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setOverColumn(null);
    
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return;

    if (targetStatus !== task.status) {
      try {
        await apiClient.put(`/tasks/${taskId}/status`, {
          status: targetStatus,
          remark: `拖拽变更状态: ${taskStatusMap[task.status]} → ${taskStatusMap[targetStatus]}`,
        });
        showNotification('success', `任务已从${taskStatusMap[task.status]}移至${taskStatusMap[targetStatus]}`);
        fetchTasks();
      } catch (err: any) {
        showNotification('error', err.message || '状态更新失败');
      }
    }
    setActiveTask(null);
  }, [tasks]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchTasks = async () => {
    try {
      const result = await apiClient.get('/tasks', { params: { pageSize: 100 } });
      if (result.code === 0) {
        setTasks(result.data.list);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  const fetchEvents = async () => {
    try {
      const result = await apiClient.get('/events', { params: { pageSize: 100 } });
      if (result.code === 0) {
        setEvents(result.data.list.map((e: any) => ({ id: e.id, title: e.title })));
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  const fetchPersons = async () => {
    try {
      const result = await apiClient.get('/config/organization');
      if (result.success) {
        setPersons(result.data.list);
      }
    } catch (err) {
      console.error('Failed to fetch persons:', err);
    }
  };

  const handleAssign = async () => {
    if (!assigningTaskId || !selectedPersonId) return;
    const person = persons.find(p => p.id === selectedPersonId);
    if (!person) return;

    setButtonState(`assign-${assigningTaskId}`, 'loading');
    try {
      const result = await apiClient.post(`/tasks/${assigningTaskId}/assign`, {
        assigneeId: person.id,
        assigneeName: person.name,
      });

      if (result.code === 0) {
        setButtonState(`assign-${assigningTaskId}`, 'success');
        showNotification('success', `成功指派给 ${person.name}`);
        if (selectedTask && selectedTask.id === assigningTaskId) {
          setSelectedTask({
            ...selectedTask,
            assigneeName: person.name,
            status: 'in_progress' as TaskStatus,
          });
        }
        fetchTasks();
        setShowAssignModal(false);
        setAssigningTaskId(null);
        setSelectedPersonId(null);
      } else {
        setButtonState(`assign-${assigningTaskId}`, 'error');
        showNotification('error', '指派失败');
      }
    } catch (err: any) {
      setButtonState(`assign-${assigningTaskId}`, 'error');
      showNotification('error', err.message || '指派失败');
    }
  };

  const handleStart = async (id: string) => {
    setButtonState(`start-${id}`, 'loading');
    try {
      const result = await apiClient.put(`/tasks/${id}/status`, { status: 'in_progress' });
      if (result.code === 0) {
        setButtonState(`start-${id}`, 'success');
        showNotification('success', '任务已开始执行');
        if (selectedTask && selectedTask.id === id) {
          setSelectedTask({
            ...selectedTask,
            status: 'in_progress' as TaskStatus,
          });
        }
        fetchTasks();
      } else {
        setButtonState(`start-${id}`, 'error');
        showNotification('error', '操作失败');
      }
    } catch (err: any) {
      setButtonState(`start-${id}`, 'error');
      showNotification('error', err.message || '操作失败');
    }
  };

  const handleComplete = async (id: string) => {
    setButtonState(`complete-${id}`, 'loading');
    try {
      const result = await apiClient.post(`/tasks/${id}/complete`, { remark: '任务已完成' });
      if (result.code === 0) {
        setButtonState(`complete-${id}`, 'success');
        showNotification('success', '任务已完成');
        if (selectedTask && selectedTask.id === id) {
          setSelectedTask({
            ...selectedTask,
            status: 'completed' as TaskStatus,
          });
        }
        fetchTasks();
      } else {
        setButtonState(`complete-${id}`, 'error');
        showNotification('error', '操作失败');
      }
    } catch (err: any) {
      setButtonState(`complete-${id}`, 'error');
      showNotification('error', err.message || '操作失败');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('确定要取消该任务吗？取消后将无法恢复。')) {
      return;
    }
    setButtonState(`cancel-${id}`, 'loading');
    try {
      const result = await apiClient.put(`/tasks/${id}/status`, {
        status: 'cancelled',
        remark: '任务已取消',
      });
      if (result.code === 0) {
        setButtonState(`cancel-${id}`, 'success');
        showNotification('success', '任务已取消');
        if (selectedTask && selectedTask.id === id) {
          setSelectedTask({
            ...selectedTask,
            status: 'cancelled' as TaskStatus,
          });
        }
        fetchTasks();
      } else {
        setButtonState(`cancel-${id}`, 'error');
        showNotification('error', '操作失败');
      }
    } catch (err: any) {
      setButtonState(`cancel-${id}`, 'error');
      showNotification('error', err.message || '取消失败');
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskForm.title || !newTaskForm.eventId) {
      showNotification('error', '请填写任务标题和关联事件');
      return;
    }

    setLoading(true);
    try {
      const result = await apiClient.post('/tasks', {
        title: newTaskForm.title,
        description: newTaskForm.description,
        eventId: newTaskForm.eventId,
        priority: newTaskForm.priority,
        deadline: newTaskForm.deadline,
        assigneeId: newTaskForm.assigneeId || undefined,
        assigneeName: newTaskForm.assigneeName || undefined,
      });

      if (result.code === 0) {
        showNotification('success', '任务创建成功');
        fetchTasks();
        setShowNewTaskModal(false);
        setNewTaskForm({
          title: '',
          description: '',
          eventId: '',
          priority: 'medium',
          deadline: '',
          assigneeId: '',
          assigneeName: '',
        });
      }
    } catch (err: any) {
      showNotification('error', err.message || '任务创建失败');
    } finally {
      setLoading(false);
    }
  };

  const openAssignModal = (taskId: string) => {
    setAssigningTaskId(taskId);
    setSelectedPersonId(null);
    setShowAssignModal(true);
  };

  const handleClose = () => {
    setShowDetailModal(false);
  };

  const openDetail = (task: Task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  useEffect(() => {
    fetchTasks();
    fetchEvents();
    fetchPersons();
  }, []);

  const filteredTasks = tasks.filter((task) => {
    if (searchText && !task.title.includes(searchText) && !(task.assigneeName || '').includes(searchText)) {
      return false;
    }
    if (filterStatus && task.status !== filterStatus) return false;
    if (filterPriority && task.priority !== filterPriority) return false;
    return true;
  });

  const getTasksByStatus = (status: TaskStatus) => {
    return filteredTasks.filter((t) => t.status === status);
  };

  const getEventTitle = (eventId: string) => {
    return events.find(e => e.id === eventId)?.title || '未知事件';
  };

  const formatSolutionData = (data: any) => {
    if (!data) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return { raw: data };
      }
    }
    return data;
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg transition-all ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">任务管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理应急处置任务和进度跟踪</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewTaskModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus size={18} />
            新建任务
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索任务标题、指派人..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-colors ${
                showFilter || filterStatus || filterPriority
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter size={16} />
              筛选
              <ChevronDown size={14} />
            </button>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'kanban' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="看板视图"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="列表视图"
            >
              <List size={18} />
            </button>
          </div>
        </div>
        {showFilter && (
          <div className="pt-3 border-t border-gray-100 grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">任务状态</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">全部状态</option>
                <option value="pending">待派发</option>
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">优先级</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">全部优先级</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
                <option value="urgent">紧急</option>
                <option value="critical">特别重大</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">关联事件</label>
              <select className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">全部事件</option>
                {events.map(e => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">指派人</label>
              <select className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">全部人员</option>
                {[...new Set(tasks.map(t => t.assigneeName).filter(Boolean))].map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-4 gap-4 h-[calc(100vh-340px)] min-h-[500px]">
          {columns.map((col) => {
            const colTasks = getTasksByStatus(col.status);
            const StatusIcon = statusConfig[col.status].icon;
            return (
              <div
                key={col.status}
                className={`flex flex-col bg-gray-50 rounded-lg transition-all h-full ${overColumn === col.status ? 'bg-gray-100 ring-2 ring-primary-500 ring-offset-2' : ''}`}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.status)}
              >
                <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                    <h3 className="font-medium text-gray-900 text-sm">{col.title} ({colTasks.length})</h3>
                  </div>
                  <StatusIcon size={14} className="text-gray-400" />
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[300px]">
                  {colTasks.map((task) => {
                    const priority = priorityConfig[task.priority];
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        className={`bg-white rounded-lg p-3 border ${priority.border} cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none ${activeTask?.id === task.id ? 'opacity-50' : ''}`}
                        onClick={() => openDetail(task)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <GripVertical size={14} className="text-gray-300 hover:text-gray-500" />
                            <h4 className="font-medium text-gray-900 text-sm flex-1">{task.title}</h4>
                          </div>
                          <span className={`${priority.bg} ${priority.text} text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0`}>
                            {priority.label}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <AlertTriangle size={12} />
                            <span className="truncate">{getEventTitle(task.eventId)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <User size={12} />
                            <span>{task.assigneeName || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Calendar size={12} />
                            <span>{task.deadline || '-'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <div className="flex-1 h-full flex items-center justify-center text-gray-400 text-sm py-20">
                      拖拽任务到此处
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">任务标题</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">优先级</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">状态</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">关联事件</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">指派人</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">截止时间</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTasks.map((task) => {
                const priority = priorityConfig[task.priority];
                const status = statusConfig[task.status];
                const StatusIcon = status.icon;
                return (
                  <tr key={task.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(task)}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{task.title}</td>
                    <td className="px-4 py-3">
                      <span className={`${priority.bg} ${priority.text} text-xs px-2 py-0.5 rounded-full font-medium`}>
                        {priority.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`${status.bg} ${status.text} text-xs px-2 py-0.5 rounded-full flex items-center gap-1 w-fit`}>
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{getEventTitle(task.eventId)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{task.assigneeName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{task.deadline || '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(task);
                        }}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                    暂无符合条件的任务
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`${priorityConfig[selectedTask.priority].bg} ${priorityConfig[selectedTask.priority].text} text-sm px-3 py-1 rounded-full font-medium flex items-center gap-1`}>
                    <Flag size={14} />
                    {priorityConfig[selectedTask.priority].label}优先级
                  </span>
                  <span className={`${statusConfig[selectedTask.status].bg} ${statusConfig[selectedTask.status].text} text-sm px-3 py-1 rounded-full font-medium`}>
                    {statusConfig[selectedTask.status].label}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{selectedTask.title}</h2>
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
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-2">
                        <User size={14} />
                        指派人
                      </span>
                      <span className="text-gray-900 font-medium">{selectedTask.assigneeName || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-2">
                        <CalendarDays size={14} />
                        截止时间
                      </span>
                      <span className="text-gray-900 font-medium">{selectedTask.deadline || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Target size={14} />
                        关联事件
                      </span>
                      <span className="text-gray-900 font-medium text-right text-xs max-w-[60%]">{getEventTitle(selectedTask.eventId)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Clock size={14} />
                        创建时间
                      </span>
                      <span className="text-gray-900 font-medium text-xs">{selectedTask.createdAt || '-'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                    <MessageSquare size={14} />
                    任务描述
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 h-[calc(100%-24px)]">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedTask.description || '暂无描述'}</p>
                  </div>
                </div>
              </div>

              {selectedTask.solutionData && (() => {
                const solution = formatSolutionData(selectedTask.solutionData);
                if (!solution) return null;
                
                const hasAssignHistory = solution.assignHistory && solution.assignHistory.length > 0;
                const hasCompletion = solution.completion;
                
                if (!hasAssignHistory && !hasCompletion && !solution.solution && !solution.analysis) {
                  return null;
                }
                
                return (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                      <FileText size={16} />
                      任务记录
                    </h4>
                    <div className="space-y-4">
                      {solution.solution && typeof solution.solution === 'string' && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                          <div className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded w-fit mb-3">处置方案</div>
                          <div className="space-y-4">
                            {solution.solution.split('\n').filter((line: string) => line.trim()).map((line: string, index: number) => (
                              <div key={index} className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-white text-xs font-bold">{index + 1}</span>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">{line.trim().replace(/^[\d\.\-\*]+/, '').trim()}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {solution.analysis && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                          <div className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded w-fit mb-3">处置方案</div>
                          <div className="space-y-3">
                            {solution.analysis.map((step: any, index: number) => (
                              <div key={index} className="bg-white rounded-lg p-3 border border-blue-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                                    步骤 {index + 1}
                                  </span>
                                  <span className="text-sm font-medium text-gray-900">{step.title || step.name || '未命名步骤'}</span>
                                </div>
                                {step.description && (
                                  <p className="text-sm text-gray-600 ml-6">{step.description}</p>
                                )}
                                {step.content && (
                                  <p className="text-sm text-gray-600 ml-6">{step.content}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {hasAssignHistory && (
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                          <div className="text-xs font-bold text-gray-600 bg-gray-200 px-2 py-0.5 rounded w-fit mb-3">指派历史</div>
                          <div className="space-y-3">
                            {solution.assignHistory.map((record: any, index: number) => (
                              <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <User size={14} className="text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{record.assigneeName}</p>
                                    <p className="text-xs text-gray-500">ID: {record.assigneeId}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">指派时间</p>
                                  <p className="text-sm text-gray-700">{record.assignedAt ? new Date(record.assignedAt).toLocaleString('zh-CN') : '-'}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {hasCompletion && (
                        <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                          <div className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded w-fit mb-3">完成信息</div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">完成时间</span>
                              <span className="text-sm text-gray-900 font-medium">
                                {solution.completion.completedAt ? new Date(solution.completion.completedAt).toLocaleString('zh-CN') : '-'}
                              </span>
                            </div>
                            {solution.completion.remark && (
                              <div>
                                <span className="text-sm text-gray-500">备注</span>
                                <p className="text-sm text-gray-900 mt-1">{solution.completion.remark}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <Activity size={16} />
                  操作日志
                </h4>
                <div className="relative pl-6">
                  <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-200"></div>
                  {selectedTask.solutionData?.statusHistory && selectedTask.solutionData.statusHistory.length > 0 ? (
                    selectedTask.solutionData.statusHistory.map((log: any, index: number) => (
                      <div key={index} className="relative mb-4 last:mb-0">
                        <div className="absolute -left-6 w-4 h-4 bg-primary-500 rounded-full border-2 border-white"></div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">状态变更: {taskStatusMap[log.status] || log.status}</span>
                            <span className="text-xs text-gray-500">{log.changedAt ? new Date(log.changedAt).toLocaleString('zh-CN') : '-'}</span>
                          </div>
                          {log.remark && <p className="text-sm text-gray-600">{log.remark}</p>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-500">暂无操作日志</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                关闭
              </button>
              {selectedTask.status === 'pending' && (
                <button
                  onClick={() => openAssignModal(selectedTask.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={buttonStates[`assign-${selectedTask.id}`] === 'loading'}
                >
                  {buttonStates[`assign-${selectedTask.id}`] === 'loading' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      指派中...
                    </>
                  ) : buttonStates[`assign-${selectedTask.id}`] === 'success' ? (
                    <>
                      <CheckCircle size={16} className="text-green-300" />
                      已指派
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      指派并开始
                    </>
                  )}
                </button>
              )}
              {selectedTask.status === 'pending' && (
                <button
                  onClick={() => handleStart(selectedTask.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors text-sm ${
                    buttonStates[`start-${selectedTask.id}`] === 'success'
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={buttonStates[`start-${selectedTask.id}`] === 'loading'}
                >
                  {buttonStates[`start-${selectedTask.id}`] === 'loading' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      启动中...
                    </>
                  ) : buttonStates[`start-${selectedTask.id}`] === 'success' ? (
                    <>
                      <CheckCircle size={16} />
                      已启动
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      开始
                    </>
                  )}
                </button>
              )}
              {(selectedTask.status === 'in_progress') && (
                <button
                  onClick={() => handleComplete(selectedTask.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors text-sm ${
                    buttonStates[`complete-${selectedTask.id}`] === 'success'
                      ? 'bg-gray-500 text-white'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={buttonStates[`complete-${selectedTask.id}`] === 'loading'}
                >
                  {buttonStates[`complete-${selectedTask.id}`] === 'loading' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      完成中...
                    </>
                  ) : buttonStates[`complete-${selectedTask.id}`] === 'success' ? (
                    <>
                      <CheckCircle size={16} />
                      已完成
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      完成
                    </>
                  )}
                </button>
              )}
              {(selectedTask.status === 'pending' || selectedTask.status === 'in_progress') && (
                <button
                  onClick={() => handleCancel(selectedTask.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors text-sm ${
                    buttonStates[`cancel-${selectedTask.id}`] === 'success'
                      ? 'bg-gray-400 text-white'
                      : 'bg-gray-500 text-white hover:bg-gray-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={buttonStates[`cancel-${selectedTask.id}`] === 'loading'}
                >
                  {buttonStates[`cancel-${selectedTask.id}`] === 'loading' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      取消中...
                    </>
                  ) : buttonStates[`cancel-${selectedTask.id}`] === 'success' ? (
                    <>
                      <XCircle size={16} />
                      已取消
                    </>
                  ) : (
                    <>
                      <XCircle size={16} />
                      取消任务
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">选择指派人员</h2>
                <p className="text-sm text-gray-500 mt-1">请从下方列表中选择要指派的人员</p>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssigningTaskId(null);
                  setSelectedPersonId(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto">
              <div className="space-y-2">
                {persons.map((person) => (
                  <div
                    key={person.id}
                    onClick={() => setSelectedPersonId(person.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPersonId === person.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPersonId === person.id
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedPersonId === person.id && <Check size={12} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{person.name}</p>
                      <p className="text-xs text-gray-500">{person.position} | {person.department}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{person.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssigningTaskId(null);
                  setSelectedPersonId(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedPersonId || buttonStates[`assign-${assigningTaskId}`] === 'loading'}
                className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  selectedPersonId && buttonStates[`assign-${assigningTaskId}`] !== 'loading'
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {buttonStates[`assign-${assigningTaskId}`] === 'loading' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    指派中...
                  </>
                ) : buttonStates[`assign-${assigningTaskId}`] === 'success' ? (
                  <>
                    <CheckCircle size={16} />
                    指派成功
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    确认指派
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">新建任务</h2>
                <p className="text-sm text-gray-500 mt-1">请填写任务信息</p>
              </div>
              <button
                onClick={() => {
                  setShowNewTaskModal(false);
                  setNewTaskForm({
                    title: '',
                    description: '',
                    eventId: '',
                    priority: 'medium',
                    deadline: '',
                    assigneeId: '',
                    assigneeName: '',
                  });
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">任务标题 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  placeholder="请输入任务标题"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">关联事件 <span className="text-red-500">*</span></label>
                <select
                  value={newTaskForm.eventId}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, eventId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value="">请选择关联事件</option>
                  {events.map(e => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">优先级</label>
                  <select
                    value={newTaskForm.priority}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value as TaskPriority })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                    <option value="urgent">紧急</option>
                    <option value="critical">特别重大</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">截止时间</label>
                  <input
                    type="datetime-local"
                    value={newTaskForm.deadline}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">指派人员</label>
                <select
                  value={newTaskForm.assigneeId}
                  onChange={(e) => {
                    const person = persons.find(p => p.id === e.target.value);
                    setNewTaskForm({
                      ...newTaskForm,
                      assigneeId: e.target.value,
                      assigneeName: person?.name || '',
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value="">请选择指派人员（可选）</option>
                  {persons.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - {p.position}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">任务描述</label>
                <textarea
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  placeholder="请输入任务描述"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewTaskModal(false);
                  setNewTaskForm({
                    title: '',
                    description: '',
                    eventId: '',
                    priority: 'medium',
                    deadline: '',
                    assigneeId: '',
                    assigneeName: '',
                  });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={handleCreateTask}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  !loading
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    创建中...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    创建任务
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskManagementPage;