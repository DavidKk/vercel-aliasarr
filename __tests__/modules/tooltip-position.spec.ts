/**
 * @jest-environment jsdom
 */
/// <reference types="jest" />

import { computeTooltipPosition } from '@/components/ui/tooltipPosition'

describe('computeTooltipPosition', () => {
  const viewport = { width: 1000, height: 800 }

  function rect(partial: Partial<DOMRect>): DOMRect {
    const top = partial.top ?? 0
    const left = partial.left ?? 0
    const width = partial.width ?? 40
    const height = partial.height ?? 20
    return {
      top,
      left,
      width,
      height,
      bottom: partial.bottom ?? top + height,
      right: partial.right ?? left + width,
      x: left,
      y: top,
      toJSON() {
        return {}
      },
    }
  }

  it('places below when there is room', () => {
    const result = computeTooltipPosition(rect({ top: 100, left: 100 }), 120, 32, 'bottom', viewport)
    expect(result.placement).toBe('bottom')
    expect(result.top).toBeGreaterThan(120)
  })

  it('flips upward near the bottom edge', () => {
    const result = computeTooltipPosition(rect({ top: 760, left: 100 }), 120, 32, 'bottom', viewport)
    expect(result.placement).toBe('top')
    expect(result.top).toBeLessThan(760)
  })

  it('clamps horizontally inside the viewport', () => {
    const result = computeTooltipPosition(rect({ top: 100, left: 980 }), 200, 32, 'bottom', viewport)
    expect(result.left).toBeGreaterThanOrEqual(8)
    expect(result.left + 200).toBeLessThanOrEqual(1000 - 8)
  })
})
