import { describe, expect, it } from 'vitest'
import { FAB_DRAG_THRESHOLD_PX, isFabDragDistanceExceeded } from '../drag'

describe('fab drag threshold', () => {
  it('keeps small pointer jitter as a click', () => {
    expect(isFabDragDistanceExceeded({ x: 100, y: 100 }, { x: 102, y: 101 })).toBe(false)
  })

  it('treats intentional movement as a drag', () => {
    expect(
      isFabDragDistanceExceeded({ x: 100, y: 100 }, { x: 100 + FAB_DRAG_THRESHOLD_PX + 1, y: 100 }),
    ).toBe(true)
  })
})
