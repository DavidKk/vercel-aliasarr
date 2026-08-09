# Aliasarr MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Vercel 上交付一个可被 Sonarr 接入的虚拟 Torznab Indexer：按 TVDB ID 扩展中文/简繁别名，经 Prowlarr 搜索后合并去重并以 Torznab XML 返回。

**Architecture:** Next.js App Router 提供 `/api/torznab` 与 `/api/health`。请求经 API Key 校验 → 解析 Torznab 参数 → YAML 别名库 + OpenCC 简繁补充解析标题 → 生成最多 6 条查询 → 并发调用 Prowlarr Search API → 去重 → 输出 RSS/Torznab XML。下载链接保持 Prowlarr Grab URL，本服务不中转 Torrent。

**Tech Stack:** TypeScript、Next.js 15 (App Router)、Zod、xmlbuilder2、opencc-js、yaml、Pino、Vitest、Vercel

## Global Constraints

- **运行平台（硬约束）：唯一目标运行时为 Vercel**（Next.js App Router + Node.js Serverless / Fluid）。本地 `next dev` 仅用于开发；不得引入依赖长期进程、WebSocket 服务端或无法在 Vercel Functions 上运行的架构。路由使用 `export const runtime = "nodejs"`；搜索函数 `maxDuration` ≥ 30（见 `vercel.json`）。别名 YAML 随部署产物可读（放在仓库 `data/` 内），不依赖本机绝对路径。
- 语言与响应：服务端代码 TypeScript；Torznab 成功/失败响应均为 XML（禁止 HTML / JSON 错误页给 Sonarr）
- 鉴权：Sonarr 请求必须带 `apikey`，与 `TORZNAB_API_KEY` 做常量时间比较
- 查询放大：最多 3 个标题 × 每标题最多 2 种格式，单次最多 6 次 Prowlarr 查询；并发上限 3
- MVP 不做：Agent、管理后台、Release 标题重写、Torrent 代理、PostgreSQL（用 YAML）、Upstash（用进程内 TTL 缓存）
- 日志：不得输出完整 API Key / 带 Key 的完整 URL
- 超时：单次整体搜索预算约 15–25s，部分失败返回已完成结果；Prowlarr 必须公网可达（Tunnel/网关），因 Vercel 无法访问纯局域网

## File Map（将创建）

```text
package.json
tsconfig.json
next.config.ts
vercel.json
.env.example
README.md
data/aliases/joy-of-life.yaml
src/
  app/api/torznab/route.ts
  app/api/health/route.ts
  modules/torznab/{parser,caps,xml-builder,errors,types}.ts
  modules/media/{identity,alias-repository,title-resolver,script-convert}.ts
  modules/search/{query-generator,search-service,deduplicator,types}.ts
  modules/prowlarr/{client,mapper,types}.ts
  modules/cache/memory-cache.ts
  modules/security/api-key.ts
  shared/{env,logger,types}.ts
tests/
  modules/torznab/*.test.ts
  modules/media/*.test.ts
  modules/search/*.test.ts
  modules/prowlarr/*.test.ts
  modules/security/*.test.ts
```

---

