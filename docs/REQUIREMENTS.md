# Aliasarr Requirements and Technical Specification

> Project codename: **Aliasarr** (also Sonarr Alias Indexer / Chinese Torznab Proxy)  
> Document type: Product / business requirements (formal source; root `TOOD.md` is historical draft)  
> Version: **0.2.0**  
> Status: Aligned with implementation  
> Technical details: [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`API.md`](./API.md), [`DEPLOYMENT.md`](./DEPLOYMENT.md)

### 0.2.0 increments over MVP

- Single Torznab service for **Sonarr (TV) + Radarr (movies)**
- Aliases: **Gist YAML first, TMDB/Bangumi on miss with automatic write-back** (no Vercel local data directory dependency)
- Edit Gist after login; Indexer/MCP use Torznab API Key configured in Admin
- URL, TOKEN, and API Key stored with AES-256-GCM encryption; environment variables keep only storage, master encryption key, and login bootstrap credentials

---

## 1. Background and Problem

When Sonarr / Radarr search, they usually rely on primary titles, English titles, or external media IDs from TVDB / TMDB metadata.

For Chinese series, domestic productions, Hong Kong/Taiwan dramas, Chinese documentaries, and some Japanese/Korean series released under Chinese translated names, indexer release titles often contain only:

- Chinese original / translated / traditional names
- Site-common abbreviations
- Chinese episode expressions
- Names that differ greatly from TVDB English primary titles

**Example**

| Sonarr search term   | Actual indexer release title             |
| -------------------- | ---------------------------------------- |
| `Joy of Life S02E12` | `Qing Yu Nian Season 2 Episode 12 2160P` |
|                      | `Qing Yu Nian 2.E12.WEB-DL`              |
|                      | `Qing Yu Nian (trad.) S02E12`            |

Resources may exist, but Sonarr may not find them due to search term mismatch.

---

## 2. Product Positioning

### 2.1 What It Is

A Torznab-compatible virtual Indexer: receives Sonarr search requests, expands English titles or media IDs into Chinese original, simplified/traditional, and other aliases, searches real Indexers via Prowlarr, and returns standard Torznab XML.

### 2.2 What It Is Not

| Not                              | Explanation                                    |
| -------------------------------- | ---------------------------------------------- |
| Torrent downloader               | Does not download or store                     |
| Standalone torrent search engine | Does not crawl sites / DHT directly            |
| Sonarr reverse proxy             | Supplementary Torznab Indexer only             |
| Prowlarr replacement             | Depends on Prowlarr to aggregate real Indexers |
| Private site scraper             | Does not handle login, CAPTCHA, anti-bot       |

Appears in Sonarr as an ordinary custom Torznab Indexer.

### 2.3 Initial Integration Shape

As a **supplementary Indexer**, not replacing Prowlarr-synced existing Indexers:

```text
Sonarr
├── Ordinary Indexers synced from Prowlarr
└── Aliasarr (this service)
        └── Prowlarr
                ├── Indexer A
                ├── Indexer B
                └── Indexer C
```

Benefits: preserve original capability, fault isolation, compare gains, lower one-shot refactor risk.

---

## 3. Goals and Non-Goals

### 3.1 Core Goals

Without modifying Sonarr / Prowlarr source code, improve search coverage for Chinese-related release titles.

The system must:

1. Receive standard Sonarr Torznab requests
2. Identify TVDB / TMDB and other media IDs
3. Obtain Chinese original, simplified/traditional, English, and alias titles
4. Generate multiple query strings per season/episode
5. Call Prowlarr search
6. Merge and deduplicate
7. Output Sonarr-recognizable Torznab XML
8. Keep original download chain unchanged where possible
9. When proxy is unavailable, not affect Sonarr's original Indexers

### 3.2 Non-Goals (first version)

1. Do not actively crawl torrent site pages
2. Do not implement standalone DHT search
3. Do not store or distribute torrent files
4. Do not replace Sonarr quality rules or series management
5. Do not use LLMs to decide all search results
6. Do not auto-modify series primary titles in Sonarr
7. Do not guarantee recognition of fully non-standard Chinese episode expressions
8. Do not directly manage Prowlarr Indexer accounts
9. Do not handle site login, CAPTCHA, or anti-bot

---

## 4. User Scenarios

### 4.1 Chinese Series Search

Sonarr primary title `Joy of Life`; user searches S02E12. Proxy resolves aliases via TVDB ID and generates multiple queries (Chinese/English + episode formats), merges results.

### 4.2 Chinese Original Overwritten by English Title

