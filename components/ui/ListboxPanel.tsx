'use client'

import { type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { dropdownMenuRadius } from './controlStyles'
import { type FloatingPanelWidthMode, useFloatingPanel } from './useFloatingPanel'

const PANEL_MAX_HEIGHT_PX = 240

export interface ListboxPanelProps {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  boundaryRef?: RefObject<HTMLElement | null>
  listboxId: string
  /** Fixed above the scrollable options (search, etc.). */
  header?: ReactNode
  /** Fixed below the scrollable options (select-all, etc.). */
  footer?: ReactNode
  children: ReactNode
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void
  activeDescendantId?: string
  onClose?: () => void
  widthMode?: FloatingPanelWidthMode
  minWidth?: number
  maxHeight?: number
}

export function ListboxPanel({
  open,
  anchorRef,
  boundaryRef,
  listboxId,
  header,
  footer,
  children,
  onKeyDown,
  activeDescendantId,
  onClose,
  widthMode = 'anchor',
  minWidth,
  maxHeight = PANEL_MAX_HEIGHT_PX,
}: ListboxPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { style, placement } = useFloatingPanel({ open, anchorRef, panelRef, maxHeight, minWidth, widthMode })
  const dismissBoundaryRef = boundaryRef ?? anchorRef

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (dismissBoundaryRef.current?.contains(target) || panelRef.current?.contains(target)) return
      onClose?.()
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [dismissBoundaryRef, onClose, open])

  useEffect(() => {
    if (!open || !activeDescendantId) return
    document.getElementById(activeDescendantId)?.scrollIntoView({ block: 'nearest' })
  }, [activeDescendantId, open])

  if (!open || typeof document === 'undefined') return null

  const panelStyle: CSSProperties = { ...style, maxHeight }

  return createPortal(
    <div
      ref={panelRef}
      data-listbox-panel=""
      data-placement={placement}
      style={panelStyle}
      className={`flex flex-col overflow-hidden border border-app-border bg-app-surface shadow-lg ${dropdownMenuRadius(placement)} ${widthMode === 'content' ? 'w-max' : ''}`}
      onKeyDown={onKeyDown}
    >
      {header ? <div className="shrink-0">{header}</div> : null}
      <div id={listboxId} role="listbox" tabIndex={-1} aria-activedescendant={activeDescendantId} className="min-h-0 flex-1 overflow-auto py-1">
        {children}
      </div>
      {footer ? <div className="shrink-0">{footer}</div> : null}
    </div>,
    document.body
  )
}
