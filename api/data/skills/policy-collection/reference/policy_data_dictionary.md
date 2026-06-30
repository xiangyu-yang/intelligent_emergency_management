# 应急政策文件数据字典

## 一、概述

本数据字典定义了应急政策文件数据库中所有数据表的字段结构、数据类型、约束条件和业务含义，为政策文件收集、存储、检索和管理提供统一的数据标准。

## 二、核心数据表结构

### 2.1 政策文件主表（policies）

| 字段名 | 数据类型 | 长度 | 约束 | 必填 | 说明 | 示例值 |
|--------|---------|------|------|------|------|--------|
| id | INTEGER | - | PRIMARY KEY, AUTO_INCREMENT | 是 | 政策文件唯一标识 | 1 |
| title | TEXT | - | NOT NULL | 是 | 政策文件标题 | 《突发事件应对法》 |
| document_number | TEXT | 100 | - | 否 | 文件编号 | 国务院令第69号 |
| version | TEXT | 20 | - | 否 | 版本号 | V1.0 |
| issue_date | DATE | - | - | 否 | 发布日期 | 2024-01-15 |
| effective_date | DATE | - | - | 否 | 生效日期 | 2024-02-01 |
| expiry_date | DATE | - | - | 否 | 失效日期 | NULL |
| issuing_authority | TEXT | 200 | - | 否 | 发布机构 | 国务院 |
| issuing_authority_level | TEXT | 50 | - | 否 | 发布机构级别 | 国家级 |
| issuing_authority_region | TEXT | 200 | - | 否 | 发布机构地域 | 全国 |
| category_level1 | TEXT | 50 | - | 是 | 一级分类 | 法律 |
| category_level2 | TEXT | 50 | - | 否 | 二级分类 | 总体预案 |
| category_level3 | TEXT | 50 | - | 否 | 三级分类 | 自然灾害 |
| category_full | TEXT | 200 | - | 否 | 完整分类路径 | 法律/总体预案/自然灾害 |
| status | TEXT | 20 | DEFAULT 'effective' | 是 | 文件状态 | effective |
| document_type | TEXT | 50 | - | 是 | 文件类型 | law |
| language | TEXT | 20 | DEFAULT 'zh-CN' | 否 | 语言 | zh-CN |
| keywords | TEXT | - | - | 否 | 关键词JSON数组 | ["应急管理","预案"] |
| tags | TEXT | - | - | 否 | 标签JSON数组 | ["重要","紧急"] |
| summary | TEXT | - | - | 否 | 文件摘要 | 本法规定了... |
| content | TEXT | - | - | 否 | 文件正文内容 | 第一章 总则... |
| content_length | INTEGER | - | - | 否 | 内容长度 | 15000 |
| chapter_count | INTEGER | - | - | 否 | 章节数量 | 10 |
| word_count | INTEGER | - | - | 否 | 字数 | 8000 |
| source_url | TEXT | - | - | 否 | 来源URL | http://www.gov.cn/... |
| source_website | TEXT | 200 | - | 否 | 来源网站名称 | 国务院 |
| source_channel | TEXT | 100 | - | 否 | 来源渠道 | 官方网站 |
| file_path | TEXT | - | - | 否 | 本地文件路径 | /data/policies/law/... |
| file_name | TEXT | 200 | - | 否 | 文件名称 | 突发事件应对法.pdf |
| file_format | TEXT | 20 | - | 否 | 文件格式 | pdf |
| file_size | INTEGER | - | - | 否 | 文件大小 | 500000 |
| file_encoding | TEXT | 20 | - | 否 | 文件编码 | utf-8 |
| download_status | TEXT | 20 | - | 否 | 下载状态 | success |
| download_time | TIMESTAMP | - | - | 否 | 下载时间 | 2024-01-20 10:00:00 |
| parse_status | TEXT | 20 | - | 否 | 解析状态 | success |
| parse_time | TIMESTAMP | - | - | 否 | 解析时间 | 2024-01-20 11:00:00 |
| quality_score | INTEGER | - | - | 否 | 质量评分 | 95 |
| completeness_score | INTEGER | - | - | 否 | 完整性评分 | 98 |
| accuracy_score | INTEGER | - | - | 否 | 准确性评分 | 99 |
| classification_score | INTEGER | - | - | 否 | 分类准确性评分 | 92 |
| review_status | TEXT | 20 | DEFAULT 'pending' | 否 | 审核状态 | approved |
| reviewer | TEXT | 100 | - | 否 | 审核人 | 张三 |
| review_time | TIMESTAMP | - | - | 否 | 审核时间 | 2024-01-21 09:00:00 |
| review_comments | TEXT | - | - | 否 | 审核意见 | 内容完整准确 |
| related_documents | TEXT | - | - | 否 | 相关文件JSON数组 | [{"id":2,"title":"..."}] |
| revision_history | TEXT | - | - | 否 | 修订历史JSON数组 | [{"version":"V1.0","date":"..."}] |
| attachments | TEXT | - | - | 否 | 附件JSON数组 | [{"name":"附表1","path":"..."}] |
| references | TEXT | - | - | 否 | 参考文件JSON数组 | [{"title":"参考法1","url":"..."}] |
| importance_level | INTEGER | - | DEFAULT 3 | 否 | 重要程度(1-5) | 4 |
| urgency_level | INTEGER | - | DEFAULT 3 | 否 | 紧急程度(1-5) | 3 |
| application_scope | TEXT | 200 | - | 否 | 适用范围 | 全国 |
| target_objects | TEXT | - | - | 否 | 适用对象JSON数组 | ["政府","企业","公众"] |
| implementation_requirement | TEXT | - | - | 否 | 实施要求 | 30天内完成 |
| compliance_deadline | DATE | - | - | 否 | 合规截止日期 | 2024-03-01 |
| enforcement_method | TEXT | - | - | 否 | 执行方式 | 强制执行 |
| penalty_clause | TEXT | - | - | 否 | 罚则条款 | 第五章第十条 |
| beneficial_clause | TEXT | - | - | 否 | 激励条款 | 第六条 |
| contact_info | TEXT | - | - | 否 | 联系方式JSON | {"name":"李四","phone":"..."} |
| created_at | TIMESTAMP | - | DEFAULT CURRENT_TIMESTAMP | 是 | 创建时间 | 2024-01-20 12:00:00 |
| updated_at | TIMESTAMP | - | DEFAULT CURRENT_TIMESTAMP | 是 | 更新时间 | 2024-01-21 08:00:00 |
| created_by | TEXT | 100 | - | 否 | 创建人 | system |
| updated_by | TEXT | 100 | - | 否 | 更新人 | admin |

