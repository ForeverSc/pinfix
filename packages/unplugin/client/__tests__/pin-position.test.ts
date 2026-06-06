import { describe, expect, it } from 'vitest'
import { getDialogDragStart, shouldMoveDialogToPin } from '../pin'

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
})
