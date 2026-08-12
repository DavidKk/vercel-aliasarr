'use client'

import { type KeyboardEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { FiCheck, FiChevronDown, FiX } from 'react-icons/fi'

import { CONTROL_CLASS, CONTROL_HELPER_CLASS, CONTROL_LABEL_CLASS, CONTROL_RADIUS } from './controlStyles'
import { FieldHint } from './FieldHint'
import { ListboxPanel } from './ListboxPanel'
import { filterSelectOptions, findNextEnabledSelectIndex, type SelectOption, shouldShowSelectSearch } from './selectOptionUtils'

export type { SelectOption }

export interface SelectProps {
  label?: string
  helperText?: string
  descriptionTooltip?: string
  options: SelectOption[]
  value: string
  onChange?(value: string): void
  placeholder?: string
  searchPlaceholder?: string
  emptyLabel?: string
  disabled?: boolean
  className?: string
  name?: string
  compact?: boolean
  clearable?: boolean
  clearValue?: string
  clearLabel?: string
}

export function Select(props: SelectProps) {
  const {
    label,
    helperText,
    descriptionTooltip,
    options,
    value,
    onChange,
    placeholder = 'Select',
    searchPlaceholder = 'Search…',
    emptyLabel = 'No matches',
    disabled,
    className = '',
    name,
    compact = false,
    clearable = false,
    clearValue = '',
    clearLabel = 'Clear selection',
  } = props

  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(-1)

  const searchable = shouldShowSelectSearch(options.length)
  const visibleOptions = useMemo(() => (searchable ? filterSelectOptions(options, query) : options), [options, query, searchable])
  const selected = options.find((option) => option.value === value)
  const showClear = clearable && !disabled && value !== clearValue && Boolean(selected || value)

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setHighlightIndex(-1)
  }, [])

  const openPanel = useCallback(() => {
    if (disabled) return
    const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled)
    setHighlightIndex(selectedIndex >= 0 ? selectedIndex : findNextEnabledSelectIndex(options, -1, 1))
    setQuery('')
    setOpen(true)
  }, [disabled, options, value])

  useEffect(() => {
    if (!open || !searchable) return
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open, searchable])

  const selectAt = useCallback(
    (index: number) => {
      const option = visibleOptions[index]
      if (!option || option.disabled) return
      onChange?.(option.value)
      close()
      triggerRef.current?.focus()
    },
    [close, onChange, visibleOptions]
  )

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled || event.target !== event.currentTarget) return
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openPanel()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    handlePanelKeyDown(event)
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null
    const fromEditable = Boolean(target?.closest('input, textarea, select, [contenteditable="true"]'))
    const fromNativeControl = Boolean(target?.closest('input, textarea, select, button, label, a'))

    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      triggerRef.current?.focus()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightIndex((current) => findNextEnabledSelectIndex(visibleOptions, current < 0 ? -1 : current, 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightIndex((current) => findNextEnabledSelectIndex(visibleOptions, current < 0 ? visibleOptions.length : current, -1))
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      setHighlightIndex(findNextEnabledSelectIndex(visibleOptions, -1, 1))
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      setHighlightIndex(findNextEnabledSelectIndex(visibleOptions, 0, -1))
      return
    }
    if (event.key === 'Enter' && highlightIndex >= 0 && !fromNativeControl) {
      event.preventDefault()
      selectAt(highlightIndex)
      return
    }
    if (event.key === ' ' && highlightIndex >= 0 && !fromEditable && !fromNativeControl) {
      event.preventDefault()
      selectAt(highlightIndex)
    }
  }

  const activeDescendantId = highlightIndex >= 0 ? `${listboxId}-option-${highlightIndex}` : undefined
  const triggerClass = compact
    ? `relative flex h-9 min-h-9 w-full items-center gap-2 border border-app-border bg-app-bg px-2 text-left text-xs outline-none transition hover:border-app-muted/70 focus-visible:border-app-accent ${CONTROL_RADIUS} ${showClear ? 'pr-14' : 'pr-8'}`
    : `relative flex ${CONTROL_CLASS} ${CONTROL_RADIUS} items-center gap-3 text-left outline-none ${showClear ? 'pr-16' : 'pr-10'}`

  return (
    <div className={`grid gap-1.5 text-left ${className}`}>
      {label ? (
        <span className="flex items-center gap-1.5">
          <span className={CONTROL_LABEL_CLASS}>{label}</span>
          {descriptionTooltip ? <FieldHint content={descriptionTooltip} /> : null}
        </span>
      ) : null}
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <div ref={rootRef} className="relative">
        <div
          ref={triggerRef}
          role="combobox"
          tabIndex={disabled ? -1 : 0}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-disabled={disabled || undefined}
          className={`${triggerClass} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${!selected ? 'text-app-muted' : 'text-app-text'}`}
          onClick={() => (open ? close() : openPanel())}
          onKeyDown={handleTriggerKeyDown}
        >
          <span className="min-w-0 flex-1 truncate">{selected?.label ?? placeholder}</span>
          {showClear ? (
            <button
              type="button"
              aria-label={clearLabel}
              className={`absolute top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-app-muted transition hover:bg-app-subtle hover:text-app-ink ${compact ? 'right-7' : 'right-9'}`}
              onClick={(event) => {
                event.stopPropagation()
                onChange?.(clearValue)
                close()
                triggerRef.current?.focus()
              }}
            >
              <FiX className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
          <FiChevronDown
            className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted transition ${open ? 'rotate-180 text-app-ink' : ''} ${compact ? 'right-2' : 'right-3'}`}
            aria-hidden
          />
        </div>

        <ListboxPanel
          open={open && !disabled}
          anchorRef={rootRef}
          listboxId={listboxId}
          activeDescendantId={activeDescendantId}
          onClose={close}
          onKeyDown={handlePanelKeyDown}
          minWidth={compact ? 180 : undefined}
          header={
            searchable ? (
              <div className="border-b border-app-border/80 p-2">
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-lg border border-app-border bg-app-bg px-2.5 py-1.5 text-xs text-app-text outline-none placeholder:text-app-muted/60 focus:border-app-accent"
                  onChange={(event) => {
                    const next = event.target.value
                    setQuery(next)
                    setHighlightIndex(findNextEnabledSelectIndex(filterSelectOptions(options, next), -1, 1))
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      close()
                      triggerRef.current?.focus()
                    }
                  }}
                />
              </div>
            ) : null
          }
        >
          {visibleOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-app-muted" role="status">
              {emptyLabel}
            </div>
          ) : (
            visibleOptions.map((option, index) => {
              const selectedOption = option.value === value
              const highlighted = index === highlightIndex
              return (
                <div
                  key={option.value || `${listboxId}-empty`}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={selectedOption}
                  aria-disabled={option.disabled || undefined}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm transition ${
                    option.disabled
                      ? 'cursor-not-allowed opacity-40'
                      : highlighted
                        ? 'bg-app-subtle text-app-ink'
                        : selectedOption
                          ? 'bg-app-accentSoft text-app-ink'
                          : 'hover:bg-app-subtle'
                  }`}
                  onMouseEnter={() => {
                    if (!option.disabled) setHighlightIndex(index)
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectAt(index)}
                >
                  <span className="truncate">{option.label}</span>
                  {selectedOption ? <FiCheck className="h-3.5 w-3.5 shrink-0 text-app-accent" aria-hidden /> : null}
                </div>
              )
            })
          )}
        </ListboxPanel>
      </div>
      {helperText ? <span className={CONTROL_HELPER_CLASS}>{helperText}</span> : null}
    </div>
  )
}
