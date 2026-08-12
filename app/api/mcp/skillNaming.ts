/** MCP resource naming helpers for Aliasarr skills. */

export function moduleSkillResourceUri(moduleId: string): string {
  return `aliasarr://skills/${moduleId}/SKILL.md`
}

export function moduleSkillMarkdownFilename(moduleId: string): string {
  return `${moduleId}-SKILL.md`
}
