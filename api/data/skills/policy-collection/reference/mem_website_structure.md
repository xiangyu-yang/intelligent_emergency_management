# 国家应急管理部网站结构规范

## 一、网站基本信息

### 1.1 网站地址
- **官方网站**: https://www.mem.gov.cn
- **政府信息公开栏目**: https://www.mem.gov.cn/gk/

### 1.2 网站架构
```
www.mem.gov.cn/
├── gk/                              # 政府信息公开
│   ├── tzgg/                        # 通知公告
│   │   ├── bl/                      # 部令
│   │   ├── tb/                      # 通报
│   │   ├── yjbgg/                   # 应急管理部公告
│   │   ├── tz/                      # 通知
│   │   ├── h/                       # 函
│   │   ├── yj/                      # 意见
│   │   ├── qt/                      # 其他
│   │   └── yjglbgg/                 # 应急管理部公报
│   ├── zcjd/                        # 政策解读
│   ├── rsxx/                        # 人事信息
│   ├── cwxx/                        # 财务信息
│   ├── sgcc/                        # 事故及灾害查处
│   │   ├── sggpdbqk/                # 挂牌督办
│   │   └── tbzdsgdcbg/              # 调查报告
│   ├── ghjh/                        # 计划规划
│   ├── tjsj/                        # 统计数据
│   ├── jytabljggk/                  # 建议提案办理
│   └── gwgg/                        # 原国家安全监管总局文件
│       └── agwzlfl/                 # 安监文件分类
│           ├── zjl_01/              # 总局令
│           ├── tz_01/               # 通知
│           ├── tb_01/               # 通报
│           ├── jd_01/               # 决定
│           ├── gg_01/               # 公告
│           ├── han_01/              # 函
│           ├── yj_01/               # 意见
│           ├── qt_01/               # 其他
│           ├── zjmjjgg/             # 煤矿安监局公告
│           └── gfxwj/               # 规范性文件
├── xw/                              # 新闻中心
├── yjglbgzdt/                       # 应急管理部工作动态
└── zfxxgkpt/                        # 政府信息公开平台
    └── fdzdgknr/                    # 法定主动公开内容
```

## 二、URL模式定义

### 2.1 通知公告列表页
```
https://www.mem.gov.cn/gk/tzgg/              # 通知公告首页
https://www.mem.gov.cn/gk/tzgg/bl/            # 部令列表
https://www.mem.gov.cn/gk/tzgg/tb/            # 通报列表
https://www.mem.gov.cn/gk/tzgg/yjbgg/         # 应急管理部公告列表
https://www.mem.gov.cn/gk/tzgg/tz/            # 通知列表
https://www.mem.gov.cn/gk/tzgg/h/             # 函列表
https://www.mem.gov.cn/gk/tzgg/yj/            # 意见列表
https://www.mem.gov.cn/gk/tzgg/qt/            # 其他列表
https://www.mem.gov.cn/gk/tzgg/yjglbgg/       # 应急管理部公报列表
```

### 2.2 政策解读列表页
```
https://www.mem.gov.cn/gk/zcjd/              # 政策解读列表
```

### 2.3 详情页URL模式
```
# HTML格式详情页
https://www.mem.gov.cn/gk/zfxxgkpt/fdzdgknr/{year}{month}/t{year}{month}{day}_{id}.shtml

# PDF格式文档
https://www.mem.gov.cn/gk/tzgg/yjglbgg/{year}{month}/P{random}.pdf
```

### 2.4 示例URL
```
# 部令示例
https://www.mem.gov.cn/gk/zfxxgkpt/fdzdgknr/202605/t20260528_605335.shtml

# 公告示例
https://www.mem.gov.cn/gk/zfxxgkpt/fdzdgknr/202606/t20260622_608438.shtml

# PDF公报示例
https://www.mem.gov.cn/gk/tzgg/yjglbgg/202605/P020260522357267263124.pdf
```

## 三、栏目结构说明

### 3.1 通知公告分类
| 分类 | URL | 说明 | 文档类型 |
|------|-----|------|----------|
| 部令 | /gk/tzgg/bl/ | 应急管理部令，如第21号、第20号等 | HTML |
| 通报 | /gk/tzgg/tb/ | 事故通报、工作通报等 | HTML |
| 公告 | /gk/tzgg/yjbgg/ | 行业标准批准公告等 | HTML |
| 通知 | /gk/tzgg/tz/ | 各类通知文件 | HTML |
| 函 | /gk/tzgg/h/ | 各类函件 | HTML |
| 意见 | /gk/tzgg/yj/ | 征求意见稿等 | HTML |
| 其他 | /gk/tzgg/qt/ | 其他类型文件 | HTML |
| 公报 | /gk/tzgg/yjglbgg/ | 应急管理部公报 | PDF |

### 3.2 事故及灾害查处分类
| 分类 | URL | 说明 |
|------|-----|------|
| 挂牌督办 | /gk/sgcc/sggpdbqk/ | 重大生产安全事故查处挂牌督办 |
| 调查报告 | /gk/sgcc/tbzdsgdcbg/ | 事故调查报告 |

### 3.3 计划规划
| 分类 | URL | 说明 |
|------|-----|------|
| 计划规划 | /gk/ghjh/ | 应急管理发展规划 |

### 3.4 统计数据
| 分类 | URL | 说明 |
|------|-----|------|
| 统计数据 | /gk/tjsj/ | 各类统计数据报告 |

