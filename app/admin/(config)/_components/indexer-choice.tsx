'use client'

import { Checkbox, MultiSelect } from '@/components/ui'

export function IndexerChoice({
  checked,
  disabled,
  name,
  meta,
  language,
  languageOptions: options,
  onChange,
  onLanguageChange,
}: {
  checked: boolean
  disabled: boolean
  name: string
  meta: string
  language: string[]
  languageOptions: Array<{ label: string; value: string }>
  onChange(checked: boolean): void
  onLanguageChange(languages: string[]): void
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition ${disabled ? 'opacity-45' : 'hover:border-app-border hover:bg-app-subtle/50'}`}
    >
      <Checkbox
        compact
        disabled={disabled}
        checked={checked}
        className="min-w-0 max-w-[min(100%,22rem)]"
        onChange={(event) => onChange(event.target.checked)}
        label={
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-app-ink">{name}</span>
            <span className="mt-0.5 block truncate font-mono text-[0.6rem] font-normal text-app-muted">{meta}</span>
          </span>
        }
      />
      <div className="min-w-0 flex-1" aria-hidden />
      <div className="w-[9.5rem] shrink-0" onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
        <MultiSelect
          compact
          disabled={disabled}
          options={options}
          value={language}
          placeholder="en-US"
          allSelectedLabel="All"
          selectAllLabel="Select all"
          clearLabel="Clear all"
          onChange={onLanguageChange}
        />
      </div>
    </div>
  )
}
