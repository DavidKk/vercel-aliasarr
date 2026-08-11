# Aliasarr

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Virtual **Torznab** indexer on Vercel that expands Chinese title aliases for **Sonarr** (TV) and **Radarr** (movies), searches via **Prowlarr and/or Jackett**, and returns standard Torznab XML.

## Features

- Sonarr/Radarr URL `/api/torznab` with API Path `/api` (`/api` and `/api/torznab` also remain available)
- Alias chain: **Gist YAML first → TMDB/Bangumi on miss → automatic Gist write-back** + OpenCC
- Admin-managed Prowlarr/Jackett upstreams and indexer selection
- One-click install, update, and removal of Aliasarr in Sonarr/Radarr
- Debug search UI and **login-gated Gist YAML editor**
- HTTP **MCP** (`/api/mcp`) with SKILL resource
- Service URLs and credentials encrypted with **AES-256-GCM** in Upstash Redis

## Quick start

```bash
pnpm i
cp .env.example .env
# configure Upstash, CONFIG_ENCRYPTION_KEY, and login secrets; enter integrations in /admin/services
pnpm dev
```

- Home: `http://localhost:3000`
- Login / admin: `/login`, `/admin`, `/admin/services`, `/admin/indexers`, `/admin/applications`, `/admin/probe`, `/admin/aliases`
- Health: `/api/health`

## Environment

See [`.env.example`](./.env.example). Never commit real keys. Upstash credentials, `CONFIG_ENCRYPTION_KEY`, and Admin bootstrap credentials remain environment variables. Service URLs, API keys, provider state, and selected indexers are managed under `/admin/services`, `/admin/indexers`, and `/admin/applications`; stored credentials are never returned to the browser.

Production configuration is stored under `aliasarr:config:v1` in Vercel Marketplace Upstash Redis. Its connection bundle is sealed with AES-256-GCM. Local development uses the ignored, encrypted `.aliasarr/config.json`, so configuration survives dev-server restarts without writing to the remote KV. Gist is reserved for alias YAML and automatic alias write-back.

## Sonarr / Radarr

| Item                | Value                                       |
| ------------------- | ------------------------------------------- |
| URL                 | `https://<your-app>.vercel.app/api/torznab` |
| API Path            | `/api`                                      |
| API Key             | Value configured in Admin                   |
| Categories (Sonarr) | `5000, 5030, 5040, 5045`                    |
| Categories (Radarr) | `2000, 2030, 2040, 2045`                    |

## HTTP API (summary)

| Path                   | Auth                    | Purpose                        |
| ---------------------- | ----------------------- | ------------------------------ |
| `/api/torznab/api`     | API key                 | Sonarr/Radarr Torznab endpoint |
| `/api`, `/api/torznab` | API key                 | Compatible direct endpoints    |
| `/api/health`          | public                  | Liveness                       |
| `/api/debug/search`    | Admin cookie or API key | Debug JSON search              |
| `/api/aliases`         | login cookie            | List/edit Gist YAML            |
| `/api/mcp`             | API key                 | MCP JSON-RPC + SKILL           |
| `/api/auth`            | public                  | Login / logout                 |

## MCP

See [`skills/aliasarr-mcp/SKILL.md`](./skills/aliasarr-mcp/SKILL.md) and [`docs/API.md`](./docs/API.md).

## Docs

| Doc                                              | Description                                                     |
| ------------------------------------------------ | --------------------------------------------------------------- |
| [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md) | Product requirements (source of truth; `TOOD.md` is historical) |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Technical design                                                |
| [`docs/UI-DESIGN.md`](./docs/UI-DESIGN.md)       | UI direction, design tokens, and public/Admin layout rules      |
| [`docs/API.md`](./docs/API.md)                   | HTTP / Torznab / MCP contracts                                  |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)     | Vercel + *arr setup                                             |

## License

MIT
