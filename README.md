[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Chinese docs](https://img.shields.io/badge/docs-Chinese-green?style=flat-square&logo=docs)](./README.zh-CN.md) [![English](https://img.shields.io/badge/docs-English-green?style=flat-square&logo=docs)](./README.md)

# Aliasarr

Aliasarr is a virtual Torznab indexer on Vercel that expands Chinese title aliases for Sonarr and Radarr, searches via Prowlarr and/or Jackett, and returns standard Torznab XML.

## Features

- **Torznab for _arr_**: Expose `/api/torznab` (API Path `/api`) so Sonarr and Radarr can search Aliasarr like any other indexer. `/api` and `/api/torznab` remain available as compatible entry points.
- **Alias chain**: Resolve titles from Gist YAML first, then TMDB/Bangumi on miss, write new aliases back to Gist, and normalize Chinese variants with OpenCC.
- **Admin console**: Configure Prowlarr/Jackett, pick indexers, edit Gist YAML, and sync or clear per-indexer Aliasarr entries in Sonarr/Radarr in one click.
- **HTTP MCP**: `/api/mcp` lets agents resolve titles and run debug searches with the Admin Torznab API key.
- **Encrypted config**: Service URLs and credentials are sealed with AES-256-GCM in Upstash Redis. Gist/TMDB/Bangumi keys, indexer API keys, and custom headers are entered in Admin after deploy — not as environment variables.

## Security Notes

- Stored connection config is encrypted with AES-256-GCM. `CONFIG_ENCRYPTION_KEY` lives only in environment variables; if it is lost, the saved config cannot be recovered.
- Do not put Prowlarr, Jackett, Sonarr, Radarr, Gist, or TMDB secrets in environment variables. Enter them in Admin after deploy.
- Give the Gist token `gist` scope only, and rotate credentials regularly.
- Vercel must be able to reach Prowlarr/Jackett. LAN-only hosts need a public reverse proxy or tunnel.

## Deploy to Vercel

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDavidKk%2Fvercel-aliasarr)

### Environment Variable Configuration

Refer to the [`.env.example`](./.env.example) file to set the required environment variables.

- `CONFIG_ENCRYPTION_KEY`: AES-256-GCM master key (`openssl rand -base64 32`)
- `ACCESS_USERNAME`: Admin Username
- `ACCESS_PASSWORD`: Admin Password
- `ACCESS_2FA_SECRET`: 2FA Secret, can generate TOKEN using [https://vercel-2fa.vercel.app](https://vercel-2fa.vercel.app)
- `JWT_SECRET`: JWT Secret
- `JWT_EXPIRES_IN`: JWT Token Expiration Time
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`: injected by Vercel Marketplace → Upstash Redis

### Vercel 2FA Signet login (optional)

Set `SIGNET_SDK_URL` to the full `signet-client.mjs` URL to show Signet on the login page. The default allowlist is `ACCESS_USERNAME`; override with `SIGNET_ALLOWED_USERS`. When `ACCESS_2FA_SECRET` is set, both password login and Signet require TOTP.

## Quick Start

1. Click **Deploy to Vercel**, then connect **Upstash Redis** from the Vercel Marketplace.
2. Set the environment variables above in the Vercel project.
3. After deploy, sign in at `/login` and configure Gist, Prowlarr/Jackett, and Sonarr/Radarr in Admin.
4. In Sonarr and Radarr, add a Torznab indexer: URL `https://<your-app>.vercel.app/api/torznab`, API Path `/api`, API Key from Admin. Sonarr categories `5000, 5030, 5040, 5045`; Radarr categories `2000, 2030, 2040, 2045`.