Domestic series use English translation in Sonarr but indexers use Chinese original only. **Prefer original-language titles by media ID**, not machine translation from English.

### 4.3 Simplified / Traditional Resources

Same series may appear as simplified or traditional Chinese titles. Script conversion supplements but **must not override manually verified official aliases**.

### 4.4 Chinese Episode Formats

| Priority      | Format examples                             |
| ------------- | ------------------------------------------- |
| First release | `S02E12`, `EP12`, `E12`, `Episode 12`, `12` |
| Later         | Chinese numerals (e.g. "Episode Twelve")    |

---

## 5. Overall Architecture

```text
┌─────────────┐
│   Sonarr    │
└──────┬──────┘
       │ Torznab (caps / tvsearch / search)
       ▼
┌─────────────────────────┐
│ Aliasarr (Vercel)       │
│ 1. Parameter parse      │
│ 2. Title / identity     │
│ 3. Alias lookup         │
│ 4. Query expansion      │
│ 5. Prowlarr search      │
│ 6. Merge dedupe         │
│ 7. Torznab XML output   │
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

**Search vs download separation**

| Chain    | Path                                      |
| -------- | ----------------------------------------- |
| Search   | Sonarr → Aliasarr → Prowlarr              |
| Download | Sonarr → Prowlarr Grab URL → real Indexer |

First release does not proxy torrent files through Vercel.

---

## 6. Sonarr / Radarr Integration

Path: `Settings → Indexers → Add → Torznab → Custom` (same **URL / API Key**, different categories)

| Setting    | Sonarr                                          | Radarr                   |
| ---------- | ----------------------------------------------- | ------------------------ |
| Name       | Aliasarr TV                                     | Aliasarr Movies          |
| URL        | `https://alias-indexer.example.com/api/torznab` | Same                     |
| API Path   | `/api`                                          | `/api`                   |
| API Key    | Torznab API Key configured in Admin             | Same                     |
| Categories | `5000, 5030, 5040, 5045`                        | `2000, 2030, 2040, 2045` |

Typical requests:

```http
GET /api/torznab/api?t=caps&apikey=xxx

GET /api/torznab/api?t=tvsearch&q=Joy%20of%20Life&season=2&ep=12&tvdbid=366625&cat=5000&apikey=xxx

GET /api/torznab/api?t=movie&q=Ne%20Zha&tmdbid=123&year=2025&cat=2000&apikey=xxx
```

---

## 7. Functional Requirements

### 7.1 Torznab Caps

`GET /api/torznab/api?t=caps` returns standard Caps XML declaring at least:

- General search, TV search
- Query, season, episode
- TVDB ID, TMDB ID
- TV categories, max results

First release parameters: `q`, `season`, `ep`, `tvdbid`, `tmdb`, `cat`, `limit`, `offset`.

### 7.2 Search Request Parsing

Parse: `t`, `q`, `season`, `ep`, `tvdbid`, `tmdbid`, `imdbid`, `cat`, `limit`, `offset`, `apikey`.

Support at least: `t=tvsearch`, `t=search`. Unsupported types return explicit Torznab errors (no HTML).

### 7.3 Series Identity Resolution

Priority:

```text
TVDB ID → TMDB ID → IMDb ID → title from Sonarr
```

When media IDs exist, do not guess series from title alone.

```typescript
interface MediaIdentity {
  tvdbId?: number
  tmdbId?: number
  imdbId?: string
  primaryTitle?: string
  year?: number
  mediaType: 'series'
}
```

### 7.4 Title Alias Resolution

Runtime resolution order (skip on failure, may merge):

1. **TMDB** (series: TVDB→find; movies: tmdb/imdb)
2. **Bangumi** (title enrichment, ignore on failure)
3. **GitHub Gist YAML** (manual override / fallback when no Chinese; prefer `verified`)
4. `q` from Sonarr/Radarr
5. OpenCC simplified/traditional supplement

No full anime lexicon; Gist stores exceptions and corrections only. Agent auto-confirmation is not core.

```typescript
interface TitleAlias {
  title: string
  language?: string
  region?: string
  script?: 'simplified' | 'traditional' | 'latin' | 'other'
  type: 'original' | 'official' | 'translation' | 'romanized' | 'site-alias' | 'manual' | 'generated'
  priority: number
  verified: boolean
}

interface MediaTitles {
  mediaId: string
  primaryTitle: string
  originalTitle?: string
  aliases: TitleAlias[]
  updatedAt: string
}
```