## 四、内容提取规则

### 4.1 列表页提取规则

#### HTML列表页结构
```html
<div class="list">
    <ul>
        <li>
            <a href="详情页URL">标题内容</a>
            <span class="date">发布日期</span>
        </li>
        <!-- 更多列表项 -->
    </ul>
</div>
```

#### 提取字段
| 字段 | 提取规则 | 示例 |
|------|----------|------|
| title | `<a>`标签文本内容 | 中华人民共和国应急管理部公告（2026年第9号） |
| url | `<a>`标签href属性 | /gk/zfxxgkpt/fdzdgknr/202606/t20260622_608438.shtml |
| publishDate | `<span class="date">`文本 | 2026-06-22 |
| category | 从URL路径提取 | 公告 |

### 4.2 详情页提取规则

#### HTML详情页结构
```html
<div class="article">
    <h1 class="title">文章标题</h1>
    <div class="info">
        <span>来源：应急管理部</span>
        <span>发布时间：2026-06-22</span>
    </div>
    <div class="content">
        <!-- 正文内容 -->
    </div>
</div>
```

#### 提取字段
| 字段 | 提取规则 | 示例 |
|------|----------|------|
| title | `<h1 class="title">`文本 | 中华人民共和国应急管理部公告（2026年第9号） |
| content | `<div class="content">`内所有文本 | 批准5项行业标准... |
| source | 来源信息 | 应急管理部 |
| publishDate | 发布时间 | 2026-06-22 |
| documentType | 判断URL后缀 | html |

### 4.3 PDF文档处理

#### PDF识别规则
- URL以 `.pdf` 结尾
- 从公报列表页获取PDF链接
- 使用pdfplumber提取文本内容

#### 提取字段
| 字段 | 提取规则 |
|------|----------|
| title | 从列表页标题获取 |
| content | pdfplumber提取文本 |
| source | 应急管理部公报 |
| publishDate | 从列表页日期获取 |
| documentType | pdf |

## 五、分页处理规则

### 5.1 列表页分页
```
# 分页URL模式
https://www.mem.gov.cn/gk/tzgg/bl/index_{page}.shtml

# 示例
https://www.mem.gov.cn/gk/tzgg/bl/index_2.shtml
https://www.mem.gov.cn/gk/tzgg/bl/index_3.shtml
```

### 5.2 分页检测方法
1. 检查页面是否有分页导航
2. 检查是否存在下一页链接
3. 若列表为空或重复则停止分页

## 六、反爬策略说明

### 6.1 请求频率控制
- 单次请求间隔：2-3秒
- 列表页请求间隔：3-5秒
- 避免并发请求

### 6.2 请求头设置
```python
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Referer': 'https://www.mem.gov.cn/gk/'
}
```

### 6.3 注意事项
- 遵守robots.txt规则
- 仅抓取公开可获取信息
- 避免对网站造成访问压力
- 遵守《政府信息公开条例》

## 七、数据存储格式

### 7.1 政策文件元数据
```json
{
    "id": "unique_id",
    "title": "政策标题",
    "category": "部令/公告/通知/通报/函/意见",
    "source": "应急管理部",
    "publishDate": "2026-06-22",
    "url": "https://www.mem.gov.cn/...",
    "documentType": "html/pdf",
    "content": "文档内容（HTML或PDF提取文本）",
    "summary": "内容摘要",
    "keywords": ["关键词1", "关键词2"],
    "status": "active/inactive",
    "createdAt": "2026-06-30",
    "updatedAt": "2026-06-30"
}
```

### 7.2 分类编码
| 分类 | 编码 |
|------|------|
| 部令 | BL |
| 通报 | TB |
| 公告 | GG |
| 通知 | TZ |
| 函 | H |
| 意见 | YJ |
| 其他 | QT |
| 公报 | GB |

## 八、更新策略

### 8.1 定期更新
- 每日增量更新：检查当日发布的新文件
- 每周全量更新：确保数据完整性
- 每月质量检查：检查数据准确性

### 8.2 更新触发条件
- 手动触发：用户请求时
- 定时触发：每日凌晨自动执行
- 事件触发：检测到网站更新时

## 九、附录

### 9.1 常用URL列表
```
# 通知公告首页
https://www.mem.gov.cn/gk/tzgg/

# 部令
https://www.mem.gov.cn/gk/tzgg/bl/

# 通报
https://www.mem.gov.cn/gk/tzgg/tb/

# 公告
https://www.mem.gov.cn/gk/tzgg/yjbgg/

# 通知
https://www.mem.gov.cn/gk/tzgg/tz/

# 函
https://www.mem.gov.cn/gk/tzgg/h/

# 意见
https://www.mem.gov.cn/gk/tzgg/yj/

# 公报
https://www.mem.gov.cn/gk/tzgg/yjglbgg/

# 政策解读
https://www.mem.gov.cn/gk/zcjd/

# 事故及灾害查处
https://www.mem.gov.cn/gk/sgcc/

# 计划规划
https://www.mem.gov.cn/gk/ghjh/

# 统计数据
https://www.mem.gov.cn/gk/tjsj/
```

### 9.2 参考文档
- 《中华人民共和国政府信息公开条例》
- 《互联网信息服务管理办法》
- 应急管理部网站robots.txt：https://www.mem.gov.cn/robots.txt
