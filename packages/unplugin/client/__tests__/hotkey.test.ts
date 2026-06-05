import { describe, expect, it } from 'vitest'
import { isHotkeyPressed, normalizeHotkeyEvent, parseHotkey } from '../hotkey'

describe('hotkey matching', () => {
  it('matches configured letter keys by physical key code when Alt changes the printable key', () => {
    const pressed = new Set<string>()
    pressed.add(normalizeHotkeyEvent({ key: 'Alt', code: 'AltLeft' }))
    pressed.add(normalizeHotkeyEvent({ key: 'Shift', code: 'ShiftLeft' }))
    pressed.add(normalizeHotkeyEvent({ key: 'Ω', code: 'KeyZ' }))

    expect(isHotkeyPressed(parseHotkey('alt+shift+z'), pressed)).toBe(true)
  })
})