### 7.5 Title Priority

**Original language Chinese**

```text
Verified manual Chinese → Chinese original → simplified official → traditional official
→ site-common aliases → English official → Sonarr current title → auto-generated
```

**Japanese/Korean series**

```text
Verified Chinese translation → official Chinese translation → original JA/KO → romanization → English
```

**Western series**

```text
English primary → official Chinese translation → HK/TW translation → other aliases
```

First release optimizes series whose original language is Chinese.

### 7.6 Query Generation

Example (title `Qing Yu Nian`, S02E12) candidates:

```text
Qing Yu Nian S02E12
Qing Yu Nian S2E12
Qing Yu Nian EP12
Qing Yu Nian E12
Qing Yu Nian Episode 12
Qing Yu Nian Season 2 12
Qing Yu Nian 2 12
```

Default limits (control query amplification):

| Limit                            | Default |
| -------------------------------- | ------- |
| Max titles                       | 3       |
| Query formats per title          | 2       |
| Max Prowlarr queries per request | 6       |

Preferred templates: `Chinese + SxxExx`, `English + SxxExx`, `Chinese + Episode x`.

### 7.7 Prowlarr Search

Connection URL, API Key, provider enablement, and Indexer selection managed in Admin: production encrypted to Vercel Marketplace Upstash Redis; local encrypted to `.aliasarr/config.json`. Environment variables keep only storage credentials, master encryption key, login bootstrap, and runtime tuning:

```env
CONFIG_ENCRYPTION_KEY=***
PROWLARR_TIMEOUT_MS=8000
PROWLARR_MAX_CONCURRENCY=3
UPSTASH_REDIS_REST_URL=***
UPSTASH_REDIS_REST_TOKEN=***
ACCESS_USERNAME=***
ACCESS_PASSWORD=***
```

Requirements:

1. Multiple queries may run concurrently with a max concurrency cap
2. Timeout per upstream request
3. Single Indexer / query failure must not fail entire search
4. Log result count per query
5. Do not return Prowlarr API Key to Sonarr
6. Logs must not output full sensitive URLs
7. One Prowlarr aggregate search per expanded term; Prowlarr fans out to applicable Indexers—Aliasarr must not loop per site
8. Admin may select all or specific Prowlarr / Jackett Indexers separately

Admin may configure Prowlarr API URL and download URL returned to Sonarr/Radarr:

```text
Prowlarr URL: https://public-prowlarr-api.example.com
Prowlarr download URL: http://prowlarr:9696
```

If rewrite is not safe, first release may keep Prowlarr original Grab URL.

### 7.8 Result Merge and Deduplication

Dedup priority:

```text
InfoHash → GUID → Magnet URI → Download URL → normalized title + file size
```

```typescript
interface SearchResult {
  guid: string
  title: string
  originalTitle: string
  indexerId?: number
  indexerName?: string
  downloadUrl: string
  infoHash?: string
  size?: number
  seeders?: number
  peers?: number
  publishDate?: string
  categories: number[]
  protocol?: 'torrent' | 'usenet'
}
```

Merge must preserve: original title, source Indexer, size, publish time, seeders, download URL, categories, GUID, InfoHash.

### 7.9 Release Title Normalization (optional, MVP may disable)

Pure Chinese titles may break Sonarr parsing. May generate normalized titles for judgment but must:

1. Convert only confirmed series names
2. Normalize season/episode only
3. Do not fabricate resolution, source, codec, or release group
4. Always keep `originalTitle`

```typescript
{
  originalTitle: "Qing Yu Nian Season 2 Episode 12 4K Mandarin Subs",
  normalizedTitle: "Joy.of.Life.S02E12.2160p.WEB-DL" // only when fields confirmed
}
```

MVP default: do not rewrite release titles; observe Sonarr recognition first.

### 7.10 Torznab XML Output

Each item at minimum: `title`, `guid`, `link`, `pubDate`, `size`, `category`, `seeders`, `peers`.

```http
Content-Type: application/rss+xml; charset=utf-8
```

Must not return `application/json`, `text/html`, or Vercel default error pages. Errors should use Torznab-compatible format where possible.

---

## 8. Alias Library

### 8.1 Storage

Recommended: PostgreSQL for authoritative data, Redis for cache. Optional: Vercel Postgres / Supabase / Neon / Upstash Redis / repo YAML/JSON (early).

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

Suggested unique index: `media_id + normalized_title`.

### 8.2 Manual YAML Import (early maintenance)

