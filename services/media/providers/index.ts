import type { createAliasProviderChain } from './resolve'

export { createBangumiProvider } from './bangumi'
export { cacheMediaInGist, createGistYamlProvider } from './gist-yaml'
export { createAliasProviderChain } from './resolve'
export { createTmdbProvider } from './tmdb'
export type { AliasProvider, AliasProviderResult } from './types'
export { aliasCacheKey, mergeMediaTitles } from './types'

export type AliasProviderChain = ReturnType<typeof createAliasProviderChain>
