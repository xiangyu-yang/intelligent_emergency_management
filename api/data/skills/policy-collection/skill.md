# 应急政策文件收集技能

## metadata

```json
{
  "name": "应急政策文件收集",
  "description": "从国家应急管理部官方网站及相关权威渠道系统收集、整理和归档各类应急管理相关政策法规文件，建立完整的政策数据库，支持大模型进行政策查询和分析",
  "id": "policy-collection",
  "version": "2.0.0",
  "category": "信息收集",
  "difficulty": "medium",
  "tags": ["政策法规", "文件管理", "合规性", "应急管理", "政府公开信息"],
  "author": "应急管理系统",
  "createdAt": "2026-06-30",
  "updatedAt": "2026-06-30",
  "dependencies": ["requests", "beautifulsoup4", "pdfplumber", "sqlite3"],
  "inputSchema": {
    "type": "object",
    "properties": {
      "keyword": { "type": "string", "description": "搜索关键词，如'应急预案'、'安全生产'" },
      "category": { "type": "string", "description": "政策分类，如'部令'、'公告'、'通知'、'通报'" },
      "dateRange": { 
        "type": "object", 
        "description": "日期范围",
        "properties": {
          "startDate": { "type": "string", "description": "开始日期，格式YYYY-MM-DD" },
          "endDate": { "type": "string", "description": "结束日期，格式YYYY-MM-DD" }
        }
      },
      "sourceType": { "type": "string", "description": "来源类型，如'国家级'、'部令'、'公告'" },
      "documentType": { "type": "string", "description": "文档类型，如'html'、'pdf'" }
    }
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "policyList": { 
        "type": "array", 
        "description": "政策文件列表",
        "items": {
          "type": "object",
          "properties": {
            "id": { "type": "string", "description": "政策ID" },
            "title": { "type": "string", "description": "政策标题" },
            "category": { "type": "string", "description": "政策分类" },
            "source": { "type": "string", "description": "来源渠道" },
            "publishDate": { "type": "string", "description": "发布日期" },
            "url": { "type": "string", "description": "原文链接" },
            "documentType": { "type": "string", "description": "文档类型" },
            "content": { "type": "string", "description": "文档内容摘要" },
            "status": { "type": "string", "description": "状态" }
          }
        }
      },
      "totalCount": { "type": "number", "description": "文件总数" },
      "downloadedCount": { "type": "number", "description": "成功下载数" },
      "parsedCount": { "type": "number", "description": "成功解析数" },
      "importCount": { "type": "number", "description": "成功入库数" }
    }
  },
  "capabilities": [
    "从国家应急管理部官方网站(http://www.mem.gov.cn)抓取政策文件",
    "支持多种政策类型：部令、公告、通知、通报、函、意见等",
    "支持多种文档格式：HTML网页、PDF文档",
    "自动解析文档内容并提取关键信息",
    "建立完整的政策数据库，支持全文检索",
    "支持按关键词、分类、日期范围进行检索",
    "定期自动更新政策文件"
  ],
  "usageExamples": [
    {
      "input": { "keyword": "应急预案", "category": "公告", "dateRange": { "startDate": "2026-01-01", "endDate": "2026-06-30" } },
      "output": "返回2026年发布的与应急预案相关的公告文件列表"
    },
    {
      "input": { "category": "部令" },
      "output": "返回所有应急管理部令文件列表"
    },
    {
      "input": { "sourceType": "国家级", "documentType": "pdf" },
      "output": "返回国家级PDF格式的政策文件列表"
    }
  ]
}
```

## instruction

### 1. 读取 reference

技能执行前，需先读取 `reference/` 目录下的参考文件，获取政策文件收集的标准规范和流程指导：

```bash
# 读取政策分类标准（基于应急管理部网站分类）
cat reference/policy_categories.txt

# 读取收集流程规范
cat reference/collection_guidelines.md

# 读取合规性检查清单
cat reference/compliance_checklist.md

# 读取标准流程规范
cat reference/standard_process_specification.md

# 读取数据字典
cat reference/policy_data_dictionary.md

# 读取质量评估标准
cat reference/policy_quality_assessment_standard.md

# 读取来源渠道管理规范（包含应急管理部网站结构）
cat reference/policy_source_management_specification.md

# 读取应急管理部网站结构规范（新增）
cat reference/mem_website_structure.md
```

**核心参考文档说明：**

1. **policy_categories.txt**: 政策文件分类标准，基于应急管理部网站实际分类体系
2. **collection_guidelines.md**: 政策文件收集流程规范
3. **compliance_checklist.md**: 合规性检查清单
4. **standard_process_specification.md**: 标准流程规范
5. **policy_data_dictionary.md**: 数据字典
6. **policy_quality_assessment_standard.md**: 质量评估标准
7. **policy_source_management_specification.md**: 来源渠道管理规范
8. **mem_website_structure.md**: 应急管理部网站结构规范，定义网站URL模式和内容提取规则

### 2. 读取 asset

读取 `assets/` 目录下的资源文件，获取模板和示例数据：

