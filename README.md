# 智能应急管理智能体

融合AI能力的安全生产应急管理平台，提供事件监测、任务管理、GIS地图可视化、RAG知识库管理、AI助手、Agent技能库管理等核心功能。

## 项目结构

```
intelligent_emergency_management/
├── api/                          # 后端API服务
│   ├── src/
│   │   ├── ai/                   # AI相关功能（RAG向量检索、LLM集成）
│   │   ├── db/                   # 数据库操作（SQLite）
│   │   ├── routes/               # API路由
│   │   │   ├── ai/              # AI助手接口
│   │   │   ├── analysis/         # 数据分析（关联分析、根因分析）
│   │   │   ├── config/           # 系统配置
│   │   │   ├── events/           # 事件管理
│   │   │   ├── knowledge/         # 知识库
│   │   │   ├── rag/              # RAG文档管理
│   │   │   ├── skills/           # 技能库管理
│   │   │   └── solutions/         # 方案管理
│   │   └── utils/                # 工具函数
│   └── data/                     # SQLite数据库、FAISS索引、技能文件
│       ├── skills/                # Agent技能库目录
│       │   └── policy-collection/ # 应急政策文件收集技能
│       │       ├── reference/     # 参考文档
│       │       ├── scripts/       # 执行脚本
│       │       └── assets/        # 资源文件
│       └── faiss/                 # 向量索引
├── web/                          # 前端应用
│   ├── public/                   # 静态资源
│   └── src/
│       ├── api/                  # API客户端
│       ├── components/           # 公共组件
│       │   ├── FilePreview.tsx   # 文件预览组件
│       │   ├── FloatingAssistant.tsx # 悬浮助手组件
│       │   ├── Layout.tsx        # 布局组件
│       │   └── Nav.tsx           # 导航组件
│       ├── hooks/                # 自定义Hooks
│       ├── pages/                # 页面组件
│       │   ├── AIAssistantPage.tsx    # AI助手页面
│       │   ├── DashboardPage.tsx       # 应急指挥大屏
│       │   ├── EventPage.tsx          # 事件监测页面
│       │   ├── KnowledgeBasePage.tsx   # 知识库管理页面
│       │   ├── ModelConfigPage.tsx    # 模型配置页面
│       │   ├── SkillLibraryPage.tsx   # 技能库页面
│       │   ├── SolutionPage.tsx       # 方案管理页面
│       │   ├── StatisticsPage.tsx      # 数据分析页面
│       │   ├── SystemConfigPage.tsx   # 系统配置页面
│       │   └── TaskPage.tsx           # 任务管理页面
│       ├── stores/                # 状态管理
│       └── styles/                # 全局样式
├── package.json                   # 根配置
└── README.md
```

## 技术栈

### 后端（@iem/api）
- **框架**: Express 4.x + TypeScript
- **数据库**: SQLite（better-sqlite3）
- **ORM**: 自定义DAO层
- **验证**: Zod
- **PDF解析**: pdf-parse 2.x
- **Word解析**: mammoth
- **Excel解析**: xlsx
- **向量检索**: FAISS-node / SimpleVectorIndex（备选）
- **嵌入模型**: BGE-M3（@xenova/transformers）
- **重排序**: BGE-Reranker-v2-m3（@xenova/transformers）
- **LLM集成**: 支持多种大语言模型（GPT、Claude、本地模型等）
- **构建工具**: tsx（开发）/ tsc（生产）

### 前端（@iem/web）
- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **样式**: Tailwind CSS 3
- **状态管理**: Zustand
- **路由**: React Router 6
- **图表**: ECharts + echarts-for-react
- **图标**: Lucide React

## 核心功能

### 1. 应急指挥大屏
- GIS地图视图，支持全国和省份级别查看
- 事件分布热力图，按等级（特别重大/重大/较大/一般）颜色区分
- 统计卡片展示事件总数、待处理数、进行中数、已完成数
- 地图钻取功能，点击省份切换至省级视图

### 2. 事件监测
- 事件列表展示，支持搜索和筛选
- 事件详情弹窗，显示关联任务和处置方案
- 事件验证和状态更新
- 相关任务联动，实时同步任务状态

### 3. 任务管理
- 看板视图，四列状态管理（待派发/进行中/已完成/已取消）
- 原生HTML5拖拽功能，支持任意状态切换
- 任务详情弹窗，展示任务信息和操作日志
- 新建任务、指派人员、启动任务、完成任务、取消任务
- 操作日志追溯，记录所有状态变更历史

