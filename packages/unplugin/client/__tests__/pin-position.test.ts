import { describe, expect, it } from 'vitest'
import { getDialogDragStart, getDialogPositionNearPin, shouldMoveDialogToPin } from '../pin'

describe('dialog positioning', () => {
  it('allows explicit pin selection to move the dialog after manual drag', () => {
    expect(shouldMoveDialogToPin(true)).toBe(false)
    expect(shouldMoveDialogToPin(true, { force: true })).toBe(true)
    expect(shouldMoveDialogToPin(false)).toBe(true)
  })

  it('starts dragging from the dialog current position after it was moved to another pin', () => {
    const dialog = {
      style: {
        left: '240px',
        top: '80px',
      },
    } as HTMLElement

    const dragStart = getDialogDragStart(dialog, { x: 260, y: 92 }, { x: 40, y: 20 })

    expect(dragStart.dialogX).toBe(240)
    expect(dragStart.dialogY).toBe(80)
    expect(dragStart.dragX).toBe(20)
    expect(dragStart.dragY).toBe(12)
  })

  it('keeps the dialog inside the viewport near edge pins', () => {
    const position = getDialogPositionNearPin(
      { x: 790, y: 590 },
      { width: 320, height: 448 },
      { width: 800, height: 600 },
    )

    expect(position.x).toBe(472)
    expect(position.y).toBe(144)
  })

  it('uses the preferred pin-adjacent position when it fits in the viewport', () => {
    const position = getDialogPositionNearPin(
      { x: 100, y: 80 },
      { width: 320, height: 448 },
      { width: 800, height: 600 },
    )

    expect(position.x).toBe(116)
    expect(position.y).toBe(76)
  })
})
