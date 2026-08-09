# Sonarr 中文别名搜索代理需求文档

## 1. 项目背景

Sonarr 在搜索剧集资源时，通常依赖 TVDB 等元数据中的主标题、英文标题或外部媒体 ID。

对于中文剧集、国产剧、港台剧、中文纪录片，以及部分使用中文译名发布的日韩剧集，资源站中的资源标题可能只包含：

* 中文原名
* 中文译名
* 繁体中文名
* 站点常用简称
* 中文季数、集数表达
* 与 TVDB 英文主标题差异较大的名称

例如 Sonarr 搜索：

```text
Joy of Life S02E12
```

而资源站实际发布：

```text
庆余年 第二季 第12集 2160P
庆余年2.E12.WEB-DL
慶餘年.S02E12
```

即使资源站中存在对应资源，Sonarr 也可能因为搜索词不匹配而无法找到。

本项目计划实现一个兼容 Torznab 协议的虚拟 Indexer，部署在 Vercel 等 Serverless 平台中，作为 Sonarr 的补充搜索入口。

该服务接收 Sonarr 的搜索请求，将英文标题或媒体 ID 转换、扩展为中文原名、简体名、繁体名及其他别名，再调用 Prowlarr 搜索真实 Indexer，最终将结果以标准 Torznab XML 返回给 Sonarr。

---

## 2. 项目定位

项目暂定名称：

```text
Sonarr Alias Indexer
```

也可以使用：

```text
Chinese Torznab Proxy
Aliasarr
TitleBridge
CN Indexer Proxy
```

项目本质上是：

> 一个兼容 Torznab 协议、支持多语言标题扩展和 Prowlarr 聚合搜索的虚拟 Indexer。

它不是：

* Torrent 下载器
* Torrent 文件存储服务
* 独立种子搜索引擎
* Sonarr 反向代理
* Prowlarr 替代品
* 自动爬取私有站点的爬虫

在 Sonarr 中，它表现为一个普通的自定义 Torznab Indexer。

---

## 3. 建设目标

### 3.1 核心目标

在不修改 Sonarr 和 Prowlarr 源代码的情况下，提升 Sonarr 对中文资源标题的搜索覆盖率。

系统需要实现：

1. 接收 Sonarr 标准 Torznab 搜索请求。
2. 识别剧集对应的 TVDB、TMDB 等媒体 ID。
3. 获取剧集的中文原名、简体名、繁体名、英文名及别名。
4. 根据季、集信息生成多组查询关键词。
5. 调用 Prowlarr 搜索现有 Indexer。
6. 合并并去重多个搜索结果。
7. 将结果转换为 Sonarr 可识别的 Torznab XML。
8. 尽可能保持原始下载链路不变。
9. 在代理不可用时，不影响 Sonarr 原有 Indexer。

### 3.2 首期目标

第一阶段将服务作为 Sonarr 的补充 Indexer，而不是替代全部 Prowlarr Indexer。

```text
Sonarr
├── Prowlarr 同步的普通 Indexer
└── Sonarr Alias Indexer
        └── Prowlarr
                ├── Indexer A
                ├── Indexer B
                └── Indexer C
```

这样可以：

* 保留原有搜索能力
* 降低系统故障影响
* 对比中文代理带来的新增结果
* 避免一次性重构现有链路
* 逐步验证标题转换效果

---

## 4. 非目标

首个版本暂不处理以下内容：

1. 不主动爬取 Torrent 网站页面。
2. 不实现独立 DHT 搜索。
3. 不存储或分发 Torrent 文件。
4. 不取代 Sonarr 的质量规则。
5. 不取代 Sonarr 的剧集管理能力。
6. 不通过大模型决定所有搜索结果。
7. 不自动修改 Sonarr 中的剧集主标题。
8. 不保证识别完全非标准的中文集数表达。
9. 不直接管理 Prowlarr 中的 Indexer 账号。
10. 不处理资源站登录、验证码和反爬机制。

