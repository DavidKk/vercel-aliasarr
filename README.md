[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# Aliasarr

Aliasarr is a virtual **Torznab** indexer on Vercel that expands Chinese title aliases for **Sonarr** and **Radarr**, searches via **Prowlarr and/or Jackett**, and returns standard Torznab XML.

## Features

- **Torznab for *arr**: Sonarr/Radarr URL `/api/torznab` with API Path `/api` (`/api` and `/api/torznab` also remain available).
- **Alias chain**: Gist YAML first → TMDB/Bangumi on miss → automatic Gist write-back, plus OpenCC.
- **Admin console**: Prowlarr/Jackett upstreams, indexer selection, Gist YAML editor, and one-click install/update/remove in Sonarr/Radarr.
- **HTTP MCP**: `/api/mcp` with a SKILL resource for agents.
- **Encrypted config**: service URLs and credentials sealed with AES-256-GCM in Upstash Redis.

## Deploy to Vercel

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDavidKk%2Fvercel-aliasarr)

### Environment Variable Configuration

Refer to the [`.env.example`](./.env.example) file to set the required environment variables.

- `CONFIG_ENCRYPTION_KEY`: AES-256-GCM master key (`openssl rand -base64 32`). If this value is lost, stored connection config cannot be recovered.
- `ACCESS_USERNAME`: Admin username
- `ACCESS_PASSWORD`: Admin password
- `JWT_SECRET`: JWT signing secret (recommended; falls back to `ACCESS_PASSWORD` when unset)
- `JWT_EXPIRES_IN`: JWT token expiration time
- `ACCESS_2FA_SECRET`: optional TOTP secret; generate one at [vercel-2fa](https://vercel-2fa.vercel.app)
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`: injected by Vercel Marketplace → Upstash Redis

Service URLs, API keys, Gist/TMDB/Bangumi credentials, custom headers, and selected indexers are entered in Admin after deploy — not as environment variables.

## Quick Start

1. Click **Deploy to Vercel**, then connect **Upstash Redis** from the Vercel Marketplace.
2. Set `CONFIG_ENCRYPTION_KEY`, Admin login variables, and (recommended) `JWT_SECRET`.
3. After deploy, sign in at `/login` and configure Gist, Prowlarr/Jackett, and Sonarr/Radarr under `/admin/services`, `/admin/indexers`, and `/admin/applications`.
4. Point Sonarr and Radarr at the Torznab URL below. Vercel egress must reach Prowlarr/Jackett (LAN-only hosts need a public reverse proxy or tunnel).

## Sonarr / Radarr

| Item                | Value                                       |
| ------------------- | ------------------------------------------- |
| URL                 | `https://<your-app>.vercel.app/api/torznab` |
| API Path            | `/api`                                      |
| API Key             | Value configured in Admin                   |
| Categories (Sonarr) | `5000, 5030, 5040, 5045`                    |
| Categories (Radarr) | `2000, 2030, 2040, 2045`                    |

## Docs

| Doc                                              | Description                                |
| ------------------------------------------------ | ------------------------------------------ |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)     | Vercel + *arr setup                        |
| [`docs/API.md`](./docs/API.md)                   | HTTP / Torznab / MCP contracts             |
| [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md) | Product requirements                       |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Technical design                           |
| [`docs/UI-DESIGN.md`](./docs/UI-DESIGN.md)       | UI direction and layout rules              |
| [`skills/aliasarr-mcp/SKILL.md`](./skills/aliasarr-mcp/SKILL.md) | MCP skill for agents          |

## License

MIT