### 2.2 政策分类表（policy_categories）

| 字段名 | 数据类型 | 长度 | 约束 | 必填 | 说明 | 示例值 |
|--------|---------|------|------|------|------|--------|
| id | INTEGER | - | PRIMARY KEY, AUTO_INCREMENT | 是 | 分类唯一标识 | 1 |
| category_code | TEXT | 50 | UNIQUE, NOT NULL | 是 | 分类编码 | L-OP-ND |
| category_name | TEXT | 100 | NOT NULL | 是 | 分类名称 | 自然灾害类法律 |
| category_level | INTEGER | - | NOT NULL | 是 | 分类层级 | 3 |
| parent_id | INTEGER | - | FOREIGN KEY | 否 | 父分类ID | 5 |
| parent_code | TEXT | 50 | - | 否 | 父分类编码 | L-OP |
| description | TEXT | - | - | 否 | 分类描述 | 自然灾害相关的法律文件 |
| example_documents | TEXT | - | - | 否 | 示例文件JSON | ["地震法","防洪法"] |
| keywords | TEXT | - | - | 否 | 关键词JSON数组 | ["地震","洪水","台风"] |
| document_count | INTEGER | - | DEFAULT 0 | 否 | 文件数量 | 15 |
| last_updated | TIMESTAMP | - | - | 否 | 最后更新时间 | 2024-01-20 |
| is_active | BOOLEAN | - | DEFAULT TRUE | 否 | 是否启用 | true |
| created_at | TIMESTAMP | - | DEFAULT CURRENT_TIMESTAMP | 是 | 创建时间 | 2024-01-01 |
| updated_at | TIMESTAMP | - | DEFAULT CURRENT_TIMESTAMP | 是 | 更新时间 | 2024-01-20 |

