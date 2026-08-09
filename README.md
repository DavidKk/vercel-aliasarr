# Aliasarr

Vercel 上的虚拟 Torznab Indexer：按 TVDB ID 扩展中文/简繁别名，经 Prowlarr 搜索后合并去重，返回标准 Torznab XML 给 Sonarr。

**运行平台：仅 Vercel**（Next.js App Router + Node.js Serverless）。

## 快速开始

```bash
cp .env.example .env
# 填写 TORZNAB_API_KEY / PROWLARR_URL / PROWLARR_API_KEY
npm install
npm run dev
```

打开：

- 首页：`http://localhost:3000`
- 试搜控制台：`http://localhost:3000/admin`（需填写 `TORZNAB_API_KEY`）

本地 API 验证：

```bash
curl -s 'http://localhost:3000/api/health'
curl -s 'http://localhost:3000/api/torznab?t=caps&apikey=YOUR_KEY'
curl -s 'http://localhost:3000/api/torznab?t=tvsearch&tvdbid=366625&season=2&ep=12&apikey=YOUR_KEY'
```

## Sonarr 接入

| 项 | 值 |
| --- | --- |
| Type | Torznab → Custom |
| URL | `https://<your-vercel-app>.vercel.app` |
| API Path | `/api/torznab` |
| API Key | 与 `TORZNAB_API_KEY` 相同 |
| Categories | `5000,5030,5040,5045` |

## 别名数据

在 `data/aliases/*.yaml` 添加剧集别名（随部署一并上传到 Vercel）。示例见 `data/aliases/joy-of-life.yaml`。

## 部署

见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。Prowlarr 必须对 Vercel 公网可达（Tunnel / 网关），勿裸奔完整管理界面。

## 测试

```bash
npm test
npm run typecheck
```
