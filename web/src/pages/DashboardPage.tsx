import { useState, useEffect, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  AlertTriangle,
  Users,
  BarChart3,
  Package,
  Video,
  Clock,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  UserCheck,
  Calendar,
  ListTodo,
  Activity,
  TrendingUp,
  Shield,
  Zap,
  Eye,
  MapPin,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';

const alertStats = {
  todayEvents: 56,
  pendingEvents: 12,
  highLevelEvents: 5,
};

const personnelStats = {
  totalPersonnel: 328,
  onDuty: 245,
  onWatch: 36,
};

const reviewStats = {
  completedEvents: 168,
  successRate: 94.5,
  avgDuration: '45分钟',
};

const resourceStats = {
  totalResources: 1256,
  availableCount: 986,
  shortageCount: 23,
};

const videoMonitors = [
  { id: 1, name: '东门入口', status: 'normal', location: 'A区-1号' },
  { id: 2, name: '中央广场', status: 'alert', location: 'B区-中心' },
  { id: 3, name: '地下车库', status: 'normal', location: 'C区-B1' },
  { id: 4, name: '机房区域', status: 'warning', location: 'D区-3层' },
];

const recentAlerts = [
  { id: 1, type: '火灾预警', location: 'B区-中央广场', time: '10:23:45', level: 'high' },
  { id: 2, type: '人员聚集', location: 'A区-东门', time: '10:18:30', level: 'medium' },
  { id: 3, type: '设备异常', location: 'D区-机房', time: '10:15:20', level: 'medium' },
  { id: 4, type: '入侵检测', location: 'C区-车库', time: '09:58:10', level: 'low' },
  { id: 5, type: '烟雾告警', location: 'E区-厨房', time: '09:45:00', level: 'high' },
];

const taskFlowData = [
  { name: '事件检测', count: 56, icon: Activity },
  { name: '事件验证', count: 48, icon: Eye },
  { name: '等级判定', count: 42, icon: AlertTriangle },
  { name: '方案生成', count: 38, icon: Zap },
  { name: '任务下发', count: 35, icon: ListTodo },
  { name: '处置完成', count: 28, icon: CheckCircle },
];

const dutyPersonnel = [
  { id: 1, name: '张伟', role: '值班组长', department: '应急办', status: 'on-duty', time: '08:00-20:00' },
  { id: 2, name: '李娜', role: '指挥调度', department: '指挥中心', status: 'on-duty', time: '08:00-20:00' },
  { id: 3, name: '王强', role: '技术支持', department: '技术部', status: 'on-duty', time: '08:00-20:00' },
  { id: 4, name: '刘芳', role: '信息记录', department: '信息科', status: 'on-duty', time: '08:00-20:00' },
  { id: 5, name: '陈明', role: '备勤人员', department: '应急队', status: 'standby', time: '20:00-08:00' },
  { id: 6, name: '赵丽', role: '备勤人员', department: '应急队', status: 'standby', time: '20:00-08:00' },
];

const scheduleInfo = [
  { day: '周一', shift: '白班', person: '张伟组' },
  { day: '周二', shift: '白班', person: '李娜组' },
  { day: '周三', shift: '白班', person: '王强组' },
  { day: '周四', shift: '白班', person: '刘芳组' },
  { day: '周五', shift: '白班', person: '张伟组' },
  { day: '周六', shift: '值班', person: '陈明组' },
  { day: '周日', shift: '值班', person: '赵丽组' },
];

const pendingTasks = [
  { id: 1, title: 'B区火灾现场勘察', assignee: '应急一队', priority: 'high', createTime: '10:25' },
  { id: 2, title: '人员聚集疏散引导', assignee: '安保队', priority: 'medium', createTime: '10:20' },
  { id: 3, title: '设备故障排查', assignee: '技术部', priority: 'medium', createTime: '10:16' },
  { id: 4, title: '区域安全巡查', assignee: '巡逻队', priority: 'low', createTime: '10:00' },
];

const inProgressTasks = [
  { id: 1, title: 'E区烟雾处置', assignee: '消防中队', progress: 65, priority: 'high' },
  { id: 2, title: 'C区入侵调查', assignee: '安保队', progress: 40, priority: 'medium' },
  { id: 3, title: '电力系统检修', assignee: '工程部', progress: 80, priority: 'medium' },
];

const eventLocations = [
  { name: '北京', value: [116.46, 39.92], level: 'high', type: '火灾事故', count: 3, province: '北京' },
  { name: '上海', value: [121.48, 31.22], level: 'critical', type: '坍塌事故', count: 1, province: '上海' },
  { name: '广州', value: [113.23, 23.16], level: 'medium', type: '设备故障', count: 2, province: '广东' },
  { name: '深圳', value: [114.07, 22.62], level: 'high', type: '安全事故', count: 2, province: '广东' },
  { name: '成都', value: [104.06, 30.57], level: 'medium', type: '人员聚集', count: 1, province: '四川' },
  { name: '武汉', value: [114.31, 30.52], level: 'low', type: '设备异常', count: 1, province: '湖北' },
  { name: '杭州', value: [120.19, 30.26], level: 'medium', type: '火灾预警', count: 2, province: '浙江' },
  { name: '南京', value: [118.78, 32.04], level: 'high', type: '安全事故', count: 1, province: '江苏' },
  { name: '西安', value: [108.95, 34.27], level: 'low', type: '设备故障', count: 1, province: '陕西' },
  { name: '重庆', value: [106.54, 29.59], level: 'medium', type: '人员聚集', count: 2, province: '重庆' },
  { name: '天津', value: [117.2, 39.13], level: 'high', type: '火灾事故', count: 1, province: '天津' },
  { name: '苏州', value: [120.62, 31.32], level: 'low', type: '设备异常', count: 1, province: '江苏' },
];

const provinceCenters: Record<string, [number, number]> = {
  '北京': [116.46, 39.92],
  '上海': [121.48, 31.22],
  '广东': [113.23, 23.16],
  '四川': [104.06, 30.57],
  '湖北': [114.31, 30.52],
  '浙江': [120.19, 30.26],
  '江苏': [118.78, 32.04],
  '陕西': [108.95, 34.27],
  '重庆': [106.54, 29.59],
  '天津': [117.2, 39.13],
  '河北': [114.51, 38.04],
  '山东': [117.12, 36.65],
  '河南': [113.65, 34.76],
  '湖南': [112.94, 28.23],
  '安徽': [117.27, 31.86],
  '福建': [119.30, 26.08],
  '江西': [115.89, 28.68],
  '广西': [108.33, 22.84],
  '云南': [102.73, 24.89],
  '贵州': [106.65, 26.63],
  '辽宁': [123.43, 41.80],
  '吉林': [125.33, 43.82],
  '黑龙江': [126.63, 45.80],
  '山西': [112.53, 37.87],
  '内蒙古': [111.65, 40.82],
  '新疆': [87.62, 43.82],
  '西藏': [91.11, 29.97],
  '青海': [101.74, 36.56],
  '甘肃': [103.73, 36.06],
  '宁夏': [106.27, 38.47],
  '海南': [110.35, 20.02],
  '香港': [114.17, 22.28],
  '澳门': [113.54, 22.19],
  '台湾': [121.50, 24.04],
};

const levelColors = {
  critical: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.3)' },
  high: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.3)' },
  medium: { color: '#eab308', bg: 'rgba(234, 179, 8, 0.3)' },
  low: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.3)' },
};

