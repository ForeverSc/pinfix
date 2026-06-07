import { describe, it, expect } from 'vitest'
import { isPinMessage, isSessionStartMessage, isWorkspaceResetMessage } from '../types'

describe('isPinMessage', () => {
  it('validates a correct pin message', () => {
    const msg = {
      type: 'pin',
      id: 'pin_01',
      source: '/src/Button.tsx:14:3',
      position: { x: 100, y: 200 },
      comment: 'make it blue',
    }
    expect(isPinMessage(msg)).toBe(true)
  })

  it('rejects message without source', () => {
    const msg = { type: 'pin', id: 'pin_01', comment: 'hi' }
    expect(isPinMessage(msg)).toBe(false)
  })

  it('rejects null', () => {
    expect(isPinMessage(null)).toBe(false)
  })

  it('rejects non-object', () => {
    expect(isPinMessage('hello')).toBe(false)
  })

  it('rejects message with wrong type', () => {
    const msg = {
      type: 'comment',
      id: 'pin_01',
      source: '/src/Button.tsx:14:3',
      position: { x: 100, y: 200 },
      comment: 'make it blue',
    }
    expect(isPinMessage(msg)).toBe(false)
  })
})

describe('isWorkspaceResetMessage', () => {
  it('validates workspace reset messages', () => {
    expect(isWorkspaceResetMessage({ type: 'workspace:reset' })).toBe(true)
    expect(isWorkspaceResetMessage({ type: 'workspace:reset', prompt: 'custom prompt' })).toBe(true)
  })

  it('rejects reset messages with invalid prompt', () => {
    expect(isWorkspaceResetMessage({ type: 'workspace:reset', prompt: 123 })).toBe(false)
  })
})

describe('isSessionStartMessage', () => {
  it('validates session start messages with optional prompt', () => {
    expect(
      isSessionStartMessage({ type: 'session:start', pinId: 'pin_01', source: 'src/App.tsx:1:1' }),
    ).toBe(true)
    expect(
      isSessionStartMessage({
        type: 'session:start',
        pinId: 'pin_01',
        source: 'src/App.tsx:1:1',
        prompt: 'custom prompt',
      }),
    ).toBe(true)
  })

  it('rejects session start messages with invalid prompt', () => {
    expect(
      isSessionStartMessage({
        type: 'session:start',
        pinId: 'pin_01',
        source: 'src/App.tsx:1:1',
        prompt: 123,
      }),
    ).toBe(false)
  })
})
