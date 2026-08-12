# Sonarr Chinese Alias Search Proxy Requirements (Historical Draft)

> **Historical note:** This is the original requirements draft for Aliasarr. The formal, implementation-aligned specification is [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md). Content below is the full English translation of this draft.

## 1. Project Background

When Sonarr searches for series resources, it usually relies on primary titles, English titles, or external media IDs from TVDB and other metadata.

For Chinese series, domestic productions, Hong Kong/Taiwan dramas, Chinese documentaries, and some Japanese/Korean series released under Chinese translated names, indexer release titles may contain only:

- Chinese original names
- Chinese translated names
- Traditional Chinese names
- Site-common abbreviations
- Chinese season and episode expressions
- Names that differ greatly from TVDB English primary titles

Example Sonarr search:

```text
Joy of Life S02E12
```

Actual indexer releases:

```text
Qing Yu Nian Season 2 Episode 12 2160P
Qing Yu Nian 2.E12.WEB-DL
Qing Yu Nian (traditional) S02E12
```

Even when the resource exists on indexers, Sonarr may fail to find it due to search term mismatch.

This project implements a Torznab-compatible virtual Indexer on Vercel or similar serverless platforms as a supplementary Sonarr search entry.

The service receives Sonarr search requests, converts and expands English titles or media IDs into Chinese original, simplified, traditional, and other aliases, searches real Indexers via Prowlarr, and returns standard Torznab XML to Sonarr.

---

## 2. Project Positioning

Working names:

```text
Sonarr Alias Indexer
Chinese Torznab Proxy
Aliasarr
TitleBridge
CN Indexer Proxy
```

Essentially:

> A Torznab-compatible virtual Indexer supporting multilingual title expansion and Prowlarr aggregate search.

It is **not**:

- A torrent downloader
- Torrent file storage service
- Standalone torrent search engine
- Sonarr reverse proxy
- Prowlarr replacement
- Automatic private site scraper

In Sonarr it appears as an ordinary custom Torznab Indexer.

---

## 3. Build Goals

### 3.1 Core Goals

Without modifying Sonarr or Prowlarr source code, improve Sonarr search coverage for Chinese release titles.

The system must:

1. Receive standard Sonarr Torznab search requests
2. Identify TVDB, TMDB, and other media IDs
3. Obtain Chinese original, simplified, traditional, English, and alias titles
4. Generate multiple query keywords from season/episode info
5. Search existing Indexers via Prowlarr
6. Merge and deduplicate search results
7. Convert results to Sonarr-recognizable Torznab XML
8. Keep original download chain unchanged where possible
9. When proxy is unavailable, not affect Sonarr's original Indexers

### 3.2 First-Phase Goals

Phase one deploys as supplementary Indexer, not replacing all Prowlarr Indexers:

```text
Sonarr
├── Ordinary Indexers synced from Prowlarr
└── Sonarr Alias Indexer
        └── Prowlarr
                ├── Indexer A
                ├── Indexer B
                └── Indexer C
```

Benefits:

- Preserve original search capability
- Reduce blast radius of failures
- Compare gains from Chinese proxy
- Avoid one-shot refactor of existing chain
- Gradually validate title conversion effectiveness

---

## 4. Non-Goals

First version explicitly excludes:

1. Active crawling of torrent site pages
2. Standalone DHT search
3. Storing or distributing torrent files
4. Replacing Sonarr quality rules
5. Replacing Sonarr series management
6. Using LLMs for all search results
7. Auto-modifying series primary titles in Sonarr
8. Guaranteeing non-standard Chinese episode expressions
9. Direct management of Prowlarr Indexer accounts
10. Site login, CAPTCHA, and anti-bot handling

---

## 5. User Scenarios

### 5.1 Chinese Series Search

Sonarr primary title:

```text
Joy of Life
```

User searches season 2 episode 12. Proxy resolves via TVDB ID:

```text
Joy of Life
Qing Yu Nian
Qing Yu Nian (traditional)
Qing Yu Nian Season 2
Qing Yu Nian 2
```

Generates queries:

```text
Joy of Life S02E12
Qing Yu Nian S02E12
Qing Yu Nian (traditional) S02E12
Qing Yu Nian Season 2 Episode 12
Qing Yu Nian 2 12
```

Returns merged results.

### 5.2 Chinese Original Overwritten by English

