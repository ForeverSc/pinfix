import { describe, expect, it, vi } from 'vitest'
import {
  SELECTION_CURSOR,
  applySelectionModeState,
  createSelectionCursorRule,
  getSelectionModeAfterSourceClick,
} from '../selection-mode'

describe('selection mode state', () => {
  it('leaves selection mode after selecting a source element', () => {
    expect(getSelectionModeAfterSourceClick(true)).toBe(false)
  })

  it('uses a comment cursor while selecting a source element', () => {
    const controls = {
      setCursor: vi.fn(),
      setFabActive: vi.fn(),
      hideHighlight: vi.fn(),
    }

    applySelectionModeState(true, controls)

    expect(controls.setCursor).toHaveBeenCalledWith(SELECTION_CURSOR)
    expect(SELECTION_CURSOR).toContain('data:image/svg+xml')
    expect(SELECTION_CURSOR).toContain('pointer')
    expect(SELECTION_CURSOR).not.toBe('crosshair')
    expect(controls.setFabActive).toHaveBeenCalledWith(true)
    expect(controls.hideHighlight).not.toHaveBeenCalled()
  })

  it('creates a page-wide cursor rule so selectable elements cannot override the comment cursor', () => {
    const rule = createSelectionCursorRule(SELECTION_CURSOR)

    expect(rule).toContain('html[data-pinfix-selecting="true"]')
    expect(rule).toContain('html[data-pinfix-selecting="true"] *')
    expect(rule).toContain(SELECTION_CURSOR)
    expect(rule).toContain('!important')
  })

  it('clears selection affordances when deactivated', () => {
    const controls = {
      setCursor: vi.fn(),
      setFabActive: vi.fn(),
      hideHighlight: vi.fn(),
    }

    applySelectionModeState(false, controls)

    expect(controls.setCursor).toHaveBeenCalledWith('')
    expect(controls.setFabActive).toHaveBeenCalledWith(false)
    expect(controls.hideHighlight).toHaveBeenCalledOnce()
  })
})
