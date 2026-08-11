# Aliasarr Deployment

## Vercel

1. Import the repository; Framework: Next.js
2. In Project → Environment Variables, configure bootstrap keys matching [`.env.example`](../.env.example) (**do not** put secrets in code or Git)
3. Connect Upstash Redis via Vercel Marketplace; the integration injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
4. Generate `CONFIG_ENCRYPTION_KEY`: `openssl rand -base64 32`; if this value is lost, stored connection config cannot be recovered
5. Admin login: `ACCESS_USERNAME`, `ACCESS_PASSWORD`; production should set a high-entropy `JWT_SECRET` separately (if unset, `ACCESS_PASSWORD` is used for signing—**never** deploy without a secret)
6. Optional Signet: `SIGNET_SDK_URL` (or `NEXT_PUBLIC_SIGNET_SDK_URL`). By default only `ACCESS_USERNAME` may log in; use `SIGNET_ALLOWED_USERS` for an explicit allowlist. When `ACCESS_2FA_SECRET` is enabled, both password login and Signet require TOTP (Signet SSO then step-up verification)
7. After deploy, log in at `/admin/config`, enter URL, Torznab/API Key, Gist/TMDB/Bangumi credentials, and save
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

## Sonarr

Settings → Indexers → Torznab (Custom)

| Item       | Value                                |
| ---------- | ------------------------------------ |
| URL        | `https://<deployment>/api/torznab`   |
| API Path   | `/api`                               |
| API Key    | Same Torznab Key configured in Admin |
| Categories | `5000,5030,5040,5045`                |

## Radarr

Same URL / API Path / API Key; Categories: `2000,2030,2040,2045`.

## Prowlarr / Jackett and Application Sync

Configure and enable Prowlarr / Jackett separately at `/admin/config`; choose "all enabled" or specific Indexers. URL and API Key are stored as one AES-256-GCM encrypted connection bundle.

After configuring Sonarr / Radarr URL and API Key, install, update, or remove the Aliasarr Torznab Indexer on the same page via each app's `/api/v3` API—no manual entry required.

Sync runs the application's Indexer Test first. If the only failure is "no results returned for current categories", the save request continues with official `forceSave=true`; connection, auth, protocol, and other test errors still abort sync to avoid saving invalid config.

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
