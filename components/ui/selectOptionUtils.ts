export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

/** Show in-panel search once option count exceeds this threshold. */
export const SELECT_OPTION_SEARCH_THRESHOLD = 5

export function shouldShowSelectSearch(optionCount: number): boolean {
  return optionCount > SELECT_OPTION_SEARCH_THRESHOLD
}

export function filterSelectOptions<T extends { label: string; value: string }>(options: T[], query: string): T[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return options
  return options.filter((option) => option.label.toLowerCase().includes(normalized) || option.value.toLowerCase().includes(normalized))
}

export function findNextEnabledSelectIndex(options: Array<{ disabled?: boolean }>, start: number, direction: 1 | -1): number {
  if (options.length === 0) return -1
  let index = start
  for (let step = 0; step < options.length; step += 1) {
    index = (index + direction + options.length) % options.length
    if (!options[index]?.disabled) return index
  }
  return -1
}