Some domestic series use English names in Sonarr but indexers use Chinese originals only. Prefer original-language titles by external media ID, not machine translation from English.

### 5.3 Simplified / Traditional Search

Same series may use simplified or traditional titles on different sites. Support both; script conversion supplements but must not override verified official aliases.

### 5.4 Chinese Episode Formats

Indexers may use:

```text
S02E12
EP12
E12
Episode 12
12 episodes
Season 2 Episode Twelve
```

First release prioritizes numeric episodes:

```text
S02E12
EP12
E12
Episode 12
12
```

Chinese numeral conversion can follow in later versions.

---

## 6. Overall Architecture

```text
┌─────────────┐
│   Sonarr    │
└──────┬──────┘
       │ Torznab
       │ caps / tvsearch / search
       ▼
┌─────────────────────────┐
│ Sonarr Alias Indexer    │
│ Deployed on Vercel      │
│                         │
│ 1. Parameter parse      │
│ 2. Title parse          │
│ 3. Alias lookup         │
│ 4. Query expansion      │
│ 5. Prowlarr search      │
│ 6. Result merge         │
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

---

## 7. Sonarr Integration

Add custom Torznab Indexer in Sonarr:

```text
Settings
→ Indexers
→ Add Indexer
→ Torznab
→ Custom
```

Reference config:

```text
Name:
Chinese Alias Indexer

URL:
https://alias-indexer.example.com

API Path:
/api/torznab

API Key:
Access key generated by proxy service

Categories:
5000, 5030, 5040, 5045
```

Caps request:

```text
GET /api/torznab?t=caps&apikey=xxx
```

Search request:

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

## 8. Core Functional Requirements

### 8.1 Torznab Capability Declaration

Implement:

```text
GET /api/torznab?t=caps
```

Return standard Torznab Caps XML declaring at least:

- General search
- TV search
- Query keywords
- Season
- Episode
- TVDB ID
- TMDB ID
- TV categories
- Max results

First release parameters:

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

### 8.2 Search Request Parsing

Parse:

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

At least support:

```text
t=tvsearch
t=search
```

Unsupported types return explicit Torznab errors, not HTML pages.

### 8.3 Series Identity Resolution

Priority:

```text
TVDB ID
→ TMDB ID
→ IMDb ID
→ title from Sonarr
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

### 8.4 Title Alias Resolution

Sources:

1. Local manual alias library
2. TVDB metadata
3. TMDB metadata
4. Title from Sonarr
5. Simplified/traditional conversion
6. Third-party Chinese media data (later)
7. Agent completion results

Alias structure:

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

### 8.5 Title Priority

Original language Chinese:

```text
Verified manual Chinese
→ Chinese original
→ Simplified official
→ Traditional official
→ Site-common aliases
→ English official
→ Sonarr current title
→ Auto-generated title
```

Japanese/Korean:

```text
Verified Chinese translation
→ Official Chinese translation
→ Original JA/KO
→ Romanization
→ English title
```

Western:

```text
English primary
→ Official Chinese translation
→ HK/TW translation
→ Other aliases
```

First release focuses on original-language Chinese series.

### 8.6 Query Generation

Example title `Qing Yu Nian`, season 2, episode 12:

```text
Qing Yu Nian S02E12
Qing Yu Nian S2E12
Qing Yu Nian EP12
Qing Yu Nian E12
Qing Yu Nian Episode 12
Qing Yu Nian Season 2 12
Qing Yu Nian 2 12
```

Default limits:

```text
Max 3 titles
Max 2 query formats per title
Max 6 Prowlarr queries per request
```

Priority queries:

```text
Chinese title + SxxExx
English title + SxxExx
Chinese title + Episode x
```

### 8.7 Prowlarr Search

Via Prowlarr API.

```env
PROWLARR_URL=https://prowlarr.example.com
PROWLARR_API_KEY=***
PROWLARR_TIMEOUT_MS=8000
PROWLARR_MAX_CONCURRENCY=3
```

Requirements:

1. Multiple queries may run concurrently
2. Cap max concurrency
3. Timeout every upstream request
4. Single Indexer failure must not fail all requests
5. Log result count per query
6. Do not return Prowlarr API Key to Sonarr
7. Do not log full sensitive URLs

### 8.8 Search Result Merge

Dedup priority:

