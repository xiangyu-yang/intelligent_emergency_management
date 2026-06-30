import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  CheckSquare,
  Settings,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FileText,
  Users,
  Package,
  GitBranch,
  Search,
  ClipboardList,
  Lightbulb,
  Bot,
  Briefcase,
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { classNames } from '../utils';

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    key: 'dashboard',
    label: '应急指挥大屏',
    icon: <LayoutDashboard size={20} />,
    path: '/dashboard',
  },
  {
    key: 'event-monitor',
    label: '事件监测',
    icon: <Activity size={20} />,
    path: '/event-monitor',
  },
  {
    key: 'solution-management',
    label: '方案管理',
    icon: <Lightbulb size={20} />,
    path: '/solution-management',
  },
  {
    key: 'task-management',
    label: '任务管理',
    icon: <CheckSquare size={20} />,
    path: '/task-management',
  },
  {
    key: 'config',
    label: '配置管理',
    icon: <Settings size={20} />,
    children: [
      {
        key: 'event-type',
        label: '事件类型',
        icon: <AlertTriangle size={18} />,
        path: '/config/event-type',
      },
      {
        key: 'plan-template',
        label: '预案模板',
        icon: <FileText size={18} />,
        path: '/config/plan-template',
      },
      {
        key: 'solution-template',
        label: '方案模板',
        icon: <ClipboardList size={18} />,
        path: '/config/solution-template',
      },
      {
        key: 'organization',
        label: '组织人员',
        icon: <Users size={18} />,
        path: '/config/organization',
      },
      {
        key: 'resource',
        label: '应急资源',
        icon: <Package size={18} />,
        path: '/config/resource',
      },
    ],
  },
  {
    key: 'analysis',
    label: '分析中心',
    icon: <BarChart3 size={20} />,
    children: [
      {
        key: 'correlation',
        label: '关联分析',
        icon: <GitBranch size={18} />,
        path: '/analysis/correlation',
      },
      {
        key: 'root-cause',
        label: '根因分析',
        icon: <Search size={18} />,
        path: '/analysis/root-cause',
      },
      {
        key: 'evaluation',
        label: '处置评估',
        icon: <BarChart3 size={18} />,
        path: '/analysis/evaluation',
      },
    ],
  },
  {
    key: 'knowledge-base',
    label: '应急知识库',
    icon: <BookOpen size={20} />,
    path: '/knowledge-base',
  },
  {
    key: 'skill-library',
    label: '应急技能库',
    icon: <Briefcase size={20} />,
    path: '/skill-library',
  },
  {
    key: 'ai-assistant',
    label: '智能应急助手',
    icon: <Bot size={20} />,
    path: '/ai-assistant',
  },
  {
    key: 'model-config',
    label: '应急模型配置',
    icon: <Settings size={20} />,
    path: '/model-config',
  },
];

function Nav() {
  const { collapsed } = useAppStore();
  const location = useLocation();
  const [openKeys, setOpenKeys] = useState<string[]>(['config', 'analysis']);

  const toggleOpen = (key: string) => {
    setOpenKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const isChildActive = (item: MenuItem): boolean => {
    if (!item.children) return false;
    return item.children.some(
      (child) => child.path && location.pathname.startsWith(child.path)
    );
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openKeys.includes(item.key);
    const isActive = item.path
      ? location.pathname === item.path || location.pathname.startsWith(item.path + '/')
      : isChildActive(item);

    return (
      <div key={item.key}>
        {item.path ? (
          <NavLink
            to={item.path}
            className={({ isActive }) =>
              classNames(
                'flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-600 border-r-2 border-primary-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                level > 0 && 'pl-12'
              )
            }
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          </NavLink>
        ) : (
          <button
            onClick={() => toggleOpen(item.key)}
            className={classNames(
              'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors',
              isActive
                ? 'bg-primary-50 text-primary-600 border-r-2 border-primary-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              level > 0 && 'pl-12'
            )}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="flex-1 text-left truncate">{item.label}</span>
                {hasChildren && (
                  <span className="flex-shrink-0">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                )}
              </>
            )}
          </button>
        )}
        {hasChildren && isOpen && !collapsed && (
          <div className="bg-gray-50">
            {item.children!.map((child) => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="flex-1 py-4 overflow-y-auto">
      {menuItems.map((item) => renderMenuItem(item))}
    </nav>
  );
}

export default Nav;
