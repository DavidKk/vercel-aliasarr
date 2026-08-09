# Aliasarr Vercel 部署

Aliasarr **只以 Vercel 为生产运行平台**。

## 1. 导入项目

1. 将仓库推送到 GitHub / GitLab
2. [Vercel](https://vercel.com) → Add New Project → Import
3. Framework Preset: Next.js（自动检测）
4. Root Directory: 仓库根目录

## 2. 环境变量

在 Vercel Project → Settings → Environment Variables 配置：

| 变量 | 必需 | 说明 |
| --- | --- | --- |
| `TORZNAB_API_KEY` | 是 | Sonarr 使用的 apikey（≥16 字符） |
| `PROWLARR_URL` | 是 | Vercel 可访问的 Prowlarr 公网 URL |
| `PROWLARR_API_KEY` | 是 | Prowlarr API Key |
| `PROWLARR_TIMEOUT_MS` | 否 | 默认 8000 |
| `PROWLARR_MAX_CONCURRENCY` | 否 | 默认 3 |
| `PROWLARR_SONARR_URL` | 否 | 写入返回给 Sonarr 的下载链接 origin |
| `ALIAS_DATA_DIR` | 否 | 默认 `data/aliases` |
| `MAX_TITLES` / `MAX_QUERY_FORMATS_PER_TITLE` / `MAX_PROWLARR_QUERIES` | 否 | 查询放大控制 |
| `SEARCH_RESULT_LIMIT` | 否 | 默认 100 |
| `LOG_LEVEL` | 否 | 默认 info |

`vercel.json` 已为 `/api/torznab` 设置 `maxDuration: 30`。

## 3. Prowlarr 可达性

Vercel Functions **无法访问纯局域网**。需要其一：

- Cloudflare Tunnel
- Cloudflare Access Service Token + 反代
- Tailscale Funnel
- 自建仅暴露 `/api/v1/*` 的鉴权网关

**不要**把完整 Prowlarr 管理 UI 裸露到公网。

若 Sonarr 在内网、搜索走公网 Prowlarr URL：可设置 `PROWLARR_SONARR_URL`，把返回的 Grab URL 改写为 Sonarr 可达地址。

## 4. Sonarr 配置

- URL: `https://<deployment>.vercel.app`
- API Path: `/api/torznab`
- API Key: 同 `TORZNAB_API_KEY`
- Categories: `5000,5030,5040,5045`

在 Sonarr 中点 Test，应成功；对已有别名剧集（如 TVDB `366625`）手动 Search，应看到 RSS 结果或空 RSS（**不是** HTML）。

## 5. Smoke

```bash
./scripts/smoke-torznab.sh https://<deployment>.vercel.app "$TORZNAB_API_KEY"
```

## 6. 验收清单

- [ ] `/api/health` 返回 JSON，且不暴露 URL/Key
- [ ] `/api/torznab?t=caps` 返回 caps XML
- [ ] Sonarr Test Indexer 通过
- [ ] `tvsearch` 对配置别名剧集可返回结果或空 RSS
- [ ] 错误 apikey 返回 Torznab error XML，非 HTML
