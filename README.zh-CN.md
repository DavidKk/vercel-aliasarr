[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![中文](https://img.shields.io/badge/%E6%96%87%E6%A1%A3-%E4%B8%AD%E6%96%87-green?style=flat-square&logo=docs)](./README.zh-CN.md) [![English](https://img.shields.io/badge/docs-English-green?style=flat-square&logo=docs)](./README.md)

# Aliasarr

Aliasarr 是部署在 Vercel 上的虚拟 Torznab 索引器：为 Sonarr / Radarr 展开中文标题别名，经 Prowlarr 和/或 Jackett 搜索，并返回标准 Torznab XML。

## 特点

- **对接 *arr**：对外提供 `/api/torznab`（API Path 填 `/api`），Sonarr / Radarr 可按普通 Indexer 接入。`/api` 与 `/api/torznab` 仍可作为兼容入口。
- **别名链路**：优先读 Gist YAML，未命中再查 TMDB / Bangumi，并将新别名写回 Gist；中文简繁用 OpenCC 归一。
- **管理后台**：配置 Prowlarr / Jackett、选择索引器、编辑 Gist YAML，并一键在 Sonarr / Radarr 中安装或移除 Aliasarr。
- **HTTP MCP**：`/api/mcp` 供 Agent 解析标题、调试搜索，使用后台配置的 Torznab API Key 鉴权。
- **加密配置**：服务地址与凭证用 AES-256-GCM 封存在 Upstash Redis。Gist / TMDB / Bangumi、索引器 API Key 和自定义请求头在部署后于后台填写，不要写进环境变量。

## 安全说明

- 连接配置以 AES-256-GCM 加密存储。`CONFIG_ENCRYPTION_KEY` 只存在于环境变量；密钥丢失后已保存的配置无法恢复。
- 不要把 Prowlarr、Jackett、Sonarr、Radarr、Gist、TMDB 的密钥放进环境变量，部署后在后台填写。
- Gist Token 只需 `gist` 权限，并定期轮换。
- Vercel 必须能访问到 Prowlarr / Jackett。仅内网可达时需要公网反代或隧道。

## 部署到 Vercel

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDavidKk%2Fvercel-aliasarr)

### 环境变量配置

参考 [`.env.example`](./.env.example) 文件，设置必要的环境变量。

- `CONFIG_ENCRYPTION_KEY`: AES-256-GCM 主密钥（`openssl rand -base64 32`）
- `ACCESS_USERNAME`: 管理员用户名
- `ACCESS_PASSWORD`: 管理员密码
- `ACCESS_2FA_SECRET`: 2FA 密钥，可以使用 [https://vercel-2fa.vercel.app](https://vercel-2fa.vercel.app) 生成 TOKEN
- `JWT_SECRET`: JWT 密钥
- `JWT_EXPIRES_IN`: JWT 过期时间
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`: 由 Vercel Marketplace → Upstash Redis 注入

### Vercel 2FA 统一登录（可选）

设置 `SIGNET_SDK_URL` 为 `signet-client.mjs` 的完整 URL 后，登录页会显示 Signet 入口。默认只允许 `ACCESS_USERNAME`；可用 `SIGNET_ALLOWED_USERS` 覆盖。开启 `ACCESS_2FA_SECRET` 后，密码登录与 Signet 都需要 TOTP。

## 快速开始

1. 点击 **Deploy to Vercel**，并在 Vercel Marketplace 连接 **Upstash Redis**。
2. 在 Vercel 项目中设置上面的环境变量。
3. 部署完成后访问 `/login`，在后台配置 Gist、Prowlarr / Jackett 以及 Sonarr / Radarr。
4. 在 Sonarr / Radarr 添加 Torznab 索引器：URL 为 `https://<your-app>.vercel.app/api/torznab`，API Path 为 `/api`，API Key 使用后台生成的值。Sonarr 分类 `5000, 5030, 5040, 5045`；Radarr 分类 `2000, 2030, 2040, 2045`。
