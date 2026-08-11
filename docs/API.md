# Aliasarr API

## Torznab — `GET /api/torznab/api`

Sonarr / Radarr configure URL `https://<host>/api/torznab`; the client appends API Path `/api`, so requests hit `/api/torznab/api`. `/api` and `/api/torznab` remain fully compatible direct endpoints.

Query: `t`, `apikey`, `q`, `season`, `ep`, `year`, `tvdbid`, `tmdbid`, `imdbid`, `cat`, `limit`, `offset`.

| `t`                   | Description                         |
| --------------------- | ----------------------------------- |
| `caps`                | Caps XML (tv-search + movie-search) |
| `tvsearch` / `search` | Series search                       |
| `movie`               | Movie search                        |

Auth: `apikey` = Torznab API Key configured in Admin. Errors return Torznab `<error>` XML (not HTML).

Sonarr/Radarr indexer tests often send only `t` and `cat` without a title. Aliasarr then browses Prowlarr recent results for the requested categories with an empty keyword to verify category configuration.

## Health — `GET /api/health`

Public JSON: `status`, `prowlarr`, `version`, `runtime`.

## Debug — `POST /api/debug/search`

Auth via any of:

- Admin login Cookie (used by `/admin/probe`; no need to re-enter API Key)
- body `apikey`
- `x-api-key` Header or Bearer Token

```json
{
  "mediaType": "series",
  "tvdbId": 384640,
  "season": 1,
  "episode": 1
}
```

Response includes `sources`, `titles`, `queries`, `results`.

## Auth — `/api/auth`

- `POST` `{ username, password, token?, rememberMe? }` → Set-Cookie `auth_token`. Without `rememberMe`, the cookie is browser-session scoped; when enabled it persists for `JWT_EXPIRES_IN`.
- `GET /auth/signet/callback` validates the Signet state and remote token, then creates the same local `auth_token` session.
- `DELETE` → clears Cookie

## Configuration tests — `POST /api/config/test` (login required)

Lets Admin test external connections without saving config. Supports `aliasarr`, `gist`, `tmdb`, `bangumi`, `prowlarr`, `jackett`, `sonarr`, `radarr`. Requests may carry current form URL and newly entered credentials; unchanged credentials are merged server-side from encrypted config and never returned to the browser.

```json
{
  "service": "prowlarr",
  "connections": { "prowlarrUrl": "http://prowlarr:9696" },
  "secrets": { "prowlarrApiKey": "new-value-if-edited" }
}
```

Success response includes `service` and `latencyMs`; connection failure returns `502` with an error message that excludes credentials.

Applications card status is read independently via `GET /api/config/applications?application=sonarr|radarr`. Clicking a card status pill in Admin refreshes only that service, not all applications in batch.

Aliasarr Server API Key is server-managed: `POST /api/config/server-key` generates or regenerates a secure random Key and saves it encrypted immediately; `GET /api/config/server-key` shows plaintext to logged-in Admin for copy only. Both responses set `Cache-Control: no-store`; ordinary `GET /api/config` still returns only whether a key is configured, not the Key itself.

## Configuration — `GET|PUT /api/config` (login required)

`GET` returns non-sensitive config, boolean credential-configured flags, storage revision, and encryption status—no credential plaintext.

`PUT` must carry current revision and declare the sub-page via `section`. The server merges only fields owned by that module; stale snapshots from other pages cannot overwrite unrelated config:

| `section`      | Updatable content                                                         |
| -------------- | ------------------------------------------------------------------------- |
| `services`     | Aliasarr, Gist connections, Torznab/TMDB/Bangumi/Gist credentials         |
| `indexers`     | Prowlarr, Jackett connections, credentials, enablement, Indexer selection |
| `applications` | Sonarr, Radarr connections and credentials                                |

```json
{
  "section": "applications",
  "revision": "current-revision",
  "config": {
    "version": 1,
    "connections": {
      "aliasarrUrl": "",
      "prowlarrUrl": "",
      "prowlarrDownloadUrl": "",
      "jackettUrl": "",
      "sonarrUrl": "http://sonarr:8989",
      "radarrUrl": "http://radarr:7878",
      "gistId": ""
    },
    "indexers": {
      "prowlarr": { "mode": "all", "indexerIds": [] },
      "jackett": { "mode": "all", "indexerIds": [] }
    }
  },
  "secrets": { "radarrApiKey": "new-value-if-edited" }
}
```

Credential fields are submitted only when actually edited; omitted credentials stay unchanged. Expired revision returns `409`.

## Aliases (login required)

- `GET /api/aliases` → `{ files: string[], configured: boolean }` (empty list when Gist is not configured, not an error)
- `GET /api/aliases/series-tvdb-1.yaml` → `{ path, content, revision }`
- `PUT` body `{ content, revision }` (YAML, Zod validation; expired revision → `409`, missing → `428`)
- `DELETE` uses `x-gist-revision` header (same revision validation)

Gist metadata is cached 30 seconds within a single service instance; Admin file open forces latest version. Write requests serialize per Gist and re-read revision before write to avoid concurrent writes and stale page overwrites within one instance. GitHub Gist PATCH does not support atomic conditional writes, so multiple Vercel instances use optimistic concurrency; conflicts never auto-overwrite remote content.

Standard response: `{ code, message, data }` (`initializer/response`).

## MCP — `/api/mcp`

Auth: Torznab API Key configured in Admin. See [`skills/aliasarr-mcp/SKILL.md`](../skills/aliasarr-mcp/SKILL.md).

- `GET`: manifest (tools + resources)
- `POST`: JSON-RPC or `{ tool, params }`
- Resource: `aliasarr://skills/mcp/SKILL.md`
