import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { McpResourceProvider } from '@/initializer/mcp'

import { moduleSkillMarkdownFilename, moduleSkillResourceUri } from './skillNaming'

const MCP_SKILL_MODULE_ID = 'mcp'
const SKILL_MARKDOWN_RELATIVE_PATH = join('skills', 'aliasarr-mcp', 'SKILL.md')

let cachedSkillMarkdown: string | null = null

function loadAliasarrMcpSkillMarkdown(): string {
  if (cachedSkillMarkdown === null) {
    const absolutePath = join(process.cwd(), SKILL_MARKDOWN_RELATIVE_PATH)
    cachedSkillMarkdown = readFileSync(absolutePath, 'utf8')
  }
  return cachedSkillMarkdown
}

export function getAliasarrMcpSkillResourceProvider(): McpResourceProvider {
  const uri = moduleSkillResourceUri(MCP_SKILL_MODULE_ID)
  const name = moduleSkillMarkdownFilename(MCP_SKILL_MODULE_ID)
  const text = loadAliasarrMcpSkillMarkdown()

  return {
    listResources() {
      return [
        {
          uri,
          name,
          description: 'Agent-ready SKILL for Aliasarr HTTP MCP (alias resolve + debug search).',
          mimeType: 'text/markdown',
        },
      ]
    },
    async readResource(requestedUri: string) {
      if (requestedUri.trim() !== uri) return null
      return { mimeType: 'text/markdown', text }
    },
  }
}
