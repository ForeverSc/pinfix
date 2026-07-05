import { COMMENT_BUBBLE_PATH } from './icons.js'

const SELECTION_CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#0070ea" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${COMMENT_BUBBLE_PATH}"/><path d="M12 8v6" fill="none"/><path d="M9 11h6" fill="none"/></svg>`

export const SELECTION_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(SELECTION_CURSOR_SVG)}") 14 14, pointer`
export const SELECTION_CURSOR_ATTR = 'data-pinfix-selecting'

export function createSelectionCursorRule(cursor: string): string {
  return `html[${SELECTION_CURSOR_ATTR}="true"], html[${SELECTION_CURSOR_ATTR}="true"] * { cursor: ${cursor} !important; }`
}

export interface SelectionModeControls {
  setCursor: (cursor: string) => void
  setFabActive: (active: boolean) => void
  hideHighlight: () => void
}

export function applySelectionModeState(active: boolean, controls: SelectionModeControls) {
  controls.setCursor(active ? SELECTION_CURSOR : '')
  controls.setFabActive(active)
  if (!active) controls.hideHighlight()
}

export function getSelectionModeAfterSourceClick(active: boolean): boolean {
  return active ? false : active
}
