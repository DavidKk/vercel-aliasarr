# Aliasarr MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver on Vercel a virtual Torznab Indexer Sonarr can connect to: expand simplified/traditional Chinese aliases by TVDB ID, search via Prowlarr, merge dedupe, return Torznab XML.

**Architecture:** Next.js App Router exposes `/api/torznab` and `/api/health`. Request flow: API Key validation → parse Torznab params → YAML alias repo + OpenCC script supplement → up to 6 queries → concurrent Prowlarr Search API → dedupe → RSS/Torznab XML. Download links stay Prowlarr Grab URLs; this service does not proxy torrents.

**Tech Stack:** TypeScript, Next.js 15 (App Router), Zod, xmlbuilder2, opencc-js, yaml, Pino, Vitest, Vercel

## Global Constraints

- **Runtime platform (hard constraint): Vercel only** (Next.js App Router + Node.js Serverless / Fluid). Local `next dev` is for development only; do not introduce long-lived processes, WebSocket servers, or architectures that cannot run on Vercel Functions. Routes use `export const runtime = "nodejs"`; search functions `maxDuration` ≥ 30 (see `vercel.json`). Alias YAML is readable from deployment artifacts (in repo `data/`), not local absolute paths.
- Language and responses: server code TypeScript; Torznab success/failure responses are XML (no HTML / JSON error pages to Sonarr)
- Auth: Sonarr requests must include `apikey`, compared to `TORZNAB_API_KEY` with constant-time comparison
- Query amplification: max 3 titles × max 2 formats per title, max 6 Prowlarr queries per request; concurrency cap 3
- MVP excludes: Agent, admin UI, release title rewrite, torrent proxy, PostgreSQL (use YAML), Upstash (use in-process TTL cache)
- Logging: never output full API Key or full URLs containing keys
- Timeout: overall search budget ~15–25s; partial failure returns completed results; Prowlarr must be publicly reachable (tunnel/gateway) because Vercel cannot reach pure LAN

## File Map (to create)

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

### Task 1: Project scaffold and env validation

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

- Produces: `getEnv(): Env`; `logger` (Pino); basic shared types

- [ ] **Step 1: Initialize package.json and dependencies**

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
Expected: dependencies install successfully; `package-lock.json` generated

- [ ] **Step 2: Write failing env test**

```typescript
// tests/shared/env.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('getEnv', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('throws when TORZNAB_API_KEY is missing', async () => {
    vi.stubEnv('TORZNAB_API_KEY', '')
    vi.stubEnv('PROWLARR_URL', 'https://prowlarr.example.com')
    vi.stubEnv('PROWLARR_API_KEY', 'prowlarr-key')
    const { getEnv } = await import('../../src/shared/env')
    expect(() => getEnv()).toThrow(/TORZNAB_API_KEY/)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/shared/env.test.ts`  
Expected: FAIL (module missing or `getEnv` undefined)

- [ ] **Step 4: Implement env / logger / tsconfig / next / vercel**

```typescript
// src/shared/env.ts
import { z } from 'zod'

const EnvSchema = z.object({
  TORZNAB_API_KEY: z.string().min(16),
  PROWLARR_URL: z.string().url(),
  PROWLARR_API_KEY: z.string().min(8),
  PROWLARR_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  PROWLARR_MAX_CONCURRENCY: z.coerce.number().int().positive().default(3),
  PROWLARR_SONARR_URL: z.string().url().optional(),
  ALIAS_DATA_DIR: z.string().default('data/aliases'),
  MAX_TITLES: z.coerce.number().int().positive().default(3),
  MAX_QUERY_FORMATS_PER_TITLE: z.coerce.number().int().positive().default(2),
  MAX_PROWLARR_QUERIES: z.coerce.number().int().positive().default(6),
  SEARCH_RESULT_LIMIT: z.coerce.number().int().positive().default(100),
  LOG_LEVEL: z.string().default('info'),
})

export type Env = z.infer<typeof EnvSchema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(`Invalid env: ${parsed.error.message}`)
  }
  cached = parsed.data
  return cached
}

/** test-only */
export function resetEnvCache(): void {
  cached = null
}
```

