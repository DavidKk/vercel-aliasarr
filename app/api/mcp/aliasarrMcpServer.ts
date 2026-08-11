import { createMCPHttpServer } from '@/initializer/mcp'
import { buildAliasarrMcpToolsMap } from '@/services/mcp/aliasarrMcpTools'

import { getAliasarrMcpSkillResourceProvider } from './mcpSkillResources'

const MCP_NAME = 'aliasarr'
const MCP_VERSION = '1.0.0'
const MCP_DESCRIPTION =
  'Aliasarr MCP: resolve Chinese titles for Sonarr/Radarr via TMDB/Bangumi/Gist, run debug Prowlarr searches, and check health. Authenticate with the Torznab API key configured in Admin.'

const { manifest, execute } = createMCPHttpServer(MCP_NAME, MCP_VERSION, MCP_DESCRIPTION, buildAliasarrMcpToolsMap(), getAliasarrMcpSkillResourceProvider())

export { execute, manifest }
