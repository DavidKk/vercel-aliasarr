# Aliasarr

Vercel 上的虚拟 Torznab Indexer（Sonarr 中文别名搜索代理）。

与其他 `vercel-*` 项目同一套 App Router 骨架：`app/`、`services/`、`components/`、`utils/`、pnpm、Tailwind、ESLint/Prettier。

## 开发

```bash
pnpm i
cp .env.example .env.local
pnpm dev
```

- 首页：`http://localhost:3000`
- 试搜：`http://localhost:3000/admin`

## 目录

```text
app/            # Next.js App Router 页面与 API
components/     # UI 组件
services/       # 业务：torznab / prowlarr / search / media
utils/          # env / logger / types
data/aliases/   # YAML 别名
__tests__/      # Vitest
scripts/        # pnpm pre/postinstall
```

## Sonarr

| 项 | 值 |
| --- | --- |
| URL | `https://<your-app>.vercel.app` |
| API Path | `/api/torznab` |
| API Key | `TORZNAB_API_KEY` |

详见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。
