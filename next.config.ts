import type { NextConfig } from 'next'
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants'

export default function nextConfig(phase: string): NextConfig {
  return {
    // `next dev` and `next build` must not share the same dist dir or the build
    // overwrites chunks the dev server still references (broken HMR / random 500s).
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
    env: {
      NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    },
    serverExternalPackages: ['pino', 'opencc-js'],
    eslint: {
      // Match other vercel-* projects: lint via `pnpm lint` so build is not blocked by eslint sort rules
      ignoreDuringBuilds: true,
    },
    async redirects() {
      return [
        { source: '/admin/config', destination: '/admin/services', permanent: false },
        { source: '/admin/config/services', destination: '/admin/services', permanent: false },
        { source: '/admin/config/indexers', destination: '/admin/indexers', permanent: false },
        { source: '/admin/config/applications', destination: '/admin/applications', permanent: false },
      ]
    },
  }
}