```typescript
// src/shared/logger.ts
import pino from 'pino'
import { getEnv } from './env'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: ['apikey', 'apiKey', 'PROWLARR_API_KEY', 'TORZNAB_API_KEY', '*.apikey'],
    censor: '[Redacted]',
  },
})

export function childLogger(bindings: Record<string, unknown>) {
  try {
    getEnv()
  } catch {
    // allow logging before env is ready in tests
  }
  return logger.child(bindings)
}
```

```typescript
// src/shared/types.ts
export type MediaType = 'series'

export interface MediaIdentity {
  tvdbId?: number
  tmdbId?: number
  imdbId?: string
  primaryTitle?: string
  year?: number
  mediaType: MediaType
}
```

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['pino', 'opencc-js'],
}

export default nextConfig
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

`tsconfig.json` enables `strict`, `paths`: `@/*` → `src/*`.  
`vitest.config.ts` uses Node environment, `alias: { "@": "./src" }`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/shared/env.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts vercel.json vitest.config.ts .env.example src/shared tests/shared
git commit -m "chore: scaffold Next.js project with env validation"
```

---

### Task 2: Constant-time API Key validation

**Files:**

- Create: `src/modules/security/api-key.ts`
- Test: `tests/modules/security/api-key.test.ts`

**Interfaces:**

- Consumes: `getEnv().TORZNAB_API_KEY`
- Produces: `timingSafeEqualString(a: string, b: string): boolean`; `assertTorznabApiKey(apikey: string | null | undefined): void` (throws `UnauthorizedError` on failure)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/modules/security/api-key.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

describe('assertTorznabApiKey', () => {
  beforeEach(() => {
    vi.stubEnv('TORZNAB_API_KEY', '0123456789abcdef')
    vi.stubEnv('PROWLARR_URL', 'https://prowlarr.example.com')
    vi.stubEnv('PROWLARR_API_KEY', 'prowlarr-key')
  })
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('accepts matching key', async () => {
    const { resetEnvCache } = await import('../../../src/shared/env')
    resetEnvCache()
    const { assertTorznabApiKey } = await import('../../../src/modules/security/api-key')
    expect(() => assertTorznabApiKey('0123456789abcdef')).not.toThrow()
  })

  it('rejects wrong key', async () => {
    const { resetEnvCache } = await import('../../../src/shared/env')
    resetEnvCache()
    const { assertTorznabApiKey, UnauthorizedError } = await import('../../../src/modules/security/api-key')
    expect(() => assertTorznabApiKey('wrong-key-wrong!!')).toThrow(UnauthorizedError)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/modules/security/api-key.test.ts`  
Expected: FAIL (module missing)

- [ ] **Step 3: Implement**

```typescript
// src/modules/security/api-key.ts
import { timingSafeEqual } from 'node:crypto'
import { getEnv } from '@/shared/env'

export class UnauthorizedError extends Error {
  readonly status = 401
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) {
    // compare against self to keep roughly constant work on length mismatch
    timingSafeEqual(aBuf, aBuf)
    return false
  }
  return timingSafeEqual(aBuf, bBuf)
}

export function assertTorznabApiKey(apikey: string | null | undefined): void {
  const expected = getEnv().TORZNAB_API_KEY
  if (!apikey || !timingSafeEqualString(apikey, expected)) {
    throw new UnauthorizedError()
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

### Task 3: Torznab parse, Caps, errors, and XML builders

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
  - `TorznabRequest` / `TorznabItem` types

- [ ] **Step 1: Write failing tests**

```typescript
// tests/modules/torznab/parser.test.ts
import { describe, expect, it } from 'vitest'
import { parseTorznabQuery } from '../../../src/modules/torznab/parser'

describe('parseTorznabQuery', () => {
  it('parses tvsearch with ids and episode', () => {
    const params = new URLSearchParams({
      t: 'tvsearch',
      q: 'Joy of Life',
      season: '2',
      ep: '12',
      tvdbid: '366625',
      cat: '5000',
      apikey: 'secret',
      limit: '50',
    })
    const req = parseTorznabQuery(params)
    expect(req).toEqual({
      type: 'tvsearch',
      q: 'Joy of Life',
      season: 2,
      ep: 12,
      tvdbId: 366625,
      tmdbId: undefined,
      imdbId: undefined,
      categories: [5000],
      limit: 50,
      offset: 0,
      apikey: 'secret',
    })
  })

  it('rejects unsupported t', () => {
    expect(() => parseTorznabQuery(new URLSearchParams({ t: 'movie' }))).toThrow(/unsupported/i)
  })
})
```

```typescript
// tests/modules/torznab/xml-builder.test.ts
import { describe, expect, it } from 'vitest'
import { buildErrorXml, buildRssXml } from '../../../src/modules/torznab/xml-builder'

