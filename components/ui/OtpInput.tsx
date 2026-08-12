'use client'

import { type FormEvent, type KeyboardEvent, useId, useLayoutEffect, useRef, useState } from 'react'
import { FiShield } from 'react-icons/fi'

export interface OtpInputProps {
  label?: string
  length?: number
  required?: boolean
  value: string
  onChange(value: string): void
  /** Fires once when the code first becomes complete (ACTIVE clears). Not when editing a full code. */
  onComplete?(value: string): void
}

/**
 * Single persistent input + visual digit cells.
 * Keeps the mobile keyboard open (no per-digit focus hopping / blur).
 */
export function OtpInput({ label = '2FA code', length = 6, required = false, value, onChange, onComplete }: OtpInputProps) {
  const inputId = useId()
  const helperId = `${inputId}-helper`
  const inputRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef(value)
  const selectionRef = useRef<{ start: number; end: number } | null>(null)
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  valueRef.current = value
  const digits = Array.from({ length }, (_, index) => value[index] ?? '')

  useLayoutEffect(() => {
    const input = inputRef.current
    const selection = selectionRef.current
    if (!input || !selection || document.activeElement !== input) return
    input.setSelectionRange(selection.start, selection.end)
  }, [value])

  function focusInput() {
    inputRef.current?.focus({ preventScroll: true })
  }

  function resolveClickIndex(index: number) {
    const current = valueRef.current
    if (current[index]) return index
    return Math.min(current.length, length - 1)
  }

  function placeCaret(index: number) {
    const current = valueRef.current
    if (current[index]) {
      selectionRef.current = { start: index, end: index + 1 }
      setActiveIndex(index)
    } else {
      const caret = Math.min(index, current.length)
      selectionRef.current = { start: caret, end: caret }
      setActiveIndex(caret >= length ? -1 : caret)
    }
    focusInput()
    // Apply immediately for the click path (value may be unchanged).
    requestAnimationFrame(() => {
      const input = inputRef.current
      const selection = selectionRef.current
      if (!input || !selection) return
      input.setSelectionRange(selection.start, selection.end)
    })
  }

  function scheduleAfterEdit(prev: string, next: string) {
    // First time reaching a full code — clear highlight, keep focus (keyboard stays).
    if (next.length >= length && prev.length < length) {
      setActiveIndex(-1)
      selectionRef.current = { start: length, end: length }
      return
    }

    // Editing inside an already-complete code: move to the next digit (select it).
    if (next.length >= length && prev.length >= length) {
      let changed = 0
      while (changed < next.length && next[changed] === prev[changed]) changed += 1
      const nextIndex = changed + 1
      if (nextIndex >= length) {
        setActiveIndex(-1)
        selectionRef.current = { start: length, end: length }
      } else {
        setActiveIndex(nextIndex)
        selectionRef.current = { start: nextIndex, end: nextIndex + 1 }
      }
      return
    }

    if (next.length === prev.length) {
      let changed = 0
      while (changed < next.length && next[changed] === prev[changed]) changed += 1
      const nextIndex = Math.min(changed + 1, length - 1)
      if (next[nextIndex]) {
        setActiveIndex(nextIndex)
        selectionRef.current = { start: nextIndex, end: nextIndex + 1 }
      } else {
        setActiveIndex(nextIndex)
        selectionRef.current = { start: nextIndex, end: nextIndex }
      }
      return
    }

    if (next.length > prev.length) {
      setActiveIndex(next.length)
      selectionRef.current = { start: next.length, end: next.length }
      return
    }

    setActiveIndex(next.length)
    selectionRef.current = { start: next.length, end: next.length }
  }

  function commit(nextRaw: string) {
    const prev = valueRef.current
    const next = nextRaw.replace(/\D/g, '').slice(0, length)
    if (next === prev) {
      // Still refresh selection when value is unchanged (e.g. ignoring non-digits).
      const input = inputRef.current
      if (input && selectionRef.current) {
        input.setSelectionRange(selectionRef.current.start, selectionRef.current.end)
      }
      return
    }
    scheduleAfterEdit(prev, next)
    valueRef.current = next
    onChange(next)
    // Only the incomplete → complete transition (ACTIVE just cleared). Editing a full code must not fire.
    if (next.length >= length && prev.length < length) {
      onComplete?.(next)
    }
  }

  function handleChange(event: FormEvent<HTMLInputElement>) {
    commit(event.currentTarget.value)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const start = input.selectionStart ?? valueRef.current.length
    const end = input.selectionEnd ?? start

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      const index = Math.max(0, (start === end ? start : start) - 1)
      placeCaret(Math.min(index, Math.max(valueRef.current.length - 1, 0)))
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      const maxIndex = Math.min(valueRef.current.length, length - 1)
      const index = Math.min(maxIndex, end)
      placeCaret(index)
      return
    }

    if (event.key === 'Backspace') {
      // Let the browser delete, then sanitize via onChange — keeps mobile IME happy.
      // If caret is between digits with no selection and previous char exists, default is fine.
      return
    }

    // Digits: if a cell is selected, native replace works. If caret sits after a digit
    // (common on mobile), force replace at that visual index instead of being blocked.
    if (/^\d$/.test(event.key) && start === end && start < valueRef.current.length && start < length) {
      event.preventDefault()
      const next = `${valueRef.current.slice(0, start)}${event.key}${valueRef.current.slice(start + 1)}`
      commit(next)
    }
  }

  const highlightIndex = focused ? activeIndex : -1

  return (
    <fieldset className="relative block text-left">
      <legend className="flex w-full items-center justify-between gap-3">
        <span className="ui-label">{label}</span>
        <span className="inline-flex items-center gap-1.5 text-[0.6rem] text-app-muted">
          <FiShield className="h-3.5 w-3.5" aria-hidden /> Authenticator
        </span>
      </legend>

      <div className="relative mt-2">
        <div className="grid grid-cols-6 gap-2" aria-hidden="true">
          {Array.from({ length }, (_, index) => {
            const digit = digits[index]
            const active = index === highlightIndex
            return (
              <button
                key={index}
                type="button"
                tabIndex={-1}
                className={`grid h-14 place-items-center rounded-xl border bg-app-bg/60 font-mono text-xl font-semibold tabular-nums text-app-ink transition duration-150 ${active ? 'border-app-accent shadow-[0_0_0_3px_rgb(var(--app-accent)/0.12)]' : digit ? 'border-app-muted/70 bg-app-subtle/45' : 'border-app-border'}`}
                onPointerDown={(event) => {
                  event.preventDefault()
                  placeCaret(resolveClickIndex(index))
                }}
              >
                {digit}
              </button>
            )
          })}
        </div>

        <input
          ref={inputRef}
          id={inputId}
          name="token"
          type="text"
          value={value}
          required={required}
          inputMode="numeric"
          pattern={`[0-9]*`}
          autoComplete="one-time-code"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          maxLength={length}
          aria-describedby={helperId}
          aria-label={label}
          // Keep in the layout for iOS focus/keyboard, but invisible and non-intercepting for taps.
          className="pointer-events-none absolute inset-0 z-10 h-full w-full caret-transparent opacity-0"
          style={{ fontSize: 16 }}
          onFocus={() => {
            setFocused(true)
            if (activeIndex < 0) {
              const index = Math.min(valueRef.current.length, length - 1)
              setActiveIndex(valueRef.current.length >= length ? -1 : index)
            }
          }}
          onBlur={() => {
            setFocused(false)
            setActiveIndex(-1)
          }}
          onSelect={(event) => {
            const start = event.currentTarget.selectionStart ?? 0
            const end = event.currentTarget.selectionEnd ?? start
            if (valueRef.current.length >= length && start === end && start >= length) {
              setActiveIndex(-1)
              return
            }
            if (end === start + 1) {
              setActiveIndex(start)
              return
            }
            setActiveIndex(Math.min(start, length - 1))
          }}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
        />
      </div>

      <p id={helperId} className="mt-2 text-[0.65rem] leading-5 text-app-muted">
        Enter the {length}-digit code from your authenticator app.
      </p>
    </fieldset>
  )
}
