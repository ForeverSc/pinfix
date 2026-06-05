export type HotkeyEventLike = Pick<KeyboardEvent, 'key' | 'code'>

const KEY_ALIASES: Record<string, string> = {
  control: 'ctrl',
  cmd: 'meta',
  command: 'meta',
  option: 'alt',
}

function normalizeHotkeyToken(token: string): string {
  const key = token.trim().toLowerCase()
  return KEY_ALIASES[key] ?? key
}

export function parseHotkey(raw = 'alt+shift+z'): Set<string> {
  return new Set(raw.split('+').map(normalizeHotkeyToken).filter(Boolean))
}

export function normalizeHotkeyEvent(e: HotkeyEventLike): string {
  if (e.key === 'Control') return 'ctrl'
  if (e.key === 'Meta') return 'meta'
  if (e.key === 'Alt') return 'alt'
  if (e.key === 'Shift') return 'shift'

  if (/^Key[A-Z]$/.test(e.code)) return e.code.slice(3).toLowerCase()
  if (/^Digit[0-9]$/.test(e.code)) return e.code.slice(5)

  return normalizeHotkeyToken(e.key)
}

export function isHotkeyPressed(keys: Set<string>, pressed: Set<string>): boolean {
  for (const k of keys) {
    if (!pressed.has(k)) return false
  }
  return true
}