```bash
# 读取政策文件收集模板（JSON格式）
cat assets/policy_collection_template.json

# 读取示例政策文件（TXT格式）
cat assets/sample_policy_doc.txt

# 读取政策文件来源URL列表（包含应急管理部各栏目URL）
cat assets/policy_urls.txt

# 读取网站提取规则配置（新增）
cat assets/extraction_rules.json
```

### 3. 执行 script

执行 `scripts/` 目录下的脚本，完成政策文件的收集和处理：

```bash
# 从应急管理部网站搜索政策文件
python scripts/search_policies.py --keyword="应急预案" --category="公告"

# 下载政策文件（支持HTML和PDF）
python scripts/download_policies.py --urls=assets/policy_urls.txt --output=downloads/

# 解析政策文件内容
python scripts/parse_policies.py --input=downloads/ --output=parsed/

# 政策文件入库
python scripts/import_to_db.py --input=parsed/ --db=iem.db

# 增量更新政策文件
python scripts/incremental_update.py --lastUpdate=2026-06-01

# 政策文件全文检索
python scripts/search_policy_content.py --query="安全生产责任制"
```

### 执行流程

```
┌─────────────────────┐
│  1. 读取参考文件     │
│  (reference/)       │
│  - 分类标准          │
│  - 网站结构          │
│  - 提取规则          │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  2. 读取资源文件     │
│   (assets/)         │
│  - URL列表          │
│  - 提取规则配置      │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  3. 搜索政策文件     │
│ search_policies     │
│  - 访问应急管理部网站 │
│  - 解析页面列表      │
│  - 提取文件信息      │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  4. 下载政策文件     │
│ download_policies   │
│  - HTML页面下载      │
│  - PDF文件下载       │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  5. 解析政策文件     │
│  parse_policies     │
│  - HTML内容提取      │
│  - PDF内容提取       │
│  - 元数据提取        │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  6. 入库存储         │
│  import_to_db       │
│  - 政策信息入库      │
│  - 全文索引          │
└─────────────────────┘
```

## resource

### reference/

存放政策文件收集的标准规范和参考文档：

**基础规范文件：**
- `policy_categories.txt` - 政策文件分类标准（基于应急管理部网站分类）
- `collection_guidelines.md` - 政策文件收集流程规范
- `compliance_checklist.md` - 合规性检查清单

**核心规范文件：**
- `standard_process_specification.md` - 标准流程规范
- `policy_data_dictionary.md` - 数据字典
- `policy_quality_assessment_standard.md` - 质量评估标准
- `policy_source_management_specification.md` - 来源渠道管理规范

**新增网站相关规范：**
- `mem_website_structure.md` - 应急管理部网站结构规范，包含：
  - 网站URL模式定义
  - 栏目结构说明
  - 内容提取规则
  - 分页处理规则
  - 反爬策略说明

### scripts/

存放政策文件收集相关的脚本：

- `search_policies.py` - 政策文件搜索脚本（从应急管理部网站抓取）
- `download_policies.py` - 政策文件下载脚本（支持HTML和PDF）
- `parse_policies.py` - 政策文件解析脚本（HTML和PDF内容提取）
- `import_to_db.py` - 政策文件入库脚本
- `incremental_update.py` - 增量更新脚本（定期更新）
- `search_policy_content.py` - 全文检索脚本

### assets/

存放政策文件收集相关的资源文件：

- `policy_collection_template.json` - 政策文件收集模板（JSON格式）
- `sample_policy_doc.txt` - 示例政策文件
- `policy_urls.txt` - 政策文件来源URL列表（应急管理部各栏目）
- `extraction_rules.json` - 网站提取规则配置（新增）

### 使用说明

#### 输入参数

| 参数名 | 类型 | 说明 | 必填 |
|--------|------|------|------|
| keyword | string | 搜索关键词，如'应急预案'、'安全生产' | 否 |
| category | string | 政策分类，如'部令'、'公告'、'通知'、'通报' | 否 |
| dateRange | object | 日期范围，包含startDate和endDate | 否 |
| sourceType | string | 来源类型，如'国家级'、'部令'、'公告' | 否 |
| documentType | string | 文档类型，如'html'、'pdf' | 否 |
| outputDir | string | 输出目录 | 否 |

#### 输出结果

| 字段名 | 类型 | 说明 |
|--------|------|------|
| policyList | array | 收集到的政策文件列表，包含详细信息 |
| totalCount | number | 文件总数 |
| downloadedCount | number | 成功下载数 |
| parsedCount | number | 成功解析数 |
| importCount | number | 成功入库数 |

#### 注意事项

1. 执行脚本前需确保已安装必要的依赖库：requests、beautifulsoup4、pdfplumber
2. 下载政策文件时需注意遵守网站robots.txt规则
3. 建议设置合理的请求间隔，避免对目标网站造成压力
4. 解析PDF文件时需确保已安装pdfplumber库
5. 入库操作前需确保数据库连接正常
6. 建议定期执行增量更新脚本，保持政策数据最新
7. 遵守政府信息公开条例，仅收集公开可获取的信息