### 4. RAG知识库管理
- 多格式文档上传（PDF、DOCX、TXT、Excel）
- 三种分片策略：
  - **固定长度**: 按字符数固定分割，智能切分在句子边界
  - **层次分片**: 按章节标题分割，保持文档结构
  - **语义分片**: 按段落分割，保持语义完整性
- 向量检索（FAISS）和混合检索
- 重排序优化（BGE-Reranker）
- 文档预览（基于kkfileview）
- Docker服务自动检测和启动
- 文档分类筛选和搜索

### 5. AI助手
- 智能问答交互界面
- 多轮对话支持
- 基于RAG知识库的精准回答
- 会话管理（创建、切换、删除）
- 实时流式响应

### 6. 模型配置
- LLM模型配置管理
- 支持多种模型提供商（OpenAI、Claude、本地模型等）
- 嵌入模型配置
- Reranker模型配置
- API密钥管理
- 模型参数调优（温度、最大Token等）

### 7. Agent技能库
- 技能卡片展示界面
- 技能详情查看（三层结构）：
  - **Metadata（元数据层）**: 名称、描述、版本、分类、标签等
  - **Instruction（指令层）**: 读取reference、读取asset、执行script
  - **Resource（资源层）**: 参考文档、脚本、资源文件
- 资源文件浏览器
- 文件预览功能（Markdown渲染、代码高亮、JSON格式化）
- 内置示例技能：**应急政策文件收集**
  - 支持政策分类标准
  - 完整的收集流程规范
  - 数据字典和质量评估标准
  - 来源渠道管理规范
  - 可执行的脚本工具

### 8. 方案管理
- AI智能生成处置方案
- 方案模板管理
- 方案详情和执行记录

### 9. 数据分析
- 关联分析：分析事件之间的关联关系
- 根因分析：挖掘事件根本原因
- 评估功能：对事件处置进行评估

### 10. 系统配置
- 事件类型管理
- 组织架构管理
- 预案模板管理
- 资源管理
- 方案模板管理

## Agent技能系统架构

### 技能文件结构
```
skills/
└── policy-collection/              # 应急政策文件收集技能
    ├── skill.md                    # 技能定义核心文件
    ├── reference/                  # 参考文档目录
    │   ├── policy_categories.txt              # 政策分类标准
    │   ├── collection_guidelines.md           # 收集流程规范
    │   ├── compliance_checklist.md            # 合规性检查清单
    │   ├── standard_process_specification.md   # 标准流程规范
    │   ├── policy_data_dictionary.md          # 数据字典
    │   ├── policy_quality_assessment_standard.md   # 质量评估标准
    │   └── policy_source_management_specification.md # 来源渠道管理
    ├── scripts/                   # 可执行脚本目录
    │   ├── search_policies.py     # 政策文件搜索脚本
    │   ├── download_policies.py   # 政策文件下载脚本
    │   ├── parse_policies.py      # 政策文件解析脚本
    │   └── import_to_db.py       # 政策文件入库脚本
    └── assets/                    # 资源文件目录
        ├── policy_collection_template.json  # 收集模板
        └── sample_policy_doc.txt            # 示例政策文件
```

### skill.md三层结构
```markdown
## metadata
- name: 技能名称
- description: 技能描述
- id/version/category/tags
- inputSchema/outputSchema

## instruction
1. 读取 reference（参考文档）
2. 读取 asset（资源文件）
3. 执行 script（运行脚本）

## resource
- reference/: 参考文档目录
- scripts/: 脚本目录
- assets/: 资源文件目录
```

## 快速开始

### 环境要求
- Node.js >= 18
- pnpm >= 8
- Docker（用于kkfileview文档预览）

### 安装依赖

```bash
cd intelligent_emergency_management
pnpm install
```

### 开发模式

```bash
# 同时启动后端和前端
pnpm dev

# 或分别启动
pnpm dev:api   # 后端 http://localhost:4001
pnpm dev:web   # 前端 http://localhost:5174
```

### 生产构建

```bash
pnpm build
pnpm start     # 启动后端服务
```

## API接口