### 2.3 政策来源表（policy_sources）

| 字段名 | 数据类型 | 长度 | 约束 | 必填 | 说明 | 示例值 |
|--------|---------|------|------|------|------|--------|
| id | INTEGER | - | PRIMARY KEY, AUTO_INCREMENT | 是 | 来源唯一标识 | 1 |
| source_name | TEXT | 100 | UNIQUE, NOT NULL | 是 | 来源名称 | 国务院 |
| source_url | TEXT | - | NOT NULL | 是 | 来源网址 | www.gov.cn |
| source_type | TEXT | 50 | NOT NULL | 是 | 来源类型 | 官方网站 |
| source_level | TEXT | 50 | - | 否 | 来源级别 | 国家级 |
| source_region | TEXT | 200 | - | 否 | 来源地域 | 全国 |
| authority_type | TEXT | 100 | - | 否 | 机构类型 | 政府机关 |
| authority_nature | TEXT | 100 | - | 否 | 机构性质 | 行政机构 |
| document_types | TEXT | - | - | 否 | 文件类型JSON | ["law","regulation"] |
| update_frequency | TEXT | 50 | - | 否 | 更新频率 | 每日 |
| credibility_level | INTEGER | - | DEFAULT 5 | 否 | 可信度等级(1-5) | 5 |
| accessibility | TEXT | 50 | - | 否 | 访问性 | 公开 |
| crawl_enabled | BOOLEAN | - | DEFAULT TRUE | 否 | 是否采集 | true |
| crawl_config | TEXT | - | - | 否 | 采集配置JSON | {"keywords":[...]} |
| last_crawl_time | TIMESTAMP | - | - | 否 | 最后采集时间 | 2024-01-20 |
| crawl_status | TEXT | 50 | - | 否 | 采集状态 | active |
| document_count | INTEGER | - | DEFAULT 0 | 否 | 文件数量 | 100 |
| created_at | TIMESTAMP | - | DEFAULT CURRENT_TIMESTAMP | 是 | 创建时间 | 2024-01-01 |
| updated_at | TIMESTAMP | - | DEFAULT CURRENT_TIMESTAMP | 是 | 更新时间 | 2024-01-20 |

### 2.4 政策版本表（policy_versions）

| 字段名 | 数据类型 | 长度 | 约束 | 必填 | 说明 | 示例值 |
|--------|---------|------|------|------|------|--------|
| id | INTEGER | - | PRIMARY KEY, AUTO_INCREMENT | 是 | 版本唯一标识 | 1 |
| policy_id | INTEGER | - | FOREIGN KEY, NOT NULL | 是 | 政策文件ID | 10 |
| version_number | TEXT | 20 | NOT NULL | 是 | 版本号 | V2.0 |
| version_date | DATE | - | NOT NULL | 是 | 版本日期 | 2024-01-15 |
| version_type | TEXT | 50 | - | 否 | 版本类型 | 修订版 |
| change_type | TEXT | 50 | - | 否 | 变更类型 | 修订 |
| change_description | TEXT | - | - | 否 | 变更说明 | 修改了第三条 |
| change_details | TEXT | - | - | 否 | 变更详情JSON | [{"old":"...","new":"..."}] |
| previous_version_id | INTEGER | - | FOREIGN KEY | 否 | 上一个版本ID | 5 |
| next_version_id | INTEGER | - | FOREIGN KEY | 否 | 下一个版本ID | NULL |
| is_current | BOOLEAN | - | DEFAULT FALSE | 否 | 是否当前版本 | true |
| is_active | BOOLEAN | - | DEFAULT TRUE | 否 | 是否生效 | true |
| created_at | TIMESTAMP | - | DEFAULT CURRENT_TIMESTAMP | 是 | 创建时间 | 2024-01-15 |
| updated_at | TIMESTAMP | - | DEFAULT CURRENT_TIMESTAMP | 是 | 更新时间 | 2024-01-15 |