### Task 1: 项目脚手架与环境校验

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vercel.json`
- Create: `.env.example`
- Create: `vitest.config.ts`
- Create: `src/shared/env.ts`
- Create: `src/shared/logger.ts`
- Create: `src/shared/types.ts`
- Test: `tests/shared/env.test.ts`

**Interfaces:**
- Produces: `getEnv(): Env`；`logger`（Pino）；基础共享类型

- [ ] **Step 1: 初始化 package.json 与依赖**

```json
{
  "name": "aliasarr",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.1.0",
    "opencc-js": "^1.0.5",
    "pino": "^9.6.0",
    "xmlbuilder2": "^3.1.1",
    "yaml": "^2.7.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

Run: `npm install`  
Expected: 依赖安装成功，生成 `package-lock.json`

- [ ] **Step 2: 写失败的 env 测试**

```typescript
// tests/shared/env.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";

describe("getEnv", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("throws when TORZNAB_API_KEY is missing", async () => {
    vi.stubEnv("TORZNAB_API_KEY", "");
    vi.stubEnv("PROWLARR_URL", "https://prowlarr.example.com");
    vi.stubEnv("PROWLARR_API_KEY", "prowlarr-key");
    const { getEnv } = await import("../../src/shared/env");
    expect(() => getEnv()).toThrow(/TORZNAB_API_KEY/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/shared/env.test.ts`  
Expected: FAIL（模块不存在或 `getEnv` 未定义）

- [ ] **Step 4: 实现 env / logger / tsconfig / next / vercel**

```typescript
// src/shared/env.ts
import { z } from "zod";

const EnvSchema = z.object({
  TORZNAB_API_KEY: z.string().min(16),
  PROWLARR_URL: z.string().url(),
  PROWLARR_API_KEY: z.string().min(8),
  PROWLARR_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  PROWLARR_MAX_CONCURRENCY: z.coerce.number().int().positive().default(3),
  PROWLARR_SONARR_URL: z.string().url().optional(),
  ALIAS_DATA_DIR: z.string().default("data/aliases"),
  MAX_TITLES: z.coerce.number().int().positive().default(3),
  MAX_QUERY_FORMATS_PER_TITLE: z.coerce.number().int().positive().default(2),
  MAX_PROWLARR_QUERIES: z.coerce.number().int().positive().default(6),
  SEARCH_RESULT_LIMIT: z.coerce.number().int().positive().default(100),
  LOG_LEVEL: z.string().default("info"),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid env: ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}

/** test-only */
export function resetEnvCache(): void {
  cached = null;
}
```

```typescript
// src/shared/logger.ts
import pino from "pino";
import { getEnv } from "./env";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: ["apikey", "apiKey", "PROWLARR_API_KEY", "TORZNAB_API_KEY", "*.apikey"],
    censor: "[Redacted]",
  },
});

export function childLogger(bindings: Record<string, unknown>) {
  try {
    getEnv();
  } catch {
    // allow logging before env is ready in tests
  }
  return logger.child(bindings);
}
```

```typescript
// src/shared/types.ts
export type MediaType = "series";

export interface MediaIdentity {
  tvdbId?: number;
  tmdbId?: number;
  imdbId?: string;
  primaryTitle?: string;
  year?: number;
  mediaType: MediaType;
}
```

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pino", "opencc-js"],
};