const StatCard = ({ title, icon: Icon, items }: {
  title: string;
  icon: any;
  items: { label: string; value: string | number; unit?: string; color?: string }[];
}) => (
  <div className="relative overflow-hidden rounded-2xl p-5 bg-white/[0.04] backdrop-blur-xl border border-cyan-500/10 shadow-lg shadow-cyan-500/5">
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/2"></div>
    <div className="relative">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/20">
          <Icon size={22} className="text-cyan-400" />
        </div>
        <h3 className="text-white font-semibold text-lg">{title}</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {items.map((item, index) => (
          <div key={index} className="text-center">
            <p className={`text-2xl font-bold ${item.color || 'text-white'} drop-shadow-sm`}>
              {item.value}
              {item.unit && <span className="text-sm font-normal ml-1 text-slate-400">{item.unit}</span>}
            </p>
            <p className="text-xs text-slate-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const PanelCard = ({ title, icon: Icon, children, className = '' }: {
  title: string;
  icon: any;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-cyan-500/10 overflow-hidden shadow-lg shadow-cyan-500/3 ${className}`}>
    <div className="absolute top-0 left-0 w-16 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500"></div>
    <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-500/5">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-cyan-400" />
        <h3 className="text-white font-semibold">{title}</h3>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/20 to-transparent ml-3"></div>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const VideoMonitor = ({ monitor }: { monitor: typeof videoMonitors[0] }) => {
  const statusConfig = {
    normal: { color: 'bg-emerald-500', text: '正常', textColor: 'text-emerald-400' },
    warning: { color: 'bg-amber-500', text: '预警', textColor: 'text-amber-400' },
    alert: { color: 'bg-red-500', text: '告警', textColor: 'text-red-400' },
  };
  const status = statusConfig[monitor.status as keyof typeof statusConfig];

  return (
    <div className="relative rounded-xl overflow-hidden bg-white/[0.02] border border-slate-700/30 group hover:border-cyan-500/20 transition-all">
      <div className="aspect-video bg-gradient-to-br from-slate-800/50 to-slate-900/50 flex items-center justify-center relative">
        <Video size={32} className="text-slate-600" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2 py-1 rounded">
          <div className={`w-2 h-2 rounded-full ${status.color} animate-pulse`}></div>
          <span className={`text-xs ${status.textColor} font-medium`}>{status.text}</span>
        </div>
        <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm px-2 py-1 rounded">
          <MapPin size={12} className="text-slate-400" />
        </div>
      </div>
      <div className="p-3 bg-white/[0.02]">
        <p className="text-sm text-white font-medium truncate">{monitor.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{monitor.location}</p>
      </div>
    </div>
  );
};

const AlertItem = ({ alert }: { alert: typeof recentAlerts[0] }) => {
  const levelConfig = {
    high: { color: 'bg-red-500/15 border-red-500/30 text-red-400', dot: 'bg-red-500' },
    medium: { color: 'bg-amber-500/15 border-amber-500/30 text-amber-400', dot: 'bg-amber-500' },
    low: { color: 'bg-blue-500/15 border-blue-500/30 text-blue-400', dot: 'bg-blue-500' },
  };
  const level = levelConfig[alert.level as keyof typeof levelConfig];

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${level.color} transition-all hover:bg-white/5 cursor-pointer group`}>
      <div className={`w-2 h-2 rounded-full ${level.dot} flex-shrink-0 animate-pulse`}></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{alert.type}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5">{alert.location}</p>
      </div>
      <div className="text-xs text-slate-600 flex-shrink-0 group-hover:text-slate-400">{alert.time}</div>
    </div>
  );
};

const TaskFlowStep = ({ step, isLast }: { step: typeof taskFlowData[0]; isLast: boolean }) => {
  const Icon = step.icon;
  return (
    <div className="flex items-center flex-1">
      <div className="flex flex-col items-center flex-1">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border border-cyan-400/30 flex items-center justify-center mb-2">
          <Icon size={20} className="text-cyan-400" />
        </div>
        <p className="text-xs text-slate-400 text-center">{step.name}</p>
        <p className="text-lg font-bold text-cyan-400 mt-1">{step.count}</p>
      </div>
      {!isLast && (
        <div className="flex-shrink-0 mx-2">
          <div className="w-8 h-0.5 bg-gradient-to-r from-cyan-500/30 to-transparent"></div>
        </div>
      )}
    </div>
  );
};

const DutyPersonItem = ({ person }: { person: typeof dutyPersonnel[0] }) => {
  const statusConfig = {
    'on-duty': { color: 'text-emerald-400 bg-emerald-500/15', text: '在岗', dot: 'bg-emerald-500' },
    standby: { color: 'text-amber-400 bg-amber-500/15', text: '备勤', dot: 'bg-amber-500' },
  };
  const status = statusConfig[person.status as keyof typeof statusConfig];

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
        <Users size={16} className="text-cyan-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm text-white font-medium">{person.name}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.text}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{person.role} · {person.department}</p>
      </div>
      <div className="text-xs text-slate-600 flex-shrink-0">{person.time}</div>
    </div>
  );
};

