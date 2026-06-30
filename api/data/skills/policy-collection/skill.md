# 应急政策文件收集技能

## metadata

```json
{
  "name": "应急政策文件收集",
  "description": "系统收集、整理和归档各类应急管理相关政策法规文件，建立完整的政策数据库",
  "id": "policy-collection",
  "version": "1.0.0",
  "category": "信息收集",
  "difficulty": "easy",
  "tags": ["政策法规", "文件管理", "合规性"],
  "author": "应急管理系统",
  "createdAt": "2024-01-15",
  "updatedAt": "2024-01-15",
  "dependencies": [],
  "inputSchema": {
    "type": "object",
    "properties": {
      "keyword": { "type": "string", "description": "搜索关键词" },
      "category": { "type": "string", "description": "政策分类" },
      "dateRange": { "type": "object", "description": "日期范围" }
    }
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "policyList": { "type": "array", "description": "政策文件列表" },
      "totalCount": { "type": "number", "description": "文件总数" }
    }
  }
}
```

## instruction

### 1. 读取 reference

技能执行前，需先读取 `reference/` 目录下的参考文件，获取政策文件收集的标准规范和流程指导：

```bash
# 读取政策分类标准
cat reference/policy_categories.txt

# 读取收集流程规范
cat reference/collection_guidelines.md

# 读取合规性检查清单
cat reference/compliance_checklist.md

# 读取标准流程规范（新增）
cat reference/standard_process_specification.md

# 读取数据字典（新增）
cat reference/policy_data_dictionary.md

# 读取质量评估标准（新增）
cat reference/policy_quality_assessment_standard.md

# 读取来源渠道管理规范（新增）
cat reference/policy_source_management_specification.md
```

**核心参考文档说明：**

1. **policy_categories.txt**: 政策文件分类标准，定义一级、二级、三级分类体系
2. **collection_guidelines.md**: 政策文件收集流程规范，包含收集原则、流程、质量控制
3. **compliance_checklist.md**: 合规性检查清单，提供全面的合规检查项
4. **standard_process_specification.md**: 标准流程规范，详细定义收集流程、工具配置、考核标准
5. **policy_data_dictionary.md**: 数据字典，定义数据库表结构、字段标准、编码规范
6. **policy_quality_assessment_standard.md**: 质量评估标准，定义五维质量评估体系和评分标准
7. **policy_source_management_specification.md**: 来源渠道管理规范，定义渠道分类、注册、评估、维护机制

### 2. 读取 asset

读取 `assets/` 目录下的资源文件，获取模板和示例数据：

```bash
# 读取政策文件收集模板
cat assets/policy_collection_template.xlsx

# 读取示例政策文件
cat assets/sample_policy_doc.pdf
```

### 3. 执行 script

执行 `scripts/` 目录下的脚本，完成政策文件的收集和处理：

```bash
# 执行政策文件搜索脚本
python scripts/search_policies.py --keyword="应急预案" --category="总体预案"

# 执行政策文件下载脚本
python scripts/download_policies.py --urls=policy_urls.txt --output=downloads/

# 执行政策文件解析脚本
python scripts/parse_policies.py --input=downloads/ --output=parsed/

# 执行政策文件入库脚本
python scripts/import_to_db.py --input=parsed/ --db=iem.db
```

### 执行流程

```
┌─────────────────┐
│  1. 读取参考文件  │
│  (reference/)   │
└────────┬────────┘
         ▼
┌─────────────────┐
│  2. 读取资源文件  │
│   (assets/)     │
└────────┬────────┘
         ▼
┌─────────────────┐
│  3. 搜索政策文件  │
│ search_policies │
└────────┬────────┘
         ▼
┌─────────────────┐
│  4. 下载政策文件  │
│ download_policies│
└────────┬────────┘
         ▼
┌─────────────────┐
│  5. 解析政策文件  │
│  parse_policies │
└────────┬────────┘
         ▼
┌─────────────────┐
│  6. 入库存储     │
│  import_to_db   │
└─────────────────┘
```

## resource

### reference/

存放政策文件收集的标准规范和参考文档：

**基础规范文件：**
- `policy_categories.txt` - 政策文件分类标准（一级、二级、三级分类）
- `collection_guidelines.md` - 政策文件收集流程规范（收集原则、流程、质量控制）
- `compliance_checklist.md` - 合规性检查清单（全面的合规检查项）

