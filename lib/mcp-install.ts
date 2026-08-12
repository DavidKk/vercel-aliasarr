export const MCP_SERVER_NAME = 'aliasarr'

export const MCP_API_KEY_PLACEHOLDER = 'YOUR_TORZNAB_API_KEY'

export type McpHttpTransportConfig = {
  url: string
  headers: {
    'x-api-key': string
  }
}

export type VscodeMcpInstallConfig = {
  name: string
  type: 'http'
  url: string
  headers: {
    'x-api-key': string
  }
}

export function normalizeMcpUrl(baseUrl: string): string {
  const url = new URL(baseUrl.includes('://') ? baseUrl : `https://${baseUrl}`)
  url.hash = ''
  url.search = ''
  const path = url.pathname.replace(/\/+$/, '') || '/'
  url.pathname = path.endsWith('/api/mcp') ? path : '/api/mcp'
  return `${url.origin}${url.pathname}`
}

export function buildCursorTransportConfig(mcpUrl: string, apiKey: string): McpHttpTransportConfig {
  return {
    url: normalizeMcpUrl(mcpUrl),
    headers: { 'x-api-key': apiKey || MCP_API_KEY_PLACEHOLDER },
  }
}

export function buildVscodeInstallConfig(mcpUrl: string, apiKey: string): VscodeMcpInstallConfig {
  return {
    name: MCP_SERVER_NAME,
    type: 'http',
    url: normalizeMcpUrl(mcpUrl),
    headers: { 'x-api-key': apiKey || MCP_API_KEY_PLACEHOLDER },
  }
}

export function buildMcpJsonSnippet(mcpUrl: string, apiKey: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        [MCP_SERVER_NAME]: buildCursorTransportConfig(mcpUrl, apiKey),
      },
    },
    null,
    2
  )
}

function toBase64(value: string): string {
  // Cursor docs use standard base64 (not base64url). Browser Buffer polyfills often lack 'base64url'.
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf8').toString('base64')
  }
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/** Official Cursor deeplink — https://cursor.com/docs/mcp/install-links */
export function buildCursorInstallUrl(mcpUrl: string, apiKey: string): string {
  const config = buildCursorTransportConfig(mcpUrl, apiKey)
  const encoded = toBase64(JSON.stringify(config))
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(MCP_SERVER_NAME)}&config=${encodeURIComponent(encoded)}`
}

export function buildVscodeInstallUrl(mcpUrl: string, apiKey: string, variant: 'stable' | 'insiders' = 'stable'): string {
  // Badge / marketplace format used by VS Code docs examples: name + config query params.
  const config = {
    type: 'http' as const,
    url: normalizeMcpUrl(mcpUrl),
    headers: { 'x-api-key': apiKey || MCP_API_KEY_PLACEHOLDER },
  }
  const scheme = variant === 'insiders' ? 'vscode-insiders' : 'vscode'
  return `${scheme}:mcp/install?name=${encodeURIComponent(MCP_SERVER_NAME)}&config=${encodeURIComponent(JSON.stringify(config))}`
}
