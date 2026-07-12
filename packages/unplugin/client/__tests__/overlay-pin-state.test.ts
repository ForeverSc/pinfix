import { describe, expect, it } from 'vitest'
import type { Pin } from '../pin'

function makePin(id: string): Pin {
  return {
    id,
    source: `${id}.tsx:1:1`,
    x: 10,
    y: 10,
    comment: '',
    status: 'editing',
  }
}

describe('overlay pin state', () => {
  it('commits only the matching pending design preview when chat completes', async () => {
    ;(globalThis as any).document = {
      readyState: 'loading',
      addEventListener: () => {},
    }
    const { shouldCommitDesignPreview } = await import('../overlay')

    expect(shouldCommitDesignPreview(true, 'pin_active', 'pin_active')).toBe(true)
    expect(shouldCommitDesignPreview(false, 'pin_active', 'pin_active')).toBe(false)
    expect(shouldCommitDesignPreview(true, 'pin_active', 'pin_other')).toBe(false)
    expect(shouldCommitDesignPreview(true, 'pin_active', null)).toBe(false)
  })

  it('replaces existing pins when a new target is selected', async () => {
    ;(globalThis as any).document = {
      readyState: 'loading',
      addEventListener: () => {},
    }
    const { replacePinsWithSingleTarget } = await import('../overlay')
    const first = makePin('pin_first')
    const second = makePin('pin_second')
    const next = makePin('pin_next')
    const pins = [first, second]
    const removed: string[] = []

    replacePinsWithSingleTarget(pins, next, (pinId) => {
      removed.push(pinId)
      const index = pins.findIndex((pin) => pin.id === pinId)
      if (index !== -1) pins.splice(index, 1)
    })

    expect(removed).toEqual(['pin_first', 'pin_second'])
    expect(pins).toEqual([next])
  })

  it('shows the fixed FAB only when there are no pins on the page', async () => {
    ;(globalThis as any).document = {
      readyState: 'loading',
      addEventListener: () => {},
    }
    const { shouldShowFabForPinCount } = await import('../overlay')

    expect(shouldShowFabForPinCount(0)).toBe(true)
    expect(shouldShowFabForPinCount(1)).toBe(false)
    expect(shouldShowFabForPinCount(2)).toBe(false)
  })

  it('resets active pin UI state when the active target is removed', async () => {
    ;(globalThis as any).document = {
      readyState: 'loading',
      addEventListener: () => {},
    }
    const { handleRemovedPinUiState } = await import('../overlay')
    const calls: string[] = []

    handleRemovedPinUiState('pin_active', 'pin_active', {
      setVisualChange: () => calls.push('setVisualChange'),
      hideTyping: () => calls.push('hideTyping'),
      setStreaming: (streaming) => calls.push(`setStreaming:${streaming}`),
      hideDialog: () => calls.push('hideDialog'),
      setActivePinId: (pinId) => calls.push(`setActivePinId:${pinId}`),
    })

    expect(calls).toEqual([
      'setVisualChange',
      'hideTyping',
      'setStreaming:false',
      'hideDialog',
      'setActivePinId:null',
    ])
  })

  it('keeps the active pin visible and re-enters selection mode when the pin is clicked', async () => {
    ;(globalThis as any).document = {
      readyState: 'loading',
      addEventListener: () => {},
    }
    const { handlePinClick } = await import('../overlay')
    const calls: string[] = []

    handlePinClick('pin_active', 'pin_active', {
      beginRelocatingPin: (pinId) => calls.push(`beginRelocatingPin:${pinId}`),
      setSelectionMode: (active) => calls.push(`setSelectionMode:${active}`),
      activatePin: (pinId) => calls.push(`activatePin:${pinId}`),
    })

    expect(calls).toEqual(['beginRelocatingPin:pin_active', 'setSelectionMode:true'])
  })

  it('moves a picked-up pin with the pointer without changing its center coordinate contract', async () => {
    ;(globalThis as any).document = {
      readyState: 'loading',
      addEventListener: () => {},
    }
    const { movePinToPointer } = await import('../overlay')
    const pin = makePin('pin_active')
    const style: Record<string, string> = {}
    pin.el = { style } as unknown as HTMLElement

    movePinToPointer(pin, { x: 88, y: 144 })

    expect(pin.x).toBe(88)
    expect(pin.y).toBe(144)
    expect(style.left).toBe('76px')
    expect(style.top).toBe('132px')
  })
})
