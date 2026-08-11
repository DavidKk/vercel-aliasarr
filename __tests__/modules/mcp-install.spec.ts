import {
  buildCursorInstallUrl,
  buildCursorTransportConfig,
  buildMcpJsonSnippet,
  buildVscodeInstallConfig,
  buildVscodeInstallUrl,
  MCP_API_KEY_PLACEHOLDER,
  MCP_SERVER_NAME,
  normalizeMcpUrl,
} from '../../lib/mcp-install'

describe('mcp-install helpers', () => {
  it('normalizes host roots to /api/mcp', () => {
    expect(normalizeMcpUrl('https://aliasarr.example.com')).toBe('https://aliasarr.example.com/api/mcp')
    expect(normalizeMcpUrl('https://aliasarr.example.com/api/mcp/')).toBe('https://aliasarr.example.com/api/mcp')
  })

  it('builds Cursor and VS Code one-click install URLs', () => {
    const mcpUrl = 'https://aliasarr.example.com/api/mcp'
    const key = 'test-key'
    const cursor = buildCursorInstallUrl(mcpUrl, key)
    expect(cursor.startsWith('cursor://anysphere.cursor-deeplink/mcp/install?name=aliasarr&config=')).toBe(true)
    expect(cursor.includes('cursor.com/link')).toBe(false)

    const vscode = buildVscodeInstallUrl(mcpUrl, key)
    expect(vscode.startsWith('vscode:mcp/install?')).toBe(true)
    const query = new URL(vscode.replace(/^vscode:/, 'https://vscode.local/'))
    expect(query.searchParams.get('name')).toBe(MCP_SERVER_NAME)
    const decoded = JSON.parse(query.searchParams.get('config') || '{}') as Omit<ReturnType<typeof buildVscodeInstallConfig>, 'name'>
    expect(decoded).toEqual({
      type: 'http',
      url: mcpUrl,
      headers: { 'x-api-key': key },
    })
    expect(buildVscodeInstallConfig(mcpUrl, key).name).toBe(MCP_SERVER_NAME)
  })

  it('uses placeholder key when empty and emits mcp.json snippet', () => {
    const mcpUrl = 'https://aliasarr.example.com/api/mcp'
    expect(buildCursorTransportConfig(mcpUrl, '').headers['x-api-key']).toBe(MCP_API_KEY_PLACEHOLDER)
    const snippet = JSON.parse(buildMcpJsonSnippet(mcpUrl, '')) as { mcpServers: Record<string, unknown> }
    expect(snippet.mcpServers[MCP_SERVER_NAME]).toEqual(buildCursorTransportConfig(mcpUrl, ''))
  })
})