### 2.5 政策关联表（policy_relations）

| 字段名 | 数据类型 | 长度 | 约束 | 必填 | 说明 | 示例值 |
|--------|---------|------|------|------|------|--------|
| id | INTEGER | - | PRIMARY KEY, AUTO_INCREMENT | 是 | 关联唯一标识 | 1 |
| source_policy_id | INTEGER | - | FOREIGN KEY, NOT NULL | 是 | 源文件ID | 10 |
| target_policy_id | INTEGER | - | FOREIGN KEY, NOT NULL | 是 | 目标文件ID | 20 |
| relation_type | TEXT | 50 | NOT NULL | 是 | 关联类型 | 修订 |
| relation_strength | INTEGER | - | DEFAULT 3 | 否 | 关联强度(1-5) | 4 |
| relation_description | TEXT | - | - | 否 | 关联说明 | 修订关系 |
| is_bidirectional | BOOLEAN | - | DEFAULT FALSE | 否 | 是否双向关联 | false |
| created_at | TIMESTAMP | - | DEFAULT CURRENT_TIMESTAMP | 是 | 创建时间 | 2024-01-20 |
| updated_at | TIMESTAMP | - | DEFAULT CURRENT_TIMESTAMP | 是 | 更新时间 | 2024-01-20 |

### 2.6 政策关键词表（policy_keywords）

| 字段名 | 数据类型 | 长度 | 约束 | 必填 | 说明 | 示例值 |
|--------|---------|------|------|------|------|--------|
| id | INTEGER | - | PRIMARY KEY, AUTO_INCREMENT | 是 | 关键词唯一标识 | 1 |
| keyword | TEXT | 100 | UNIQUE, NOT NULL | 是 | 关键词 | 应急管理 |
| keyword_type | TEXT | 50 | - | 否 | 关键词类型 | 主题词 |
| keyword_frequency | INTEGER | - | DEFAULT 0 | 否 | 出现频率 | 150 |
| keyword_weight | INTEGER | - | DEFAULT 1 | 否 | 关键词权重 | 5 |
| keyword_category | TEXT | 100 | - | 否 | 关键词分类 | 应急管理 |
| synonym_keywords | TEXT | - | - | 否 | 同义词JSON | ["应急管理","应急管理"] |
| related_keywords | TEXT | - | - | 否 | 相关词JSON | ["预案","救援"] |
| created_at | TIMESTAMP | - | DEFAULT CURRENT_TIMESTAMP | 是 | 创建时间 | 2024-01-01 |
| updated_at | TIMESTAMP | - | DEFAULT CURRENT_TIMESTAMP | 是 | 更新时间 | 2024-01-20 |

### 2.7 政策文件审核记录表（policy_review_records）

| 字段名 | 数据类型 | 长度 | 约束 | 必填 | 说明 | 示例值 |
|--------|---------|------|------|------|------|--------|
| id | INTEGER | - | PRIMARY KEY, AUTO_INCREMENT | 是 | 记录唯一标识 | 1 |
| policy_id | INTEGER | - | FOREIGN KEY, NOT NULL | 是 | 政策文件ID | 10 |
| review_type | TEXT | 50 | NOT NULL | 是 | 审核类型 | 内容审核 |
| review_status | TEXT | 50 | NOT NULL | 是 | 审核状态 | approved |
| reviewer | TEXT | 100 | NOT NULL | 是 | 审核人 | 张三 |
| review_time | TIMESTAMP | - | NOT NULL | 是 | 审核时间 | 2024-01-21 09:00:00 |
| review_comments | TEXT | - | - | 否 | 审核意见 | 内容完整准确 |
| review_score | INTEGER | - | - | 否 | 审核评分 | 95 |
| review_details | TEXT | - | - | 否 | 审核详情JSON | [{"item":"标题","score":98}] |
| issues_found | TEXT | - | - | 否 | 发现问题JSON | ["编号格式不规范"] |
| improvement_suggestions | TEXT | - | - | 否 | 改进建议 | 规范编号格式 |
| next_review_date | DATE | - | - | 否 | 下次审核日期 | 2024-02-21 |
| created_at | TIMESTAMP | - | DEFAULT CURRENT_TIMESTAMP | 是 | 创建时间 | 2024-01-21 |
| updated_at | TIMESTAMP | - | DEFAULT CURRENT_TIMESTAMP | 是 | 更新时间 | 2024-01-21 |

