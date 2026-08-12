'use client'

import { type CSSProperties, type RefObject, useLayoutEffect, useState } from 'react'

const VIEWPORT_PADDING = 8
const DEFAULT_PANEL_MAX_HEIGHT = 240

export type FloatingPanelWidthMode = 'anchor' | 'content'
export type FloatingPanelPlacement = 'bottom' | 'top'

export interface FloatingPanelState {
  style: CSSProperties
  placement: FloatingPanelPlacement
}

interface UseFloatingPanelOptions {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  panelRef: RefObject<HTMLElement | null>
  maxHeight?: number
  minWidth?: number
  widthMode?: FloatingPanelWidthMode
  /** Overlay z-index; keep above admin chrome / sticky bars. */
  zIndex?: number
}

const HIDDEN: FloatingPanelState = {
  style: { visibility: 'hidden' },
  placement: 'bottom',
}

export function useFloatingPanel({
  open,
  anchorRef,
  panelRef,
  maxHeight = DEFAULT_PANEL_MAX_HEIGHT,
  minWidth,
  widthMode = 'anchor',
  zIndex = 1000,
}: UseFloatingPanelOptions): FloatingPanelState {
  const [state, setState] = useState<FloatingPanelState>(HIDDEN)

  useLayoutEffect(() => {
    if (!open) {
      setState(HIDDEN)
      return
    }

    function updatePosition() {
      const anchor = anchorRef.current
      if (!anchor) return

      const rect = anchor.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      const panelHeight = Math.min(panelRef.current?.offsetHeight ?? maxHeight, maxHeight)
      const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING
      const spaceAbove = rect.top - VIEWPORT_PADDING
      const openAbove = spaceBelow < panelHeight && spaceAbove > spaceBelow
      const placement: FloatingPanelPlacement = openAbove ? 'top' : 'bottom'
      const maxRight = window.innerWidth - VIEWPORT_PADDING

      let left = rect.left

      if (widthMode === 'content') {
        const measured = panelRef.current?.offsetWidth ?? Math.max(rect.width, minWidth ?? 0)
        if (left + measured > maxRight) left = Math.max(VIEWPORT_PADDING, rect.right - measured)
        if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING

        setState({
          placement,
          style: {
            position: 'fixed',
            left,
            maxWidth: maxRight - left,
            maxHeight,
            top: openAbove ? rect.top - 4 : rect.bottom + 4,
            transform: openAbove ? 'translateY(-100%)' : undefined,
            zIndex,
            visibility: 'visible',
          },
        })
        return
      }

      let panelWidth = Math.max(rect.width, minWidth ?? 0)
      if (left + panelWidth > maxRight) left = rect.right - panelWidth
      if (left < VIEWPORT_PADDING) {
        left = VIEWPORT_PADDING
        panelWidth = Math.min(panelWidth, window.innerWidth - VIEWPORT_PADDING * 2)
      }

      setState({
        placement,
        style: {
          position: 'fixed',
          left,
          width: panelWidth,
          minWidth: panelWidth,
          maxHeight,
          top: openAbove ? rect.top - 4 : rect.bottom + 4,
          transform: openAbove ? 'translateY(-100%)' : undefined,
          zIndex,
          visibility: 'visible',
        },
      })
    }

    updatePosition()
    const frameOne = window.requestAnimationFrame(() => {
      updatePosition()
      window.requestAnimationFrame(updatePosition)
    })

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updatePosition) : null
    const anchor = anchorRef.current
    const panel = panelRef.current
    if (anchor) resizeObserver?.observe(anchor)
    if (panel) resizeObserver?.observe(panel)

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.cancelAnimationFrame(frameOne)
      resizeObserver?.disconnect()
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [anchorRef, maxHeight, minWidth, open, panelRef, widthMode, zIndex])

  return state
}
