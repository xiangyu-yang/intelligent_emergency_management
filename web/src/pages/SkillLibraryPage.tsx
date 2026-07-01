import { useState, useEffect } from 'react';
import {
  Briefcase,
  FileSearch,
  BarChart2,
  FileText,
  Database,
  ClipboardList,
  AlertTriangle,
  Clock,
  Users,
  Package,
  MessageSquare,
  TrendingUp,
  ChevronRight,
  BookOpen,
  X,
  FileJson,
  Folder,
  FileCode,
  File,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { apiClient } from '../api/client';
import FilePreview from '../components/FilePreview';

interface SkillMetadata {
  name: string;
  description: string;
  id: string;
  version: string;
  category: string;
  difficulty: string;
  tags: string[];
}

interface SkillResource {
  name: string;
  type: 'directory' | 'file';
  children?: SkillResource[];
}

interface SkillDetail {
  id: string;
  metadata: SkillMetadata | null;
  instruction: string;
  resource: SkillResource;
  rawContent: string;
}

interface SkillCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  status?: 'published' | 'draft';
}

const skillCards: SkillCard[] = [
  {
    id: 'policy-collection',
    title: '应急政策文件收集',
    description: '系统收集、整理和归档各类应急管理相关政策法规文件，建立完整的政策数据库',
    icon: <FileSearch size={28} />,
    color: 'from-blue-500 to-blue-600',
    category: '信息收集',
    tags: ['政策法规', '文件管理', '合规性'],
    difficulty: 'easy',
  },
  {
    id: 'statistic-chart',
    title: '应急统计信息图表',
    description: '根据应急数据生成各类统计图表，直观展示应急管理工作成果和趋势',
    icon: <BarChart2 size={28} />,
    color: 'from-green-500 to-green-600',
    category: '数据可视化',
    tags: ['数据分析', '图表制作', '趋势分析'],
    difficulty: 'medium',
  },
  {
    id: 'incident-report',
    title: '突发事件报告撰写',
    description: '按照规范格式撰写突发事件报告，准确记录事件信息和处置过程',
    icon: <FileText size={28} />,
    color: 'from-purple-500 to-purple-600',
    category: '文书写作',
    tags: ['报告撰写', '信息上报', '规范格式'],
    difficulty: 'medium',
  },
  {
    id: 'resource-inventory',
    title: '应急资源盘点',
    description: '定期盘点各类应急物资和装备，确保应急资源处于良好可用状态',
    icon: <Package size={28} />,
    color: 'from-orange-500 to-orange-600',
    category: '资源管理',
    tags: ['物资管理', '库存盘点', '设备维护'],
    difficulty: 'easy',
  },
  {
    id: 'risk-assessment',
    title: '风险评估与预警',
    description: '对潜在风险进行识别和评估，制定预警方案，提前采取防范措施',
    icon: <AlertTriangle size={28} />,
    color: 'from-red-500 to-red-600',
    category: '风险管理',
    tags: ['风险识别', '预警机制', '防范措施'],
    difficulty: 'hard',
  },
  {
    id: 'emergency-dispatch',
    title: '应急调度协调',
    description: '根据事件情况合理调度应急力量和资源，协调多部门协同处置',
    icon: <Users size={28} />,
    color: 'from-cyan-500 to-cyan-600',
    category: '指挥调度',
    tags: ['资源调度', '部门协调', '快速响应'],
    difficulty: 'hard',
  },
  {
    id: 'data-entry',
    title: '应急数据录入',
    description: '准确录入各类应急管理数据，维护数据的完整性和时效性',
    icon: <Database size={28} />,
    color: 'from-teal-500 to-teal-600',
    category: '数据管理',
    tags: ['数据录入', '信息维护', '数据质量'],
    difficulty: 'easy',
  },
  {
    id: 'plan-review',
    title: '应急预案评审',
    description: '对各类应急预案进行评审和修订，确保预案的科学性和可操作性',
    icon: <ClipboardList size={28} />,
    color: 'from-indigo-500 to-indigo-600',
    category: '预案管理',
    tags: ['预案评审', '流程优化', '实战演练'],
    difficulty: 'medium',
  },
  {
    id: 'time-management',
    title: '应急时间管理',
    description: '合理安排应急处置时间节点，确保各项任务按时完成',
    icon: <Clock size={28} />,
    color: 'from-pink-500 to-pink-600',
    category: '时间管理',
    tags: ['时间规划', '任务调度', '效率提升'],
    difficulty: 'easy',
  },
  {
    id: 'communication',
    title: '应急信息沟通',
    description: '建立高效的应急信息沟通渠道，确保信息及时准确传递',
    icon: <MessageSquare size={28} />,
    color: 'from-yellow-500 to-yellow-600',
    category: '沟通协调',
    tags: ['信息传递', '渠道建设', '协同沟通'],
    difficulty: 'medium',
  },
  {
    id: 'performance-analysis',
    title: '应急绩效分析',
    description: '分析应急处置绩效数据，评估处置效果，提出改进建议',
    icon: <TrendingUp size={28} />,
    color: 'from-rose-500 to-rose-600',
    category: '绩效评估',
    tags: ['数据分析', '效果评估', '持续改进'],
    difficulty: 'hard',
  },
  {
    id: 'training-materials',
    title: '应急培训材料制作',
    description: '编制应急培训教材和课件，组织开展应急培训活动',
    icon: <BookOpen size={28} />,
    color: 'from-lime-500 to-lime-600',
    category: '培训教育',
    tags: ['教材编制', '课件制作', '培训组织'],
    difficulty: 'medium',
  },
];

