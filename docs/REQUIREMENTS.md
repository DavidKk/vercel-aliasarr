# Aliasarr 需求与技术规格

> 项目代号：**Aliasarr**（又名 Sonarr Alias Indexer / Chinese Torznab Proxy）  
> 文档类型：需求 + 技术规格（合一）  
> 版本：0.1.0（MVP）  
> 状态：草案  
> 来源：由 `TOOD.md` 整理而成

---

## 1. 背景与问题

Sonarr 搜索剧集时，通常依赖 TVDB 等元数据中的主标题、英文标题或外部媒体 ID。

对中文剧集、国产剧、港台剧、中文纪录片，以及部分使用中文译名发布的日韩剧，资源站标题往往只有：

- 中文原名 / 译名 / 繁体名
- 站点常用简称
- 中文集数表达
- 与 TVDB 英文主标题差异较大的名称

**示例**

| Sonarr 搜索词 | 资源站实际标题 |
| --- | --- |
| `Joy of Life S02E12` | `庆余年 第二季 第12集 2160P` |
| | `庆余年2.E12.WEB-DL` |
| | `慶餘年.S02E12` |

资源存在，但因搜索词不匹配，Sonarr 可能搜不到。

---

## 2. 产品定位

### 2.1 是什么

兼容 Torznab 的虚拟 Indexer：接收 Sonarr 搜索请求，将英文标题或媒体 ID 扩展为中文原名、简繁体名及其他别名，再经 Prowlarr 搜索真实 Indexer，以标准 Torznab XML 返回。

### 2.2 不是什么

| 不是 | 说明 |
| --- | --- |
| Torrent 下载器 | 不负责下载与存储 |
| 独立种子搜索引擎 | 不直接爬站 / DHT |
| Sonarr 反向代理 | 只作为补充 Torznab Indexer |
| Prowlarr 替代品 | 依赖 Prowlarr 聚合真实 Indexer |
| 私站爬虫 | 不处理登录、验证码、反爬 |

在 Sonarr 中表现为普通自定义 Torznab Indexer。

### 2.3 首期接入形态

作为 **补充 Indexer**，不替代 Prowlarr 同步的现有 Indexer：

```text
Sonarr
├── Prowlarr 同步的普通 Indexer
└── Aliasarr（本服务）
        └── Prowlarr
                ├── Indexer A
                ├── Indexer B
                └── Indexer C
```

好处：保留原能力、故障隔离、可对比增益、降低一次性重构风险。

---

## 3. 目标与非目标

### 3.1 核心目标

在不修改 Sonarr / Prowlarr 源码的前提下，提升中文相关资源标题的搜索覆盖率。

系统需完成：

1. 接收 Sonarr 标准 Torznab 请求
2. 识别 TVDB / TMDB 等媒体 ID
3. 获取中文原名、简繁体名、英文名及别名
4. 按季/集生成多组查询词
5. 调用 Prowlarr 搜索
6. 合并去重
7. 输出 Sonarr 可识别的 Torznab XML
8. 尽量保持原始下载链路不变
9. 代理不可用时不影响 Sonarr 原有 Indexer

### 3.2 非目标（首版不做）

1. 不主动爬取 Torrent 站点页面
2. 不实现独立 DHT 搜索
3. 不存储或分发 Torrent 文件
4. 不取代 Sonarr 质量规则与剧集管理
5. 不通过大模型决定全部搜索结果
6. 不自动修改 Sonarr 中的剧集主标题
7. 不保证识别完全非标准的中文集数表达
8. 不直接管理 Prowlarr Indexer 账号
9. 不处理资源站登录、验证码与反爬

---

## 4. 用户场景

### 4.1 中文剧集搜索

Sonarr 主标题为 `Joy of Life`，用户搜 S02E12。代理按 TVDB ID 取得别名后生成多组查询（中英文 + 多种集数格式），合并结果返回。

### 4.2 中文原名被英文标题覆盖

国产剧在 Sonarr 使用英文译名，资源站仅用中文原名。应 **优先按媒体 ID 取原始语言标题**，而非把英文标题机器翻译成中文。

### 4.3 简繁体资源