### 2.8 政策文件使用记录表（policy_usage_records）

| 字段名 | 数据类型 | 长度 | 约束 | 必填 | 说明 | 示例值 |
|--------|---------|------|------|------|------|--------|
| id | INTEGER | - | PRIMARY KEY, AUTO_INCREMENT | 是 | 记录唯一标识 | 1 |
| policy_id | INTEGER | - | FOREIGN KEY, NOT NULL | 是 | 政策文件ID | 10 |
| user_id | TEXT | 100 | - | 否 | 用户ID | user001 |
| user_name | TEXT | 100 | - | 否 | 用户名称 | 李四 |
| user_role | TEXT | 50 | - | 否 | 用户角色 | 管理员 |
| usage_type | TEXT | 50 | NOT NULL | 是 | 使用类型 | 查看 |
| usage_time | TIMESTAMP | - | NOT NULL | 是 | 使用时间 | 2024-01-22 10:00:00 |
| usage_duration | INTEGER | - | - | 否 | 使用时长(秒) | 120 |
| usage_details | TEXT | - | - | 否 | 使用详情JSON | {"page":1,"section":"..."} |
| search_keyword | TEXT | 200 | - | 否 | 搜索关键词 | 应急预案 |
| feedback_rating | INTEGER | - | - | 否 | 反馈评分 | 5 |
| feedback_comments | TEXT | - | - | 否 | 反馈意见 | 内容很有帮助 |
| created_at | TIMESTAMP | - | DEFAULT CURRENT_TIMESTAMP | 是 | 创建时间 | 2024-01-22 |
| updated_at | TIMESTAMP | - | DEFAULT CURRENT_TIMESTAMP | 是 | 更新时间 | 2024-01-22 |

## 三、数据关系图

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│  policies   │───┬───│policy_versions│───┬───│policy_relations│
└─────────────┘   │   └──────────────┘   │   └─────────────┘
                  │                      │
                  │                      │
                  ▼                      ▼
┌─────────────┐       ┌──────────────┐
│policy_categories│───┤policy_keywords│
└─────────────┘       └──────────────┘
                  │
                  ▼
┌─────────────┐
│policy_sources│
└─────────────┘

┌─────────────┐       ┌──────────────┐
│  policies   │───┬───│policy_review_│
└─────────────┘   │   │   records    │
                  │   └──────────────┘
                  │
                  ▼
