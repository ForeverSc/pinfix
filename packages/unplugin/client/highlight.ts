import { DATA_ATTR } from '@pinfix/shared'

let highlightEl: HTMLDivElement | null = null

export function createHighlight(root: ShadowRoot): HTMLDivElement {
  highlightEl = document.createElement('div')
  highlightEl.id = 'pinfix-highlight'
  highlightEl.style.display = 'none'
  root.appendChild(highlightEl)
  return highlightEl
}

export function showHighlight(target: Element) {
  if (!highlightEl) return
  const rect = target.getBoundingClientRect()
  Object.assign(highlightEl.style, {
    display: 'block',
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    outline: '2px solid rgba(0, 112, 234, 0.8)',
    outlineOffset: '0px',
    backgroundColor: 'rgba(0, 112, 234, 0.1)',
    border: 'none',
    pointerEvents: 'none',
    zIndex: '99998',
    borderRadius: '8px',
    transition: 'all 0.1s ease',
  })
}

export function hideHighlight() {
  if (!highlightEl) return
  highlightEl.style.display = 'none'
}

export function findSourceElement(target: EventTarget | null): Element | null {
  let el = target as Element | null
  while (el) {
    if (el.hasAttribute(DATA_ATTR)) return el
    el = el.parentElement
  }
  return null
}
