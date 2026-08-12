'use client'

import { type CSSProperties, type ReactElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import { CONTROL_RADIUS } from './controlStyles'
import { computeTooltipPosition, type TooltipPlacement } from './tooltipPosition'

export interface TooltipProps {
  /** Short hint; keep concise so it stays in viewport. */
  content: string
  placement?: TooltipPlacement
  children: ReactElement
  /** Extra class on the trigger wrapper (e.g. `block w-full`). */
  triggerClassName?: string
}

const TOOLTIP_MEDIA_QUERY = '(hover: hover) and (pointer: fine) and (min-width: 768px)'
const TOOLTIP_CLASS = [
  'z-[1100] max-w-[min(calc(100vw-16px),28rem)] whitespace-pre-line break-words border border-app-border/80',
  'bg-app-surface px-2.5 py-1.5 text-xs leading-snug text-app-text shadow-[0_16px_40px_rgb(0_0_0/0.35)]',
  CONTROL_RADIUS,
].join(' ')

let tooltipMedia: MediaQueryList | null = null
let tooltipMediaListening = false
const tooltipMediaListeners = new Set<() => void>()

function ensureTooltipMediaListening() {
  if (typeof window === 'undefined' || tooltipMediaListening) return
  tooltipMedia = window.matchMedia(TOOLTIP_MEDIA_QUERY)
  const notify = () => {
    for (const listener of tooltipMediaListeners) listener()
  }
  tooltipMedia.addEventListener('change', notify)
  tooltipMediaListening = true
}

function subscribeTooltipEnabled(onStoreChange: () => void): () => void {
  ensureTooltipMediaListening()
  tooltipMediaListeners.add(onStoreChange)
  return () => {
    tooltipMediaListeners.delete(onStoreChange)
  }
}

function getTooltipEnabledSnapshot(): boolean {
  return tooltipMedia?.matches ?? false
}

function getTooltipEnabledServerSnapshot(): boolean {
  return false
}

/** Desktop fine-pointer only; touch / narrow viewports skip hover tips. */
function useTooltipEnabled(): boolean {
  return useSyncExternalStore(subscribeTooltipEnabled, getTooltipEnabledSnapshot, getTooltipEnabledServerSnapshot)
}

export function Tooltip({ content, placement = 'bottom', children, triggerClassName = '' }: TooltipProps) {
  const enabled = useTooltipEnabled()
  const tooltipId = useId()
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', left: 0, top: 0, visibility: 'hidden' })
  const triggerRef = useRef<HTMLSpanElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  const close = useCallback(() => setOpen(false), [])

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const tooltip = tooltipRef.current
    const { left, top } = computeTooltipPosition(rect, tooltip.offsetWidth, tooltip.offsetHeight, placement, {
      width: window.innerWidth,
      height: window.innerHeight,
    })
    setStyle((prev) => {
      if (prev.left === left && prev.top === top && prev.visibility === 'visible') return prev
      return { position: 'fixed', left, top, visibility: 'visible' }
    })
  }, [placement])

  useLayoutEffect(() => {
    if (!enabled || !open) return
    updatePosition()
    const handleViewportChange = () => updatePosition()
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)
    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [content, enabled, open, updatePosition])

  useEffect(() => {
    if (!enabled || !open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [close, enabled, open])

  useEffect(() => {
    if (!enabled) setOpen(false)
  }, [enabled])

  const tooltipEl =
    enabled && open ? (
      <div ref={tooltipRef} id={tooltipId} role="tooltip" className={TOOLTIP_CLASS} style={style}>
        {content}
      </div>
    ) : null

  return (
    <>
      <span
        ref={triggerRef}
        className={triggerClassName || 'inline-flex items-center leading-none'}
        aria-describedby={enabled && open ? tooltipId : undefined}
        onMouseEnter={enabled ? () => setOpen(true) : undefined}
        onMouseLeave={enabled ? close : undefined}
        onFocusCapture={
          enabled
            ? (event) => {
                const target = event.target
                if (target instanceof Element && target.matches(':focus-visible')) setOpen(true)
              }
            : undefined
        }
        onBlurCapture={enabled ? close : undefined}
      >
        {children}
      </span>
      {typeof document !== 'undefined' && tooltipEl ? createPortal(tooltipEl, document.body) : null}
    </>
  )
}
