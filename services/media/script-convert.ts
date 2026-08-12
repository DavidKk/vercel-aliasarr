import * as OpenCC from 'opencc-js'

const s2t = OpenCC.Converter({ from: 'cn', to: 'tw' })
const t2s = OpenCC.Converter({ from: 'tw', to: 'cn' })

export function toTraditional(text: string): string {
  return s2t(text)
}

export function toSimplified(text: string): string {
  return t2s(text)
}