```yaml
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
    - title: Qing Yu Nian 2
      type: site-alias
      script: simplified
      priority: 80
      verified: true
```

---

## 9. Caching

| Type           | Key example                           | TTL suggestion |
| -------------- | ------------------------------------- | -------------- |
| Media metadata | `media:tvdb:{id}` / `media:tmdb:{id}` | 7–30 days      |
| Search results | `search:tvdb:{id}:s02:e12`            | 5–30 minutes   |
| Empty results  | Same                                  | 1–3 minutes    |

Note: interactive search may use short cache; RSS avoid long cache; new episodes should not cache for hours.

---

## 10. Agent (not MVP core)

Role: **alias completion assistant**, not real-time search executor.

Triggers: no Chinese name, title conflict, suspected machine translation error, site abbreviation, manual backfill, extract from historical releases.

Output is candidate only—must not write directly to verified aliases; flow: candidate → manual confirm → alias library → reuse.

---

## 11. Admin (MVP may be minimal)

Full admin not required initially; direction:

1. Look up media and aliases by TVDB ID
2. Add/edit/delete aliases, priority, verified flag, disable
3. Recent searches, query expansion, Prowlarr return counts
4. Manual test for specific series

Later: Agent review, Search Replay, hit rate and Indexer title habit analysis, etc.

---

## 12. API

### 12.1 Torznab

```text
GET /api/torznab
```

Supports: `t=caps` | `t=search` | `t=tvsearch`

### 12.2 Health

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

Must not expose Prowlarr URL, API Key, database address, or Indexer credentials.

### 12.3 Debug Search (authenticated)

```text
POST /api/debug/search
```

Returns media aliases, generated queries, raw and deduplicated result counts. Admin page uses logged-in Cookie without re-requiring API Key; external callers must supply Torznab API Key configured in Admin.

---

## 13. Authentication and Security

| Boundary            | Mechanism                                                          |
| ------------------- | ------------------------------------------------------------------ |
| Sonarr → Aliasarr   | `apikey` vs encrypted Torznab Key in config, constant-time compare |
| Aliasarr → Prowlarr | Server decrypts Prowlarr Key; never frontend, Sonarr, or full logs |

If Prowlarr is on LAN: expose **API path only** via Tunnel / Access Token / gateway / Tailscale—do not expose full management UI publicly.

---

## 14. Deployment (Vercel)

### 14.1 Suitable For

Torznab HTTP, title mapping, query expansion, Prowlarr calls, XML, cache, lightweight admin.

### 14.2 Risks

Serverless time limits, multi-query timeout, cold start, slow upstream, XML format, rate limits, no direct LAN access, unsuitable for large file proxy.

### 14.3 Timeout Suggestions

| Item                  | Suggestion |
| --------------------- | ---------- |
| Single Prowlarr query | 5–8s       |
| Overall search        | 15–25s     |
| Max concurrency       | 3          |
| Max expanded queries  | 6          |

On timeout return partial completed results, not total failure.

---

## 15. Recommended Stack

| Layer      | Choice                                       |
| ---------- | -------------------------------------------- |
| Platform   | Vercel                                       |
| Language   | TypeScript                                   |
| Framework  | Next.js (recommended) or Hono                |
| Protocol   | Torznab + Prowlarr REST                      |
| DB         | PostgreSQL                                   |
| Config     | Vercel Marketplace Upstash Redis; local JSON |
| Cache      | In-process TTL cache                         |
| Script     | opencc-js (candidate supplement only)        |
| XML        | xmlbuilder2                                  |
| Validation | Zod                                          |
| Logging    | Pino + Vercel Logs                           |
| Monitoring | Sentry (optional)                            |

XML must escape `& < > " '` correctly.

---

## 16. Recommended Directory Layout

```text
src/
├── app/api/{torznab,health,debug/search}/route.ts
├── app/admin/
├── modules/
│   ├── torznab/     # parser, caps, xml-builder, errors
│   ├── media/       # identity, title-resolver, metadata-provider
│   ├── search/      # query-generator, search-service, merger, deduplicator, title-normalizer
│   ├── prowlarr/    # client, mapper, types
│   ├── cache/
│   └── security/    # api-key, rate-limit
├── db/              # schema, migrations
└── shared/          # env, logger, types
```

---

## 17. Observability

Metrics: total searches / success rate / avg and P95 latency, Prowlarr timeouts, alias expansion count, Chinese alias hit rate, new result count, dedup ratio, empty ratio, Torznab error count.

Key metrics:

