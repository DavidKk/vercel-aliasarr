'use client'

import type { PointerEvent as ReactPointerEvent, ReactNode, TouchEvent as ReactTouchEvent, WheelEvent as ReactWheelEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

type Edge = 'top' | 'bottom' | null

interface ScrollMetrics {
  maxScroll: number
  thumbHeight: number
  thumbOffset: number
  trackHeight: number
  visible: boolean
}

const EMPTY_METRICS: ScrollMetrics = {
  maxScroll: 0,
  thumbHeight: 0,
  thumbOffset: 0,
  trackHeight: 0,
  visible: false,
}

export function AdminScrollArea({ children, className = '' }: { children: ReactNode; className?: string }) {
  const scrollerRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ edge: Edge; y: number } | null>(null)
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pullFrameRef = useRef(0)
  const draggingRef = useRef(false)
  const nativeBounceRef = useRef(false)
  const pullRef = useRef<{ distance: number; edge: Edge }>({ distance: 0, edge: null })
  const pullTargetRef = useRef<{ distance: number; edge: Edge }>({ distance: 0, edge: null })
  const [metrics, setMetrics] = useState<ScrollMetrics>(EMPTY_METRICS)
  const [pull, setPull] = useState<{ distance: number; edge: Edge }>({ distance: 0, edge: null })
  const [active, setActive] = useState(false)

  const updateMetrics = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const trackHeight = Math.max(0, scroller.clientHeight - 16)
    const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
    const visible = maxScroll > 1 && trackHeight > 0
    const thumbHeight = visible ? Math.max(42, trackHeight * (scroller.clientHeight / scroller.scrollHeight)) : trackHeight
    const travel = Math.max(0, trackHeight - thumbHeight)
    const clampedScrollTop = Math.min(maxScroll, Math.max(0, scroller.scrollTop))
    const thumbOffset = maxScroll > 0 ? travel * (clampedScrollTop / maxScroll) : 0

    setMetrics({ maxScroll, thumbHeight, thumbOffset, trackHeight, visible })
  }, [])

  const markActive = useCallback(() => {
    setActive(true)
    if (activeTimerRef.current) clearTimeout(activeTimerRef.current)
    activeTimerRef.current = setTimeout(() => setActive(false), 900)
  }, [])

  const startPullAnimation = useCallback(() => {
    if (pullFrameRef.current) return

    const tick = () => {
      const current = pullRef.current
      const target = pullTargetRef.current
      const edge = target.edge
      const targetDistance = target.distance
      const response = targetDistance > current.distance ? 0.34 : 0.22
      const nextDistance = current.distance + (targetDistance - current.distance) * response
      const settled = target.distance === 0 && nextDistance < 0.08
      const holding = target.distance > 0 && Math.abs(targetDistance - nextDistance) < 0.08
      const next = settled ? { distance: 0, edge: null as Edge } : holding ? { distance: target.distance, edge: target.edge } : { distance: nextDistance, edge }

      pullRef.current = next
      setPull(next)

      if (settled || holding) {
        pullFrameRef.current = 0
        return
      }
      pullFrameRef.current = requestAnimationFrame(tick)
    }

    pullFrameRef.current = requestAnimationFrame(tick)
  }, [])

  const releasePull = useCallback(
    (detachFromEdge = false) => {
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current)
      const edge = detachFromEdge ? null : (pullRef.current.edge ?? pullTargetRef.current.edge)
      if (detachFromEdge && pullRef.current.edge) {
        pullRef.current = { ...pullRef.current, edge: null }
        setPull(pullRef.current)
      }
      pullTargetRef.current = { distance: 0, edge }
      startPullAnimation()
    },
    [startPullAnimation]
  )

  const applyPull = useCallback(
    (edge: Exclude<Edge, null>, distance: number) => {
      const targetDistance = Math.min(72, Math.max(0, distance))
      if (pullRef.current.edge !== edge) {
        pullRef.current = { edge, distance: Math.min(pullRef.current.distance, targetDistance) }
        setPull(pullRef.current)
      }
      pullTargetRef.current = { edge, distance: targetDistance }
      startPullAnimation()
      markActive()
    },
    [markActive, startPullAnimation]
  )

  useEffect(() => {
    const scroller = scrollerRef.current
    const content = contentRef.current
    if (!scroller || !content) return

    let frame = 0
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(updateMetrics)
    }
    const handleScroll = () => {
      scheduleUpdate()
      markActive()
      const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight)

      // Safari exposes its rubber-band distance as out-of-range scrollTop.
      // Follow that value directly so the custom thumb rebounds with the system.
      if (scroller.scrollTop < 0) {
        nativeBounceRef.current = true
        applyPull('top', Math.abs(scroller.scrollTop) * 0.72)
        return
      }
      if (scroller.scrollTop > maxScroll) {
        nativeBounceRef.current = true
        applyPull('bottom', (scroller.scrollTop - maxScroll) * 0.72)
        return
      }
      if (nativeBounceRef.current) {
        nativeBounceRef.current = false
        releasePull()
        return
      }
      if ((scroller.scrollTop <= 1.5 && pullRef.current.edge === 'bottom') || (scroller.scrollTop >= maxScroll - 1.5 && pullRef.current.edge === 'top')) {
        releasePull(true)
        return
      }
      if (scroller.scrollTop > 0 && scroller.scrollTop < maxScroll && pullRef.current.edge) {
        releasePull(true)
      }
    }

    const resizeObserver = new ResizeObserver(scheduleUpdate)
    resizeObserver.observe(scroller)
    resizeObserver.observe(content)
    scroller.addEventListener('scroll', handleScroll, { passive: true })
    scheduleUpdate()

    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(pullFrameRef.current)
      pullFrameRef.current = 0
      resizeObserver.disconnect()
      scroller.removeEventListener('scroll', handleScroll)
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current)
      if (activeTimerRef.current) clearTimeout(activeTimerRef.current)
    }
  }, [applyPull, markActive, releasePull, updateMetrics])

  function handleWheel(event: ReactWheelEvent<HTMLElement>) {
    const scroller = scrollerRef.current
    if (!scroller || !metrics.visible) return

    const edgeTolerance = 1.5
    const atTop = scroller.scrollTop <= edgeTolerance
    const atBottom = scroller.scrollTop >= metrics.maxScroll - edgeTolerance
    // Do not accumulate wheel input. Trackpads already emit a decaying delta
    // during their inertial rebound, so using each frame keeps both in sync.
    if (atTop && event.deltaY < 0) {
      const overshoot = Math.max(0, Math.abs(event.deltaY) - Math.max(0, scroller.scrollTop))
      applyPull('top', overshoot * 0.58)
    } else if (atBottom && event.deltaY > 0) {
      const remaining = Math.max(0, metrics.maxScroll - scroller.scrollTop)
      applyPull('bottom', Math.max(0, event.deltaY - remaining) * 0.58)
    } else return

    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current)
    releaseTimerRef.current = setTimeout(releasePull, 48)
  }

  function handleTouchStart(event: ReactTouchEvent<HTMLElement>) {
    const scroller = scrollerRef.current
    if (!scroller || event.touches.length !== 1) return
    const edge = scroller.scrollTop <= 1.5 ? 'top' : scroller.scrollTop >= metrics.maxScroll - 1.5 ? 'bottom' : null
    touchStartRef.current = { edge, y: event.touches[0].clientY }
  }

  function handleTouchMove(event: ReactTouchEvent<HTMLElement>) {
    const start = touchStartRef.current
    if (!start?.edge || event.touches.length !== 1) return
    const delta = event.touches[0].clientY - start.y
    if (start.edge === 'top' && delta > 0) applyPull('top', delta * 0.38)
    if (start.edge === 'bottom' && delta < 0) applyPull('bottom', Math.abs(delta) * 0.38)
  }

  function handleTouchEnd() {
    touchStartRef.current = null
    requestAnimationFrame(() => {
      const scroller = scrollerRef.current
      if (!scroller) return
      const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
      const systemIsRebounding = scroller.scrollTop < 0 || scroller.scrollTop > maxScroll
      if (!systemIsRebounding && pullRef.current.edge) releasePull()
    })
  }

  function scrollFromPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current
    if (!scroller || !metrics.visible) return
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientY - rect.top - metrics.thumbHeight / 2) / Math.max(1, metrics.trackHeight - metrics.thumbHeight)))
    scroller.scrollTo({ top: ratio * metrics.maxScroll })
  }

  const compression = Math.min(metrics.thumbHeight * 0.52, pull.distance * 0.72)
  const renderedHeight = Math.max(18, metrics.thumbHeight - compression)
  const renderedOffset = pull.edge === 'top' ? 0 : pull.edge === 'bottom' ? metrics.trackHeight - renderedHeight : metrics.thumbOffset

  return (
    <div className="relative min-h-0 flex-1">
      <section
        id="admin-scroll-content"
        ref={scrollerRef}
        className={`admin-scroll-content h-full overflow-y-auto overscroll-contain ${className}`}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div ref={contentRef} className="min-h-full w-full">
          {children}
        </div>
      </section>

      <div
        role="scrollbar"
        aria-label="Admin content scroll position"
        aria-controls="admin-scroll-content"
        aria-valuemin={0}
        aria-valuemax={Math.round(metrics.maxScroll)}
        aria-valuenow={Math.round(scrollerRef.current?.scrollTop ?? 0)}
        className={`absolute inset-y-2 right-1 z-40 w-2 touch-none rounded-full transition-opacity duration-300 ${metrics.visible ? (active || draggingRef.current ? 'opacity-100' : 'opacity-55') : 'pointer-events-none opacity-0'}`}
        onPointerDown={(event) => {
          draggingRef.current = true
          setActive(true)
          event.currentTarget.setPointerCapture(event.pointerId)
          scrollFromPointer(event)
        }}
        onPointerMove={(event) => {
          if (draggingRef.current) scrollFromPointer(event)
        }}
        onPointerUp={(event) => {
          draggingRef.current = false
          event.currentTarget.releasePointerCapture(event.pointerId)
          markActive()
        }}
        onPointerCancel={() => {
          draggingRef.current = false
          markActive()
        }}
      >
        <span
          className="absolute right-0 block w-1.5 rounded-full bg-app-muted/65 shadow-[0_0_0_1px_rgb(var(--app-bg)/0.28)]"
          style={{ height: renderedHeight, transform: `translate3d(0, ${renderedOffset}px, 0)` }}
        />
      </div>
    </div>
  )
}
