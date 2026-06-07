export interface Point {
  x: number
  y: number
}

export const FAB_DRAG_THRESHOLD_PX = 4

export function isFabDragDistanceExceeded(
  start: Point,
  current: Point,
  threshold = FAB_DRAG_THRESHOLD_PX,
): boolean {
  const dx = current.x - start.x
  const dy = current.y - start.y
  return dx * dx + dy * dy > threshold * threshold
}