### 事件管理
| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/events` | GET | 获取事件列表 |
| `/api/events/:id` | GET | 获取事件详情 |
| `/api/events/:id/tasks` | GET | 获取事件关联任务 |
| `/api/events/:id/verify` | POST | 验证事件 |
| `/api/events/:id` | PUT | 更新事件状态 |

### 任务管理
| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/tasks` | GET | 获取任务列表 |
| `/api/tasks` | POST | 创建新任务 |
| `/api/tasks/:id` | GET | 获取任务详情 |
| `/api/tasks/:id/status` | PUT | 更新任务状态 |
| `/api/tasks/:id/assign` | POST | 指派任务 |
| `/api/tasks/:id/complete` | POST | 完成任务 |

### RAG知识库
| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/rag/upload` | POST | 上传文档（支持chunkStrategy参数） |
| `/api/rag/documents` | GET | 获取文档列表（支持category筛选） |
| `/api/rag/documents/:id` | GET | 获取文档详情 |
| `/api/rag/documents/:id/chunks` | GET | 获取文档分片 |
| `/api/rag/documents/:id/rechunk` | POST | 重新分片 |
| `/api/rag/search` | GET | 智能检索（支持向量/混合检索） |
| `/api/rag/preview/status` | GET | 获取预览服务状态 |
| `/api/rag/preview/start` | POST | 启动预览服务 |
| `/api/rag/preview/url/:id` | GET | 获取文档预览地址 |
| `/api/rag/docker/status` | GET | 获取Docker服务状态 |
| `/api/rag/docker/start` | POST | 启动Docker服务 |

### AI助手
| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/ai/chat` | POST | 发送对话消息 |
| `/api/ai/sessions` | GET | 获取会话列表 |
| `/api/ai/sessions` | POST | 创建新会话 |
| `/api/ai/sessions/:id` | DELETE | 删除会话 |

### 技能库
| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/skills` | GET | 获取技能列表 |
| `/api/skills/:id` | GET | 获取技能详情（metadata/instruction/resource） |
| `/api/skills/:id/raw` | GET | 获取技能原始markdown |
| `/api/skills/:id/resources/*` | GET | 读取技能资源文件 |

### 模型配置
| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/config/models` | GET | 获取模型配置列表 |
| `/api/config/models` | POST | 创建模型配置 |
| `/api/config/models/:id` | PUT | 更新模型配置 |
| `/api/config/models/:id` | DELETE | 删除模型配置 |
| `/api/config/models/:id/test` | POST | 测试模型连接 |

### 配置管理
| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/config/organization` | GET | 获取组织架构 |
| `/api/config/eventTypes` | GET | 获取事件类型 |
| `/api/config/resources` | GET | 获取资源列表 |

## 数据库结构

### 核心表
- `emergency_events` - 事件信息表
- `emergency_tasks` - 任务信息表
- `emergency_event_types` - 事件类型表
- `emergency_resources` - 资源表
- `emergency_organization` - 组织架构表
- `rag_documents` - 知识库文档表（含charCount字段）
- `rag_chunks` - 文档分片表（含embedding向量）

## 状态流转

### 事件状态
```
检测到(detected) → 已验证(verified) → 处置中(handling) → 已完成(resolved)
     ↑                                                    ↓
     └────────────────── 可回退 ←─────────────────────────┘
```

### 任务状态
```
待派发(pending) ↔ 进行中(in_progress) ↔ 已完成(completed)
      ↓                 ↓
      └──────────→ 已取消(cancelled) ←──────────┘
```

### 文档状态
```
上传中(uploading) → 处理中(processing) → 就绪(ready)
                              ↓
                          失败(failed)
```

## 文档预览

项目集成kkfileview实现文档预览功能：

1. **自动检测**: 系统会自动检测Docker和kkfileview服务状态
2. **一键启动**: 点击"启动Docker服务"和"启动预览服务"按钮即可
3. **手动启动（可选）**:
```bash
docker run -d -p 8012:8080 --name kkfileview \
  -e KK_TRUST_HOST= \
  keking/kkfileview:4.2.0
```

## 分片策略说明

### 固定长度分片 (fixed_size)
- 按指定字符数分割文档
- 智能切分在句子边界（。！？\n）
- 支持重叠字符设置（chunkOverlap）

### 层次分片 (hierarchical)
- 自动识别章节标题（Markdown、中文、编号格式）
- 每个分片包含章节标题前缀
- 大章节自动子分割

### 语义分片 (semantic)
- 按段落分割，保持语义完整性
- 只有超大段落才进行二次分割
- 支持段落间重叠

## 许可证

MIT License
