import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  serverExternalPackages: ['pino', 'opencc-js'],
  eslint: {
    // 与历史 vercel-* 项目一致：本地用 `pnpm lint`，避免 build 被 eslint 排序规则阻断
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