| Metric                        | Definition                                                   |
| ----------------------------- | ------------------------------------------------------------ |
| Chinese proxy new result rate | Results found via Chinese aliases not found by English alone |
| Alias effectiveness           | Aliases producing results / aliases used in search           |
| Query amplification factor    | Actual Prowlarr calls / Sonarr request count                 |

Control amplification to avoid overloading Prowlarr and trackers.

Suggested log fields: `requestId`, search type, media ID, season/episode, generated query count, upstream request count, raw/dedup result count, total duration, error type.

---

## 18. Error Handling

| Situation             | Behavior                                            |
| --------------------- | --------------------------------------------------- |
| Prowlarr unavailable  | Empty valid Torznab RSS or standard error; no HTML  |
| Partial query timeout | Return completed results                            |
| No title mapping      | Continue with Sonarr original query                 |
| Metadata source down  | Use cache; fallback to original title without cache |
| XML failure           | Log requestId, return Torznab error                 |
| API Key wrong         | Unauthorized; do not leak config                    |

---

## 19. Performance Targets (first release)

| Scenario             | Target  |
| -------------------- | ------- |
| caps                 | ≤ 500ms |
| Cache-hit search     | ≤ 2s    |
| Normal search        | ≤ 15s   |
| P95 search           | ≤ 25s   |
| Max results          | 100     |
| Max expanded queries | 6       |

Avoid: dozens of queries per alias, duplicate same request to all Indexers, full metadata fetch every time, LLM every request, uncached repeat lookup for same series in short window.

---

## 20. Current Scope (0.2.0)

### 20.1 Must Implement

1. Vercel deploy; secrets in environment only
2. Torznab `caps` / `tvsearch` / `movie`
3. Sonarr + Radarr same Indexer URL
4. Prowlarr search; script conversion; dedupe; Torznab XML
5. Multi-source aliases: TMDB / Bangumi / Gist
6. Edit Gist YAML after login; API Key for Torznab/MCP; debug supports Admin Cookie or API Key
7. Health, debug search, MCP + SKILL
8. README and requirements/architecture/deployment docs

### 20.2 Out of Scope This Release

Agent auto-confirm aliases, release rewrite, torrent proxy, multi-user RBAC, full MCP install page UI.

---

## 21. Later Phases

| Phase               | Direction                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| II: Maintainability | Hit stats, Replay, disable bad aliases, normalization toggle, MCP install UI                                        |
| III: Smart aliases  | Agent suggestions, learn from releases, abbreviation discovery, review workflow, per-Indexer strategy               |
| IV: Adaptive search | Best query format, script strategy, dynamic deprioritization and query count, quality rerank, release group scoring |

---

## 22. Acceptance Criteria

### 22.1 Basic Integration

- Sonarr can test and save this Torznab Indexer
- `caps` format correct; can initiate series search
- Can call Prowlarr and show results in Sonarr

### 22.2 Chinese Expansion (with alias config)

- Find Chinese original via TVDB ID; generate at least one Chinese search term
- Keep English search; merge simplified/traditional correctly; dedupe works

### 22.3 Stability

- Single query failure not global failure; Prowlarr down returns no HTML
- Logs without full API Key; no large torrent proxy; original Indexers unaffected by this service failure

### 22.4 Effect Validation

At least 10 Chinese series: compare normal vs proxy result counts for effective additions, wrong matches, latency, query amplification, Sonarr release recognition rate.

---

## 23. Design Principles

1. **Transparent Sonarr integration** — standard Torznab Indexer
2. **Media ID first** — do not translate English title directly
3. **Rules first, Agent supplements** — deterministic rules on stable path
4. **Do not break existing chain** — supplementary Indexer only in first release
5. **Search/download separation** — Vercel does not proxy torrents
6. **Control query amplification** — limit aliases, templates, concurrency
7. **Preserve raw data** — any normalization keeps original release title
8. **Incremental build** — validate gains before admin / Agent / adaptive features

---

## 24. First-Release Closed Loop

```text
Sonarr search
→ Aliasarr receives Torznab
→ TVDB ID matches titles
→ Expand Chinese aliases
→ Call Prowlarr
→ Merge dedupe
→ Return Torznab XML
→ Sonarr display and grab
```

After confirming Chinese search adds effective results, gradually add alias management, Agent suggestions, release normalization, and adaptive query strategy.

---

## Appendix A. Relationship to `TOOD.md`

This document was organized from root `TOOD.md` as the formal requirements and technical specification entry. Use this document for implementation and review; `TOOD.md` is the original draft and may be archived or removed later.
