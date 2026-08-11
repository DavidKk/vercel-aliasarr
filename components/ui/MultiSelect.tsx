'use client'

import { type KeyboardEvent, type MouseEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { FiChevronDown, FiX } from 'react-icons/fi'

import { Checkbox } from './Checkbox'
import { CONTROL_CLASS, CONTROL_HELPER_CLASS, CONTROL_LABEL_CLASS, CONTROL_RADIUS } from './controlStyles'
import { FieldHint } from './FieldHint'
import { ListboxPanel } from './ListboxPanel'
import { filterSelectOptions, findNextEnabledSelectIndex, shouldShowSelectSearch } from './selectOptionUtils'

export interface MultiSelectOption {
  label: string
  value: string
  disabled?: boolean
}

export interface MultiSelectProps {
  label?: string
  helperText?: string
  descriptionTooltip?: string
  options: MultiSelectOption[]
  value: string[]
  onChange?(value: string[]): void
  placeholder?: string
  allSelectedLabel?: string
  selectAllLabel?: string
  clearLabel?: string
  compact?: boolean
  disabled?: boolean
  className?: string
}

export function MultiSelect(props: MultiSelectProps) {
  const {
    label,
    helperText,
    descriptionTooltip,
    options,
    value,
    onChange,
    placeholder = 'Select',
    allSelectedLabel = 'All selected',
    selectAllLabel = 'Select all',
    clearLabel = 'Clear all',
    compact = false,
    disabled,
    className = '',
  } = props

  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(-1)

  const searchable = shouldShowSelectSearch(options.length)
  const optionValues = useMemo(() => options.map((option) => option.value), [options])
  const selectedCount = useMemo(() => optionValues.filter((optionValue) => value.includes(optionValue)).length, [optionValues, value])
  const allSelected = optionValues.length > 0 && selectedCount === optionValues.length
  const partiallySelected = selectedCount > 0 && !allSelected
  const selectedLabels = useMemo(() => options.filter((option) => value.includes(option.value)).map((option) => option.label), [options, value])
  const visibleOptions = useMemo(() => (searchable ? filterSelectOptions(options, query) : options), [options, query, searchable])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setHighlightIndex(-1)
  }, [])

  const openPanel = useCallback(() => {
    if (disabled) return
    setHighlightIndex(findNextEnabledSelectIndex(options, -1, 1))
    setQuery('')
    setOpen(true)
  }, [disabled, options])

  function toggle(optionValue: string) {
    if (disabled) return
    const removing = value.includes(optionValue)
    onChange?.(removing ? value.filter((item) => item !== optionValue) : [...value, optionValue])
  }

  function clearAll(event?: MouseEvent) {
    event?.stopPropagation()
    if (disabled || value.length === 0) return
    onChange?.([])
  }

  function toggleSelectAll() {
    if (disabled) return
    if (allSelected) onChange?.([])
    else onChange?.(optionValues)
  }

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
    if ((event.key === 'Enter' || event.key === ' ') && highlightIndex >= 0) {
      if (fromEditable || fromNativeControl) return
      event.preventDefault()
      const option = visibleOptions[highlightIndex]
      if (option && !option.disabled) toggle(option.value)
    }
  }

  useEffect(() => {
    if (!open) return
    setHighlightIndex((current) => {
      if (current >= 0 && current < visibleOptions.length) return current
      return findNextEnabledSelectIndex(visibleOptions, -1, 1)
    })
  }, [open, visibleOptions])

  const summary = allSelected
    ? allSelectedLabel
    : selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(', ')
        : `${selectedLabels.length} selected`

  const showClear = value.length > 0
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
      <div ref={rootRef} className="relative">
        <div
          ref={triggerRef}
          role="combobox"
          tabIndex={disabled ? -1 : 0}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-disabled={disabled || undefined}
          className={`${triggerClass} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${selectedLabels.length || allSelected ? 'text-app-text' : 'text-app-muted'}`}
          onClick={() => (open ? close() : openPanel())}
          onKeyDown={handleTriggerKeyDown}
        >
          <span className="min-w-0 flex-1 truncate">{summary}</span>
          {showClear ? (
            <button
              type="button"
              aria-label={clearLabel}
              title={clearLabel}
              className={`absolute top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-app-muted transition hover:bg-app-subtle hover:text-app-ink ${compact ? 'right-7' : 'right-9'}`}
              onClick={clearAll}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  clearAll()
                }
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
          maxHeight={280}
          header={
            searchable ? (
              <div className="border-b border-app-border/80 p-2">
                <input
                  type="search"
                  value={query}
                  placeholder="Search…"
                  aria-label="Search options"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-lg border border-app-border bg-app-bg px-2.5 py-1.5 text-xs text-app-text outline-none placeholder:text-app-muted/60 focus:border-app-accent"
                  onChange={(event) => setQuery(event.target.value)}
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
          footer={
            <div className="border-t border-app-border/80 px-3 py-2">
              <Checkbox
                compact
                label={selectAllLabel}
                checked={allSelected}
                indeterminate={partiallySelected}
                disabled={disabled || optionValues.length === 0}
                onChange={toggleSelectAll}
              />
            </div>
          }
        >
          {visibleOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-app-muted" role="status">
              No matches
            </div>
          ) : (
            visibleOptions.map((option, index) => {
              const active = value.includes(option.value)
              const highlighted = index === highlightIndex
              return (
                <div
                  key={option.value}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={active}
                  aria-disabled={option.disabled || undefined}
                  className={`px-3 py-2 transition ${highlighted ? 'bg-app-subtle' : active ? 'bg-app-accentSoft' : 'hover:bg-app-subtle'}`}
                  onMouseEnter={() => {
                    if (!option.disabled) setHighlightIndex(index)
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <Checkbox
                    compact
                    label={<span className="truncate">{option.label}</span>}
                    checked={active}
                    disabled={option.disabled || disabled}
                    onChange={() => {
                      if (option.disabled) return
                      toggle(option.value)
                    }}
                  />
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
