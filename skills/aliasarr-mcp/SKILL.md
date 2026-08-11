---
name: aliasarr-mcp
description: >-
  Aliasarr HTTP MCP at /api/mcp — resolve Chinese titles (TMDB/Bangumi/Gist),
  debug Prowlarr searches for Sonarr/Radarr, health check. Authenticate with
  the Torznab API key configured in Admin (x-api-key / Bearer / ?apikey=). Use when installing Cursor MCP,
  calling JSON-RPC tools/list|tools/call|resources/*, or debugging alias expansion.
---

# Aliasarr — MCP Usage

## Endpoint

- **URL**: `GET` / `POST` **`/api/mcp`**
- **Auth**: Torznab API Key configured in Admin
  - Header `x-api-key: <key>`
  - or `Authorization: Bearer <key>`
  - or query `?apikey=<key>`
- **Protocol**: JSON-RPC 2.0 (`initialize`, `tools/list`, `tools/call`, `resources/list`, `resources/read`) plus legacy `{ "tool", "params" }`

**No** Gist YAML write tools; edit aliases via Web: `/login` → `/admin/aliases`.

## Tools

| Tool                       | Purpose                                                                    |
| -------------------------- | -------------------------------------------------------------------------- |
| `aliasarr_health`          | Health check (includes Prowlarr reachability)                              |
| `aliasarr_resolve_titles`  | Multi-source alias resolution (TMDB → Bangumi → Gist → local), no Prowlarr |
| `aliasarr_debug_search`    | Alias expansion + Prowlarr probe search summary                            |
| `aliasarr_tooling_summary` | List tools and auth instructions                                           |

### `aliasarr_resolve_titles` / `aliasarr_debug_search` parameters

| Parameter            | Description                    |
| -------------------- | ------------------------------ |
| `mediaType`          | `series` \| `movie` (optional) |
| `tvdbId`             | Series TheTVDB id              |
| `tmdbId`             | TMDB id                        |
| `imdbId`             | IMDb id (common for movies)    |
| `season` / `episode` | Series season and episode      |
| `year`               | Movie year                     |
| `q`                  | Free-text title fallback       |

## Resources

| URI                              | Content       |
| -------------------------------- | ------------- |
| `aliasarr://skills/mcp/SKILL.md` | This document |

## One-click install

Open **`/docs/mcp`** on your Aliasarr deployment for install buttons:

- **Cursor** — `cursor://anysphere.cursor-deeplink/mcp/install` deeplink ([docs](https://cursor.com/docs/mcp/install-links))
- **VS Code** / **VS Code Insiders** — `vscode:mcp/install` / `vscode-insiders:mcp/install`
- **Copy mcp.json** — Claude Desktop, Windsurf, and other clients

Paste the Admin Torznab API key before clicking, or install with `YOUR_TORZNAB_API_KEY` and replace it in settings.

## mcp.json example

```json
{
  "mcpServers": {
    "aliasarr": {
      "url": "https://<your-app>.vercel.app/api/mcp",
      "headers": {
        "x-api-key": "<ADMIN_CONFIGURED_TORZNAB_KEY>"
      }
    }
  }
}
```

## Related docs

- [README.md](../../README.md)
- [docs/API.md](../../docs/API.md)
- [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
