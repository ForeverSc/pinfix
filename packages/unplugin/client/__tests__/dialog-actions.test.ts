import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../../../..')

describe('dialog actions', () => {
  it('does not expose a minimize action in the chat dialog or landing demo', () => {
    const pinSource = readFileSync(resolve(root, 'packages/unplugin/client/pin.ts'), 'utf8')
    const landingTemplate = readFileSync(resolve(root, 'docs/landing.template.html'), 'utf8')

    expect(pinSource).not.toContain('Minimize')
    expect(pinSource).not.toContain('ICON_MINIMIZE')
    expect(landingTemplate).not.toContain('M5 12h14')
  })

  it('shows the comment cursor rather than a crosshair in the landing demo selection step', () => {
    const landingTemplate = readFileSync(resolve(root, 'docs/landing.template.html'), 'utf8')

    expect(landingTemplate).toContain('demo-cursor-comment')
    expect(landingTemplate).toContain("cursor.classList.add('comment')")
    expect(landingTemplate).not.toContain('crosshair')
  })
})