同一剧可能有 `庆余年` / `慶餘年`。简繁转换可作为补充，**不能覆盖人工确认的正式别名**。

### 4.4 中文集数格式

| 优先级 | 格式示例 |
| --- | --- |
| 首期支持 | `S02E12`、`EP12`、`E12`、`第12集`、`12` |
| 后续 | 中文数字（如「第十二集」） |

---

## 5. 总体架构

```text
┌─────────────┐
│   Sonarr    │
└──────┬──────┘
       │ Torznab（caps / tvsearch / search）
       ▼
┌─────────────────────────┐
│ Aliasarr（Vercel）      │
│ 1. 参数解析             │
│ 2. 标题 / 身份解析      │
│ 3. 别名查询             │
│ 4. 查询扩展             │
│ 5. Prowlarr 搜索        │
│ 6. 结果合并去重         │
│ 7. Torznab XML 输出     │
└────────────┬────────────┘
             │ Prowlarr API
             ▼
┌─────────────────────────┐
│       Prowlarr          │
│ Indexer A / B / C       │
└────────────┬────────────┘
             ▼
       Torrent Indexers
```

**搜索与下载分离**

| 链路 | 路径 |
| --- | --- |
| 搜索 | Sonarr → Aliasarr → Prowlarr |
| 下载 | Sonarr → Prowlarr Grab URL → 真实 Indexer |

首期不经 Vercel 中转 Torrent 文件。

---

## 6. Sonarr 接入

路径：`Settings → Indexers → Add → Torznab → Custom`

| 配置项 | 示例值 |
| --- | --- |
| Name | Chinese Alias Indexer |
| URL | `https://alias-indexer.example.com` |
| API Path | `/api/torznab` |
| API Key | 由本服务生成的访问密钥 |
| Categories | `5000, 5030, 5040, 5045` |

典型请求：

```http
GET /api/torznab?t=caps&apikey=xxx

GET /api/torznab?t=tvsearch&q=Joy%20of%20Life&season=2&ep=12&tvdbid=366625&cat=5000&apikey=xxx
```

---

## 7. 功能需求

### 7.1 Torznab Caps

`GET /api/torznab?t=caps` 返回标准 Caps XML，至少声明：

- 普通搜索、TV 搜索
- 查询词、季、集
- TVDB ID、TMDB ID
- TV 分类、最大返回条数

首期支持参数：`q`、`season`、`ep`、`tvdbid`、`tmdbid`、`cat`、`limit`、`offset`。

### 7.2 搜索请求解析

解析：`t`、`q`、`season`、`ep`、`tvdbid`、`tmdbid`、`imdbid`、`cat`、`limit`、`offset`、`apikey`。

至少支持：`t=tvsearch`、`t=search`。不支持的类型返回明确 Torznab 错误（禁止返回 HTML）。

### 7.3 剧集身份识别

优先级：

```text
TVDB ID → TMDB ID → IMDb ID → Sonarr 传入标题
```

有媒体 ID 时，不得仅凭标题猜测剧集。

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

### 7.4 标题别名获取

数据来源（按可用性组合）：

1. 本地人工别名库
2. TVDB / TMDB 元数据
3. Sonarr 提供标题
4. 简繁体转换
5. 后续第三方中文影视源
6. Agent 补全候选（非首期核心）

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