const TaskItem = ({ task, type }: { task: any; type: 'pending' | 'progress' }) => {
  const priorityConfig = {
    high: 'text-red-400 bg-red-500/15 border-red-500/30',
    medium: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
    low: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  };
  const priority = priorityConfig[task.priority as keyof typeof priorityConfig];

  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-slate-700/20 hover:border-cyan-500/20 transition-all">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-white font-medium flex-1">{task.title}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${priority} flex-shrink-0`}>
          {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
        </span>
      </div>
      <p className="text-xs text-slate-500 mt-2">
        {type === 'pending' ? `派发至：${task.assignee}` : `执行中：${task.assignee}`}
      </p>
      {type === 'pending' && (
        <p className="text-xs text-slate-600 mt-1">创建时间：{task.createTime}</p>
      )}
      {type === 'progress' && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">处置进度</span>
            <span className="text-xs text-cyan-400 font-medium">{task.progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
              style={{ width: `${task.progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

function DashboardPage() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);

  useEffect(() => {
    const loadMap = async () => {
      try {
        const response = await fetch('/data/china.json');
        const geoData = await response.json();
        
        const echarts = await import('echarts');
        echarts.registerMap('china', geoData);
        setMapLoaded(true);
      } catch (error) {
        console.warn('Failed to load map data, using fallback');
        setMapLoaded(true);
      }
    };
    loadMap();
  }, []);

  const handleMapClick = useCallback((params: any) => {
    if (params.componentType === 'geo' && params.name) {
      const provinceName = params.name;
      if (provinceCenters[provinceName]) {
        setSelectedProvince(provinceName);
      }
    }
  }, []);

  const handleBack = useCallback(() => {
    setSelectedProvince(null);
  }, []);

  const filteredEvents = selectedProvince 
    ? eventLocations.filter(e => e.province === selectedProvince)
    : eventLocations;

  const mapOption: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(34, 211, 238, 0.3)',
      borderWidth: 1,
      textStyle: { color: '#fff', fontSize: 13 },
      formatter: (params: any) => {
        if (params.componentType === 'series') {
          const info = filteredEvents.find(e => e.name === params.name);
          if (info) {
            return `
              <div style="padding: 8px;">
                <div style="font-weight: bold; color: ${levelColors[info.level as keyof typeof levelColors].color}; margin-bottom: 4px;">
                  ${params.name}
                </div>
                <div style="color: #94a3b8;">事件类型：${info.type}</div>
                <div style="color: #94a3b8;">事件数量：${info.count} 起</div>
                <div style="color: ${levelColors[info.level as keyof typeof levelColors].color}; margin-top: 4px;">
                  等级：${info.level === 'critical' ? '特别重大' : info.level === 'high' ? '重大' : info.level === 'medium' ? '较大' : '一般'}
                </div>
              </div>
            `;
          }
        }
        return params.name;
      },
    },
    legend: {
      orient: 'vertical',
      right: 20,
      top: 'center',
      textStyle: { color: '#94a3b8', fontSize: 12 },
      itemWidth: 14,
      itemHeight: 14,
      data: ['特别重大', '重大', '较大', '一般'],
    },
    geo: {
      map: 'china',
      roam: true,
      zoom: selectedProvince ? 5 : 1.2,
      center: selectedProvince ? provinceCenters[selectedProvince] : [105.5, 38],
      itemStyle: {
        areaColor: 'rgba(34, 211, 238, 0.03)',
        borderColor: 'rgba(34, 211, 238, 0.15)',
        borderWidth: 1,
      },
      emphasis: {
        itemStyle: {
          areaColor: 'rgba(34, 211, 238, 0.1)',
          borderColor: 'rgba(34, 211, 238, 0.4)',
        },
      },
      label: {
        show: selectedProvince ? true : false,
        color: '#94a3b8',
        fontSize: 10,
      },
    },
    series: [
      {
        name: '特别重大',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: filteredEvents.filter(e => e.level === 'critical').map(e => ({
          name: e.name,
          value: e.value,
          symbolSize: 20 + e.count * 5,
        })),
        itemStyle: {
          color: levelColors.critical.color,
          shadowBlur: 20,
          shadowColor: levelColors.critical.color,
        },
        rippleEffect: {
          color: levelColors.critical.color,
          brushType: 'stroke',
          scale: 3,
        },
        zlevel: 4,
      },
      {
        name: '重大',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: filteredEvents.filter(e => e.level === 'high').map(e => ({
          name: e.name,
          value: e.value,
          symbolSize: 16 + e.count * 4,
        })),
        itemStyle: {
          color: levelColors.high.color,
          shadowBlur: 15,
          shadowColor: levelColors.high.color,
        },
        rippleEffect: {
          color: levelColors.high.color,
          brushType: 'stroke',
          scale: 2.5,
        },
        zlevel: 3,
      },
      {
        name: '较大',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: filteredEvents.filter(e => e.level === 'medium').map(e => ({
          name: e.name,
          value: e.value,
          symbolSize: 14 + e.count * 3,
        })),
        itemStyle: {
          color: levelColors.medium.color,
          shadowBlur: 12,
          shadowColor: levelColors.medium.color,
        },
        rippleEffect: {
          color: levelColors.medium.color,
          brushType: 'stroke',
          scale: 2,
        },
        zlevel: 2,
      },
      {
        name: '一般',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: filteredEvents.filter(e => e.level === 'low').map(e => ({
          name: e.name,
          value: e.value,
          symbolSize: 12 + e.count * 2,
        })),
        itemStyle: {
          color: levelColors.low.color,
          shadowBlur: 10,
          shadowColor: levelColors.low.color,
        },
        rippleEffect: {
          color: levelColors.low.color,
          brushType: 'stroke',
          scale: 1.5,
        },
        zlevel: 1,
      },
    ],
  };

  const pieOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(34, 211, 238, 0.3)',
      borderWidth: 1,
      textStyle: { color: '#fff' },
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: '#94a3b8', fontSize: 12 },
      itemWidth: 10,
      itemHeight: 10,
    },
    series: [
      {
        name: '事件类型',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#0f172a',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
            color: '#fff',
          },
        },
        labelLine: { show: false },
        data: [
          { value: 35, name: '火灾事件', itemStyle: { color: '#ef4444' } },
          { value: 25, name: '安全事件', itemStyle: { color: '#f97316' } },
          { value: 20, name: '设备故障', itemStyle: { color: '#3b82f6' } },
          { value: 12, name: '自然灾害', itemStyle: { color: '#8b5cf6' } },
          { value: 8, name: '公共卫生', itemStyle: { color: '#10b981' } },
        ],
      },
    ],
  };

  const lineOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(34, 211, 238, 0.3)',
      borderWidth: 1,
      textStyle: { color: '#fff' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    series: [
      {
        name: '事件数量',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#06b6d4', width: 2 },
        itemStyle: { color: '#06b6d4', borderColor: '#fff', borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(6, 182, 212, 0.25)' },
              { offset: 1, color: 'rgba(6, 182, 212, 0.02)' },
            ],
          },
        },
        data: [32, 28, 45, 38, 52, 48, 56],
      },
    ],
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] -m-6 p-6 bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#0B1120] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.06),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.04),transparent_40%)]"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.015)_1px,transparent_1px)] bg-[size:48px_48px]"></div>

      <div className="relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            智能应急指挥大屏
          </h1>
          <p className="text-slate-500 text-sm mt-2">实时监控 · 智能调度 · 快速响应</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="告警信息"
            icon={AlertTriangle}
            items={[
              { label: '今日事件', value: alertStats.todayEvents, color: 'text-white' },
              { label: '待处理', value: alertStats.pendingEvents, color: 'text-amber-400' },
              { label: '高等级', value: alertStats.highLevelEvents, color: 'text-red-400' },
            ]}
          />
          <StatCard
            title="人员组织"
            icon={Users}
            items={[
              { label: '人员总数', value: personnelStats.totalPersonnel, color: 'text-white' },
              { label: '在岗人数', value: personnelStats.onDuty, color: 'text-emerald-400' },
              { label: '值班人数', value: personnelStats.onWatch, color: 'text-cyan-400' },
            ]}
          />
          <StatCard
            title="事件回视力"
            icon={BarChart3}
            items={[
              { label: '已完成', value: reviewStats.completedEvents, color: 'text-white' },
              { label: '成功率', value: reviewStats.successRate, unit: '%', color: 'text-emerald-400' },
              { label: '平均时长', value: reviewStats.avgDuration, color: 'text-cyan-400' },
            ]}
          />
          <StatCard
            title="资源清点"
            icon={Package}
            items={[
              { label: '资源总数', value: resourceStats.totalResources, color: 'text-white' },
              { label: '可用数量', value: resourceStats.availableCount, color: 'text-emerald-400' },
              { label: '短缺告警', value: resourceStats.shortageCount, color: 'text-red-400' },
            ]}
          />
        </div>

        <PanelCard title="GIS事件分布地图" icon={MapPin} className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {selectedProvince && (
                <button 
                  onClick={handleBack}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>返回全国</span>
                </button>
              )}
              <span className="text-sm text-slate-400">
                {selectedProvince ? `${selectedProvince}省事件分布` : '实时监控全国应急事件分布'}
              </span>
            </div>
            <button className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
              <ExternalLink size={14} />
              <span>查看详情</span>
            </button>
          </div>
          <div className="h-80">
            {mapLoaded ? (
              <ReactECharts 
                option={mapOption} 
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
                onEvents={{ click: handleMapClick }}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                  <span className="text-sm text-slate-500">加载地图数据...</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-cyan-500/5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50"></div>
              <span className="text-xs text-slate-500">特别重大</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50"></div>
              <span className="text-xs text-slate-500">重大</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50"></div>
              <span className="text-xs text-slate-500">较大</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></div>
              <span className="text-xs text-slate-500">一般</span>
            </div>
          </div>
        </PanelCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PanelCard title="视频监控事件" icon={Video}>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {videoMonitors.map((monitor) => (
                <VideoMonitor key={monitor.id} monitor={monitor} />
              ))}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={14} className="text-cyan-400" />
              <span className="text-sm text-slate-400 font-medium">最新告警事件</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {recentAlerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>
          </PanelCard>

          <PanelCard title="预案及处置流程" icon={Shield}>
            <div className="mb-4">
              <p className="text-sm text-slate-400 font-medium mb-2">事件类型分布</p>
              <div className="h-52">
                <ReactECharts option={pieOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
            <div className="border-t border-slate-700/20 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-cyan-400" />
                <p className="text-sm text-slate-400 font-medium">近7天事件趋势</p>
              </div>
              <div className="h-40">
                <ReactECharts option={lineOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          </PanelCard>

          <PanelCard title="任务派发" icon={ListTodo}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-amber-400" />
                  <span className="text-sm text-slate-400 font-medium">待处理任务</span>
                </div>
                <span className="text-xs text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">
                  {pendingTasks.length}项
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {pendingTasks.map((task) => (
                  <TaskItem key={task.id} task={task} type="pending" />
                ))}
              </div>
            </div>
            <div className="border-t border-slate-700/20 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-cyan-400" />
                  <span className="text-sm text-slate-400 font-medium">进行中任务</span>
                </div>
                <span className="text-xs text-cyan-400 bg-cyan-500/15 px-2 py-0.5 rounded-full">
                  {inProgressTasks.length}项
                </span>
              </div>
              <div className="space-y-2">
                {inProgressTasks.map((task) => (
                  <TaskItem key={task.id} task={task} type="progress" />
                ))}
              </div>
            </div>
          </PanelCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <PanelCard title="事件任务处置流程" icon={PlayCircle}>
            <div className="flex items-stretch py-4">
              {taskFlowData.map((step, index) => (
                <TaskFlowStep key={step.name} step={step} isLast={index === taskFlowData.length - 1} />
              ))}
            </div>
            <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-slate-700/20">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-cyan-400">56</p>
                  <p className="text-xs text-slate-500 mt-1">今日新增事件</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">28</p>
                  <p className="text-xs text-slate-500 mt-1">处置中事件</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">168</p>
                  <p className="text-xs text-slate-500 mt-1">累计完成</p>
                </div>
              </div>
            </div>
          </PanelCard>

          <PanelCard title="值班值守" icon={UserCheck}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={14} className="text-cyan-400" />
              <span className="text-sm text-slate-400 font-medium">今日值班人员</span>
            </div>
            <div className="space-y-2 mb-4 max-h-52 overflow-y-auto pr-1">
              {dutyPersonnel.map((person) => (
                <DutyPersonItem key={person.id} person={person} />
              ))}
            </div>
            <div className="border-t border-slate-700/20 pt-4">
              <p className="text-sm text-slate-400 font-medium mb-3">本周排班</p>
              <div className="grid grid-cols-7 gap-1">
                {scheduleInfo.map((item) => (
                  <div key={item.day} className="text-center p-2 rounded-lg bg-white/[0.02]">
                    <p className="text-xs text-slate-500">{item.day}</p>
                    <p className="text-xs text-cyan-400 font-medium mt-1">{item.shift}</p>
                  </div>
                ))}
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
