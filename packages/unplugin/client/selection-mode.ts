export interface SelectionModeControls {
  setCursor: (cursor: string) => void
  setFabActive: (active: boolean) => void
  hideHighlight: () => void
}

export function applySelectionModeState(active: boolean, controls: SelectionModeControls) {
  controls.setCursor(active ? 'crosshair' : '')
  controls.setFabActive(active)
  if (!active) controls.hideHighlight()
}

export function getSelectionModeAfterSourceClick(active: boolean): boolean {
  return active ? false : active
}
