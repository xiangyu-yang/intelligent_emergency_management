import { useState } from 'react';
import {
  Search,
  Plus,
  X,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  FileText,
  Users,
  Package,
  Send,
  Archive,
  ListOrdered,
  StickyNote,
  User,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { generateId, classNames, formatDate } from '../utils';

type EventLevel = '一级' | '二级' | '三级' | '四级';
type EventStatus = 'active' | 'handled' | 'closed';
type SolutionStatus = 'draft' | 'published' | 'archived';
type TaskPriority = 'high' | 'medium' | 'low';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

interface EmergencyEvent {
  id: string;
  title: string;
  type: string;
  level: EventLevel;
  status: EventStatus;
  time: string;
  description: string;
}

interface SolutionStep {
  id: string;
  order: number;
  title: string;
  description: string;
}

interface SolutionResource {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

interface SolutionPersonnel {
  id: string;
  role: string;
  count: number;
}

interface Solution {
  id: string;
  eventId: string;
  title: string;
  description: string;
  level: EventLevel;
  version: string;
  status: SolutionStatus;
  planTemplateName: string;
  createdAt: string;
  publishedAt?: string;
  steps: SolutionStep[];
  resources: SolutionResource[];
  personnel: SolutionPersonnel[];
  notes: string;
}

interface SolutionTask {
  id: string;
  solutionId: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignee: string;
  deadline: string;
  description: string;
}

const eventLevelConfig = {
  '一级': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  '二级': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  '三级': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  '四级': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
};

const eventStatusConfig = {
  active: { label: '处置中', bg: 'bg-blue-100', text: 'text-blue-700', icon: Play },
  handled: { label: '已处置', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  closed: { label: '已关闭', bg: 'bg-gray-100', text: 'text-gray-600', icon: XCircle },
};

const solutionStatusConfig = {
  draft: { label: '草稿', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
  published: { label: '已发布', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  archived: { label: '已归档', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
};

const taskPriorityConfig = {
  high: { label: '高', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-200' },
  medium: { label: '中', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500', border: 'border-yellow-200' },
  low: { label: '低', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-200' },
};

const taskStatusConfig = {
  pending: { label: '待派发', bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
  in_progress: { label: '进行中', bg: 'bg-blue-100', text: 'text-blue-700', icon: Play },
  completed: { label: '已完成', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  overdue: { label: '已逾期', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
};

const mockEvents: EmergencyEvent[] = [
  {
    id: 'e1',
    title: '东区仓库发生火灾险情',
    type: '火灾事故',
    level: '一级',
    status: 'active',
    time: '2024-01-15 14:30:00',
    description: '东区A栋3层仓库突发火情，火势有蔓延趋势，现场有人员被困。',
  },
  {
    id: 'e2',
    title: '西区道路交通事故',
    type: '交通事故',
    level: '二级',
    status: 'handled',
    time: '2024-01-15 13:45:00',
    description: '西区主干道发生多车追尾事故，有人员受伤。',
  },
  {
    id: 'e3',
    title: '南区地下车库积水',
    type: '洪涝灾害',
    level: '三级',
    status: 'active',
    time: '2024-01-15 12:20:00',
    description: '持续暴雨导致南区地下车库积水严重，最深处达50cm。',
  },
  {
    id: 'e4',
    title: '中心广场人员晕倒',
    type: '公共卫生事件',
    level: '四级',
    status: 'closed',
    time: '2024-01-15 11:10:00',
    description: '中心广场一名游客突发晕倒，疑似中暑。',
  },
  {
    id: 'e5',
    title: '北区楼体疑似结构异常',
    type: '安全事故',
    level: '二级',
    status: 'active',
    time: '2024-01-15 10:40:00',
    description: '北区办公楼出现墙体裂缝，疑似结构异常。',
  },
  {
    id: 'e6',
    title: '化工园区气体泄漏',
    type: '安全事故',
    level: '一级',
    status: 'handled',
    time: '2024-01-14 16:20:00',
    description: '化工园区反应釜故障导致有害气体泄漏。',
  },
];

const mockSolutions: Solution[] = [
  {
    id: 's1',
    eventId: 'e1',
    title: '东区仓库火灾处置方案',
    description: '针对东区仓库火灾的专项处置方案，包含人员疏散、灭火救援、医疗保障等内容。',
    level: '一级',
    version: 'v1.2',
    status: 'published',
    planTemplateName: '火灾事故应急预案',
    createdAt: '2024-01-15 14:32:00',
    publishedAt: '2024-01-15 14:35:00',
    steps: [
      { id: 'st1', order: 1, title: '火情侦察', description: '立即安排消防人员进入现场侦察火情，确定燃烧范围、人员被困位置、危险物品等情况。' },
      { id: 'st2', order: 2, title: '人员疏散', description: '组织各楼层负责人引导人员有序撤离，安排人员在关键路口疏导，确保所有人员安全撤离到指定集合点。' },
      { id: 'st3', order: 3, title: '灭火战斗', description: '调派消防车辆和人员，展开灭火战斗，控制火势蔓延，保护重点区域。' },
      { id: 'st4', order: 4, title: '医疗救援', description: '安排急救人员在现场待命，对受伤人员进行紧急救治，及时转运至医院。' },
      { id: 'st5', order: 5, title: '现场保护', description: '灭火后保护好现场，配合事故调查，清理现场隐患。' },
    ],
    resources: [
      { id: 'r1', name: '消防车', quantity: 5, unit: '辆' },
      { id: 'r2', name: '消防员', quantity: 30, unit: '人' },
      { id: 'r3', name: '急救车', quantity: 3, unit: '辆' },
      { id: 'r4', name: '医护人员', quantity: 10, unit: '人' },
      { id: 'r5', name: '灭火器', quantity: 50, unit: '具' },
    ],
    personnel: [
      { id: 'p1', role: '现场总指挥', count: 1 },
      { id: 'p2', role: '灭火组组长', count: 1 },
      { id: 'p3', role: '疏散组组长', count: 1 },
      { id: 'p4', role: '医疗组组长', count: 1 },
      { id: 'p5', role: '灭火队员', count: 20 },
      { id: 'p6', role: '疏散引导员', count: 15 },
    ],
    notes: '1. 优先保障人员生命安全\n2. 注意防止火势蔓延至周边仓库\n3. 及时向上级汇报进展\n4. 做好现场人员防护',
  },
  {
    id: 's2',
    eventId: 'e1',
    title: '东区仓库火灾处置方案（备选）',
    description: '备用处置方案，在主方案无法实施时启用。',
    level: '一级',
    version: 'v1.0',
    status: 'draft',
    planTemplateName: '火灾事故应急预案',
    createdAt: '2024-01-15 14:40:00',
    steps: [
      { id: 'st1', order: 1, title: '人员疏散', description: '优先组织人员疏散，确保人员安全。' },
      { id: 'st2', order: 2, title: '外围控制', description: '在外围设置警戒线，控制火势蔓延。' },
    ],
    resources: [
      { id: 'r1', name: '消防车', quantity: 3, unit: '辆' },
      { id: 'r2', name: '消防员', quantity: 20, unit: '人' },
    ],
    personnel: [
      { id: 'p1', role: '现场指挥', count: 1 },
      { id: 'p2', role: '灭火队员', count: 15 },
    ],
    notes: '备选方案，根据现场情况决定是否启用。',
  },
  {
    id: 's3',
    eventId: 'e2',
    title: '西区道路交通事故处置方案',
    description: '针对西区道路交通事故的处置方案，包含现场警戒、伤员救援、交通疏导等内容。',
    level: '二级',
    version: 'v2.1',
    status: 'archived',
    planTemplateName: '交通事故应急预案',
    createdAt: '2024-01-15 13:50:00',
    publishedAt: '2024-01-15 13:52:00',
    steps: [
      { id: 'st1', order: 1, title: '现场警戒', description: '到达现场后设置警示标志和隔离设施，保护事故现场。' },
      { id: 'st2', order: 2, title: '伤员救援', description: '对事故伤员进行紧急救治，及时转运至医院。' },
      { id: 'st3', order: 3, title: '清障救援', description: '安排清障车辆清理事故现场，恢复道路通行。' },
      { id: 'st4', order: 4, title: '交通疏导', description: '引导社会车辆绕行，保障救援车辆优先通行。' },
    ],
    resources: [
      { id: 'r1', name: '清障车', quantity: 2, unit: '辆' },
      { id: 'r2', name: '急救车', quantity: 2, unit: '辆' },
      { id: 'r3', name: '交警', quantity: 8, unit: '人' },
    ],
    personnel: [
      { id: 'p1', role: '现场指挥', count: 1 },
      { id: 'p2', role: '救援人员', count: 6 },
      { id: 'p3', role: '交警', count: 8 },
    ],
    notes: '注意保护现场，配合事故调查。',
  },
  {
    id: 's4',
    eventId: 'e3',
    title: '南区地下车库积水处置方案',
    description: '针对地下车库积水的处置方案，包含抽排作业、物资转移、人员安全等内容。',
    level: '三级',
    version: 'v1.0',
    status: 'published',
    planTemplateName: '洪涝灾害应急预案',
    createdAt: '2024-01-15 12:25:00',
    publishedAt: '2024-01-15 12:30:00',
    steps: [
      { id: 'st1', order: 1, title: '积水监测', description: '持续监测水位变化，评估积水严重程度。' },
      { id: 'st2', order: 2, title: '排水抢险', description: '调动抽水泵等设备进行积水抽排作业。' },
      { id: 'st3', order: 3, title: '物资转移', description: '组织人员将地下车库内贵重物资转移至安全区域。' },
    ],
    resources: [
      { id: 'r1', name: '抽水泵', quantity: 4, unit: '台' },
      { id: 'r2', name: '水带', quantity: 200, unit: '米' },
      { id: 'r3', name: '沙袋', quantity: 100, unit: '袋' },
    ],
    personnel: [
      { id: 'p1', role: '现场指挥', count: 1 },
      { id: 'p2', role: '抢险人员', count: 10 },
    ],
    notes: '注意用电安全，防止触电事故。',
  },
  {
    id: 's5',
    eventId: 'e5',
    title: '北区楼体结构异常处置方案',
    description: '针对楼体结构异常的处置方案，包含安全检测、人员疏散、临时加固等内容。',
    level: '二级',
    version: 'v1.0',
    status: 'draft',
    planTemplateName: '安全事故应急预案',
    createdAt: '2024-01-15 10:45:00',
    steps: [
      { id: 'st1', order: 1, title: '结构检测', description: '组织专业工程师对楼体结构进行现场检测。' },
      { id: 'st2', order: 2, title: '人员疏散准备', description: '做好人员疏散准备工作，如需疏散确保快速有序。' },
    ],
    resources: [
      { id: 'r1', name: '检测设备', quantity: 1, unit: '套' },
    ],
    personnel: [
      { id: 'p1', role: '结构工程师', count: 2 },
      { id: 'p2', role: '物业人员', count: 5 },
    ],
    notes: '密切监测楼体变化，如有异常立即疏散。',
  },
];

const mockTasks: SolutionTask[] = [
  {
    id: 't1',
    solutionId: 's1',
    title: '组织东区仓库人员疏散',
    priority: 'high',
    status: 'in_progress',
    assignee: '张队长',
    deadline: '2024-01-15 15:00',
    description: '立即组织东区A栋3层及周边区域的人员紧急疏散。',
  },
  {
    id: 't2',
    solutionId: 's1',
    title: '消防队伍调度',
    priority: 'high',
    status: 'completed',
    assignee: '李指挥',
    deadline: '2024-01-15 14:45',
    description: '调度最近的消防中队前往现场处置。',
  },
  {
    id: 't3',
    solutionId: 's1',
    title: '医疗急救准备',
    priority: 'high',
    status: 'pending',
    assignee: '王医生',
    deadline: '2024-01-15 15:30',
    description: '安排急救人员和车辆在现场待命。',
  },
  {
    id: 't4',
    solutionId: 's4',
    title: '地下车库积水抽排',
    priority: 'medium',
    status: 'in_progress',
    assignee: '维修李',
    deadline: '2024-01-15 14:00',
    description: '组织人员和设备对地下车库积水进行抽排。',
  },
  {
    id: 't5',
    solutionId: 's3',
    title: '西区事故现场交通管制',
    priority: 'medium',
    status: 'completed',
    assignee: '赵交警',
    deadline: '2024-01-15 14:30',
    description: '在事故现场周边设置交通管制。',
  },
];

const eventTypes = ['全部类型', '火灾事故', '交通事故', '洪涝灾害', '公共卫生事件', '安全事故'];
const eventLevels = ['全部等级', '一级', '二级', '三级', '四级'];
const eventStatuses = [
  { value: '', label: '全部状态' },
  { value: 'active', label: '处置中' },
  { value: 'handled', label: '已处置' },
  { value: 'closed', label: '已关闭' },
];
const solutionStatusFilters = [
  { value: '', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '发布' },
  { value: 'archived', label: '归档' },
];
const planTemplates = ['火灾事故应急预案', '交通事故应急预案', '洪涝灾害应急预案', '公共卫生应急预案', '安全事故应急预案'];

function SolutionManagementPage() {
  const [events] = useState<EmergencyEvent[]>(mockEvents);
  const [solutions, setSolutions] = useState<Solution[]>(mockSolutions);
  const [tasks] = useState<SolutionTask[]>(mockTasks);

  const [selectedEvent, setSelectedEvent] = useState<EmergencyEvent | null>(null);
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null);

  const [eventSearch, setEventSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('全部类型');
  const [eventLevelFilter, setEventLevelFilter] = useState('全部等级');
  const [eventStatusFilter, setEventStatusFilter] = useState('');
  const [solutionStatusFilter, setSolutionStatusFilter] = useState('');
  const [taskSearch, setTaskSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingSolution, setEditingSolution] = useState<Solution | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSolution, setDeleteSolution] = useState<Solution | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState<SolutionTask | null>(null);
  const [showStatusConfirm, setShowStatusConfirm] = useState<{ solution: Solution; targetStatus: SolutionStatus } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: '三级' as EventLevel,
    planTemplateName: '',
    version: 'v1.0',
    steps: [] as SolutionStep[],
    resources: [] as SolutionResource[],
    personnel: [] as SolutionPersonnel[],
    notes: '',
  });

  const filteredEvents = events.filter((event) => {
    if (eventSearch && !event.title.includes(eventSearch) && !event.description.includes(eventSearch)) {
      return false;
    }
    if (eventTypeFilter !== '全部类型' && event.type !== eventTypeFilter) return false;
    if (eventLevelFilter !== '全部等级' && event.level !== eventLevelFilter) return false;
    if (eventStatusFilter && event.status !== eventStatusFilter) return false;
    return true;
  });

  const filteredSolutions = solutions.filter((solution) => {
    if (selectedEvent?.id && solution.eventId !== selectedEvent.id) return false;
    if (solutionStatusFilter && solution.status !== solutionStatusFilter) return false;
    return true;
  });

  const solutionTasks = tasks.filter((task) => {
    if (selectedSolution?.id && task.solutionId !== selectedSolution.id) return false;
    if (taskSearch && !task.title.includes(taskSearch) && !task.assignee.includes(taskSearch)) return false;
    return true;
  });

  const handleSelectEvent = (event: EmergencyEvent) => {
    setSelectedEvent(event);
    setSelectedSolution(null);
  };

  const handleSelectSolution = (solution: Solution) => {
    setSelectedSolution(solution);
  };

  const handleAddSolution = () => {
    if (!selectedEvent) {
      alert('请先选择一个事件');
      return;
    }
    setEditingSolution(null);
    setFormData({
      title: '',
      description: '',
      level: selectedEvent.level,
      planTemplateName: '',
      version: 'v1.0',
      steps: [],
      resources: [],
      personnel: [],
      notes: '',
    });
    setShowModal(true);
  };

  const handleEditSolution = (solution: Solution) => {
    setEditingSolution(solution);
    setFormData({
      title: solution.title,
      description: solution.description,
      level: solution.level,
      planTemplateName: solution.planTemplateName,
      version: solution.version,
      steps: [...solution.steps],
      resources: [...solution.resources],
      personnel: [...solution.personnel],
      notes: solution.notes,
    });
    setShowModal(true);
  };

  const handleDeleteClick = (solution: Solution) => {
    setDeleteSolution(solution);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deleteSolution) {
      setSolutions((prev) => prev.filter((s) => s.id !== deleteSolution.id));
      if (selectedSolution?.id === deleteSolution.id) {
        setSelectedSolution(null);
      }
    }
    setShowDeleteConfirm(false);
    setDeleteSolution(null);
  };

  const handleStatusChange = (solution: Solution, targetStatus: SolutionStatus) => {
    if (targetStatus === 'published' && solution.status === 'archived') {
      alert('归档方案不能直接发布，需要先创建新版本');
      return;
    }
    setShowStatusConfirm({ solution, targetStatus });
  };

  const confirmStatusChange = () => {
    if (!showStatusConfirm) return;
    const { solution, targetStatus } = showStatusConfirm;
    setSolutions((prev) =>
      prev.map((s) =>
        s.id === solution.id
          ? {
              ...s,
              status: targetStatus,
              publishedAt: targetStatus === 'published' ? formatDate(new Date()) : s.publishedAt,
            }
          : s
      )
    );
    if (selectedSolution?.id === solution.id) {
      setSelectedSolution((prev) =>
        prev
          ? {
              ...prev,
              status: targetStatus,
              publishedAt: targetStatus === 'published' ? formatDate(new Date()) : prev.publishedAt,
            }
          : null
      );
    }
    setShowStatusConfirm(null);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.level || !formData.planTemplateName) {
      alert('请填写必填项（标题、等级、关联预案模板）');
      return;
    }
    if (editingSolution) {
      setSolutions((prev) =>
        prev.map((s) => (s.id === editingSolution.id ? { ...s, ...formData } : s))
      );
      if (selectedSolution?.id === editingSolution.id) {
        setSelectedSolution((prev) => (prev ? { ...prev, ...formData } : null));
      }
    } else {
      const newSolution: Solution = {
        id: generateId(),
        eventId: selectedEvent!.id,
        ...formData,
        status: 'draft',
        createdAt: formatDate(new Date()),
      };
      setSolutions((prev) => [newSolution, ...prev]);
      setSelectedSolution(newSolution);
    }
    setShowModal(false);
  };

  const addStep = () => {
    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, { id: generateId(), order: prev.steps.length + 1, title: '', description: '' }],
    }));
  };

  const removeStep = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })),
    }));
  };

  const updateStep = (id: string, field: keyof SolutionStep, value: string) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  };

  const addResource = () => {
    setFormData((prev) => ({
      ...prev,
      resources: [...prev.resources, { id: generateId(), name: '', quantity: 1, unit: '个' }],
    }));
  };

  const removeResource = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      resources: prev.resources.filter((r) => r.id !== id),
    }));
  };

  const updateResource = (id: string, field: keyof SolutionResource, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      resources: prev.resources.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }));
  };

  const addPersonnel = () => {
    setFormData((prev) => ({
      ...prev,
      personnel: [...prev.personnel, { id: generateId(), role: '', count: 1 }],
    }));
  };

  const removePersonnel = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      personnel: prev.personnel.filter((p) => p.id !== id),
    }));
  };

  const updatePersonnel = (id: string, field: keyof SolutionPersonnel, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      personnel: prev.personnel.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    }));
  };

  const handleGenerateTasks = () => {
    alert('任务生成功能将基于方案步骤自动创建任务（API对接中）');
  };

  return (
    <div className="space-y-4 h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">方案管理</h1>
          <p className="mt-1 text-sm text-gray-500">事件-方案-任务三级联动管理</p>
        </div>
      </div>

      <div className="flex gap-4 h-full">
        <div className="w-1/4 flex flex-col bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="搜索事件..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {eventTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={eventLevelFilter}
                onChange={(e) => setEventLevelFilter(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {eventLevels.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <select
              value={eventStatusFilter}
              onChange={(e) => setEventStatusFilter(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {eventStatuses.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredEvents.map((event) => {
              const levelCfg = eventLevelConfig[event.level];
              const statusCfg = eventStatusConfig[event.status];
              const StatusIcon = statusCfg.icon;
              const isSelected = selectedEvent?.id === event.id;
              return (
                <div
                  key={event.id}
                  onClick={() => handleSelectEvent(event)}
                  className={classNames(
                    'p-3 rounded-lg border cursor-pointer transition-all',
                    isSelected
                      ? 'bg-primary-50 border-primary-300 shadow-sm'
                      : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 flex-1 pr-2 leading-snug">{event.title}</h4>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={classNames('text-xs px-1.5 py-0.5 rounded font-medium', levelCfg.bg, levelCfg.text)}>
                      {event.level}
                    </span>
                    <span className={classNames('text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-1', statusCfg.bg, statusCfg.text)}>
                      <StatusIcon size={10} />
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar size={12} />
                    <span>{event.time}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{event.type}</p>
                </div>
              );
            })}
            {filteredEvents.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-sm">暂无事件</div>
            )}
          </div>

          <div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-500">
            共 {filteredEvents.length} 个事件
          </div>
        </div>

        <div className="w-[30%] flex flex-col bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">方案列表</h3>
              <button
                onClick={handleAddSolution}
                disabled={!selectedEvent}
                className={classNames(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  selectedEvent
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                <Plus size={14} />
                新建方案
              </button>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {solutionStatusFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setSolutionStatusFilter(filter.value)}
                  className={classNames(
                    'flex-1 py-1 text-xs rounded-md transition-colors',
                    solutionStatusFilter === filter.value
                      ? 'bg-white text-primary-600 shadow-sm font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {!selectedEvent ? (
              <div className="py-12 text-center">
                <AlertCircle size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">请先选择左侧的事件</p>
              </div>
            ) : filteredSolutions.length === 0 ? (
              <div className="py-12 text-center">
                <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">暂无方案</p>
              </div>
            ) : (
              filteredSolutions.map((solution) => {
                const statusCfg = solutionStatusConfig[solution.status];
                const levelCfg = eventLevelConfig[solution.level];
                const isSelected = selectedSolution?.id === solution.id;
                return (
                  <div
                    key={solution.id}
                    onClick={() => handleSelectSolution(solution)}
                    className={classNames(
                      'p-3 rounded-lg border cursor-pointer transition-all',
                      isSelected
                        ? 'bg-primary-50 border-primary-300 shadow-sm'
                        : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900 flex-1 pr-2 leading-snug">{solution.title}</h4>
                    </div>
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <span className={classNames('text-xs px-1.5 py-0.5 rounded font-medium', statusCfg.bg, statusCfg.text)}>
                        {statusCfg.label}
                      </span>
                      <span className={classNames('text-xs px-1.5 py-0.5 rounded font-medium', levelCfg.bg, levelCfg.text)}>
                        {solution.level}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {solution.version}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      <FileText size={12} />
                      <span className="truncate">{solution.planTemplateName}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>创建：{solution.createdAt.split(' ')[0]}</span>
                      {solution.publishedAt && (
                        <span>发布：{solution.publishedAt.split(' ')[0]}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSolution(solution);
                        }}
                        className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="编辑"
                      >
                        <Edit2 size={14} />
                      </button>
                      {solution.status === 'draft' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(solution, 'published');
                          }}
                          className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="发布"
                        >
                          <Send size={14} />
                        </button>
                      )}
                      {solution.status === 'published' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(solution, 'archived');
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="归档"
                        >
                          <Archive size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(solution);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors ml-auto"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-500">
            共 {filteredSolutions.length} 个方案
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-primary-600" />
                  <h3 className="text-base font-semibold text-gray-900">方案详情</h3>
                </div>
                {selectedSolution && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditSolution(selectedSolution)}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-xs"
                    >
                      <Edit2 size={14} />
                      编辑
                    </button>
                    {selectedSolution.status === 'draft' && (
                      <button
                        onClick={() => handleStatusChange(selectedSolution, 'published')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs"
                      >
                        <Send size={14} />
                        发布
                      </button>
                    )}
                    {selectedSolution.status === 'published' && (
                      <button
                        onClick={() => handleStatusChange(selectedSolution, 'archived')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs"
                      >
                        <Archive size={14} />
                        归档
                      </button>
                    )}
                    {selectedSolution.status === 'published' && (
                      <button
                        onClick={handleGenerateTasks}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-xs"
                      >
                        <ListOrdered size={14} />
                        生成任务
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!selectedSolution ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <FileText size={48} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-400">请选择一个方案查看详情</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-bold text-gray-900">{selectedSolution.title}</h2>
                      <span className={classNames('text-xs px-2 py-0.5 rounded-full font-medium', solutionStatusConfig[selectedSolution.status].bg, solutionStatusConfig[selectedSolution.status].text)}>
                        {solutionStatusConfig[selectedSolution.status].label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{selectedSolution.description}</p>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">等级</p>
                      <span className={classNames('text-sm font-medium px-2 py-0.5 rounded', eventLevelConfig[selectedSolution.level].bg, eventLevelConfig[selectedSolution.level].text)}>
                        {selectedSolution.level}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">版本</p>
                      <p className="text-sm font-medium text-gray-900">{selectedSolution.version}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">创建时间</p>
                      <p className="text-sm font-medium text-gray-900">{selectedSolution.createdAt}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">发布时间</p>
                      <p className="text-sm font-medium text-gray-900">{selectedSolution.publishedAt || '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">关联事件</p>
                      <p className="text-sm font-medium text-gray-900">{selectedEvent?.title || '-'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">关联预案模板</p>
                      <p className="text-sm font-medium text-gray-900">{selectedSolution.planTemplateName}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <ListOrdered size={16} className="text-primary-500" />
                      处置步骤
                      <span className="text-xs font-normal text-gray-400">（共 {selectedSolution.steps.length} 步）</span>
                    </h4>
                    <div className="space-y-2">
                      {selectedSolution.steps.map((step) => (
                        <div key={step.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {step.order}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 mb-1">{step.title}</p>
                            <p className="text-xs text-gray-600 leading-relaxed">{step.description}</p>
                          </div>
                        </div>
                      ))}
                      {selectedSolution.steps.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">暂无处置步骤</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Package size={16} className="text-primary-500" />
                      资源需求
                    </h4>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left text-xs font-medium text-gray-500 px-3 py-2">资源名称</th>
                            <th className="text-center text-xs font-medium text-gray-500 px-3 py-2 w-24">数量</th>
                            <th className="text-center text-xs font-medium text-gray-500 px-3 py-2 w-24">单位</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedSolution.resources.map((resource) => (
                            <tr key={resource.id}>
                              <td className="px-3 py-2 text-sm text-gray-900">{resource.name}</td>
                              <td className="px-3 py-2 text-sm text-gray-900 text-center">{resource.quantity}</td>
                              <td className="px-3 py-2 text-sm text-gray-900 text-center">{resource.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {selectedSolution.resources.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">暂无资源需求</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Users size={16} className="text-primary-500" />
                      人员分工
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedSolution.personnel.map((p) => (
                        <div key={p.id} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-900">{p.role}</p>
                          <p className="text-xs text-gray-500 mt-1">{p.count} 人</p>
                        </div>
                      ))}
                    </div>
                    {selectedSolution.personnel.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">暂无人员分工</p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <StickyNote size={16} className="text-primary-500" />
                      注意事项
                    </h4>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <pre className="text-sm text-yellow-800 whitespace-pre-wrap font-sans leading-relaxed">
                        {selectedSolution.notes || '暂无注意事项'}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListOrdered size={18} className="text-primary-600" />
                  <h3 className="text-sm font-semibold text-gray-900">关联任务</h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {solutionTasks.length}
                  </span>
                </div>
                <div className="relative w-48">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="搜索任务..."
                    className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {!selectedSolution ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <ListOrdered size={40} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-sm text-gray-400">请选择方案查看任务</p>
                  </div>
                </div>
              ) : solutionTasks.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <ListOrdered size={40} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-sm text-gray-400">暂无关联任务</p>
                  </div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 px-3 py-2">任务标题</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-3 py-2 w-16">优先级</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-3 py-2 w-20">状态</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-3 py-2 w-20">指派人</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-3 py-2 w-28">截止时间</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-3 py-2 w-16">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {solutionTasks.map((task) => {
                      const priorityCfg = taskPriorityConfig[task.priority];
                      const statusCfg = taskStatusConfig[task.status];
                      const StatusIcon = statusCfg.icon;
                      return (
                        <tr
                          key={task.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setShowTaskDetail(task)}
                        >
                          <td className="px-3 py-2">
                            <span className="text-sm text-gray-900">{task.title}</span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={classNames('text-xs px-1.5 py-0.5 rounded font-medium', priorityCfg.bg, priorityCfg.text)}>
                              {priorityCfg.label}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={classNames('text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-1 w-fit', statusCfg.bg, statusCfg.text)}>
                              <StatusIcon size={10} />
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-sm text-gray-600">{task.assignee}</span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-sm text-gray-600">{task.deadline}</span>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowTaskDetail(task);
                              }}
                              className="text-primary-600 hover:text-primary-700 text-xs"
                            >
                              查看
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSolution ? '编辑方案' : '新建方案'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    方案标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="请输入方案标题"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      等级 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value as EventLevel })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {eventLevels.filter((l) => l !== '全部等级').map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      版本号
                    </label>
                    <input
                      type="text"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      placeholder="v1.0"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  关联预案模板 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.planTemplateName}
                  onChange={(e) => setFormData({ ...formData, planTemplateName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">请选择预案模板</option>
                  {planTemplates.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">方案描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="请输入方案描述"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <ListOrdered size={16} className="text-primary-500" />
                    处置步骤
                  </label>
                  <button
                    onClick={addStep}
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-xs font-medium"
                  >
                    <Plus size={14} />
                    添加步骤
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                  {formData.steps.map((step, index) => (
                    <div key={step.id} className="flex gap-2 items-start bg-white p-2.5 rounded-lg border border-gray-100">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-1">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => updateStep(step.id, 'title', e.target.value)}
                          placeholder="步骤标题"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <textarea
                          value={step.description}
                          onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                          placeholder="步骤描述"
                          rows={2}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                        />
                      </div>
                      <button
                        onClick={() => removeStep(step.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {formData.steps.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">暂无处置步骤，点击上方按钮添加</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Package size={16} className="text-primary-500" />
                    资源需求
                  </label>
                  <button
                    onClick={addResource}
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-xs font-medium"
                  >
                    <Plus size={14} />
                    添加资源
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-500 px-3 py-2">资源名称</th>
                        <th className="text-center text-xs font-medium text-gray-500 px-3 py-2 w-24">数量</th>
                        <th className="text-center text-xs font-medium text-gray-500 px-3 py-2 w-24">单位</th>
                        <th className="text-center text-xs font-medium text-gray-500 px-3 py-2 w-12">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {formData.resources.map((resource) => (
                        <tr key={resource.id}>
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={resource.name}
                              onChange={(e) => updateResource(resource.id, 'name', e.target.value)}
                              placeholder="资源名称"
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              min="1"
                              value={resource.quantity}
                              onChange={(e) => updateResource(resource.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={resource.unit}
                              onChange={(e) => updateResource(resource.id, 'unit', e.target.value)}
                              placeholder="单位"
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <button
                              onClick={() => removeResource(resource.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {formData.resources.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">暂无资源需求</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Users size={16} className="text-primary-500" />
                    人员分工
                  </label>
                  <button
                    onClick={addPersonnel}
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-xs font-medium"
                  >
                    <Plus size={14} />
                    添加分工
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                  {formData.personnel.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-100">
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={p.role}
                          onChange={(e) => updatePersonnel(p.id, 'role', e.target.value)}
                          placeholder="角色"
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <input
                          type="number"
                          min="1"
                          value={p.count}
                          onChange={(e) => updatePersonnel(p.id, 'count', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <button
                        onClick={() => removePersonnel(p.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {formData.personnel.length === 0 && (
                    <p className="col-span-3 text-sm text-gray-400 text-center py-2">暂无人员分工</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <StickyNote size={16} className="text-primary-500" />
                  注意事项
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="请输入注意事项，每行一条"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
              >
                {editingSolution ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && deleteSolution && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">确认删除</h3>
              <p className="text-sm text-gray-500 text-center">
                确定要删除方案「{deleteSolution.title}」吗？此操作不可恢复。
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showStatusConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-6">
              <div className={classNames('w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4',
                showStatusConfirm.targetStatus === 'published' ? 'bg-green-100' : 'bg-blue-100'
              )}>
                {showStatusConfirm.targetStatus === 'published' ? (
                  <Send size={24} className="text-green-600" />
                ) : (
                  <Archive size={24} className="text-blue-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                确认{showStatusConfirm.targetStatus === 'published' ? '发布' : '归档'}
              </h3>
              <p className="text-sm text-gray-500 text-center">
                确定要将方案「{showStatusConfirm.solution.title}」
                {showStatusConfirm.targetStatus === 'published' ? '发布' : '归档'}吗？
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowStatusConfirm(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={confirmStatusChange}
                className={classNames('px-4 py-2 text-white rounded-lg transition-colors text-sm',
                  showStatusConfirm.targetStatus === 'published' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                )}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {showTaskDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={classNames('text-xs px-2 py-0.5 rounded-full font-medium',
                    taskPriorityConfig[showTaskDetail.priority].bg,
                    taskPriorityConfig[showTaskDetail.priority].text
                  )}>
                    {taskPriorityConfig[showTaskDetail.priority].label}优先级
                  </span>
                  <span className={classNames('text-xs px-2 py-0.5 rounded-full font-medium',
                    taskStatusConfig[showTaskDetail.status].bg,
                    taskStatusConfig[showTaskDetail.status].text
                  )}>
                    {taskStatusConfig[showTaskDetail.status].label}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{showTaskDetail.title}</h3>
              </div>
              <button
                onClick={() => setShowTaskDetail(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">指派人</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                    <User size={14} className="text-gray-400" />
                    {showTaskDetail.assignee}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">截止时间</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                    <Clock size={14} className="text-gray-400" />
                    {showTaskDetail.deadline}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">任务描述</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 leading-relaxed">{showTaskDetail.description}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowTaskDetail(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SolutionManagementPage;