---

## 5. 用户场景

### 5.1 中文剧集搜索

Sonarr 中剧集主标题为：

```text
Joy of Life
```

用户搜索第二季第十二集。

代理根据 TVDB ID 获取：

```text
Joy of Life
庆余年
慶餘年
庆余年 第二季
庆余年2
```

生成查询：

```text
Joy of Life S02E12
庆余年 S02E12
慶餘年 S02E12
庆余年 第二季 第12集
庆余年2 12
```

最终将多个查询结果合并返回。

### 5.2 中文原名被英文标题覆盖

部分国产剧在 Sonarr 中使用英文译名，但资源站仅使用原始中文名。

代理应优先根据外部媒体 ID 获取原始语言标题，而不是直接将英文标题机器翻译成中文。

### 5.3 简繁体资源搜索

同一剧集在不同站点中可能使用简体或繁体标题。

代理应支持：

```text
庆余年
慶餘年
```

简繁体转换可以作为补充，但不能覆盖人工确认的正式别名。

### 5.4 中文集数格式

资源站可能使用：

```text
S02E12
EP12
E12
第12集
12集
第二季第十二集
```

首期优先支持数字集数：

```text
S02E12
EP12
E12
第12集
12
```

中文数字转换可以在后续版本加入。

---

## 6. 总体架构

```text
┌─────────────┐
│   Sonarr    │
└──────┬──────┘
       │ Torznab
       │ caps / tvsearch / search
       ▼
┌─────────────────────────┐
│ Sonarr Alias Indexer    │
│ 部署于 Vercel           │
│                         │
│ 1. 参数解析             │
│ 2. 标题解析             │
│ 3. 别名查询             │
│ 4. 查询扩展             │
│ 5. Prowlarr 搜索        │
│ 6. 结果合并             │
│ 7. Torznab XML 输出     │
└────────────┬────────────┘
             │ Prowlarr API
             ▼
┌─────────────────────────┐
│       Prowlarr          │
│                         │
│ Indexer A               │
│ Indexer B               │
│ Indexer C               │
└────────────┬────────────┘
             ▼
       Torrent Indexers
```

---

## 7. Sonarr 接入方式

在 Sonarr 中新增自定义 Torznab Indexer：

```text
Settings
→ Indexers
→ Add Indexer
→ Torznab
→ Custom
```

参考配置：

```text
Name:
Chinese Alias Indexer

URL:
https://alias-indexer.example.com

API Path:
/api/torznab

API Key:
由代理服务生成的访问密钥

Categories:
5000, 5030, 5040, 5045
```

Sonarr 将请求：

```text
GET /api/torznab?t=caps&apikey=xxx
```

搜索时请求：

```text
GET /api/torznab
  ?t=tvsearch
  &q=Joy%20of%20Life
  &season=2
  &ep=12
  &tvdbid=366625
  &cat=5000
  &apikey=xxx
```

---

## 8. 核心功能需求

## 8.1 Torznab 能力声明

系统需要实现：

```text
GET /api/torznab?t=caps
```

返回标准 Torznab Caps XML，至少声明：

* 普通搜索
* TV 搜索
* 查询关键词
* 季数
* 集数
* TVDB ID
* TMDB ID
* TV 分类
* 最大返回条数

首期建议支持参数：

```text
q
season
ep
tvdbid
tmdbid
cat
limit
offset
```

---

## 8.2 搜索请求解析

系统需要解析：

```text
t
q
season
ep
tvdbid
tmdbid
imdbid
cat
limit
offset
apikey
```

搜索类型至少支持：

```text
t=tvsearch
t=search
```

当搜索类型不支持时，返回明确的 Torznab 错误，而不是返回 HTML 页面。

---

## 8.3 剧集身份识别

推荐识别优先级：

```text
TVDB ID
→ TMDB ID
→ IMDb ID
→ Sonarr 传入标题
```