```text
InfoHash
→ GUID
→ Magnet URI
→ Download URL
→ Normalized title + file size
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

Preserve: original release title, source Indexer, size, publish time, seeders, download URL, categories, GUID, InfoHash.

### 8.9 Release Title Normalization

Sonarr may fail to parse pure Chinese release titles.

Example:

```text
Qing Yu Nian Season 2 Episode 12 4K Mandarin Subs
```

May generate normalized title:

```text
Joy.of.Life.S02E12.2160p.WEB-DL
```

Rules:

1. Convert confirmed series names only
2. Normalize season/episode only
3. Do not fabricate resolution, source, codec, or release group
4. Keep original title for audit

```typescript
{
  originalTitle: "Qing Yu Nian Season 2 Episode 12 4K Mandarin Subs",
  normalizedTitle: "Joy.of.Life.S02E12.2160p.WEB-DL"
}
```

First release may skip title rewrite and observe Sonarr recognition first.

### 8.10 Torznab XML Output

Each result at minimum:

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

```http
Content-Type: application/rss+xml; charset=utf-8
```

Must not return `application/json`, `text/html`, or Vercel default error pages. Errors should use Torznab-compatible format where possible.

### 8.11 Download Chain

First release should not proxy torrent files through Vercel.

Search chain:

```text
Sonarr
→ Vercel Alias Indexer
→ Prowlarr
```

Download chain:

```text
Sonarr
→ Prowlarr Grab URL
→ Real Indexer
```

Ensure:

- Sonarr can reach Prowlarr download URLs
- Returned URLs do not expose unnecessary site credentials
- Prowlarr address is reachable from Sonarr
- Vercel does not carry torrent file traffic

Optional split config:

```env
PROWLARR_UPSTREAM_URL=https://public-prowlarr-api.example.com
PROWLARR_SONARR_URL=http://prowlarr:9696
```

- `PROWLARR_UPSTREAM_URL`: called by Vercel
- `PROWLARR_SONARR_URL`: written into links returned to Sonarr

If safe rewrite is not possible, keep Prowlarr original Grab URL in first release.

---

## 9. Title Alias Library

### 9.1 Storage Options

First release options:

- Vercel Postgres
- Supabase PostgreSQL
- Neon PostgreSQL
- Upstash Redis
- YAML or JSON in Git repo
- Vercel KV

Recommended: PostgreSQL for authoritative data, Redis for cache.

See [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) for schema examples.

### 9.2 Manual Configuration Format

YAML import example:

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

## 10. Cache Design

### 10.1 Media Metadata Cache

Keys:

```text
media:tvdb:{tvdbId}
media:tmdb:{tmdbId}
```

TTL: 7 to 30 days

### 10.2 Search Result Cache

Key includes media ID, season, episode, query title set, Indexer scope.

Example:

```text
search:tvdb:366625:s02:e12
```

TTL: 5 to 30 minutes

Notes:

- Interactive search: short cache OK
- RSS: avoid long cache
- New episodes: not hours-long cache
- Empty results: shorter cache, 1 to 3 minutes

---

## 11. Agent Capability Design

Agent is not first-release core.

Role: alias completion assistant, not real-time search executor.

Triggers:

- Media ID cannot match Chinese name
- Conflicting Chinese titles
- Suspected machine translation error
- Site abbreviation needed
- Manual backfill request
- Extract aliases from historical releases

Agent output is candidate only:

```json
{
  "mediaId": "tvdb:366625",
  "candidates": [
    {
      "title": "Qing Yu Nian",
      "type": "original",
      "confidence": 0.98,
      "reason": "Matches Chinese original series name"
    },
    {
      "title": "Qing Yu Nian 2",
      "type": "site-alias",
      "confidence": 0.72,
      "reason": "Common in season 2 release titles"
    }
  ]
}
```

Flow:

```text
Agent generates candidates
→ Manual confirmation
→ Write to alias library
→ Reuse in later searches
```

---

## 12. Admin Direction

Full admin not required initially. Basic capabilities:

1. Query media by TVDB ID
2. View current titles and aliases
3. Add manual aliases
4. Adjust alias priority
5. Mark verified flag
6. Disable bad aliases
7. View recent searches
8. View query expansion
9. View Prowlarr result counts
10. Manual test for specific series

Later: Agent review, Search Replay, error analysis, site alias stats, Indexer title habits, hit rate stats.

---

## 13. API Design

### 13.1 Torznab API

```text
GET /api/torznab
```

Supports: `t=caps`, `t=search`, `t=tvsearch`

### 13.2 Health Check

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

### 13.3 Debug Search

```text
POST /api/debug/search
```

Request:

```json
{
  "tvdbId": 366625,
  "season": 2,
  "episode": 12
}
```

Response:

```json
{
  "media": {
    "primaryTitle": "Joy of Life",
    "aliases": ["Qing Yu Nian", "Qing Yu Nian (traditional)"]
  },
  "queries": ["Qing Yu Nian S02E12", "Qing Yu Nian (traditional) S02E12", "Joy of Life S02E12"],
  "resultCount": 18,
  "deduplicatedCount": 9
}
```

Debug endpoint must be authenticated; not public.

---

## 14. Authentication and Security

### 14.1 Sonarr to Proxy

Sonarr requests must include `apikey`. Validate against:

```env
TORZNAB_API_KEY=***
```

Use constant-time comparison.

### 14.2 Proxy to Prowlarr

```env
PROWLARR_API_KEY=***
```

Never:

- Put API Key in frontend code
- Return API Key to Sonarr
- Log full API Key
- Log site cookies or passkeys

### 14.3 Prowlarr Public Access

If Prowlarr is on LAN and Vercel is public, secure access options:

- Cloudflare Tunnel
- Cloudflare Access Service Token
- Dedicated API Gateway
- Authenticated reverse proxy
- Tailscale Funnel
- Lightweight self-hosted gateway

Do not expose full Prowlarr management UI publicly. Expose only required API paths with extra auth if possible.

---

## 15. Vercel Deployment Design

Recommended stack:

```text
Next.js
TypeScript
Vercel Functions
PostgreSQL
Redis / KV
```

Or plain Node.js Serverless Function.

### 15.1 Vercel Suitable For

- Torznab HTTP interface
- Title mapping
- Query expansion
- Prowlarr API calls
- XML generation
- Cache
- Lightweight admin

### 15.2 Considerations

- Serverless execution time limits
- Multiple Prowlarr searches may timeout
- Cold start
- Slow upstream Indexers
- XML response format
- Concurrency and rate limits
- Vercel cannot reach pure LAN addresses
- Unsuitable for large torrent file proxy

### 15.3 Suggested Timeouts

```text
Single Prowlarr query: 5 to 8 seconds
Overall search: 15 to 25 seconds
Max concurrent queries: 3
Max expanded queries: 6
```

On timeout return partial completed results, not total failure.

---

## 16. Optional Technical Choices

### 16.1 Web Framework

Recommended: Next.js (Vercel-native, API + admin, TypeScript, simple env management).

Alternatives: Hono, Fastify, Express, NestJS, Go. For API-only, Hono or Fastify is lighter.

### 16.2 XML Generation

Options: `fast-xml-parser`, `xmlbuilder2`, custom templates. Prefer XML builder to avoid escaping issues. Escape `& < > " '`.

