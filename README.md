# 智能应急管理智能体

融合AI能力的安全生产应急管理平台，提供事件监测、任务管理、GIS地图可视化、知识库管理等核心功能。

## 项目结构

```
intelligent_emergency_management/
├── api/                 # 后端API服务
│   ├── src/
│   │   ├── ai/          # AI相关功能（RAG）
│   │   ├── db/          # 数据库操作（SQLite）
│   │   ├── routes/      # API路由
│   │   └── utils/       # 工具函数
│   └── data/            # SQLite数据库文件
├── web/                 # 前端应用
│   ├── public/          # 静态资源（地图数据）
│   └── src/
│       ├── api/         # API客户端
│       ├── components/  # 公共组件
│       ├── pages/       # 页面组件
│       ├── stores/      # 状态管理
│       └── styles/      # 全局样式
├── package.json         # 根配置
└── README.md
```

## 技术栈

### 后端（@iem/api）
- **框架**: Express 4.x + TypeScript
- **数据库**: SQLite（better-sqlite3）
- **ORM**: 自定义DAO层
- **验证**: Zod
- **PDF解析**: pdf-parse 2.x
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

### 4. 知识库管理
- PDF文档上传和解析，支持复杂结构（表格、图片）
- 文档预览功能（基于kkfileview）
- 文档列表和搜索
- 文档状态管理（上传中/解析中/成功/失败）

### 5. 方案管理
- AI智能生成处置方案
- 方案模板管理
- 方案详情和执行记录

### 6. 数据分析
- 关联分析：分析事件之间的关联关系
- 根因分析：挖掘事件根本原因
- 评估功能：对事件处置进行评估

### 7. 系统配置
- 事件类型管理
- 组织架构管理
- 预案模板管理
- 资源管理
- 方案模板管理

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

### 知识库
| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/rag/upload` | POST | 上传文档 |
| `/api/rag/list` | GET | 获取文档列表 |
| `/api/rag/preview/:id` | GET | 获取预览地址 |

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
- `rag_documents` - 知识库文档表

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

## 文档预览

项目集成kkfileview实现文档预览功能：

1. 启动kkfileview容器：
```bash
docker run -d -p 8012:8080 --name kkfileview \
  -e KK_TRUST_HOST= \
  keking/kkfileview:4.2.0
```

2. 系统会自动检测kkfileview服务状态，未启动时会提示用户。

## 许可证

MIT License