当存在媒体 ID 时，不应仅根据标题猜测剧集。

需要设计统一媒体实体：

```typescript
interface MediaIdentity {
  tvdbId?: number;
  tmdbId?: number;
  imdbId?: string;
  primaryTitle?: string;
  year?: number;
  mediaType: "series";
}
```

---

## 8.4 标题别名获取

标题数据可来自：

1. 本地人工别名库
2. TVDB 元数据
3. TMDB 元数据
4. Sonarr 提供的标题
5. 简繁体转换
6. 后续接入的第三方中文影视数据源
7. Agent 补全结果

别名结构建议：

```typescript
interface TitleAlias {
  title: string;
  language?: string;
  region?: string;
  script?: "simplified" | "traditional" | "latin" | "other";
  type:
    | "original"
    | "official"
    | "translation"
    | "romanized"
    | "site-alias"
    | "manual"
    | "generated";
  priority: number;
  verified: boolean;
}
```

媒体标题结构：

```typescript
interface MediaTitles {
  mediaId: string;
  primaryTitle: string;
  originalTitle?: string;
  aliases: TitleAlias[];
  updatedAt: string;
}
```

---

## 8.5 标题优先级

对于原始语言为中文的剧集：

```text
人工确认中文名
→ 中文原名
→ 简体中文官方名
→ 繁体中文官方名
→ 站点常用别名
→ 英文官方名
→ Sonarr 当前标题
→ 自动生成标题
```

对于日韩剧集：

```text
人工确认中文译名
→ 中文官方译名
→ 原始日文或韩文名
→ 罗马音
→ 英文标题
```

对于欧美剧集：

```text
英文主标题
→ 中文官方译名
→ 港台译名
→ 其他别名
```

首期可以重点优化原始语言为中文的剧集。

---

## 8.6 查询词生成

系统需要根据标题、季数、集数生成多个搜索表达式。

例如：

```text
标题：庆余年
季：2
集：12
```

候选查询：

```text
庆余年 S02E12
庆余年 S2E12
庆余年 EP12
庆余年 E12
庆余年 第12集
庆余年 第二季 12
庆余年2 12
```

首期建议控制查询数量，避免一次搜索触发过多上游请求。

默认限制：

```text
最多使用 3 个标题
每个标题最多生成 2 个查询格式
一次请求最多执行 6 个 Prowlarr 查询
```

优先查询：

```text
中文标题 + SxxExx
英文标题 + SxxExx
中文标题 + 第x集
```

---

## 8.7 Prowlarr 搜索

服务通过 Prowlarr API 执行搜索。

配置项：

```env
PROWLARR_URL=https://prowlarr.example.com
PROWLARR_API_KEY=***
PROWLARR_TIMEOUT_MS=8000
PROWLARR_MAX_CONCURRENCY=3
```

搜索要求：

1. 多个查询可以并发执行。
2. 需要限制最大并发数。
3. 每个上游请求必须设置超时。
4. 单个 Indexer 失败不能导致全部请求失败。
5. 记录每个查询返回的结果数量。
6. 不将 Prowlarr API Key 返回给 Sonarr。
7. 不在日志中输出完整敏感 URL。

---

## 8.8 搜索结果合并

不同查询可能返回相同资源，需要执行去重。

推荐去重优先级：

```text
InfoHash
→ GUID
→ Magnet URI
→ Download URL
→ 标准化标题 + 文件大小
```

结果模型建议：

```typescript
interface SearchResult {
  guid: string;
  title: string;
  originalTitle: string;
  indexerId?: number;
  indexerName?: string;
  downloadUrl: string;
  infoHash?: string;
  size?: number;
  seeders?: number;
  peers?: number;
  publishDate?: string;
  categories: number[];
  protocol?: "torrent" | "usenet";
}
```

合并时需要保留：

