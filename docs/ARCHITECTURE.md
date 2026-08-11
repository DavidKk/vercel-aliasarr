# Aliasarr Technical Design

> Version: 0.2.0 · Companion to [`REQUIREMENTS.md`](./REQUIREMENTS.md)

## 1. Architecture Overview

```text
Sonarr / Radarr
      │  Torznab (API Key)
      ▼
 /api/torznab/api (Sonarr/Radarr) + direct compatible routes
      │
      ├─ identity (series | movie)
      ▼
 AliasProviderChain
   Gist YAML ── hit ──▶ return
       │ miss
       ▼
   TMDB → Bangumi → write back to Gist
      │
      ├─ OpenCC + title resolve
      ▼
 QueryGenerator → IndexerClient → Prowlarr and/or Jackett
                                     │
                                     ▼
                              dedupe → Torznab XML
```

Admin surface: `/login` (JWT Cookie) → `/admin` Dashboard. `/admin/config` lands directly on Services. Configuration is split by responsibility across `/admin/config/services`, `/admin/config/indexers`, and `/admin/config/applications`, with each page showing its own bottom save bar. Search diagnostics live at `/admin/probe`; alias management at `/admin/aliases` → GitHub Gist (read/write).

The UI uses the **Midnight Operations** design system: the public site handles brand expression; Admin uses a full-height sidebar, fixed top bar, and full-width high-density workspace. See [`UI-DESIGN.md`](./UI-DESIGN.md) for the full spec.

Public routes `/`, `/docs`, and `/login` belong to the `app/(site)` Route Group and reuse its Layout; `/admin/**` uses a separate authenticated Layout. Both share the Root Layout without duplicating header maintenance.

## 2. Module Responsibilities

| Path                                                         | Responsibility                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------- |
| `app/api/torznab/api`, `app/api/route.ts`, `app/api/torznab` | Torznab Sonarr/Radarr entry and direct compatible endpoints |
| `app/api/aliases`                                            | Gist YAML CRUD after login                                  |
| `app/api/config`                                             | KV / local config and upstream, Sonarr/Radarr orchestration |
| `app/api/mcp`                                                | MCP + SKILL resources                                       |
| `app/api/auth`                                               | Login / logout                                              |
| `app/admin`                                                  | Admin Dashboard, search diagnostics, alias editing          |
| `services/media/providers`                                   | Multi-source aliases                                        |
| `services/gist`                                              | GitHub Gist client                                          |
| `services/config`                                            | Production Upstash Redis, local JSON config storage         |
| `services/indexers`                                          | Unified search entry for Prowlarr / Jackett                 |
| `services/arr`                                               | Sonarr / Radarr Indexer sync client                         |
| `services/auth`                                              | Cookie sessions                                             |
| `services/search`                                            | Query generation, deduplication, probe search               |
| `services/prowlarr`                                          | Upstream search                                             |
| `initializer`                                                | `api()` / MCP / auth wrappers                               |
| `utils/env.ts`                                               | **Single** environment variable entry point                 |

## 3. Alias Providers

Interface: `lookup(identity) → { media, source }`.

Lookup uses cache-aside: check Gist first; on hit return immediately without calling TMDB/Bangumi. On miss, merge remote metadata and write unverified candidate aliases back to Gist. Automatic write-back only creates files that do not exist; it does not overwrite Admin-maintained data. Cache key: `alias:{series|movie}:{tvdb|tmdb|imdb}:{id}`, TTL=`ALIAS_CACHE_TTL_MS`; Admin writes call `cache.delete`.

The Gist client also keeps a 30-second in-process read cache to avoid hitting GitHub on every query. Admin reads bypass the cache for the latest revision; writes serialize per Gist within a single instance and check revision before PATCH. Stale writes return `409` and never silently overwrite. GitHub Gist PATCH does not offer atomic conditional updates, so multi-instance Vercel deployments get best-effort optimistic concurrency protection; acceptable for low-frequency personal writes.

## 4. Torznab

- `t=caps|search|tvsearch|movie`
- Caps: TV `5000*` + Movies `2000*`
- Series queries: `Chinese SxxExx` / `Episode x`
- Movie queries: `title` / `title YYYY`

### Indexer Aggregation Boundaries

In Prowlarr mode, each expanded query calls `/api/v1/search` once; Prowlarr fans out to enabled indexers within the selection scope. In Jackett mode, "all" uses the `all` aggregate endpoint; "selected" calls each chosen Indexer Torznab endpoint. Both providers may be enabled simultaneously; results are deduplicated before return.

Provider URL, API Key, and Indexer selection are saved via Admin; URL plus complete API Key counts as enabled—no separate toggle. Connection URL and credentials form one AES-256-GCM ciphertext bundle; API Key is never returned to the browser. Sonarr/Radarr sync reads credentials only from server-side decrypted config.

## 5. Configuration Storage

- Production: Vercel Marketplace Upstash Redis, key `aliasarr:config:v1`
- Local: `.aliasarr/config.json`, mode 0600, atomic replace writes, Git-ignored
- URL, Torznab/Provider/API Token, and Gist credentials are encrypted as a whole with AES-256-GCM; KV/local files never store connection plaintext
- `CONFIG_ENCRYPTION_KEY` exists only in environment variables; the master key is not stored in the database
- Saves carry revision; Redis uses Lua compare-and-set to avoid silent concurrent overwrites
- Services, Indexers, and Applications merge by field ownership; no sub-page may overwrite another module's connections or credentials
- Successful save produces a new revision; the frontend refreshes external service connection status and Indexer install status automatically
- Gist stores alias YAML only; runtime config no longer lives in Gist

## 6. Authentication Boundaries

| Capability                | Mechanism                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Torznab / MCP / debug     | Torznab API Key configured in Admin, encrypted at rest                                                                                                    |
| Admin UI / `/api/aliases` | JWT Cookie (`ACCESS_*`; `JWT_SECRET` optional, falls back to `ACCESS_PASSWORD`; production forbids no secret)                                             |
| Signet                    | Optional `SIGNET_SDK_URL`; allowlist `SIGNET_ALLOWED_USERS` or default bind to `ACCESS_USERNAME`; when local 2FA is enabled, Signet requires TOTP step-up |

Upstash credentials, `CONFIG_ENCRYPTION_KEY`, and Admin login bootstrap credentials come from environment variables; integration credentials from decrypted config. No hard-coded keys or log echo of secrets.

## 7. Gist Layout

```text
series-tvdb-{id}.yaml
series-tmdb-{id}.yaml
movies-tmdb-{id}.yaml
movies-imdb-{id}.yaml
```

Gist has no directories; filenames must be flat. Reads still accept legacy `series/tvdb-*.yaml` form, but all new write-backs use hyphenated names.

## 8. Runtime

- Vercel Node.js / Fluid; `maxDuration` ≥ 30 (search)
- No long-lived process; alias and Gist read caches are in-process memory—do not assume cross-instance sharing
- External call timeouts degrade gracefully: single-source failure does not take down the whole chain
- Local dev outputs to `.next-dev`, production build to `.next`; `pnpm build` is safe during `pnpm dev` without overwriting HMR chunks

## 9. Testing Strategy

- Mock `fetch`: TMDB / Bangumi / Gist
- Gist: read cache, remote result write-back, no overwrite of existing files, write serialization, stale revision conflicts
- Parser / caps / identity unit tests
- Auth: unauthenticated PUT aliases → 401
- Torznab regression (Sonarr path)

See also [`API.md`](./API.md), [`DEPLOYMENT.md`](./DEPLOYMENT.md), [`UI-DESIGN.md`](./UI-DESIGN.md).
