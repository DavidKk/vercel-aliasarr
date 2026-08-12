# Aliasarr Deployment

## Vercel

1. Import the repository; Framework: Next.js
2. In Project → Environment Variables, configure bootstrap keys matching [`.env.example`](../.env.example) (**do not** put secrets in code or Git)
3. Connect Upstash Redis via Vercel Marketplace; the integration injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
4. Generate `CONFIG_ENCRYPTION_KEY`: `openssl rand -base64 32`; if this value is lost, stored connection config cannot be recovered
5. Admin login: `ACCESS_USERNAME`, `ACCESS_PASSWORD`; production should set a high-entropy `JWT_SECRET` separately (if unset, `ACCESS_PASSWORD` is used for signing—**never** deploy without a secret)
6. Optional Signet: `SIGNET_SDK_URL` (or `NEXT_PUBLIC_SIGNET_SDK_URL`). By default only `ACCESS_USERNAME` may log in; use `SIGNET_ALLOWED_USERS` for an explicit allowlist. When `ACCESS_2FA_SECRET` is enabled, both password login and Signet require TOTP (Signet SSO then step-up verification)
7. After deploy, log in and open `/admin/services`, enter URL, Torznab/API Key, Gist/TMDB/Bangumi credentials, and save
8. After the page shows `AES-256-GCM`, delete legacy service URL/API Key environment variables and redeploy; keep only Upstash, encryption key, and login bootstrap variables
9. Search route `maxDuration` in Functions—see `vercel.json` (recommend ≥ 30s)

**Note:** Vercel egress must reach your Prowlarr; LAN-only Prowlarr needs a public reverse proxy or tunnel.

## Local

```bash
pnpm i
cp .env.example .env   # .env.local also works; Next loads both
# Set CONFIG_ENCRYPTION_KEY, Upstash (production), and Admin login variables
pnpm dev
```

The dev server uses `.next-dev`; `pnpm build` uses `.next`—artifacts are isolated; source changes do not require restart. Restart dev only when changing `.env` or Next config.

Local config is encrypted to `.aliasarr/config.json` (in `.gitignore`, mode 0600); it does not touch production KV and survives `pnpm dev` restarts. Production reads/writes only Upstash Redis key `aliasarr:config:v1`. Both require the same `CONFIG_ENCRYPTION_KEY` in that environment to decrypt.

## Sonarr / Radarr (manual aggregate Torznab)

The aggregate endpoint remains available for manual setup:

| Item       | Value                                                         |
| ---------- | ------------------------------------------------------------- |
| URL        | `https://<deployment>/api/torznab`                            |
| API Path   | `/api`                                                        |
| API Key    | Same Torznab Key configured in Admin                          |
| Categories | Sonarr: `5000,5030,5040,5045` · Radarr: `2000,2030,2040,2045` |

Prefer Application Sync (below) so each upstream indexer gets its own entry.

## Prowlarr / Jackett and Application Sync

Configure and enable Prowlarr / Jackett at `/admin/indexers`; choose "all enabled" or specific Indexers (plus language filters). URL and API Key are stored as one AES-256-GCM encrypted connection bundle.

After configuring Sonarr / Radarr URL and API Key, use **Sync all to Sonarr & Radarr** on `/admin/applications`, or toggle each app individually. Saving Indexers, Applications, or Services configuration also auto-resyncs managed entries to both apps when they are configured.

**Remove all Aliasarr indexers** deletes every managed Aliasarr entry (and legacy bare `Aliasarr`) from both Sonarr and Radarr.

| Item     | Value                                                                                 |
| -------- | ------------------------------------------------------------------------------------- |
| Name     | `{indexerName} (Aliasarr · {Prowlarr\|Jackett})` (e.g. `1337x (Aliasarr · Prowlarr)`) |
| URL      | `https://<deployment>/api/torznab/{prowlarr\|jackett}/{indexerId}`                    |
| API Path | `/api`                                                                                |
| API Key  | Same Torznab Key configured in Admin                                                  |

Defaults on **create**: RSS / automatic / interactive search on, priority `25`, and the category defaults above. Later syncs only refresh URL and API key — tags, categories, priority, and search toggles stay as edited in Sonarr/Radarr.

Clearing the Indexers selection and syncing (or saving config) prunes managed Aliasarr entries. Sync no longer keeps a single aggregate `Aliasarr` indexer.

*_Create workaround for *arr 6.x*_: empty-category Test failures are hard errors even with `forceSave` on create. Aliasarr creates each indexer disabled first (skips Test), then enables it with `forceSave=true` on update (skips Test). Updates always use `forceSave` and do not re-test.

Aliasarr supplements Chinese alias search, so it can coexist with ordinary Indexers synced from Prowlarr to Sonarr/Radarr. If both remain, Prowlarr-synced items handle original titles and RSS; Aliasarr handles alias expansion. Do not add Aliasarr back into Prowlarr—it would create recursive search.

## Gist Aliases

1. Create a GitHub Gist; add files like `series-tvdb-*.yaml`, `movies-tmdb-*.yaml` (Gist has no directories—do not use `/` in filenames)
2. Configure Gist ID and Token (gist scope) in Admin
3. Log in at `/login` → `/admin/aliases` to edit and save

Aliasarr briefly caches Gist reads and uses revision tokens to protect Admin writes. Writes within one instance serialize; if the file was changed elsewhere after open, save returns conflict and requires reopen—no silent overwrite.

Lookup reads Gist first. On miss, TMDB/Bangumi are queried and media names plus candidate aliases are auto-created as YAML; existing files are not overwritten by automatic write-back. Prowlarr search results are ephemeral and are not written to Gist.

## MCP

See [`skills/aliasarr-mcp/SKILL.md`](../skills/aliasarr-mcp/SKILL.md). Header: `x-api-key: <Torznab API key configured in Admin>`.

## Related Docs

- [REQUIREMENTS.md](./REQUIREMENTS.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [API.md](./API.md)