* 原始 Release 标题
* 来源 Indexer
* 文件大小
* 发布时间
* Seeder 数量
* 下载地址
* 分类
* GUID
* InfoHash

---

## 8.9 Release 标题规范化

Sonarr 可能无法正确解析纯中文 Release 标题。

例如：

```text
庆余年 第二季 第12集 4K 国语中字
```

代理可生成用于 Sonarr 判断的规范化标题：

```text
Joy.of.Life.S02E12.2160p.WEB-DL
```

但需要遵守以下原则：

1. 只转换已确认的剧名。
2. 只规范化季数和集数。
3. 不虚构分辨率。
4. 不虚构片源类型。
5. 不虚构编码格式。
6. 不虚构发布组。
7. 保留原始标题用于日志和后续追溯。

推荐结果模型同时保存：

```typescript
{
  originalTitle: "庆余年 第二季 第12集 4K 国语中字",
  normalizedTitle: "Joy.of.Life.S02E12.2160p.WEB-DL"
}
```

首期可以先不修改 Release 标题，只观察 Sonarr 的识别情况，再决定是否启用规范化。

---

## 8.10 Torznab XML 输出

服务需要把聚合结果转换为标准 RSS/Torznab XML。

每个结果至少返回：

```text
title
guid
link
pubDate
size
category
seeders
peers
```

响应 Header：

```http
Content-Type: application/rss+xml; charset=utf-8
```

不得返回：

```text
application/json
text/html
Vercel 默认错误页面
```

即使发生错误，也应尽量返回 Torznab 兼容错误格式。

---

## 8.11 下载链路

首期建议不通过 Vercel 代理 Torrent 文件。

搜索链路：

```text
Sonarr
→ Vercel Alias Indexer
→ Prowlarr
```

下载链路：

```text
Sonarr
→ Prowlarr Grab URL
→ 真实 Indexer
```

需要确保：

* Sonarr 能访问返回的 Prowlarr 下载地址。
* 返回地址不暴露不必要的站点凭据。
* Prowlarr 地址对 Sonarr 可达。
* Vercel 不承担 Torrent 文件中转流量。

可以分别配置：

```env
PROWLARR_UPSTREAM_URL=https://public-prowlarr-api.example.com
PROWLARR_SONARR_URL=http://prowlarr:9696
```

其中：

* `PROWLARR_UPSTREAM_URL`：供 Vercel 调用。
* `PROWLARR_SONARR_URL`：写入返回给 Sonarr 的链接。

如果无法安全地进行地址转换，首期可以保持 Prowlarr 原始 Grab URL。

---

## 9. 标题别名库

## 9.1 存储方案

首期可以选择：

* Vercel Postgres
* Supabase PostgreSQL
* Neon PostgreSQL
* Upstash Redis
* Git 仓库中的 YAML 或 JSON
* Vercel KV

推荐使用 PostgreSQL 保存正式数据，Redis 用于缓存。

数据表示例：

### media