const categories = ['全部', '信息收集', '数据可视化', '文书写作', '资源管理', '风险管理', '指挥调度', '数据管理', '预案管理', '时间管理', '沟通协调', '绩效评估', '培训教育'];

const difficultyConfig = {
  easy: { label: '入门', color: 'bg-green-100 text-green-700' },
  medium: { label: '进阶', color: 'bg-yellow-100 text-yellow-700' },
  hard: { label: '高级', color: 'bg-red-100 text-red-700' },
};

interface ResourceTreeProps {
  resource: SkillResource;
  currentPath?: string;
  onFileClick?: (filePath: string, fileName: string) => void;
  isRoot?: boolean;
}

function ResourceTree({ resource, currentPath = '', onFileClick, isRoot = false }: ResourceTreeProps) {
  const [expanded, setExpanded] = useState(true);
  const fullPath = isRoot ? '' : (currentPath ? `${currentPath}/${resource.name}` : resource.name);

  if (resource.type === 'file') {
    return (
      <div
        className="flex items-center gap-2 text-sm text-gray-600 pl-4 cursor-pointer hover:text-primary-500 hover:bg-gray-50 p-1 rounded transition-colors"
        onClick={() => onFileClick?.(fullPath, resource.name)}
      >
        {resource.name.endsWith('.py') && <FileCode size={14} className="text-blue-500" />}
        {resource.name.endsWith('.json') && <FileJson size={14} className="text-yellow-500" />}
        {resource.name.endsWith('.txt') && <File size={14} className="text-gray-400" />}
        {resource.name.endsWith('.md') && <FileText size={14} className="text-purple-500" />}
        {!resource.name.match(/\.(py|json|txt|md)$/) && <File size={14} className="text-gray-400" />}
        <span className="flex-1">{resource.name}</span>
        <span className="text-xs text-gray-400">点击预览</span>
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer hover:text-primary-500"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        <Folder size={16} className="text-orange-400" />
        <span>{resource.name}</span>
        {resource.children && resource.children.length > 0 && (
          <span className="text-xs text-gray-400">({resource.children.length})</span>
        )}
      </div>
      {expanded && resource.children && resource.children.length > 0 && (
        <div className="ml-2">
          {resource.children.map((child, index) => (
            <ResourceTree
              key={index}
              resource={child}
              currentPath={fullPath}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SkillDetailModal({ skill, onClose }: { skill: SkillDetail; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'metadata' | 'instruction' | 'resource'>('metadata');
  const [previewFile, setPreviewFile] = useState<{ filePath: string; fileName: string } | null>(null);

  const handleFileClick = (filePath: string, fileName: string) => {
    setPreviewFile({ filePath, fileName });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <Briefcase size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {skill.metadata?.name || '技能详情'}
                </h2>
                <p className="text-gray-500 text-sm">
                  {skill.metadata?.category || '未分类'} · v{skill.metadata?.version || '1.0.0'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('metadata')}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                activeTab === 'metadata'
                  ? 'text-primary-500 border-b-2 border-primary-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              元数据层 (Metadata)
            </button>
            <button
              onClick={() => setActiveTab('instruction')}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                activeTab === 'instruction'
                  ? 'text-primary-500 border-b-2 border-primary-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              指令层 (Instruction)
            </button>
            <button
              onClick={() => setActiveTab('resource')}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                activeTab === 'resource'
                  ? 'text-primary-500 border-b-2 border-primary-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              资源层 (Resource)
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {activeTab === 'metadata' && skill.metadata && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">基本信息</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-400">技能名称</span>
                      <p className="font-medium text-gray-900">{skill.metadata.name}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">技能ID</span>
                      <p className="font-mono text-sm text-gray-600">{skill.metadata.id}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">版本号</span>
                      <p className="text-gray-900">{skill.metadata.version}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">难度等级</span>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        skill.metadata.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        skill.metadata.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {skill.metadata.difficulty === 'easy' ? '入门' :
                         skill.metadata.difficulty === 'medium' ? '进阶' : '高级'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">技能描述</h3>
                  <p className="text-gray-700 leading-relaxed">{skill.metadata.description}</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">分类标签</h3>
                  <div className="flex flex-wrap gap-2">
                    {skill.metadata.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'instruction' && (
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-gray-700 font-mono text-sm leading-relaxed">
                    {skill.instruction || '暂无指令内容'}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'resource' && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-500 mb-4">资源文件结构</h3>
                  <ResourceTree resource={skill.resource} onFileClick={handleFileClick} isRoot={true} />
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-blue-600 mb-2">资源说明</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>reference/</strong>: 参考文档、分类标准、流程规范</li>
                    <li>• <strong>scripts/</strong>: 可执行脚本、自动化工具</li>
                    <li>• <strong>assets/</strong>: 模板文件、示例数据、配置文件</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              关闭
            </button>
            <button className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
              开始使用
            </button>
          </div>
        </div>
      </div>

      {previewFile && (
        <FilePreview
          skillId={skill.id}
          filePath={previewFile.filePath}
          fileName={previewFile.fileName}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
}

function SkillLibraryPage() {
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<SkillDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [skills, setSkills] = useState<SkillCard[]>([]);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const response = await apiClient.get('/skills');
      if (response.code === 0) {
        const apiSkills = response.data.map((skill: any) => {
          const card = skillCards.find(c => c.id === skill.id);
          return {
            ...card,
            id: skill.id,
            name: skill.name,
            title: skill.name,
            description: skill.description,
            category: skill.category,
            difficulty: skill.difficulty,
            tags: skill.tags,
            status: skill.status,
          } as SkillCard;
        }).filter((skill: SkillCard | undefined) => skill);
        setSkills(apiSkills.length > 0 ? apiSkills : skillCards);
      } else {
        setSkills(skillCards);
      }
    } catch {
      setSkills(skillCards);
    }
  };

  const handlePublishSkill = async (skillId: string) => {
    try {
      const response = await apiClient.post(`/skills/${skillId}/publish`);
      if (response.code === 0) {
        fetchSkills();
      }
    } catch (error) {
      console.error('发布技能失败:', error);
    }
  };

  const handleUnpublishSkill = async (skillId: string) => {
    try {
      const response = await apiClient.post(`/skills/${skillId}/unpublish`);
      if (response.code === 0) {
        fetchSkills();
      }
    } catch (error) {
      console.error('取消发布技能失败:', error);
    }
  };

  const filteredSkills = skills.filter((skill) => {
    const matchCategory = selectedCategory === '全部' || skill.category === selectedCategory;
    const matchSearch = skill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        skill.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });

  const handleSkillClick = async (skillId: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/skills/${skillId}`);
      if (response.code === 0) {
        setSelectedSkill(response.data);
      }
    } catch (error) {
      console.error('获取技能详情失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
            <Briefcase size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">应急技能库</h1>
            <p className="text-gray-500 text-sm">掌握应急管理必备技能，提升处置能力</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>共 {filteredSkills.length} 项技能</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索技能名称、描述或标签..."
                className="w-full px-4 py-3 pl-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSkills.map((skill) => (
            <button
              key={skill.id}
              onClick={() => handleSkillClick(skill.id)}
              className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all duration-300 text-left"
            >
              <div className="absolute top-4 right-4">
                {skill.status === 'published' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    已发布
                  </span>
                )}
                {skill.status === 'draft' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    草稿
                  </span>
                )}
              </div>
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${skill.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}
              >
                {skill.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {skill.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                {skill.description}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {skill.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{skill.category}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyConfig[skill.difficulty].color}`}>
                    {difficultyConfig[skill.difficulty].label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {skill.status === 'published' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnpublishSkill(skill.id);
                      }}
                      className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                    >
                      取消发布
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePublishSkill(skill.id);
                      }}
                      className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                    >
                      发布
                    </button>
                  )}
                  <ChevronRight className="w-5 h-5 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredSkills.length === 0 && (
          <div className="text-center py-16">
            <Briefcase size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">暂无匹配的技能</p>
            <p className="text-gray-400 text-sm mt-1">尝试调整筛选条件或搜索关键词</p>
          </div>
        )}

        <div className="mt-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 text-white">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Briefcase size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">技能库使用说明</h3>
              <ul className="space-y-2 text-white/80">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>根据难度标签选择适合自己当前水平的技能</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>通过分类筛选快速定位所需技能类型</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>点击技能卡片查看详细内容和操作指南</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">加载中...</span>
            </div>
          </div>
        </div>
      )}

      {selectedSkill && (
        <SkillDetailModal skill={selectedSkill} onClose={() => setSelectedSkill(null)} />
      )}
    </div>
  );
}

export default SkillLibraryPage;