describe('xml-builder', () => {
  it('escapes special characters in titles', () => {
    const xml = buildRssXml([
      {
        title: `Qing Yu Nian & <test> "quote"`,
        guid: 'abc',
        link: 'https://example.com/dl',
        pubDate: new Date('2024-01-01T00:00:00Z'),
        size: 1000,
        categories: [5000],
        seeders: 10,
        peers: 12,
      },
    ])
    expect(xml).toContain('&amp;')
    expect(xml).toContain('&lt;test&gt;')
    expect(xml).not.toContain('<test>')
  })

  it('builds torznab error xml', () => {
    const xml = buildErrorXml(100, 'Unauthorized')
    expect(xml).toContain('error code="100"')
    expect(xml).toContain('Unauthorized')
  })
})
```

```typescript
// tests/modules/torznab/caps.test.ts
import { describe, expect, it } from 'vitest'
import { buildCapsXml } from '../../../src/modules/torznab/caps'

describe('buildCapsXml', () => {
  it('declares tvsearch with season ep tvdbid', () => {
    const xml = buildCapsXml()
    expect(xml).toContain('tvsearch')
    expect(xml).toContain('season')
    expect(xml).toContain('ep')
    expect(xml).toContain('tvdbid')
    expect(xml).toContain('tmdbid')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/modules/torznab`  
Expected: FAIL

- [ ] **Step 3: Implement types / errors / parser / caps / xml-builder**

```typescript
// src/modules/torznab/types.ts
export type TorznabType = 'caps' | 'search' | 'tvsearch'

export interface TorznabRequest {
  type: TorznabType
  q?: string
  season?: number
  ep?: number
  tvdbId?: number
  tmdbId?: number
  imdbId?: string
  categories: number[]
  limit: number
  offset: number
  apikey?: string
}

export interface TorznabItem {
  title: string
  guid: string
  link: string
  pubDate: Date
  size?: number
  categories: number[]
  seeders?: number
  peers?: number
  infoHash?: string
}
```

```typescript
// src/modules/torznab/errors.ts
export class TorznabError extends Error {
  constructor(
    public readonly code: number,
    description: string
  ) {
    super(description)
    this.name = 'TorznabError'
  }
}
```

`parser.ts`: allow only `caps|search|tvsearch`; parse numeric fields with `Number`; split `cat` by comma; default `limit=100`, `offset=0`.  
`caps.ts`: build standard caps with `xmlbuilder2`, server name `Aliasarr`, searching enables `search`/`tv-search`, params include `q,season,ep,tvdbid,tmdbid,imdbid,cat,limit,offset`, categories 5000/5030/5040/5045.  
`xml-builder.ts`: RSS 2.0 + `xmlns:torznab`; each item has title/guid/link/pubDate/size/enclosure (url=link) and `torznab:attr` seeders/peers/infohash/category.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/modules/torznab`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/torznab tests/modules/torznab
git commit -m "feat: add Torznab parser, caps, and XML builders"
```

---

### Task 4: YAML alias repo + script supplement + title resolution

**Files:**

- Create: `data/aliases/joy-of-life.yaml`
- Create: `src/modules/media/script-convert.ts`
- Create: `src/modules/media/alias-repository.ts`
- Create: `src/modules/media/title-resolver.ts`
- Create: `src/modules/media/identity.ts`
- Test: `tests/modules/media/title-resolver.test.ts`
- Test: `tests/modules/media/alias-repository.test.ts`

**Interfaces:**

- Consumes: `MediaIdentity`; `ALIAS_DATA_DIR`
- Produces:
  - `buildIdentityFromTorznab(req): MediaIdentity`
  - `loadAliasRepository(dir): AliasRepository` with `findByTvdbId(id): MediaTitles | null`
  - `resolveTitles(identity, repo): ResolvedTitles` (title list sorted by priority, with script supplement)

- [ ] **Step 1: Write sample alias YAML**

```yaml
# data/aliases/joy-of-life.yaml
media:
  tvdbId: 366625
  tmdbId: 96481
  primaryTitle: Joy of Life
  originalLanguage: zh
  aliases:
    - title: Qing Yu Nian
      type: original
      script: simplified
      priority: 100
      verified: true
    - title: Qing Yu Nian (traditional)
      type: translation
      script: traditional
      priority: 90
      verified: true
    - title: Qing Yu Nian2
      type: site-alias
      script: simplified
      priority: 80
      verified: true
```

- [ ] **Step 2: Write failing tests**

```typescript
// tests/modules/media/alias-repository.test.ts
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadAliasRepository } from '../../../src/modules/media/alias-repository'

describe('loadAliasRepository', () => {
  it('loads joy of life by tvdb id', async () => {
    const dir = path.join(process.cwd(), 'data/aliases')
    const repo = await loadAliasRepository(dir)
    const media = repo.findByTvdbId(366625)
    expect(media?.primaryTitle).toBe('Joy of Life')
    expect(media?.aliases.map((a) => a.title)).toContain('Qing Yu Nian')
  })
})
```

```typescript
// tests/modules/media/title-resolver.test.ts
import { describe, expect, it } from 'vitest'
import { resolveTitles } from '../../../src/modules/media/title-resolver'
import type { MediaTitles } from '../../../src/modules/media/alias-repository'

describe('resolveTitles', () => {
  it('prefers verified chinese aliases and caps to maxTitles', () => {
    const media: MediaTitles = {
      mediaId: 'tvdb:366625',
      primaryTitle: 'Joy of Life',
      originalLanguage: 'zh',
      aliases: [
        { title: 'Qing Yu Nian', type: 'original', script: 'simplified', priority: 100, verified: true },
        { title: 'Qing Yu Nian (traditional)', type: 'translation', script: 'traditional', priority: 90, verified: true },
        { title: 'Qing Yu Nian2', type: 'site-alias', script: 'simplified', priority: 80, verified: true },
        { title: 'Joy of Life', type: 'official', script: 'latin', priority: 50, verified: true },
      ],
      updatedAt: new Date().toISOString(),
    }
    const resolved = resolveTitles({ mediaType: 'series', tvdbId: 366625, primaryTitle: 'Joy of Life' }, media, { maxTitles: 3, enableScriptConvert: true })
    expect(resolved.titles).toHaveLength(3)
    expect(resolved.titles[0]).toBe('Qing Yu Nian')
  })

  it('falls back to primaryTitle when no alias media', () => {
    const resolved = resolveTitles({ mediaType: 'series', primaryTitle: 'Only English' }, null, { maxTitles: 3, enableScriptConvert: true })
    expect(resolved.titles).toEqual(['Only English'])
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/modules/media`  
Expected: FAIL

- [ ] **Step 4: Implement**

`script-convert.ts`: wrap `opencc-js` `s2t` / `t2s`; dedupe existing titles.  
`alias-repository.ts`: read all `.yaml`/`.yml` in directory, Zod validate, build `Map<number, MediaTitles>` by tvdbId.  
`title-resolver.ts`: merge aliases + primaryTitle; sort by `priority` desc; if script convert enabled and simplified lacks traditional, supplement (`type: "generated"`, without displacing verified priority, candidate until cap); final `titles` deduped and truncated to `maxTitles`.  
`identity.ts`: map `TorznabRequest` to `MediaIdentity`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/modules/media`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add data/aliases src/modules/media tests/modules/media
git commit -m "feat: add YAML alias repo and title resolver with OpenCC"
```

---

### Task 5: Query generator

**Files:**

- Create: `src/modules/search/types.ts`
- Create: `src/modules/search/query-generator.ts`
- Test: `tests/modules/search/query-generator.test.ts`

**Interfaces:**

- Consumes: title list, `season?`, `ep?`, `maxFormatsPerTitle`, `maxQueries`
- Produces: `generateQueries(input): string[]`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/modules/search/query-generator.test.ts
import { describe, expect, it } from 'vitest'
import { generateQueries } from '../../../src/modules/search/query-generator'

describe('generateQueries', () => {
  it('prefers SxxExx and Episode x within limits', () => {
    const queries = generateQueries({
      titles: ['Qing Yu Nian', 'Joy of Life', 'Qing Yu Nian (traditional)'],
      season: 2,
      episode: 12,
      maxFormatsPerTitle: 2,
      maxQueries: 6,
    })
    expect(queries.length).toBeLessThanOrEqual(6)
    expect(queries).toContain('Qing Yu Nian S02E12')
    expect(queries.some((q) => q.includes('Episode 12'))).toBe(true)
    expect(queries).toContain('Joy of Life S02E12')
  })

  it('uses bare title when no season/episode', () => {
    expect(
      generateQueries({
        titles: ['Qing Yu Nian'],
        maxFormatsPerTitle: 2,
        maxQueries: 6,
      })
    ).toEqual(['Qing Yu Nian'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/modules/search/query-generator.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement**

For each title generate format list by priority:

1. `{title} S{season:02d}E{ep:02d}` (when season+ep present)
2. `{title} Episode {ep}` (when ep present)
3. If season only: `{title} S{season:02d}`

Take first `maxFormatsPerTitle` per title, global dedupe, truncate to `maxQueries`. Without season/episode each title is itself only.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/modules/search/query-generator.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/search/query-generator.ts src/modules/search/types.ts tests/modules/search/query-generator.test.ts
git commit -m "feat: generate capped Prowlarr query strings"
```

---

### Task 6: Prowlarr client and result mapping

**Files:**

- Create: `src/modules/prowlarr/types.ts`
- Create: `src/modules/prowlarr/mapper.ts`
- Create: `src/modules/prowlarr/client.ts`
- Test: `tests/modules/prowlarr/mapper.test.ts`
- Test: `tests/modules/prowlarr/client.test.ts`

**Interfaces:**

- Consumes: Prowlarr config from `getEnv()`
- Produces:
  - `mapProwlarrRelease(raw, opts?): SearchResult`
  - `createProwlarrClient(env): { search(query: string, signal?: AbortSignal): Promise<SearchResult[]> }`
  - Concurrency controlled by upper `search-service`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/modules/prowlarr/mapper.test.ts
import { describe, expect, it } from 'vitest'
import { mapProwlarrRelease } from '../../../src/modules/prowlarr/mapper'

describe('mapProwlarrRelease', () => {
  it('maps fields and rewrites download host when configured', () => {
    const result = mapProwlarrRelease(
      {
        guid: 'g1',
        title: 'Qing Yu Nian S02E12',
        downloadUrl: 'https://public.example.com/1/download?apikey=SECRET',
        size: 1,
        seeders: 5,
        peers: 6,
        publishDate: '2024-01-01T00:00:00Z',
        categories: [{ id: 5000 }],
        indexerId: 1,
        indexer: 'PT',
        infoHash: 'ABC',
        protocol: 'torrent',
      },
      { sonarrBaseUrl: 'http://prowlarr:9696', upstreamBaseUrl: 'https://public.example.com' }
    )
    expect(result.downloadUrl.startsWith('http://prowlarr:9696/')).toBe(true)
    expect(result.originalTitle).toBe('Qing Yu Nian S02E12')
    expect(result.infoHash).toBe('ABC')
  })
})
```

```typescript
// tests/modules/prowlarr/client.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProwlarrClient } from '../../../src/modules/prowlarr/client'

describe('createProwlarrClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns empty array on upstream failure instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const client = createProwlarrClient({
      baseUrl: 'https://prowlarr.example.com',
      apiKey: 'key',
      timeoutMs: 100,
    })
    await expect(client.search('Qing Yu Nian S02E12')).resolves.toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/modules/prowlarr`  
Expected: FAIL

- [ ] **Step 3: Implement**

`client.search`: `GET {baseUrl}/api/v1/search?query=...&type=search` (or equivalent TV search params), Header `X-Api-Key`; use `AbortSignal.timeout(timeoutMs)`; on non-2xx or throw log warn and return `[]`. Log hostname + path only, not key in query.  
`mapper`: produce `SearchResult` (see requirements 7.8); if `PROWLARR_SONARR_URL` configured, replace downloadUrl origin, keep pathname+search.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/modules/prowlarr`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/prowlarr tests/modules/prowlarr
git commit -m "feat: add resilient Prowlarr client and release mapper"
```

---

### Task 7: Dedupe and search orchestration

**Files:**

- Create: `src/modules/search/deduplicator.ts`
- Create: `src/modules/search/search-service.ts`
- Create: `src/modules/cache/memory-cache.ts`
- Test: `tests/modules/search/deduplicator.test.ts`
- Test: `tests/modules/search/search-service.test.ts`

**Interfaces:**

- Consumes: `AliasRepository`, `ProwlarrClient`, `generateQueries`, `resolveTitles`, env limits
- Produces:
  - `deduplicateResults(results: SearchResult[]): SearchResult[]`
  - `createSearchService(deps): { tvSearch(req: TorznabRequest): Promise<SearchResult[]> }`
  - Cache key: `search:tvdb:{id}:s{season}:e{ep}` or query hash without ID; hit TTL 15 min, empty result TTL 2 min

- [ ] **Step 1: Write failing tests**

```typescript
// tests/modules/search/deduplicator.test.ts
import { describe, expect, it } from 'vitest'
import { deduplicateResults } from '../../../src/modules/search/deduplicator'
import type { SearchResult } from '../../../src/modules/search/types'

const base = (over: Partial<SearchResult>): SearchResult => ({
  guid: 'g',
  title: 't',
  originalTitle: 't',
  downloadUrl: 'https://x/1',
  categories: [5000],
  ...over,
})

describe('deduplicateResults', () => {
  it('dedupes by infoHash first', () => {
    const out = deduplicateResults([base({ guid: '1', infoHash: 'AAA', downloadUrl: 'https://a' }), base({ guid: '2', infoHash: 'AAA', downloadUrl: 'https://b' })])
    expect(out).toHaveLength(1)
  })
})
```

```typescript
// tests/modules/search/search-service.test.ts
import { describe, expect, it, vi } from 'vitest'
import { createSearchService } from '../../../src/modules/search/search-service'

describe('createSearchService', () => {
  it('runs queries with concurrency limit and merges', async () => {
    const search = vi.fn().mockImplementation(async (q: string) => [
      {
        guid: q,
        title: q,
        originalTitle: q,
        downloadUrl: `https://dl/${encodeURIComponent(q)}`,
        categories: [5000],
        infoHash: q,
      },
    ])
    const service = createSearchService({
      resolveTitlesForRequest: async () => ({ titles: ['Qing Yu Nian', 'Joy of Life'] }),
      generateQueries: () => ['Qing Yu Nian S02E12', 'Joy of Life S02E12'],
      prowlarr: { search },
      maxConcurrency: 1,
      resultLimit: 100,
      cache: { get: async () => null, set: async () => undefined },
    })
    const results = await service.tvSearch({
      type: 'tvsearch',
      season: 2,
      ep: 12,
      tvdbId: 366625,
      categories: [5000],
      limit: 100,
      offset: 0,
    })
    expect(search).toHaveBeenCalledTimes(2)
    expect(results).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/modules/search/deduplicator.test.ts tests/modules/search/search-service.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement**

Dedup key order: `infoHash` → `guid` → `downloadUrl` → `` `${normalize(title)}|${size}` ``.  
`search-service`: resolve titles → generate queries → simple async pool (`maxConcurrency`) calling prowlarr; single query failures absorbed in client; merge → dedupe → `slice(0, resultLimit)`; write cache.  
`memory-cache.ts`: `Map<string, { expiresAt: number; value: T }>`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/modules/search`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/search src/modules/cache tests/modules/search
git commit -m "feat: orchestrate alias search with dedupe and cache"
```

---

### Task 8: HTTP routes (torznab + health) and README

**Files:**

- Create: `src/app/api/torznab/route.ts`
- Create: `src/app/api/health/route.ts`
- Create: `README.md`
- Create: `.gitignore`
- Test: `tests/app/torznab-route.test.ts` (extract handler core as pure function, or unit test `handleTorznabGet(url: URL)`)

**Interfaces:**

- Consumes: all of Task 2–7
- Produces: deployable HTTP API

- [ ] **Step 1: Extract testable handler and write failing test**

```typescript
// Suggested: src/modules/torznab/handler.ts
// export async function handleTorznabRequest(url: URL, deps: TorznabDeps): Promise<Response>
```

Test cases:

1. Wrong apikey → XML error, status 401, `Content-Type` includes `application/rss+xml` or `application/xml`
2. `t=caps` → includes server/caps
3. `t=tvsearch` → calls searchService, returns RSS items

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/app/torznab-route.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement routes**

`route.ts`:

```typescript
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: Request): Promise<Response> {
  // wire deps once (lazy singleton): alias repo, prowlarr client, search service
  // call handleTorznabRequest
}
```

Behavior matrix:

| Condition               | Response                                                        |
| ----------------------- | --------------------------------------------------------------- |
| Invalid apikey          | `buildErrorXml(100, "Unauthorized")`, 401                       |
| `t=caps`                | caps XML, 200 (still validates apikey, common indexer behavior) |
| `t=tvsearch` / `search` | `buildRssXml` after search, 200                                 |
| Unsupported t           | Torznab error XML, 400                                          |
| Uncaught exception      | Torznab error XML, 500; log includes requestId                  |

`health/route.ts`: probe Prowlarr `GET /api/v1/system/status` (short timeout); return JSON `{ status, prowlarr, database: "skipped", version: "0.1.0" }` (MVP without DB uses `database: "skipped"`). Do not expose URL/Key.

README: env vars, local `npm run dev`, Sonarr integration fields, adding `data/aliases/*.yaml`, Vercel deploy notes (tunnel for LAN Prowlarr).

`.gitignore`: `node_modules`, `.env`, `.next`, logs, etc.

- [ ] **Step 4: Run all tests**

Run: `npm test && npm run typecheck`  
Expected: all PASS

- [ ] **Step 5: Local smoke (when Prowlarr available)**

```bash
cp .env.example .env
# Fill real or mock values
npm run dev
curl -s 'http://localhost:3000/api/health'
curl -s 'http://localhost:3000/api/torznab?t=caps&apikey=...'
curl -s 'http://localhost:3000/api/torznab?t=tvsearch&tvdbid=366625&season=2&ep=12&apikey=...'
```

Expected: health JSON; caps/XML not HTML; tvsearch is RSS.

- [ ] **Step 6: Commit**

```bash
git add src/app src/modules/torznab/handler.ts tests/app README.md .gitignore
git commit -m "feat: expose Torznab and health HTTP endpoints"
```

---

### Task 9: Vercel deployment checklist and acceptance script

**Files:**

- Create: `docs/DEPLOYMENT.md`
- Create: `scripts/smoke-torznab.sh`
- Modify: `README.md` (link to deployment doc)

**Interfaces:**

- Produces: repeatable smoke and deployment checklist

- [ ] **Step 1: Write deployment doc**

Must include:

1. Vercel project import and env var list (matching `.env.example`)
2. Prowlarr public reachability (Cloudflare Tunnel, etc.): do not expose management UI publicly
3. Sonarr Indexer config table (URL / API Path `/api/torznab` / Categories)
4. Acceptance: Sonarr Test Indexer passes; manual search Qing Yu Nian S02E12 returns results or empty RSS (not HTML)

- [ ] **Step 2: smoke script**

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

| Requirement (REQUIREMENTS §20 MVP)                                    | Task                          |
| --------------------------------------------------------------------- | ----------------------------- |
| Vercel deployment                                                     | Task 1 `vercel.json` + Task 9 |
| Torznab caps / tvsearch                                               | Task 3 + Task 8               |
| API Key auth                                                          | Task 2 + Task 8               |
| Prowlarr search                                                       | Task 6–7                      |
| TVDB mapping + local aliases                                          | Task 4 YAML                   |
| Script supplement                                                     | Task 4 OpenCC                 |
| Max 3 title expansion + merge dedupe                                  | Task 5 + Task 7               |
| Torznab XML                                                           | Task 3 + Task 8               |
| Request logging + health                                              | Task 1 logger + Task 8 health |
| Supplementary Indexer integration docs                                | Task 8–9 README/DEPLOYMENT    |
| Explicitly excluded: Agent/admin/title rewrite/torrent proxy/Postgres | Global Constraints            |

**Not in this plan (MVP excluded):** `/api/debug/search`, admin UI, PostgreSQL, Upstash, release normalization, rate-limit middleware (phase 2).

**Placeholder scan:** no TBD; key algorithms and interfaces documented.

**Type consistency:** `TorznabRequest` / `SearchResult` / `MediaTitles` unified across Task 3–7; routes depend only on `handleTorznabRequest`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-09-aliasarr-mvp.md`.

Two execution modes:

1. **Subagent-Driven (recommended)** — new subagent per Task, review between tasks, fast iteration
2. **Inline Execution** — continuous execution in this session per executing-plans with checkpoints

Which one?
