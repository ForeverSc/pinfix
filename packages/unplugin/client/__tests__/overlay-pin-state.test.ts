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
})