export default nextConfig;
```

```json
// vercel.json
{
  "functions": {
    "src/app/api/torznab/route.ts": {
      "maxDuration": 30
    }
  }
}
```

```env
# .env.example
TORZNAB_API_KEY=change-me-to-a-long-secret
PROWLARR_URL=https://prowlarr.example.com
PROWLARR_API_KEY=change-me
PROWLARR_TIMEOUT_MS=8000
PROWLARR_MAX_CONCURRENCY=3
# optional: rewrite download host for Sonarr LAN access
# PROWLARR_SONARR_URL=http://prowlarr:9696
ALIAS_DATA_DIR=data/aliases
MAX_TITLES=3
MAX_QUERY_FORMATS_PER_TITLE=2
MAX_PROWLARR_QUERIES=6
SEARCH_RESULT_LIMIT=100
LOG_LEVEL=info
```

`tsconfig.json` 启用 `strict`，`paths`: `@/*` → `src/*`。  
`vitest.config.ts` 使用 Node 环境，`alias: { "@": "./src" }`。

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/shared/env.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts vercel.json vitest.config.ts .env.example src/shared tests/shared
git commit -m "chore: scaffold Next.js project with env validation"
```

---

### Task 2: API Key 常量时间校验

**Files:**
- Create: `src/modules/security/api-key.ts`
- Test: `tests/modules/security/api-key.test.ts`

**Interfaces:**
- Consumes: `getEnv().TORZNAB_API_KEY`
- Produces: `timingSafeEqualString(a: string, b: string): boolean`；`assertTorznabApiKey(apikey: string | null | undefined): void`（失败抛 `UnauthorizedError`）

- [ ] **Step 1: Write the failing test**

```typescript
// tests/modules/security/api-key.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("assertTorznabApiKey", () => {
  beforeEach(() => {
    vi.stubEnv("TORZNAB_API_KEY", "0123456789abcdef");
    vi.stubEnv("PROWLARR_URL", "https://prowlarr.example.com");
    vi.stubEnv("PROWLARR_API_KEY", "prowlarr-key");
  });
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("accepts matching key", async () => {
    const { resetEnvCache } = await import("../../../src/shared/env");
    resetEnvCache();
    const { assertTorznabApiKey } = await import("../../../src/modules/security/api-key");
    expect(() => assertTorznabApiKey("0123456789abcdef")).not.toThrow();
  });

  it("rejects wrong key", async () => {
    const { resetEnvCache } = await import("../../../src/shared/env");
    resetEnvCache();
    const { assertTorznabApiKey, UnauthorizedError } = await import(
      "../../../src/modules/security/api-key"
    );
    expect(() => assertTorznabApiKey("wrong-key-wrong!!")).toThrow(UnauthorizedError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/modules/security/api-key.test.ts`  
Expected: FAIL（模块不存在）

- [ ] **Step 3: Implement**

```typescript
// src/modules/security/api-key.ts
import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/shared/env";

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // compare against self to keep roughly constant work on length mismatch
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

export function assertTorznabApiKey(apikey: string | null | undefined): void {
  const expected = getEnv().TORZNAB_API_KEY;
  if (!apikey || !timingSafeEqualString(apikey, expected)) {
    throw new UnauthorizedError();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/modules/security/api-key.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/security tests/modules/security
git commit -m "feat: add timing-safe Torznab API key check"
```

---

### Task 3: Torznab 解析、Caps、错误与 XML 构建

**Files:**
- Create: `src/modules/torznab/types.ts`
- Create: `src/modules/torznab/errors.ts`
- Create: `src/modules/torznab/parser.ts`
- Create: `src/modules/torznab/caps.ts`
- Create: `src/modules/torznab/xml-builder.ts`
- Test: `tests/modules/torznab/parser.test.ts`
- Test: `tests/modules/torznab/xml-builder.test.ts`
- Test: `tests/modules/torznab/caps.test.ts`

**Interfaces:**
- Produces:
  - `parseTorznabQuery(searchParams: URLSearchParams): TorznabRequest`
  - `buildCapsXml(): string`
  - `buildRssXml(items: TorznabItem[], opts?: { offset?: number; total?: number }): string`
  - `buildErrorXml(code: number, description: string): string`
  - `TorznabRequest` / `TorznabItem` 类型

- [ ] **Step 1: Write failing tests**

```typescript
// tests/modules/torznab/parser.test.ts
import { describe, expect, it } from "vitest";
import { parseTorznabQuery } from "../../../src/modules/torznab/parser";

describe("parseTorznabQuery", () => {
  it("parses tvsearch with ids and episode", () => {
    const params = new URLSearchParams({
      t: "tvsearch",
      q: "Joy of Life",
      season: "2",
      ep: "12",
      tvdbid: "366625",
      cat: "5000",
      apikey: "secret",
      limit: "50",
    });
    const req = parseTorznabQuery(params);
    expect(req).toEqual({
      type: "tvsearch",
      q: "Joy of Life",
      season: 2,
      ep: 12,
      tvdbId: 366625,
      tmdbId: undefined,
      imdbId: undefined,
      categories: [5000],
      limit: 50,
      offset: 0,
      apikey: "secret",
    });
  });

  it("rejects unsupported t", () => {
    expect(() => parseTorznabQuery(new URLSearchParams({ t: "movie" }))).toThrow(
      /unsupported/i
    );
  });
});
```

```typescript
// tests/modules/torznab/xml-builder.test.ts
import { describe, expect, it } from "vitest";
import { buildErrorXml, buildRssXml } from "../../../src/modules/torznab/xml-builder";

describe("xml-builder", () => {
  it("escapes special characters in titles", () => {
    const xml = buildRssXml([
      {
        title: `庆余年 & <test> "quote"`,
        guid: "abc",
        link: "https://example.com/dl",
        pubDate: new Date("2024-01-01T00:00:00Z"),
        size: 1000,
        categories: [5000],
        seeders: 10,
        peers: 12,
      },
    ]);
    expect(xml).toContain("&amp;");
    expect(xml).toContain("&lt;test&gt;");
    expect(xml).not.toContain("<test>");
  });

  it("builds torznab error xml", () => {
    const xml = buildErrorXml(100, "Unauthorized");
    expect(xml).toContain('error code="100"');
    expect(xml).toContain("Unauthorized");
  });
});
```

```typescript
// tests/modules/torznab/caps.test.ts
import { describe, expect, it } from "vitest";
import { buildCapsXml } from "../../../src/modules/torznab/caps";

describe("buildCapsXml", () => {
  it("declares tvsearch with season ep tvdbid", () => {
    const xml = buildCapsXml();
    expect(xml).toContain('tvsearch');
    expect(xml).toContain("season");
    expect(xml).toContain("ep");
    expect(xml).toContain("tvdbid");
    expect(xml).toContain("tmdbid");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/modules/torznab`  
Expected: FAIL

- [ ] **Step 3: Implement types / errors / parser / caps / xml-builder**

```typescript
// src/modules/torznab/types.ts
export type TorznabType = "caps" | "search" | "tvsearch";

export interface TorznabRequest {
  type: TorznabType;
  q?: string;
  season?: number;
  ep?: number;
  tvdbId?: number;
  tmdbId?: number;
  imdbId?: string;
  categories: number[];
  limit: number;
  offset: number;
  apikey?: string;
}

export interface TorznabItem {
  title: string;
  guid: string;
  link: string;
  pubDate: Date;
  size?: number;
  categories: number[];
  seeders?: number;
  peers?: number;
  infoHash?: string;
}
```

```typescript
// src/modules/torznab/errors.ts
export class TorznabError extends Error {
  constructor(
    public readonly code: number,
    description: string
  ) {
    super(description);
    this.name = "TorznabError";
  }
}
```

`parser.ts`：仅允许 `caps|search|tvsearch`；数字字段用 `Number` 解析；`cat` 按逗号拆分；默认 `limit=100`、`offset=0`。  
`caps.ts`：用 `xmlbuilder2` 生成标准 caps，server 名 `Aliasarr`，searching 开启 `search`/`tv-search`，params 含 `q,season,ep,tvdbid,tmdbid,imdbid,cat,limit,offset`，categories 含 5000/5030/5040/5045。  
`xml-builder.ts`：RSS 2.0 + `xmlns:torznab`；每条 item 含 title/guid/link/pubDate/size/enclosure（url=link）及 `torznab:attr` 的 seeders/peers/infohash/category。

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/modules/torznab`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/torznab tests/modules/torznab
git commit -m "feat: add Torznab parser, caps, and XML builders"
```

---

### Task 4: YAML 别名库 + 简繁补充 + 标题解析

**Files:**
- Create: `data/aliases/joy-of-life.yaml`
- Create: `src/modules/media/script-convert.ts`
- Create: `src/modules/media/alias-repository.ts`
- Create: `src/modules/media/title-resolver.ts`
- Create: `src/modules/media/identity.ts`
- Test: `tests/modules/media/title-resolver.test.ts`
- Test: `tests/modules/media/alias-repository.test.ts`

**Interfaces:**
- Consumes: `MediaIdentity`；`ALIAS_DATA_DIR`
- Produces:
  - `buildIdentityFromTorznab(req): MediaIdentity`
  - `loadAliasRepository(dir): AliasRepository` with `findByTvdbId(id): MediaTitles | null`
  - `resolveTitles(identity, repo): ResolvedTitles`（最多按 priority 排序后的标题列表，含简繁补充）

- [ ] **Step 1: 写入样例别名 YAML**

```yaml
# data/aliases/joy-of-life.yaml
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

- [ ] **Step 2: Write failing tests**

```typescript
// tests/modules/media/alias-repository.test.ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadAliasRepository } from "../../../src/modules/media/alias-repository";

describe("loadAliasRepository", () => {
  it("loads joy of life by tvdb id", async () => {
    const dir = path.join(process.cwd(), "data/aliases");
    const repo = await loadAliasRepository(dir);
    const media = repo.findByTvdbId(366625);
    expect(media?.primaryTitle).toBe("Joy of Life");
    expect(media?.aliases.map((a) => a.title)).toContain("庆余年");
  });
});
```

```typescript
// tests/modules/media/title-resolver.test.ts
import { describe, expect, it } from "vitest";
import { resolveTitles } from "../../../src/modules/media/title-resolver";
import type { MediaTitles } from "../../../src/modules/media/alias-repository";

describe("resolveTitles", () => {
  it("prefers verified chinese aliases and caps to maxTitles", () => {
    const media: MediaTitles = {
      mediaId: "tvdb:366625",
      primaryTitle: "Joy of Life",
      originalLanguage: "zh",
      aliases: [
        { title: "庆余年", type: "original", script: "simplified", priority: 100, verified: true },
        { title: "慶餘年", type: "translation", script: "traditional", priority: 90, verified: true },
        { title: "庆余年2", type: "site-alias", script: "simplified", priority: 80, verified: true },
        { title: "Joy of Life", type: "official", script: "latin", priority: 50, verified: true },
      ],
      updatedAt: new Date().toISOString(),
    };
    const resolved = resolveTitles(
      { mediaType: "series", tvdbId: 366625, primaryTitle: "Joy of Life" },
      media,
      { maxTitles: 3, enableScriptConvert: true }
    );
    expect(resolved.titles).toHaveLength(3);
    expect(resolved.titles[0]).toBe("庆余年");
  });

  it("falls back to primaryTitle when no alias media", () => {
    const resolved = resolveTitles(
      { mediaType: "series", primaryTitle: "Only English" },
      null,
      { maxTitles: 3, enableScriptConvert: true }
    );
    expect(resolved.titles).toEqual(["Only English"]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/modules/media`  
Expected: FAIL

- [ ] **Step 4: Implement**

`script-convert.ts`：封装 `opencc-js` 的 `s2t` / `t2s`；对已存在标题去重。  
`alias-repository.ts`：读取目录下全部 `.yaml`/`.yml`，Zod 校验后建立 `Map<number, MediaTitles>`（按 tvdbId）。  
`title-resolver.ts`：合并 aliases + primaryTitle；按 `priority` 降序；若启用简繁且某简体无对应繁体则补充（`type: "generated"`，不挤占已 verified 优先位，在选满前作为候选）；最终 `titles` 去重后截断到 `maxTitles`。  
`identity.ts`：从 `TorznabRequest` 映射 `MediaIdentity`。

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/modules/media`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add data/aliases src/modules/media tests/modules/media
git commit -m "feat: add YAML alias repo and title resolver with OpenCC"
```

---

### Task 5: 查询词生成器

**Files:**
- Create: `src/modules/search/types.ts`
- Create: `src/modules/search/query-generator.ts`
- Test: `tests/modules/search/query-generator.test.ts`

**Interfaces:**
- Consumes: 标题列表、`season?`、`ep?`、`maxFormatsPerTitle`、`maxQueries`
- Produces: `generateQueries(input): string[]`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/modules/search/query-generator.test.ts
import { describe, expect, it } from "vitest";
import { generateQueries } from "../../../src/modules/search/query-generator";

describe("generateQueries", () => {
  it("prefers SxxExx and 第x集 within limits", () => {
    const queries = generateQueries({
      titles: ["庆余年", "Joy of Life", "慶餘年"],
      season: 2,
      episode: 12,
      maxFormatsPerTitle: 2,
      maxQueries: 6,
    });
    expect(queries.length).toBeLessThanOrEqual(6);
    expect(queries).toContain("庆余年 S02E12");
    expect(queries.some((q) => q.includes("第12集"))).toBe(true);
    expect(queries).toContain("Joy of Life S02E12");
  });

  it("uses bare title when no season/episode", () => {
    expect(
      generateQueries({
        titles: ["庆余年"],
        maxFormatsPerTitle: 2,
        maxQueries: 6,
      })
    ).toEqual(["庆余年"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/modules/search/query-generator.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement**

对每个标题按优先级生成格式列表：

1. `{title} S{season:02d}E{ep:02d}`（有 season+ep）
2. `{title} 第{ep}集`（有 ep）
3. 若仅有 season：`{title} S{season:02d}`

每标题取前 `maxFormatsPerTitle` 个，全局去重后截断到 `maxQueries`。无季集时每个标题仅自身。

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/modules/search/query-generator.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/search/query-generator.ts src/modules/search/types.ts tests/modules/search/query-generator.test.ts
git commit -m "feat: generate capped Prowlarr query strings"
```

---

### Task 6: Prowlarr 客户端与结果映射

**Files:**
- Create: `src/modules/prowlarr/types.ts`
- Create: `src/modules/prowlarr/mapper.ts`
- Create: `src/modules/prowlarr/client.ts`
- Test: `tests/modules/prowlarr/mapper.test.ts`
- Test: `tests/modules/prowlarr/client.test.ts`

**Interfaces:**
- Consumes: `getEnv()` 中 Prowlarr 配置
- Produces:
  - `mapProwlarrRelease(raw, opts?): SearchResult`
  - `createProwlarrClient(env): { search(query: string, signal?: AbortSignal): Promise<SearchResult[]> }`
  - 并发由上层 `search-service` 控制

- [ ] **Step 1: Write failing tests**

```typescript
// tests/modules/prowlarr/mapper.test.ts
import { describe, expect, it } from "vitest";
import { mapProwlarrRelease } from "../../../src/modules/prowlarr/mapper";

describe("mapProwlarrRelease", () => {
  it("maps fields and rewrites download host when configured", () => {
    const result = mapProwlarrRelease(
      {
        guid: "g1",
        title: "庆余年 S02E12",
        downloadUrl: "https://public.example.com/1/download?apikey=SECRET",
        size: 1,
        seeders: 5,
        peers: 6,
        publishDate: "2024-01-01T00:00:00Z",
        categories: [{ id: 5000 }],
        indexerId: 1,
        indexer: "PT",
        infoHash: "ABC",
        protocol: "torrent",
      },
      { sonarrBaseUrl: "http://prowlarr:9696", upstreamBaseUrl: "https://public.example.com" }
    );
    expect(result.downloadUrl.startsWith("http://prowlarr:9696/")).toBe(true);
    expect(result.originalTitle).toBe("庆余年 S02E12");
    expect(result.infoHash).toBe("ABC");
  });
});
```

```typescript
// tests/modules/prowlarr/client.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProwlarrClient } from "../../../src/modules/prowlarr/client";

describe("createProwlarrClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty array on upstream failure instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );
    const client = createProwlarrClient({
      baseUrl: "https://prowlarr.example.com",
      apiKey: "key",
      timeoutMs: 100,
    });
    await expect(client.search("庆余年 S02E12")).resolves.toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/modules/prowlarr`  
Expected: FAIL

- [ ] **Step 3: Implement**

`client.search`：`GET {baseUrl}/api/v1/search?query=...&type=search`（或等价 TV 搜索参数），Header `X-Api-Key`；用 `AbortSignal.timeout(timeoutMs)`；非 2xx 或抛错时记 warn 日志并返回 `[]`。日志只记 hostname + path，不记 query 中的 key。  
`mapper`：产出 `SearchResult`（见需求 7.8）；若配置了 `PROWLARR_SONARR_URL`，将 downloadUrl 的 origin 替换为该值，保留 pathname+search。

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/modules/prowlarr`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/prowlarr tests/modules/prowlarr
git commit -m "feat: add resilient Prowlarr client and release mapper"
```

---

### Task 7: 去重与搜索编排服务

**Files:**
- Create: `src/modules/search/deduplicator.ts`
- Create: `src/modules/search/search-service.ts`
- Create: `src/modules/cache/memory-cache.ts`
- Test: `tests/modules/search/deduplicator.test.ts`
- Test: `tests/modules/search/search-service.test.ts`

**Interfaces:**
- Consumes: `AliasRepository`、`ProwlarrClient`、`generateQueries`、`resolveTitles`、env 限制
- Produces:
  - `deduplicateResults(results: SearchResult[]): SearchResult[]`
  - `createSearchService(deps): { tvSearch(req: TorznabRequest): Promise<SearchResult[]> }`
  - 缓存键：`search:tvdb:{id}:s{season}:e{ep}` 或无 ID 时基于 query hash；命中 TTL 15 分钟，空结果 TTL 2 分钟

- [ ] **Step 1: Write failing tests**

```typescript
// tests/modules/search/deduplicator.test.ts
import { describe, expect, it } from "vitest";
import { deduplicateResults } from "../../../src/modules/search/deduplicator";
import type { SearchResult } from "../../../src/modules/search/types";

const base = (over: Partial<SearchResult>): SearchResult => ({
  guid: "g",
  title: "t",
  originalTitle: "t",
  downloadUrl: "https://x/1",
  categories: [5000],
  ...over,
});

describe("deduplicateResults", () => {
  it("dedupes by infoHash first", () => {
    const out = deduplicateResults([
      base({ guid: "1", infoHash: "AAA", downloadUrl: "https://a" }),
      base({ guid: "2", infoHash: "AAA", downloadUrl: "https://b" }),
    ]);
    expect(out).toHaveLength(1);
  });
});
```

```typescript
// tests/modules/search/search-service.test.ts
import { describe, expect, it, vi } from "vitest";
import { createSearchService } from "../../../src/modules/search/search-service";

describe("createSearchService", () => {
  it("runs queries with concurrency limit and merges", async () => {
    const search = vi
      .fn()
      .mockImplementation(async (q: string) => [
        {
          guid: q,
          title: q,
          originalTitle: q,
          downloadUrl: `https://dl/${encodeURIComponent(q)}`,
          categories: [5000],
          infoHash: q,
        },
      ]);
    const service = createSearchService({
      resolveTitlesForRequest: async () => ({ titles: ["庆余年", "Joy of Life"] }),
      generateQueries: () => ["庆余年 S02E12", "Joy of Life S02E12"],
      prowlarr: { search },
      maxConcurrency: 1,
      resultLimit: 100,
      cache: { get: async () => null, set: async () => undefined },
    });
    const results = await service.tvSearch({
      type: "tvsearch",
      season: 2,
      ep: 12,
      tvdbId: 366625,
      categories: [5000],
      limit: 100,
      offset: 0,
    });
    expect(search).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/modules/search/deduplicator.test.ts tests/modules/search/search-service.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement**

去重键顺序：`infoHash` → `guid` → `downloadUrl` → `` `${normalize(title)}|${size}` ``。  
`search-service`：解析标题 → 生成查询 → 用简单 async pool（并发 `maxConcurrency`）调用 prowlarr；单查询失败已在 client 消化；合并 → 去重 → `slice(0, resultLimit)`；写缓存。  
`memory-cache.ts`：`Map<string, { expiresAt: number; value: T }>`。

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/modules/search`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/search src/modules/cache tests/modules/search
git commit -m "feat: orchestrate alias search with dedupe and cache"
```

---

### Task 8: HTTP 路由（torznab + health）与 README

**Files:**
- Create: `src/app/api/torznab/route.ts`
- Create: `src/app/api/health/route.ts`
- Create: `README.md`
- Create: `.gitignore`
- Test: `tests/app/torznab-route.test.ts`（用纯函数抽出 handler 核心，或对 `handleTorznabGet(url: URL)` 单测）

**Interfaces:**
- Consumes: Task 2–7 全部
- Produces: 可部署的 HTTP API

- [ ] **Step 1: 抽出可测 handler 并写失败测试**

```typescript
// 建议：src/modules/torznab/handler.ts
// export async function handleTorznabRequest(url: URL, deps: TorznabDeps): Promise<Response>
```

测试用例：

1. 错误 apikey → XML error，status 401，`Content-Type` 含 `application/rss+xml` 或 `application/xml`
2. `t=caps` → 含 server/caps
3. `t=tvsearch` → 调用 searchService，返回 RSS item

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/app/torznab-route.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement routes**

`route.ts`：

```typescript
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request): Promise<Response> {
  // wire deps once (lazy singleton): alias repo, prowlarr client, search service
  // call handleTorznabRequest
}
```

行为矩阵：

| 条件 | 响应 |
| --- | --- |
| apikey 无效 | `buildErrorXml(100, "Unauthorized")`，401 |
| `t=caps` | caps XML，200（仍校验 apikey，与常见 indexer 行为一致） |
| `t=tvsearch` / `search` | 搜索后 `buildRssXml`，200 |
| 不支持的 t | Torznab error XML，400 |
| 未捕获异常 | Torznab error XML，500；日志带 requestId |

`health/route.ts`：探测 Prowlarr `GET /api/v1/system/status`（超时短）；返回 JSON `{ status, prowlarr, database: "skipped", version: "0.1.0" }`（MVP 无 DB 则 `database: "skipped"`）。不暴露 URL/Key。

README：配置环境变量、本地 `npm run dev`、Sonarr 接入字段、如何添加 `data/aliases/*.yaml`、部署到 Vercel 的要点（Tunnel 访问内网 Prowlarr）。

`.gitignore`：`node_modules`、`.env`、`.next`、日志等。

- [ ] **Step 4: Run all tests**

Run: `npm test && npm run typecheck`  
Expected: 全部 PASS

- [ ] **Step 5: 本地 smoke（有 Prowlarr 时）**

```bash
cp .env.example .env
# 填入真实或 mock 值
npm run dev
curl -s 'http://localhost:3000/api/health'
curl -s 'http://localhost:3000/api/torznab?t=caps&apikey=...'
curl -s 'http://localhost:3000/api/torznab?t=tvsearch&tvdbid=366625&season=2&ep=12&apikey=...'
```

Expected: health JSON；caps/XML 非 HTML；tvsearch 为 RSS。

- [ ] **Step 6: Commit**

```bash
git add src/app src/modules/torznab/handler.ts tests/app README.md .gitignore
git commit -m "feat: expose Torznab and health HTTP endpoints"
```

---

### Task 9: Vercel 部署清单与验收脚本

**Files:**
- Create: `docs/DEPLOYMENT.md`
- Create: `scripts/smoke-torznab.sh`
- Modify: `README.md`（链到部署文档）

**Interfaces:**
- Produces: 可重复的 smoke 与部署检查项

- [ ] **Step 1: 写部署文档**

内容必须包含：

1. Vercel 项目导入与环境变量清单（与 `.env.example` 一致）
2. Prowlarr 公网可达方式（Cloudflare Tunnel 等）提醒：勿裸奔管理 UI
3. Sonarr Indexer 配置表（URL / API Path `/api/torznab` / Categories）
4. 验收：Sonarr Test Indexer 通过；手动 Search 庆余年 S02E12 有结果或空 RSS（非 HTML）

- [ ] **Step 2: smoke 脚本**

```bash
#!/usr/bin/env bash
set -euo pipefail
BASE="${1:?base url}"
KEY="${2:?apikey}"
curl -fsS "$BASE/api/health" | grep -q '"status"'
curl -fsS "$BASE/api/torznab?t=caps&apikey=$KEY" | grep -q '<caps'
curl -fsS "$BASE/api/torznab?t=tvsearch&tvdbid=366625&season=2&ep=12&apikey=$KEY" | grep -q '<rss'
echo "smoke ok"
```

- [ ] **Step 3: Commit**

```bash
git add docs/DEPLOYMENT.md scripts/smoke-torznab.sh README.md
git commit -m "docs: add Vercel deployment and smoke checks"
```

---

## Spec Coverage Self-Review

| 需求（REQUIREMENTS §20 MVP） | 任务 |
| --- | --- |
| Vercel 部署 | Task 1 `vercel.json` + Task 9 |
| Torznab caps / tvsearch | Task 3 + Task 8 |
| API Key 鉴权 | Task 2 + Task 8 |
| Prowlarr 搜索 | Task 6–7 |
| TVDB 映射 + 本地别名 | Task 4 YAML |
| 简繁补充 | Task 4 OpenCC |
| 最多 3 标题扩展 + 合并去重 | Task 5 + Task 7 |
| Torznab XML | Task 3 + Task 8 |
| 请求日志 + health | Task 1 logger + Task 8 health |
| 补充 Indexer 接入说明 | Task 8–9 README/DEPLOYMENT |
| 明确不做：Agent/后台/标题重写/Torrent 代理/Postgres | Global Constraints |

**未纳入本计划（符合 MVP 不做）：** `/api/debug/search`、管理后台、PostgreSQL、Upstash、Release 规范化、限流中间件（可二期加）。

**Placeholder scan：** 无 TBD；关键算法与接口均已写明。

**类型一致性：** `TorznabRequest` / `SearchResult` / `MediaTitles` 在 Task 3–7 间统一；路由只依赖 `handleTorznabRequest`。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-09-aliasarr-mvp.md`.

两种执行方式：

1. **Subagent-Driven（推荐）** — 每个 Task 开新子代理，任务间做审查，迭代快  
2. **Inline Execution** — 本会话按 executing-plans 连续执行，设检查点  

选哪种？
