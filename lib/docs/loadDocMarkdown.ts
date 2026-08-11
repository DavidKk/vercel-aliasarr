import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function loadRepoMarkdown(relativePath: string): Promise<string> {
  const absolutePath = join(process.cwd(), relativePath)
  const raw = await readFile(absolutePath, 'utf8')
  return stripYamlFrontmatter(raw).trim()
}

function stripYamlFrontmatter(source: string): string {
  if (!source.startsWith('---\n')) return source
  const end = source.indexOf('\n---\n', 4)
  if (end === -1) return source
  return source.slice(end + 5)
}