### 16.3 Script Conversion

OpenCC / opencc-js. Supplement candidates only; cannot replace authoritative title data.

### 16.4 Database

PostgreSQL recommended for media mapping, aliases, review state, search logs, hit stats.

### 16.5 Cache

Upstash Redis / Vercel KV for metadata cache, search cache, rate limiting, distributed locks, short empty-result cache.

### 16.6 Validation

Zod for env, Prowlarr responses, admin params, alias structures.

### 16.7 Logging

Pino, OpenTelemetry, Vercel Logs, Sentry. Include requestId, search type, media ID, season/episode, query counts, upstream request count, raw/dedup counts, duration, error type.

---

## 17. Observability

Track:

```text
Total search requests
Search success rate
Average search duration
P95 search duration
Prowlarr timeout count
Alias expansion count
Chinese alias hit rate
New result count
Dedup ratio
Empty result ratio
Torznab error count
```

Key metrics:

**Chinese proxy new result rate** — results found via Chinese aliases not found by English search alone

**Alias effectiveness** — aliases producing results / aliases used

**Query amplification** — Prowlarr searches / Sonarr requests

Control amplification to protect Prowlarr and trackers.

---

## 18. Error Handling

**Prowlarr unavailable:** empty valid Torznab RSS or standard error; no Vercel HTML error page.

