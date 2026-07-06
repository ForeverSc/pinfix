export const SELECTION_CURSOR = 'none'
export const SELECTION_CURSOR_ATTR = 'data-pinfix-selecting'

export function createSelectionCursorRule(cursor: string): string {
  return `html[${SELECTION_CURSOR_ATTR}="true"], html[${SELECTION_CURSOR_ATTR}="true"] * { cursor: ${cursor} !important; }`
}

export interface SelectionModeControls {
  setCursor: (cursor: string) => void
  setFabActive: (active: boolean) => void
  setMarkerVisible: (active: boolean) => void
  hideHighlight: () => void
}

export function applySelectionModeState(active: boolean, controls: SelectionModeControls) {
  controls.setCursor(active ? SELECTION_CURSOR : '')
  controls.setFabActive(active)
  controls.setMarkerVisible(active)
  if (!active) controls.hideHighlight()
}

export function getSelectionModeAfterSourceClick(active: boolean): boolean {
  return active ? false : active
}