```sql
CREATE TABLE media (
  id UUID PRIMARY KEY,
  tvdb_id INTEGER,
  tmdb_id INTEGER,
  imdb_id VARCHAR(32),
  primary_title TEXT NOT NULL,
  original_language VARCHAR(16),
  release_year INTEGER,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

### media_alias

```sql
CREATE TABLE media_alias (
  id UUID PRIMARY KEY,
  media_id UUID NOT NULL,
  title TEXT NOT NULL,
  language VARCHAR(16),
  region VARCHAR(16),
  script VARCHAR(16),
  alias_type VARCHAR(32),
  priority INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  source VARCHAR(32),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

建议建立唯一索引：

```text
media_id + normalized_title
```

---

## 9.2 人工配置格式

为方便早期维护，可以支持 YAML 导入：

```yaml
media:
  tvdbId: 366625
  tmdbId: 96481
  primaryTitle: Joy of Life
  originalLanguage: zh
  aliases:
    - title: 庆余年
      type: original
      script: simplified
      priority: 100
      verified: true

    - title: 慶餘年
      type: translation
      script: traditional
      priority: 90
      verified: true

    - title: 庆余年2
      type: site-alias
      script: simplified
      priority: 80
      verified: true
```

---

## 10. 缓存设计

需要缓存以下内容：

### 10.1 媒体元数据缓存

缓存键：

```text
media:tvdb:{tvdbId}
media:tmdb:{tmdbId}
```

建议有效期：

```text
7 天至 30 天
```

### 10.2 搜索结果缓存

缓存键可以包含：

```text
媒体 ID
季数
集数
查询标题集合
Indexer 范围
```

例如：

```text
search:tvdb:366625:s02:e12
```

建议有效期：

```text
5 分钟至 30 分钟
```

需要注意：

* 交互搜索可以接受短缓存。
* RSS 搜索需要避免缓存过久。
* 新发布剧集不应使用数小时缓存。
* 空结果建议使用更短缓存，例如 1 至 3 分钟。

---

## 11. Agent 能力设计

Agent 不是首期核心依赖。

推荐将 Agent 定位为“别名补全助手”，而不是实时搜索执行器。

### 11.1 Agent 使用场景

当出现以下情况时调用 Agent：

* 媒体 ID 无法匹配中文名。
* 多个中文标题存在冲突。
* 标题疑似机器翻译错误。
* 需要识别资源站常用简称。
* 人工后台请求补充别名。
* 需要从历史 Release 标题提取别名。

### 11.2 Agent 输出

Agent 只能输出候选，不应直接写入已验证别名：

```json
{
  "mediaId": "tvdb:366625",
  "candidates": [
    {
      "title": "庆余年",
      "type": "original",
      "confidence": 0.98,
      "reason": "与中文原始剧名一致"
    },
    {
      "title": "庆余年2",
      "type": "site-alias",
      "confidence": 0.72,
      "reason": "常用于第二季资源标题"
    }
  ]
}
```

推荐流程：

```text
Agent 生成候选
→ 人工确认
→ 写入别名库
→ 后续搜索直接复用
```

---

## 12. 管理后台方向

首期不要求完整后台，可以先提供简单管理页面。

基础功能：

1. 按 TVDB ID 查询媒体。
2. 查看当前标题和别名。
3. 新增人工别名。
4. 修改别名优先级。
5. 标记别名是否已验证。
6. 禁用错误别名。
7. 查看最近搜索记录。
8. 查看查询扩展结果。
9. 查看 Prowlarr 返回数量。
10. 手动测试指定剧集。

后续可以增加：

* Agent 推荐别名审核
* Search Replay
* 错误查询分析
* 资源站别名统计
* 不同 Indexer 的标题习惯分析
* 别名命中率统计

---

## 13. API 设计

## 13.1 Torznab API

```text
GET /api/torznab
```

支持：

```text
t=caps
t=search
t=tvsearch
```

## 13.2 健康检查

```text
GET /api/health
```

返回：

```json
{
  "status": "ok",
  "prowlarr": "reachable",
  "database": "reachable",
  "version": "0.1.0"
}
```

健康检查不应暴露：

* Prowlarr URL
* API Key
* 数据库地址
* Indexer 凭据

## 13.3 调试搜索

```text
POST /api/debug/search
```

请求：

```json
{
  "tvdbId": 366625,
  "season": 2,
  "episode": 12
}
```

返回：

```json
{
  "media": {
    "primaryTitle": "Joy of Life",
    "aliases": ["庆余年", "慶餘年"]
  },
  "queries": [
    "庆余年 S02E12",
    "慶餘年 S02E12",
    "Joy of Life S02E12"
  ],
  "resultCount": 18,
  "deduplicatedCount": 9
}
```

调试接口必须额外鉴权，不能公开访问。

---

## 14. 鉴权与安全

## 14.1 Sonarr 到代理

Sonarr 请求必须携带：

```text
apikey
```

代理需要校验：

```env
TORZNAB_API_KEY=***
```

推荐使用常量时间比较，避免简单字符串比较带来的时序问题。

## 14.2 代理到 Prowlarr

使用：

```env
PROWLARR_API_KEY=***
```

禁止：

* 将 API Key 写入前端代码。
* 将 API Key 返回给 Sonarr。
* 将完整 API Key 输出到日志。
* 将站点 Cookie 或 passkey 写入数据库日志。

## 14.3 Prowlarr 公网访问

如果 Prowlarr 位于局域网，而 Vercel 位于公网，需要提供安全访问方式。

可选技术：

* Cloudflare Tunnel
* Cloudflare Access Service Token
* 独立 API Gateway
* 带鉴权的反向代理
* Tailscale Funnel
* 自建轻量网关

不建议直接把完整 Prowlarr 管理界面裸露到公网。

可以考虑仅暴露代理所需的 Prowlarr API 路径，并增加额外鉴权。

---

## 15. Vercel 部署设计

推荐技术栈：

```text
Next.js
TypeScript
Vercel Functions
PostgreSQL
Redis / KV
```

也可以使用纯 Node.js Serverless Function。

### 15.1 Vercel 适合承担

* Torznab HTTP 接口
* 标题映射
* 查询扩展
* Prowlarr API 调用
* XML 生成
* 缓存
* 轻量管理后台

### 15.2 需要注意

* Serverless 执行时间限制
* 多次 Prowlarr 搜索可能超时
* 冷启动
* 上游 Indexer 响应慢
* XML 响应格式
* 并发和请求限流
* Vercel 无法直接访问局域网地址
* 不适合中转大型 Torrent 文件

### 15.3 建议超时配置

```text
单个 Prowlarr 查询：5 至 8 秒
整体搜索：15 至 25 秒
最大并发查询数：3
最大扩展查询数：6
```

搜索超时后，应返回已完成的部分结果，而不是全部失败。

---

## 16. 可选技术方案

## 16.1 Web 框架

推荐：

```text
Next.js
```

优点：

* 适合直接部署 Vercel
* 可同时实现 API 和管理后台
* TypeScript 类型统一
* 部署和环境变量管理简单

备选：

```text
Hono
Fastify
Express
NestJS
Go
```

如果仅做 API，Hono 或 Fastify 会更轻。

## 16.2 XML 生成

可选：

* `fast-xml-parser`
* `xmlbuilder2`
* 自定义 XML 模板

推荐使用 XML Builder，避免字符串拼接导致转义问题。

需要正确转义：

```text
&
<
>
"
'
```

## 16.3 简繁转换

可使用：

```text
OpenCC
opencc-js
```

简繁转换只能生成补充候选，不能替代正式标题数据。

## 16.4 数据库

推荐：

```text
PostgreSQL
```

适合保存：

* 媒体映射
* 标题别名
* 人工审核状态
* 搜索记录
* Alias 命中统计

## 16.5 缓存

推荐：

```text
Upstash Redis
Vercel KV
```

适合：

* 元数据缓存
* 搜索结果缓存
* 请求限流
* 分布式锁
* 空结果短缓存

## 16.6 数据校验

推荐：

```text
Zod
```

用于：

* 环境变量校验
* Prowlarr API 响应校验
* 管理接口参数校验
* 别名数据结构校验

## 16.7 日志

可以使用：

```text
Pino
OpenTelemetry
Vercel Logs
Sentry
```

日志需要包含：

```text
requestId
搜索类型
媒体 ID
季数
集数
生成查询数量
Prowlarr 请求数量
原始结果数量
去重后数量
总耗时
错误类型
```

---

## 17. 可观测性

需要关注以下指标：

```text
搜索请求总数
搜索成功率
搜索平均耗时
P95 搜索耗时
Prowlarr 超时次数
别名扩展次数
中文别名命中率
新增结果数量
去重比例
空结果比例
Torznab 错误次数
```

重点指标：

### 中文代理新增结果率

```text
通过中文别名获得、普通英文搜索无法获得的结果数量
```

### 别名有效率

```text
产生有效搜索结果的别名数量
÷
所有参与搜索的别名数量
```

### 查询放大倍数

```text
实际 Prowlarr 搜索次数
÷
Sonarr 搜索请求次数
```

需要控制查询放大，避免给 Prowlarr 和 Tracker 带来过大压力。

---

## 18. 异常处理

### Prowlarr 不可用

返回空的合法 Torznab RSS，或返回标准错误。

不返回 Vercel HTML 错误页。

### 部分查询超时

返回其他已完成查询的结果。

### 标题映射不存在

使用 Sonarr 原始查询继续搜索。

### 媒体元数据源不可用

使用缓存数据；没有缓存时退回原始标题。

### XML 生成失败

记录请求 ID，返回 Torznab 错误。

### API Key 错误

返回未授权错误，不泄露配置信息。

---

## 19. 性能要求

首期建议目标：

```text
caps 请求：500ms 内
缓存命中的搜索：2 秒内
普通搜索：15 秒内
P95 搜索：25 秒内
单次搜索最大结果：100 条
单次搜索最大扩展查询：6 次
```

系统应避免：

* 每个别名生成十几个查询。
* 对所有 Indexer 重复发送完全相同的请求。
* 每次请求都重新查询全部外部元数据。
* 每次请求都调用大模型。
* 同一个剧集短时间重复查询无缓存。

---

## 20. MVP 范围

第一阶段只实现：

1. Vercel 部署。
2. Torznab `caps`。
3. Torznab `tvsearch`。
4. Sonarr API Key 鉴权。
5. Prowlarr API 搜索。
6. TVDB ID 标题映射。
7. 本地或数据库别名表。
8. 简繁体补充。
9. 最多 3 个标题扩展。
10. 查询结果合并和去重。
11. 标准 Torznab XML 返回。
12. 基础请求日志。
13. 健康检查。
14. 作为 Sonarr 补充 Indexer 接入。

MVP 暂不实现：

* Agent 自动确认别名
* 完整管理后台
* Release 标题重写
* Torrent 文件代理
* 自动同步 Prowlarr Indexer
* DHT 抓取
* 网页爬虫
* 多用户系统
* 复杂权限系统

---

## 21. 后续阶段

### 第二阶段：可维护性

* 标题别名管理页面
* 搜索调试页面
* TVDB、TMDB 自动补全
* 别名命中统计
* Search Replay
* 错误别名禁用
* Release 标题规范化开关

### 第三阶段：智能别名

* Agent 推荐中文别名
* 根据历史 Release 学习站点别名
* 自动发现高频简称
* 人工审核工作流
* 不同 Indexer 使用不同标题策略

### 第四阶段：智能搜索策略

* 根据历史结果选择最佳查询格式
* 根据 Indexer 特征决定简体或繁体
* 自动降低无效别名优先级
* 动态控制查询数量
* 结果质量重排
* 发布组可信度评分

---

## 22. 验收标准

### 基础接入

* Sonarr 可以成功测试并保存该 Torznab Indexer。
* `caps` 返回格式正确。
* Sonarr 可以发起剧集搜索。
* 服务可以调用 Prowlarr 并获取结果。
* 搜索结果可以正常显示在 Sonarr 中。

### 中文扩展

对于已有别名配置的中文剧集：

* 服务能够通过 TVDB ID 找到中文原名。
* 至少生成一个中文搜索词。
* 可以同时保留英文搜索。
* 简繁体结果可以正确合并。
* 重复资源不会大量重复展示。

### 稳定性

* 单个查询失败不会导致全部搜索失败。
* Prowlarr 不可用时不会返回 HTML。
* 日志中不出现完整 API Key。
* Vercel 不代理大型 Torrent 文件。
* 原有 Sonarr Indexer 不受代理故障影响。

### 效果验证

选取至少 10 部中文剧集进行验证：

```text
普通 Sonarr 搜索结果数
对比
中文别名代理搜索结果数
```

至少确认：

* 有效新增结果
* 错误匹配数量
* 搜索耗时变化
* 查询放大倍数
* Sonarr Release 识别成功率

---

## 23. 推荐首版技术栈

```text
运行平台：
Vercel

语言：
TypeScript

框架：
Next.js 或 Hono

协议：
Torznab
Prowlarr REST API

数据库：
PostgreSQL

缓存：
Upstash Redis

简繁转换：
opencc-js

XML：
xmlbuilder2

校验：
Zod

日志：
Pino + Vercel Logs

错误监控：
Sentry，可选
```

---

## 24. 推荐目录结构

```text
src/
├── app/
│   ├── api/
│   │   ├── torznab/
│   │   │   └── route.ts
│   │   ├── health/
│   │   │   └── route.ts
│   │   └── debug/
│   │       └── search/
│   │           └── route.ts
│   └── admin/
│
├── modules/
│   ├── torznab/
│   │   ├── parser.ts
│   │   ├── caps.ts
│   │   ├── xml-builder.ts
│   │   └── errors.ts
│   │
│   ├── media/
│   │   ├── identity.ts
│   │   ├── title-resolver.ts
│   │   ├── alias-repository.ts
│   │   └── metadata-provider.ts
│   │
│   ├── search/
│   │   ├── query-generator.ts
│   │   ├── search-service.ts
│   │   ├── result-merger.ts
│   │   ├── deduplicator.ts
│   │   └── title-normalizer.ts
│   │
│   ├── prowlarr/
│   │   ├── client.ts
│   │   ├── mapper.ts
│   │   └── types.ts
│   │
│   ├── cache/
│   │   └── cache-service.ts
│   │
│   └── security/
│       ├── api-key.ts
│       └── rate-limit.ts
│
├── db/
│   ├── schema.ts
│   └── migrations/
│
└── shared/
    ├── env.ts
    ├── logger.ts
    └── types.ts
```

---

## 25. 关键设计原则

1. **Sonarr 无感接入**

   对 Sonarr 来说，服务只是一个标准 Torznab Indexer。

2. **媒体 ID 优先**

   优先使用 TVDB、TMDB 等 ID，不依赖英文标题直接翻译。

3. **规则优先，Agent 补充**

   稳定流程使用确定性规则，Agent 只处理未知别名和复杂情况。

4. **不破坏原有链路**

   首期作为补充 Indexer，代理故障不影响原有搜索。

5. **搜索与下载分离**

   Vercel 负责搜索转换，不负责传输 Torrent 文件。

6. **控制查询放大**

   限制别名数量、查询模板和并发数量。

7. **保留原始数据**

   任何标题规范化都必须保留原始 Release 标题。

8. **渐进式建设**

   先验证中文搜索增益，再建设后台、Agent 和自适应搜索。

---

## 26. 最终方向

首版最合理的产品形态是：

```text
一个部署在 Vercel 上的虚拟 Torznab Indexer
```

它作为 Sonarr 的额外 Indexer 接入，接收 Sonarr 搜索请求，根据媒体 ID 扩展中文原名、简体名、繁体名和人工别名，再通过 Prowlarr 搜索真实站点。

MVP 不需要引入完整 Agent，也不需要爬取站点页面。

首期核心闭环为：

```text
Sonarr 搜索
→ Vercel 接收 Torznab 请求
→ TVDB ID 匹配标题
→ 扩展中文别名
→ 调用 Prowlarr
→ 合并去重
→ 返回 Torznab XML
→ Sonarr 展示和抓取
```

在确认中文搜索确实能够增加有效结果后，再逐步加入别名管理、Agent 推荐、Release 标题规范化和自适应查询策略。