interface MediaTitles {
  mediaId: string;
  primaryTitle: string;
  originalTitle?: string;
  aliases: TitleAlias[];
  updatedAt: string;
}
```

### 7.5 标题优先级

**原始语言为中文**

```text
人工确认中文名 → 中文原名 → 简体官方名 → 繁体官方名
→ 站点常用别名 → 英文官方名 → Sonarr 当前标题 → 自动生成
```

**日韩剧**

```text
人工确认中文译名 → 中文官方译名 → 原始日/韩文 → 罗马音 → 英文
```

**欧美剧**

```text
英文主标题 → 中文官方译名 → 港台译名 → 其他别名
```

首期重点优化原始语言为中文的剧集。

### 7.6 查询词生成

示例（标题 `庆余年`，S02E12）候选：

```text
庆余年 S02E12
庆余年 S2E12
庆余年 EP12
庆余年 E12
庆余年 第12集
庆余年 第二季 12
庆余年2 12
```

默认限制（控制查询放大）：

| 限制项 | 默认值 |
| --- | --- |
| 最多标题数 | 3 |
| 每标题查询格式数 | 2 |
| 单次 Prowlarr 查询上限 | 6 |

优先模板：`中文 + SxxExx`、`英文 + SxxExx`、`中文 + 第x集`。

### 7.7 Prowlarr 搜索

环境变量：

```env
PROWLARR_URL=https://prowlarr.example.com
PROWLARR_API_KEY=***
PROWLARR_TIMEOUT_MS=8000
PROWLARR_MAX_CONCURRENCY=3
```

要求：

1. 多查询可并发，限制最大并发
2. 每个上游请求设超时
3. 单个 Indexer / 查询失败不拖垮整次搜索
4. 记录每查询结果数
5. 不向 Sonarr 回传 Prowlarr API Key
6. 日志不输出完整敏感 URL

可选 URL 分离：

```env
PROWLARR_UPSTREAM_URL=https://public-prowlarr-api.example.com  # Vercel 调用
PROWLARR_SONARR_URL=http://prowlarr:9696                       # 写入返回给 Sonarr 的链接
```

无法安全改写时，首期可保持 Prowlarr 原始 Grab URL。

### 7.8 结果合并与去重

去重优先级：

```text
InfoHash → GUID → Magnet URI → Download URL → 标准化标题 + 文件大小
```

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

合并须保留：原始标题、来源 Indexer、大小、发布时间、Seeder、下载地址、分类、GUID、InfoHash。

### 7.9 Release 标题规范化（可选，MVP 可关）

纯中文标题可能导致 Sonarr 解析失败。可生成规范化标题供判断，但须：

1. 只转换已确认剧名
2. 只规范季/集
3. 不虚构分辨率、片源、编码、发布组
4. 始终保留 `originalTitle`

```typescript
{
  originalTitle: "庆余年 第二季 第12集 4K 国语中字",
  normalizedTitle: "Joy.of.Life.S02E12.2160p.WEB-DL" // 仅在可确认字段时写入
}
```

MVP 默认不改写 Release 标题，先观察 Sonarr 识别情况。

### 7.10 Torznab XML 输出

每条至少含：`title`、`guid`、`link`、`pubDate`、`size`、`category`、`seeders`、`peers`。

```http
Content-Type: application/rss+xml; charset=utf-8
```

禁止返回 `application/json`、`text/html`、Vercel 默认错误页。错误也应尽量用 Torznab 兼容格式。

---

## 8. 别名库

### 8.1 存储

推荐：PostgreSQL 存正式数据，Redis 做缓存。可选：Vercel Postgres / Supabase / Neon / Upstash Redis / 仓库内 YAML·JSON（早期）。

**media**

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

**media_alias**

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

建议唯一索引：`media_id + normalized_title`。

### 8.2 人工 YAML 导入（早期维护）

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

## 9. 缓存

| 类型 | 键示例 | TTL 建议 |
| --- | --- | --- |
| 媒体元数据 | `media:tvdb:{id}` / `media:tmdb:{id}` | 7–30 天 |
| 搜索结果 | `search:tvdb:{id}:s02:e12` | 5–30 分钟 |
| 空结果 | 同上 | 1–3 分钟 |

注意：交互搜索可短缓存；RSS 避免过久；新剧不宜数小时缓存。

---

## 10. Agent（非 MVP 核心）

定位：**别名补全助手**，非实时搜索执行器。

触发场景：无中文名、标题冲突、疑似机翻错误、站点简称、人工后台补全、从历史 Release 提取。

输出仅为候选，不得直接写入已验证别名；流程为：候选 → 人工确认 → 别名库 → 后续复用。

---

## 11. 管理后台（MVP 可极简）

首期可不建完整后台；基础能力方向：

1. 按 TVDB ID 查媒体与别名
2. 增删改别名、优先级、验证状态、禁用
3. 最近搜索、查询扩展、Prowlarr 返回量
4. 手动测试指定剧集

后续：Agent 审核、Search Replay、命中率与 Indexer 标题习惯分析等。

---

## 12. API

### 12.1 Torznab

```text
GET /api/torznab
```

支持：`t=caps` | `t=search` | `t=tvsearch`

### 12.2 健康检查

```text
GET /api/health
```

```json
{
  "status": "ok",
  "prowlarr": "reachable",
  "database": "reachable",
  "version": "0.1.0"
}
```

不得暴露 Prowlarr URL、API Key、数据库地址、Indexer 凭据。

### 12.3 调试搜索（须额外鉴权）

```text
POST /api/debug/search
```

请求 / 响应示例见实现阶段；用于返回媒体别名、生成查询、原始与去重结果数。

---

## 13. 鉴权与安全

| 边界 | 机制 |
| --- | --- |
| Sonarr → Aliasarr | `apikey` 对 `TORZNAB_API_KEY`，建议常量时间比较 |
| Aliasarr → Prowlarr | `PROWLARR_API_KEY`，禁止写入前端、回传 Sonarr、完整记入日志 |

Prowlarr 若在内网：用 Tunnel / Access Token / 网关 / Tailscale 等安全暴露 **仅 API 路径**，勿裸奔完整管理界面。

---

## 14. 部署（Vercel）

### 14.1 适合承担

Torznab HTTP、标题映射、查询扩展、Prowlarr 调用、XML、缓存、轻量管理页。

### 14.2 风险点

Serverless 时限、多查询超时、冷启动、上游慢、XML 格式、限流、无法直连局域网、不适合中转大文件。

### 14.3 超时建议

| 项 | 建议 |
| --- | --- |
| 单次 Prowlarr 查询 | 5–8s |
| 整体搜索 | 15–25s |
| 最大并发 | 3 |
| 最大扩展查询 | 6 |

超时后返回已完成的部分结果，而非整次失败。

---

## 15. 推荐技术栈

| 层 | 选型 |
| --- | --- |
| 平台 | Vercel |
| 语言 | TypeScript |
| 框架 | Next.js（推荐）或 Hono |
| 协议 | Torznab + Prowlarr REST |
| DB | PostgreSQL |
| 缓存 | Upstash Redis / Vercel KV |
| 简繁 | opencc-js（仅补充候选） |
| XML | xmlbuilder2 |
| 校验 | Zod |
| 日志 | Pino + Vercel Logs |
| 监控 | Sentry（可选） |

XML 必须正确转义 `& < > " '`。

