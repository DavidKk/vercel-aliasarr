'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const HASH_ROUTES: Record<string, string> = {
  '#api': '/docs/api',
  '#mcp': '/docs/mcp',
  '#skill': '/docs/skill',
}

/** Compat for old /docs#api|mcp|skill deep links. */
export function DocsHashRedirect() {
  const router = useRouter()
  useEffect(() => {
    const next = HASH_ROUTES[window.location.hash]
    if (next) router.replace(next)
  }, [router])
  return null
}