┌─────────────┐
│policy_usage_│
│  records    │
└─────────────┘
```

## 四、数据约束规则

### 4.1 唯一性约束

| 约束名 | 约束字段 | 说明 |
|--------|---------|------|
| unique_document_number | document_number | 文件编号唯一 |
| unique_category_code | category_code | 分类编码唯一 |
| unique_source_name | source_name | 来源名称唯一 |
| unique_keyword | keyword | 关键词唯一 |

### 4.2 外键约束

| 约束名 | 约束字段 | 参照表 | 参照字段 | 说明 |
|--------|---------|--------|---------|------|
| fk_policy_category | category_level1 | policy_categories | category_code | 一级分类关联 |
| fk_policy_version | policy_id | policies | id | 版本关联 |
| fk_policy_relation_source | source_policy_id | policies | id | 关联源文件 |
| fk_policy_relation_target | target_policy_id | policies | id | 关联目标文件 |
| fk_review_policy | policy_id | policies | id | 审核记录关联 |
| fk_usage_policy | policy_id | policies | id | 使用记录关联 |

### 4.3 检查约束

| 约束名 | 约束条件 | 说明 |
|--------|---------|------|
| check_quality_score | quality_score BETWEEN 0 AND 100 | 质量评分范围 |
| check_importance_level | importance_level BETWEEN 1 AND 5 | 重要程度范围 |
| check_urgency_level | urgency_level BETWEEN 1 AND 5 | 紧急程度范围 |
| check_credibility_level | credibility_level BETWEEN 1 AND 5 | 可信度等级范围 |
| check_status | status IN ('effective', 'draft', 'revised', 'expired', 'abolished') | 状态值范围 |

## 五、数据字典标准编码

### 5.1 文件状态编码（status）

| 编码值 | 编码名称 | 说明 | 示例 |
|--------|---------|------|------|
| effective | 生效 | 文件当前生效 | 当前有效的文件 |
| draft | 草案 | 文件尚未正式发布 | 正在制定的草案 |
| revised | 修订中 | 文件正在修订 | 正在修订的文件 |
| expired | 已失效 | 文件已失效但未废止 | 过期但未废止的文件 |
| abolished | 已废止 | 文件已正式废止 | 已废止的文件 |

### 5.2 文件类型编码（document_type）

| 编码值 | 编码名称 | 说明 | 示例 |
|--------|---------|------|------|
| law | 法律 | 全国人大制定的法律 | 《突发事件应对法》 |
| regulation | 法规 | 国务院制定的行政法规 | 《应急预案管理条例》 |
| rule | 规章 | 各部门制定的部门规章 | 《应急预案管理办法》 |
| normative | 规范性文件 | 各级政府发布的规范性文件 | 《关于加强应急管理的通知》 |
| guidance | 指导性文件 | 指导性、建议性文件 | 《应急预案编制指南》 |
| standard | 标准 | 国家标准、行业标准 | 《应急预案编制标准》 |
| plan | 预案 | 各类应急预案 | 《国家突发事件总体应急预案》 |

### 5.3 发布机构级别编码（issuing_authority_level）

| 编码值 | 编码名称 | 说明 | 示例 |
|--------|---------|------|------|
| national | 国家级 | 中央政府及部委 | 国务院、应急管理部 |
| provincial | 省级 | 省级政府及厅局 | 省政府、省应急厅 |
| municipal | 市级 | 市级政府及局 | 市政府、市应急局 |
| county | 县级 | 县级政府及局 | 县政府、县应急局 |
| township | 乡镇级 | 乡镇政府 | 乡镇政府 |

### 5.4 来源类型编码（source_type）

| 编码值 | 编码名称 | 说明 | 示例 |
|--------|---------|------|------|
| official_website | 官方网站 | 政府官方网站 | www.gov.cn |
| legal_database | 法律数据库 | 专业法律数据库 | 北大法宝 |
| news_media | 新闻媒体 | 新闻媒体网站 | 新华网 |
| professional_org | 专业机构 | 专业机构网站 | 应急管理学会 |
| academic_inst | 学术机构 | 学术机构网站 | 高校研究中心 |
| social_media | 社交媒体 | 社交媒体平台 | 微博公众号 |

### 5.5 审核状态编码（review_status）

| 编码值 | 编码名称 | 说明 | 示例 |
|--------|---------|------|------|
| pending | 待审核 | 待审核状态 | 新入库待审核文件 |
| reviewing | 审核中 | 正在审核 | 正在审核的文件 |
| approved | 已通过 | 审核通过 | 审核通过的文件 |
| rejected | 已拒绝 | 审核拒绝 | 审核拒绝的文件 |
| needs_revision | 需修订 | 需要修订 | 需修订的文件 |

### 5.6 关联类型编码（relation_type）

| 编码值 | 编码名称 | 说明 | 示例 |
|--------|---------|------|------|
| revision | 修订关系 | 修订版本关系 | 修订后的新版本 |
| reference | 参考关系 | 参考引用关系 | 参考其他文件制定 |
| supplement | 补充关系 | 补充完善关系 | 补充文件 |
| replacement | 替代关系 | 替代废止关系 | 替代废止文件 |
| amendment | 修正关系 | 修正关系 | 修正条款 |
| implementation | 实施关系 | 实施细则关系 | 实施细则 |
| interpretation | 解释关系 | 解释说明关系 | 解释文件 |

### 5.7 使用类型编码（usage_type）

| 编码值 | 编码名称 | 说明 | 示例 |
|--------|---------|------|------|
| view | 查看 | 浏览查看文件 | 查看文件内容 |
| download | 下载 | 下载文件 | 下载文件原文 |
| search | 搜索 | 搜索文件 | 搜索关键词 |
| print | 打印 | 打印文件 | 打印文件 |
| share | 分享 | 分享文件 | 分享给他人 |
| quote | 引用 | 引用文件 | 引用文件内容 |
| edit | 编辑 | 编辑文件 | 编辑修改文件 |
| delete | 删除 | 删除文件 | 删除文件 |

## 六、数据质量标准

### 6.1 数据完整性标准

| 字段类别 | 必填字段数量 | 完整率标准 | 说明 |
|---------|------------|----------|------|
| 基本信息 | 3 | ≥99% | title, category_level1, status |
| 分类信息 | 3 | ≥98% | category_level1, category_level2, category_level3 |
| 时间信息 | 3 | ≥95% | issue_date, effective_date, expiry_date |
| 来源信息 | 3 | ≥98% | source_url, source_website, source_channel |
| 内容信息 | 3 | ≥95% | content, summary, keywords |

### 6.2 数据准确性标准

| 字段类别 | 准确率标准 | 说明 |
|---------|----------|------|
| 基本信息 | ≥99% | 与原文完全一致 |
| 分类信息 | ≥95% | 分类准确无误 |
| 时间信息 | ≥100% | 日期完全准确 |
| 来源信息 | ≥100% | 来源完全准确 |

### 6.3 数据一致性标准

| 检查项 | 标准 | 说明 |
|--------|-----|------|
| 编号唯一性 | 100% | 文件编号唯一 |
| 分类一致性 | ≥98% | 分类与内容一致 |
| 关联一致性 | ≥95% | 关联关系正确 |
| 版本一致性 | ≥98% | 版本信息一致 |

## 七、数据索引标准

### 7.1 主键索引

| 表名 | 主键字段 | 索引类型 | 说明 |
|------|---------|---------|------|
| policies | id | PRIMARY | 主键索引 |
| policy_categories | id | PRIMARY | 主键索引 |
| policy_sources | id | PRIMARY | 主键索引 |
| policy_versions | id | PRIMARY | 主键索引 |
| policy_relations | id | PRIMARY | 主键索引 |
| policy_keywords | id | PRIMARY | 主键索引 |
| policy_review_records | id | PRIMARY | 主键索引 |
| policy_usage_records | id | PRIMARY | 主键索引 |

### 7.2 业务索引

| 表名 | 索引字段 | 索引类型 | 说明 |
|------|---------|---------|------|
| policies | title | INDEX | 标题检索索引 |
| policies | document_number | INDEX | 编号检索索引 |
| policies | category_level1 | INDEX | 分类检索索引 |
| policies | status | INDEX | 状态检索索引 |
| policies | issue_date | INDEX | 日期检索索引 |
| policies | keywords | INDEX | 关键词检索索引 |
| policies | source_url | INDEX | 来源检索索引 |
| policy_keywords | keyword | INDEX | 关键词检索索引 |
| policy_usage_records | policy_id | INDEX | 使用记录检索索引 |

### 7.3 全文索引

| 表名 | 索引字段 | 索引类型 | 说明 |
|------|---------|---------|------|
| policies | content | FULLTEXT | 内容全文检索索引 |
| policies | summary | FULLTEXT | 摘要全文检索索引 |
| policies | keywords | FULLTEXT | 关键词全文检索索引 |

---

**数据字典版本**：V1.0  
**发布日期**：2024年01月  
**维护单位**：应急管理科  
**更新频率**：按需更新