---

## 16. 推荐目录结构

```text
src/
├── app/api/{torznab,health,debug/search}/route.ts
├── app/admin/
├── modules/
│   ├── torznab/     # parser, caps, xml-builder, errors
│   ├── media/       # identity, title-resolver, alias-repository, metadata-provider
│   ├── search/      # query-generator, search-service, merger, deduplicator, title-normalizer
│   ├── prowlarr/    # client, mapper, types
│   ├── cache/
│   └── security/    # api-key, rate-limit
├── db/              # schema, migrations
└── shared/          # env, logger, types
```

---

## 17. 可观测性

关注指标：搜索总数 / 成功率 / 平均与 P95 耗时、Prowlarr 超时、别名扩展次数、中文别名命中率、新增结果数、去重比、空结果比、Torznab 错误次数。

重点：

| 指标 | 定义 |
| --- | --- |
| 中文代理新增结果率 | 靠中文别名获得、纯英文搜不到的结果数 |
| 别名有效率 | 产生有效结果的别名数 ÷ 参与搜索的别名数 |
| 查询放大倍数 | 实际 Prowlarr 次数 ÷ Sonarr 请求次数 |

须控制放大，避免压垮 Prowlarr 与 Tracker。

日志字段建议含：`requestId`、搜索类型、媒体 ID、季/集、生成查询数、上游请求数、原始/去重结果数、总耗时、错误类型。

---

## 18. 异常处理

