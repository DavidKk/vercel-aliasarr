export const DOCS_NAV = [
  { href: '/docs', label: 'Overview' },
  { href: '/docs/api', label: 'API' },
  { href: '/docs/mcp', label: 'MCP' },
  { href: '/docs/skill', label: 'Skill' },
] as const

export const MCP_TOOLS = [
  { name: 'aliasarr_health', use: 'Health check including Prowlarr reachability' },
  { name: 'aliasarr_resolve_titles', use: 'Multi-source alias resolve (no Prowlarr)' },
  { name: 'aliasarr_debug_search', use: 'Alias expand + Prowlarr probe summary' },
  { name: 'aliasarr_tooling_summary', use: 'List tools and auth notes' },
] as const