**Partial query timeout:** return completed query results.

**No title mapping:** continue with Sonarr original query.

**Metadata source down:** use cache; fallback to original title without cache.

**XML generation failure:** log request ID, return Torznab error.

**API Key wrong:** unauthorized; do not leak config.

---

## 19. Performance Requirements

First-release targets:

```text
caps: within 500ms
Cache-hit search: within 2s
Normal search: within 15s
P95 search: within 25s
Max results per search: 100
Max expanded queries: 6
```

Avoid: dozens of queries per alias, duplicate requests to all Indexers, full metadata fetch every request, LLM every request, uncached repeat lookups.

---

## 20. MVP Scope

Phase one implements:

1. Vercel deployment
2. Torznab caps
3. Torznab tvsearch
4. Sonarr API Key auth
5. Prowlarr API search
6. TVDB ID title mapping
7. Local or database alias table
8. Script supplement
9. Max 3 title expansion
10. Merge and dedupe
11. Standard Torznab XML
12. Basic request logging
13. Health check
14. Supplementary Sonarr Indexer integration

MVP excludes:

- Agent auto-confirm aliases
- Full admin UI
- Release title rewrite
- Torrent file proxy
- Auto-sync Prowlarr Indexers
- DHT scraping
- Web crawling
- Multi-user system
- Complex RBAC

---

## 21. Later Phases

**Phase 2: Maintainability** — alias admin, search debug UI, TVDB/TMDB auto-fill, hit stats, Search Replay, disable bad aliases, normalization toggle

**Phase 3: Smart aliases** — Agent suggestions, learn from releases, discover abbreviations, review workflow, per-Indexer title strategy

**Phase 4: Adaptive search** — best query format from history, script strategy per Indexer, deprioritize ineffective aliases, dynamic query count, quality rerank, release group scoring

---

## 22. Acceptance Criteria

**Basic integration:** Sonarr tests and saves Indexer; caps correct; search works; Prowlarr results display in Sonarr.

**Chinese expansion:** find Chinese original via TVDB ID; at least one Chinese query; English preserved; script merge correct; dedupe effective.

**Stability:** single query failure not global; Prowlarr down returns no HTML; no full API Key in logs; no large torrent proxy; original Indexers unaffected.

**Effect validation:** at least 10 Chinese series; compare normal vs proxy result counts for effective additions, wrong matches, latency, amplification, Sonarr release recognition.

---

## 23. Recommended First-Release Stack

```text
Platform: Vercel
Language: TypeScript
Framework: Next.js or Hono
Protocol: Torznab, Prowlarr REST API
Database: PostgreSQL
Cache: Upstash Redis
Script: opencc-js
XML: xmlbuilder2
Validation: Zod
Logging: Pino + Vercel Logs
Monitoring: Sentry (optional)
```

---

## 24. Recommended Directory Layout

```text
src/
├── app/
│   ├── api/
│   │   ├── torznab/route.ts
│   │   ├── health/route.ts
│   │   └── debug/search/route.ts
│   └── admin/
├── modules/
│   ├── torznab/
│   ├── media/
│   ├── search/
│   ├── prowlarr/
│   ├── cache/
│   └── security/
├── db/
└── shared/
```

See [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) for the current implementation layout.

---

## 25. Key Design Principles

1. **Transparent Sonarr integration** — standard Torznab Indexer
2. **Media ID first** — do not translate English title directly
3. **Rules first, Agent supplements** — deterministic rules on stable path
4. **Do not break existing chain** — supplementary Indexer in first release
5. **Search/download separation** — Vercel does not proxy torrents
6. **Control query amplification**
7. **Preserve raw data**
8. **Incremental build**

---

## 26. Final Direction

First-release product shape:

```text
A virtual Torznab Indexer deployed on Vercel
```

Connect as extra Sonarr Indexer; expand Chinese original, simplified, traditional, and manual aliases by media ID; search real sites via Prowlarr.

MVP needs no full Agent or site crawling.

Core closed loop:

```text
Sonarr search
→ Vercel receives Torznab request
→ TVDB ID matches titles
→ Expand Chinese aliases
→ Call Prowlarr
→ Merge dedupe
→ Return Torznab XML
→ Sonarr display and grab
```

After confirming Chinese search adds effective results, add alias management, Agent suggestions, release normalization, and adaptive query strategy incrementally.