| 情况 | 行为 |
| --- | --- |
| Prowlarr 不可用 | 空合法 Torznab RSS 或标准错误；禁止 HTML |
| 部分查询超时 | 返回已完成结果 |
| 无标题映射 | 用 Sonarr 原始查询继续搜 |
| 元数据源不可用 | 用缓存；无缓存则退回原始标题 |
| XML 失败 | 记 requestId，返回 Torznab 错误 |
| API Key 错误 | 未授权，不泄露配置 |

---

## 19. 性能目标（首期）

| 场景 | 目标 |
| --- | --- |
| caps | ≤ 500ms |
| 缓存命中搜索 | ≤ 2s |
| 普通搜索 | ≤ 15s |
| P95 搜索 | ≤ 25s |
| 单次最大结果 | 100 |
| 单次最大扩展查询 | 6 |

避免：每别名生成十几个查询、对所有 Indexer 重复相同请求、每次全量拉元数据、每次调大模型、短时间无缓存重复查同一剧。

---

## 20. MVP 范围

### 20.1 必须实现

1. Vercel 部署  
2. Torznab `caps` / `tvsearch`  
3. Sonarr API Key 鉴权  
4. Prowlarr API 搜索  
5. TVDB ID 标题映射 + 本地/DB 别名表  
6. 简繁补充  
7. 最多 3 标题扩展、合并去重  
8. 标准 Torznab XML  
9. 基础请求日志、健康检查  
10. 作为 Sonarr 补充 Indexer 接入  

### 20.2 MVP 不做

Agent 自动确认、完整管理后台、Release 重写、Torrent 代理、自动同步 Prowlarr Indexer、DHT/爬虫、多用户与复杂权限。

---

## 21. 后续阶段

| 阶段 | 方向 |
| --- | --- |
| 二：可维护性 | 别名管理页、调试页、TVDB/TMDB 自动补全、命中统计、Replay、禁用错误别名、规范化开关 |
| 三：智能别名 | Agent 推荐、历史 Release 学习、简称发现、人工审核、按 Indexer 策略 |
| 四：自适应搜索 | 最佳查询格式、简繁策略、动态降权与查询数量、质量重排、发布组评分 |

---

## 22. 验收标准

### 22.1 基础接入

- Sonarr 可测试并保存该 Torznab Indexer  
- `caps` 格式正确，可发起剧集搜索  
- 能调 Prowlarr 取结果并在 Sonarr 展示  

### 22.2 中文扩展（已有别名配置）

- 能经 TVDB ID 找到中文原名，至少生成一个中文搜索词  
- 可保留英文搜索；简繁结果正确合并；去重有效  

### 22.3 稳定性

- 单查询失败不全局失败；Prowlarr 不可用不返回 HTML  
- 日志无完整 API Key；不代理大 Torrent；原 Indexer 不受本服务故障影响  

### 22.4 效果验证

至少 10 部中文剧，对比普通搜索 vs 本代理结果数，确认：有效新增、错误匹配、耗时、查询放大、Sonarr Release 识别成功率。

---

## 23. 设计原则

1. **Sonarr 无感接入** — 标准 Torznab Indexer  
2. **媒体 ID 优先** — 不依赖英文标题直接翻译  
3. **规则优先，Agent 补充** — 稳定路径用确定性规则  
4. **不破坏原有链路** — 首期仅补充 Indexer  
5. **搜索与下载分离** — Vercel 不做 Torrent 中转  
6. **控制查询放大** — 限制别名、模板与并发  
7. **保留原始数据** — 任何规范化都保留原始 Release 标题  
8. **渐进式建设** — 先验证增益，再后台 / Agent / 自适应  

---

## 24. 首期闭环

```text
Sonarr 搜索
→ Aliasarr 接收 Torznab
→ TVDB ID 匹配标题
→ 扩展中文别名
→ 调用 Prowlarr
→ 合并去重
→ 返回 Torznab XML
→ Sonarr 展示与抓取
```

确认中文搜索确有有效增益后，再逐步加入别名管理、Agent 推荐、Release 规范化与自适应查询策略。

---

## 附录 A. 与 `TOOD.md` 的关系

本文档由仓库根目录 `TOOD.md` 整理而来，作为正式需求与技术规格入口。实现与评审请以本文档为准；`TOOD.md` 可视为原始草稿，后续可归档或删除。
