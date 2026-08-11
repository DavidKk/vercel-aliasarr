import type { ReactNode } from 'react'

type Block =
  | { type: 'heading'; level: 1 | 2 | 3; text: string; id: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }

function rewriteDocHref(href: string): string {
  if (href.includes('API.md')) return '#api'
  if (href.includes('SKILL.md') || href.includes('aliasarr-mcp')) return '#skill'
  if (href.includes('/api/mcp')) return '#mcp'
  if (href.includes('README')) return 'https://github.com/DavidKk/vercel-aliasarr'
  if (href.includes('ARCHITECTURE.md')) return 'https://github.com/DavidKk/vercel-aliasarr/blob/main/docs/ARCHITECTURE.md'
  return href
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((cell) => cell.trim())
}

function isTableSep(line: string): boolean {
  return /^\|?\s*:?-{3,}.*\|/.test(line)
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      i += 1
      continue
    }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const body: string[] = []
      i += 1
      while (i < lines.length && !lines[i].startsWith('```')) {
        body.push(lines[i])
        i += 1
      }
      i += 1
      blocks.push({ type: 'code', lang, code: body.join('\n') })
      continue
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3
      const text = heading[2].trim()
      blocks.push({ type: 'heading', level, text, id: slugify(text) })
      i += 1
      continue
    }

    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const headers = splitRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]))
        i += 1
      }
      blocks.push({ type: 'table', headers, rows })
      continue
    }

    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line)
      const items: string[] = []
      while (i < lines.length && (ordered ? /^\s*\d+\.\s+/.test(lines[i]) : /^\s*[-*]\s+/.test(lines[i]))) {
        items.push(lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, ''))
        i += 1
      }
      blocks.push({ type: 'list', ordered, items })
      continue
    }

    const para: string[] = [line]
    i += 1
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('#') && !lines[i].startsWith('```') && !/^\s*[-*]\s+/.test(lines[i])) {
      if (lines[i].includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) break
      para.push(lines[i])
      i += 1
    }
    blocks.push({ type: 'paragraph', text: para.join(' ') })
  }

  return blocks
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const re = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = re.exec(text)) != null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const token = match[0]
    if (token.startsWith('`')) {
      nodes.push(
        <code key={key++} className="rounded-sm bg-app-subtle px-1 py-0.5 font-mono text-[0.8em] text-app-ink">
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith('**')) {
      nodes.push(
        <strong key={key++} className="font-semibold text-app-ink">
          {token.slice(2, -2)}
        </strong>
      )
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      if (link) {
        const href = rewriteDocHref(link[2])
        const external = href.startsWith('http') || href.startsWith('/api/')
        nodes.push(
          <a
            key={key++}
            href={href}
            className="text-app-accent underline decoration-app-accent/40 underline-offset-2 hover:decoration-app-accent"
            {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
          >
            {link[1]}
          </a>
        )
      }
    }
    last = match.index + token.length
  }

  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

export function MarkdownDoc({ markdown }: { markdown: string }) {
  const blocks = parseBlocks(markdown)

  return (
    <div className="space-y-4 text-sm leading-relaxed text-app-text">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const className =
            block.level === 1
              ? 'font-display text-2xl font-semibold tracking-tight text-app-ink'
              : block.level === 2
                ? 'pt-2 font-display text-lg font-semibold tracking-tight text-app-ink'
                : 'font-mono text-[0.75rem] uppercase tracking-[0.14em] text-app-muted'
          const Tag = block.level === 1 ? 'h2' : block.level === 2 ? 'h3' : 'h4'
          return (
            <Tag key={index} id={block.id} className={className}>
              {renderInline(block.text)}
            </Tag>
          )
        }

        if (block.type === 'paragraph') {
          return (
            <p key={index} className="text-app-muted">
              {renderInline(block.text)}
            </p>
          )
        }

        if (block.type === 'code') {
          return (
            <pre key={index} className="overflow-x-auto border border-app-border bg-app-subtle/50 p-3 font-mono text-[0.75rem] text-app-ink">
              <code>{block.code}</code>
            </pre>
          )
        }

        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul'
          return (
            <ListTag key={index} className={`space-y-1.5 text-app-muted ${block.ordered ? 'list-decimal pl-5' : 'list-disc pl-5'}`}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ListTag>
          )
        }

        return (
          <div key={index} className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-app-border font-mono text-[0.65rem] uppercase tracking-[0.14em] text-app-muted">
                  {block.headers.map((h) => (
                    <th key={h} className="py-2 pr-3 font-medium">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-app-border/70 align-top">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="py-2.5 pr-3 text-app-text">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
