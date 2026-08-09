import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadAliasRepository } from '../../../services/media/alias-repository'

describe('loadAliasRepository', () => {
  it('loads joy of life by tvdb id', async () => {
    const dir = path.join(process.cwd(), 'data/aliases')
    const repo = await loadAliasRepository(dir)
    const media = repo.findByTvdbId(366625)
    expect(media?.primaryTitle).toBe('Joy of Life')
    expect(media?.aliases.map((a) => a.title)).toContain('庆余年')
  })
})