**核心规范文件（新增）：**
- `standard_process_specification.md` - 标准流程规范（详细流程、工具配置、考核标准、附录）
- `policy_data_dictionary.md` - 数据字典（数据库表结构、字段标准、编码规范、索引标准）
- `policy_quality_assessment_standard.md` - 质量评估标准（五维评估体系、评分公式、评估工具）
- `policy_source_management_specification.md` - 来源渠道管理规范（渠道分类、注册、评估、维护、淘汰）

**文件详细说明：**

1. **standard_process_specification.md** (标准流程规范)
   - 概述：标准流程规范和质量要求
   - 来源渠道：国家级、省级、市县级官方渠道及专业数据库
   - 收集流程：准备、执行、处理、入库四阶段详细流程
   - 工具配置：搜索、下载、解析、入库工具的完整配置示例
   - 质量控制：完整性、准确性、时效性、合规性检查标准
   - 归档管理：命名规范、目录结构、存储要求、检索索引
   - 考核评估：工作量、质量、服务指标及评分标准
   - 附录：来源清单、分类编码、记录表模板

2. **policy_data_dictionary.md** (数据字典)
   - 核心数据表：policies、categories、sources、versions、relations等8个表
   - 字段定义：详细的字段类型、长度、约束、说明和示例
   - 数据关系：完整的数据关系图
   - 约束规则：唯一性、外键、检查约束
   - 编码标准：状态、类型、级别、来源、审核、关联、使用等编码
   - 质量标准：完整性、准确性、一致性标准
   - 索引标准：主键、业务、全文索引配置

3. **policy_quality_assessment_standard.md** (质量评估标准)
   - 五维评估体系：完整性、准确性、时效性、可用性、合规性
   - 综合评分公式：加权综合评分算法
   - 各维度详细评估标准：检查项、分值、评分标准
   - 评估流程：自动化评估、人工审核、综合评分、分级入库
   - 质量提升措施：不合格处理、定期复评、提升策略
   - 评估工具：完整性、准确性、综合评分工具代码示例
   - 评估报告：月度质量评估报告模板

4. **policy_source_management_specification.md** (来源渠道管理规范)
   - 分类体系：按机构级别、性质、访问方式分类
   - 注册管理：注册流程、信息登记、资质审核、测试验证
   - 质量评估：内容质量、服务质量、维护质量指标体系
   - 更新维护：定期维护、性能监测、问题处理、版本更新
   - 淘汰退出：淘汰条件、流程、替代方案处理
   - 配置管理：爬虫配置标准、渠道状态管理
   - 统计分析：统计指标体系、月度统计报告模板
   - 应急响应：响应机制、备用渠道管理

### scripts/

存放政策文件收集相关的脚本：

- `search_policies.py` - 政策文件搜索脚本
- `download_policies.py` - 政策文件下载脚本
- `parse_policies.py` - 政策文件解析脚本
- `import_to_db.py` - 政策文件入库脚本

### assets/

存放政策文件收集相关的资源文件：

- `policy_collection_template.xlsx` - 政策文件收集模板
- `sample_policy_doc.pdf` - 示例政策文件
- `policy_urls.txt` - 政策文件来源URL列表

### 使用说明

#### 输入参数

| 参数名 | 类型 | 说明 | 必填 |
|--------|------|------|------|
| keyword | string | 搜索关键词 | 否 |
| category | string | 政策分类 | 否 |
| dateRange | object | 日期范围 | 否 |
| outputDir | string | 输出目录 | 否 |

#### 输出结果

| 字段名 | 类型 | 说明 |
|--------|------|------|
| policyList | array | 收集到的政策文件列表 |
| totalCount | number | 文件总数 |
| downloadedCount | number | 成功下载数 |
| parsedCount | number | 成功解析数 |
| importCount | number | 成功入库数 |

#### 注意事项

1. 执行脚本前需确保已安装必要的依赖库
2. 下载政策文件时需注意网络状况和访问权限
3. 解析PDF文件时需确保已安装PDF解析库
4. 入库操作前需确保数据库连接正常
5. 建议定期更新参考文件和资源模板