import { describe, expect, it, vi } from 'vitest'
import { applySelectionModeState, getSelectionModeAfterSourceClick } from '../selection-mode'

describe('selection mode state', () => {
  it('leaves selection mode after selecting a source element', () => {
    expect(getSelectionModeAfterSourceClick(true)).toBe(false)
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
