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

  it('shows the picked-up comment marker rather than a crosshair in the landing demo selection step', () => {
    const landingTemplate = readFileSync(resolve(root, 'docs/landing.template.html'), 'utf8')
    const markerMarkup = landingTemplate.match(
      /<div class="demo-selection-marker" id="demo-selection-marker">[\s\S]*?<\/div>/,
    )?.[0]

    expect(landingTemplate).toContain('demo-selection-marker')
    expect(landingTemplate).toContain("marker.classList.add('visible')")
    expect(landingTemplate).toContain("fab.classList.add('picked-up')")
    expect(landingTemplate).toContain('.demo-fab.active.picked-up')
    expect(landingTemplate).toContain('opacity: 0;')
    expect(markerMarkup).toBeDefined()
    expect(markerMarkup).not.toContain('M12 8v6')
    expect(markerMarkup).not.toContain('M9 11h6')
    expect(landingTemplate).not.toContain('crosshair')
  })

  it('uses a plain comment marker and hides the fixed FAB while selecting', () => {
    const overlaySource = readFileSync(resolve(root, 'packages/unplugin/client/overlay.ts'), 'utf8')
    const stylesSource = readFileSync(resolve(root, 'packages/unplugin/client/styles.ts'), 'utf8')

    expect(overlaySource).toContain("import { ICON_COMMENT, ICON_COMMENT_PLUS } from './icons.js'")
    expect(overlaySource).toContain('marker.innerHTML = ICON_COMMENT')
    expect(overlaySource).not.toContain('marker.innerHTML = ICON_COMMENT_PLUS')
    expect(stylesSource).toContain('.pinfix-fab.active')
    expect(stylesSource).toContain('opacity: 0;')
    expect(stylesSource).toContain('pointer-events: none;')
    expect(stylesSource).toContain('.pinfix-pin-relocating')
  })

  it('does not duplicate the comment icon in the chat dialog header', () => {
    const pinSource = readFileSync(resolve(root, 'packages/unplugin/client/pin.ts'), 'utf8')
    const stylesSource = readFileSync(resolve(root, 'packages/unplugin/client/styles.ts'), 'utf8')
    const landingTemplate = readFileSync(resolve(root, 'docs/landing.template.html'), 'utf8')

    expect(pinSource).not.toContain('pinfix-chat-header-icon')
    expect(stylesSource).not.toContain('pinfix-chat-header-icon')
    expect(landingTemplate).not.toContain('demo-dialog-header .icon')
  })

  it('uses a larger bare comment icon for the fixed FAB entry point', () => {
    const stylesSource = readFileSync(resolve(root, 'packages/unplugin/client/styles.ts'), 'utf8')
    const landingTemplate = readFileSync(resolve(root, 'docs/landing.template.html'), 'utf8')

    expect(stylesSource).toContain('.pinfix-fab')
    expect(stylesSource).toContain('background: transparent;')
    expect(stylesSource).toContain('border: 0;')
    expect(stylesSource).toContain('box-shadow: none;')
    expect(stylesSource).toContain('.pinfix-fab-hidden')
    expect(stylesSource).toContain('width: 34px;')
    expect(stylesSource).toContain('height: 34px;')
    expect(landingTemplate).toContain('.demo-fab')
    expect(landingTemplate).toContain('background: transparent;')
    expect(landingTemplate).toContain('box-shadow: none;')
  })

  it('keeps the landing demo dialog anchored while it fades in', () => {
    const landingTemplate = readFileSync(resolve(root, 'docs/landing.template.html'), 'utf8')
    const dialogStyle = landingTemplate.match(/\.demo-dialog \{[\s\S]*?\n\s+\}/)?.[0]
    const visibleStyle = landingTemplate.match(/\.demo-dialog\.visible \{[\s\S]*?\n\s+\}/)?.[0]

    expect(dialogStyle).toBeDefined()
    expect(visibleStyle).toBeDefined()
    expect(dialogStyle).toContain('transform-origin: top left;')
    expect(dialogStyle).not.toContain('translateY')
    expect(visibleStyle).not.toContain('translateY')
  })

  it('uses the button top-right point as the landing demo pin anchor', () => {
    const landingTemplate = readFileSync(resolve(root, 'docs/landing.template.html'), 'utf8')

    expect(landingTemplate).toContain('const btnPinX = btn.offsetLeft + btn.offsetWidth')
    expect(landingTemplate).toContain('const btnPinY = btn.offsetTop')
    expect(landingTemplate).toContain('const pinLeft = btnPinX - 12')
    expect(landingTemplate).toContain('const pinTop = btnPinY - 12')
    expect(landingTemplate).toContain("marker.style.left = btnPinX + 'px'")
    expect(landingTemplate).toContain("marker.style.top = btnPinY + 'px'")
    expect(landingTemplate).not.toContain("marker.style.left = btnCenterX + 'px'")
    expect(landingTemplate).not.toContain("marker.style.top = btnCenterY + 'px'")
  })

  it('replaces the picked-up landing demo marker without a visual handoff animation', () => {
    const landingTemplate = readFileSync(resolve(root, 'docs/landing.template.html'), 'utf8')
    const pinStyle = landingTemplate.match(/\.demo-pin \{[\s\S]*?\n\s+\}/)?.[0]
    const pinVisibleStyle = landingTemplate.match(/\.demo-pin\.visible \{[\s\S]*?\n\s+\}/)?.[0]

    expect(pinStyle).toBeDefined()
    expect(pinVisibleStyle).toBeDefined()
    expect(landingTemplate).toContain('.demo-selection-marker.settled')
    expect(landingTemplate).toContain("marker.classList.add('settled')")
    expect(pinStyle).toContain('transition: none;')
    expect(pinStyle).not.toContain('transform: scale(0)')
    expect(pinStyle).not.toContain('transition: opacity')
    expect(pinVisibleStyle).not.toContain('transform: scale(1)')
    expect(landingTemplate).not.toContain("pin.classList.add('pulse')")
  })

  it('shows a short confirmation press before replacing the landing demo marker', () => {
    const landingTemplate = readFileSync(resolve(root, 'docs/landing.template.html'), 'utf8')

    expect(landingTemplate).toContain('.demo-selection-marker.confirmed')
    expect(landingTemplate).toContain('@keyframes demo-marker-confirm')
    expect(landingTemplate).toContain("marker.classList.add('confirmed')")
    expect(landingTemplate).toContain('}, 3100)')
    expect(landingTemplate).toContain('}, 3180)')
    expect(landingTemplate).toContain('}, 3250)')
    expect(landingTemplate).not.toContain('}, 3600)')
  })
})
