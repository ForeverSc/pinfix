import type {
  DesignPanelChanges,
  RectSnapshot,
  VisualChangeContext,
  VisualChangeOperation,
  VisualChangeTargetScope,
  VisualParentLayoutSnapshot,
  VisualTargetSnapshot,
} from '@pinfix/shared'

interface VisualChangeInput {
  source: string
  target: VisualTargetSnapshot
  beforeRect: RectSnapshot
  afterRect: RectSnapshot
  computedStyle: Record<string, string>
  parentLayout?: VisualParentLayoutSnapshot
}

interface DesignPanelChangeInput extends VisualChangeInput {
  targetScope: VisualChangeTargetScope
  changes: DesignPanelChanges
}

interface DesignPanelStyleInput {
  flexDirection: string
  justifyContent: string
  alignItems: string
  gap: string
  padding: string
  margin: string
  width: string
  height: string
  borderRadius: string
  backgroundColor: string
  color: string
  fontSize: string
  fontWeight: string
  textAlign: string
}

interface StartVisualAdjustmentOptions {
  root: ShadowRoot
  target: HTMLElement
  source: string
  onChange: (change: VisualChangeContext | null) => void
}

export interface VisualAdjustmentSession {
  reset: () => void
  destroy: (options?: { restore?: boolean }) => void
  getChange: () => VisualChangeContext | null
}

type DragMode = 'move' | 'resize'

interface KeyboardAdjustmentInput {
  key: string
  shiftKey: boolean
}

type KeyboardAdjustment =
  | { mode: 'move'; x: number; y: number }
  | { mode: 'resize'; width: number; height: number }

const STYLE_KEYS = [
  'display',
  'position',
  'boxSizing',
  'width',
  'height',
  'margin',
  'padding',
  'gap',
  'transform',
  'fontSize',
  'borderRadius',
]

export function createVisualChangeContext(input: VisualChangeInput): VisualChangeContext {
  const beforeRect = normalizeRect(input.beforeRect)
  const afterRect = normalizeRect(input.afterRect)
  const delta = {
    x: round(afterRect.x - beforeRect.x),
    y: round(afterRect.y - beforeRect.y),
    width: round(afterRect.width - beforeRect.width),
    height: round(afterRect.height - beforeRect.height),
  }

  return {
    source: input.source,
    operation: getVisualChangeOperation(delta),
    target: input.target,
    beforeRect,
    afterRect,
    delta,
    computedStyle: input.computedStyle,
    ...(input.parentLayout ? { parentLayout: input.parentLayout } : {}),
  }
}

export function createDesignPanelChangeContext(input: DesignPanelChangeInput): VisualChangeContext {
  const beforeRect = normalizeRect(input.beforeRect)
  const afterRect = normalizeRect(input.afterRect)
  return {
    source: input.source,
    operation: 'design-panel',
    targetScope: input.targetScope,
    intent: createDesignIntent(input.targetScope, input.changes),
    target: input.target,
    beforeRect,
    afterRect,
    delta: {
      x: round(afterRect.x - beforeRect.x),
      y: round(afterRect.y - beforeRect.y),
      width: round(afterRect.width - beforeRect.width),
      height: round(afterRect.height - beforeRect.height),
    },
    computedStyle: input.computedStyle,
    ...(input.parentLayout ? { parentLayout: input.parentLayout } : {}),
    changes: input.changes,
  }
}

export function getKeyboardAdjustment(input: KeyboardAdjustmentInput): KeyboardAdjustment | null {
  const direction = getArrowDirection(input.key)
  if (!direction) return null
  if (input.shiftKey) {
    return { mode: 'resize', width: direction.x, height: direction.y }
  }
  return { mode: 'move', x: direction.x, y: direction.y }
}

export function getDesignPanelDefaults(input: DesignPanelStyleInput): DesignPanelChanges {
  return {
    layout: {
      flexDirection: input.flexDirection,
      justifyContent: input.justifyContent,
      alignItems: input.alignItems,
      gap: stripPx(input.gap),
    },
    spacing: {
      padding: stripPx(input.padding),
      margin: stripPx(input.margin),
    },
    size: {
      width: input.width,
      height: input.height,
    },
    style: {
      borderRadius: stripPx(input.borderRadius),
      backgroundColor: input.backgroundColor,
      color: input.color,
    },
    typography: {
      fontSize: stripPx(input.fontSize),
      fontWeight: input.fontWeight,
      textAlign: input.textAlign,
    },
  }
}

export function diffDesignPanelChanges(
  current: DesignPanelChanges,
  baseline: DesignPanelChanges,
): DesignPanelChanges {
  const diff: DesignPanelChanges = {}
  for (const [group, values] of Object.entries(current) as Array<
    [keyof DesignPanelChanges, Record<string, string> | undefined]
  >) {
    if (!values) continue
    const baselineValues = (baseline[group] ?? {}) as Record<string, string>
    const changedEntries = Object.entries(values).filter(
      ([key, value]) => value && value !== baselineValues[key],
    )
    if (changedEntries.length > 0) diff[group] = Object.fromEntries(changedEntries)
  }
  return diff
}

export function getColorPickerValue(value: string): string {
  const color = value.trim().toLowerCase()
  const shortHex = color.match(/^#([0-9a-f]{3})$/i)
  if (shortHex) {
    return `#${shortHex[1]
      .split('')
      .map((char) => `${char}${char}`)
      .join('')}`
  }
  if (/^#[0-9a-f]{6}$/i.test(color)) return color

  const rgb = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/)
  if (!rgb) return '#000000'

  return `#${[rgb[1], rgb[2], rgb[3]]
    .map((part) => clampColor(Number(part)).toString(16).padStart(2, '0'))
    .join('')}`
}

export function startVisualAdjustment(
  options: StartVisualAdjustmentOptions,
): VisualAdjustmentSession {
  const { root, target, source, onChange } = options
  const beforeRect = snapshotRect(target.getBoundingClientRect())
  const originalInlineStyle = {
    transform: target.style.transform,
    width: target.style.width,
    height: target.style.height,
    boxSizing: target.style.boxSizing,
    willChange: target.style.willChange,
  }
  const originalTransform = target.style.transform
  let currentChange: VisualChangeContext | null = null
  let moveDelta = { x: 0, y: 0 }
  let resizeDelta = { width: 0, height: 0 }

  const box = document.createElement('div')
  box.className = 'pinfix-adjust-box'
  box.tabIndex = 0

  const resizeHandle = document.createElement('div')
  resizeHandle.className = 'pinfix-adjust-resize'
  resizeHandle.title = 'Resize'
  box.appendChild(resizeHandle)
  root.appendChild(box)

  positionBox()
  box.focus()

  function beginDrag(mode: DragMode, e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const startPointer = { x: e.clientX, y: e.clientY }
    const startMove = { ...moveDelta }
    const startResize = { ...resizeDelta }

    const onMouseMove = (ev: MouseEvent) => {
      ev.preventDefault()
      const pointerDelta = {
        x: ev.clientX - startPointer.x,
        y: ev.clientY - startPointer.y,
      }

      if (mode === 'move') {
        moveDelta = {
          x: startMove.x + pointerDelta.x,
          y: startMove.y + pointerDelta.y,
        }
      } else {
        resizeDelta = {
          width: startResize.width + pointerDelta.x,
          height: startResize.height + pointerDelta.y,
        }
      }

      applyPreview()
      positionBox()
      emitChange()
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  function handleKeyboardAdjustment(e: KeyboardEvent) {
    const adjustment = getKeyboardAdjustment(e)
    if (!adjustment) return
    e.preventDefault()
    if (adjustment.mode === 'move') {
      moveDelta = {
        x: moveDelta.x + adjustment.x,
        y: moveDelta.y + adjustment.y,
      }
    } else {
      resizeDelta = {
        width: resizeDelta.width + adjustment.width,
        height: resizeDelta.height + adjustment.height,
      }
    }
    applyPreview()
    positionBox()
    emitChange()
  }

  box.addEventListener('mousedown', (e) => {
    if (e.target === resizeHandle) return
    beginDrag('move', e)
  })
  resizeHandle.addEventListener('mousedown', (e) => beginDrag('resize', e))
  document.addEventListener('keydown', handleKeyboardAdjustment, true)

  function applyPreview() {
    target.style.willChange = 'transform,width,height'
    target.style.transform = buildPreviewTransform(originalTransform, moveDelta)
    if (resizeDelta.width !== 0 || resizeDelta.height !== 0) {
      target.style.boxSizing = 'border-box'
      target.style.width = `${Math.max(1, beforeRect.width + resizeDelta.width)}px`
      target.style.height = `${Math.max(1, beforeRect.height + resizeDelta.height)}px`
    }
  }

  function emitChange() {
    currentChange = createVisualChangeContext({
      source,
      target: snapshotTarget(target),
      beforeRect,
      afterRect: snapshotRect(target.getBoundingClientRect()),
      computedStyle: snapshotComputedStyle(window.getComputedStyle(target)),
      parentLayout: snapshotParentLayout(target.parentElement),
    })
    onChange(currentChange)
  }

  function positionBox() {
    const rect = target.getBoundingClientRect()
    Object.assign(box.style, {
      display: 'block',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    })
  }

  function reset() {
    target.style.transform = originalInlineStyle.transform
    target.style.width = originalInlineStyle.width
    target.style.height = originalInlineStyle.height
    target.style.boxSizing = originalInlineStyle.boxSizing
    target.style.willChange = originalInlineStyle.willChange
    moveDelta = { x: 0, y: 0 }
    resizeDelta = { width: 0, height: 0 }
    currentChange = null
    positionBox()
    onChange(null)
  }

  function destroy(options?: { restore?: boolean }) {
    document.removeEventListener('keydown', handleKeyboardAdjustment, true)
    if (options?.restore) reset()
    box.remove()
  }

  return {
    reset,
    destroy,
    getChange: () => currentChange,
  }
}

function getVisualChangeOperation(delta: RectSnapshot): VisualChangeOperation {
  const moved = delta.x !== 0 || delta.y !== 0
  const resized = delta.width !== 0 || delta.height !== 0
  if (moved && resized) return 'move-resize'
  if (resized) return 'resize'
  return 'move'
}

function createDesignIntent(
  targetScope: VisualChangeTargetScope,
  changes: DesignPanelChanges,
): string {
  const groups = Object.entries(changes)
    .filter(([, value]) => value && Object.keys(value).length > 0)
    .map(
      ([group, value]) =>
        `${group}: ${Object.entries(value!)
          .map(([key, val]) => `${key}=${val}`)
          .join(', ')}`,
    )
  return `Apply ${targetScope} design adjustments${groups.length ? ` (${groups.join('; ')})` : ''}.`
}

function getArrowDirection(key: string): { x: number; y: number } | null {
  if (key === 'ArrowLeft') return { x: -1, y: 0 }
  if (key === 'ArrowRight') return { x: 1, y: 0 }
  if (key === 'ArrowUp') return { x: 0, y: -1 }
  if (key === 'ArrowDown') return { x: 0, y: 1 }
  return null
}

function snapshotRect(rect: DOMRect | RectSnapshot): RectSnapshot {
  return normalizeRect({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  })
}

function normalizeRect(rect: RectSnapshot): RectSnapshot {
  return {
    x: round(rect.x),
    y: round(rect.y),
    width: round(rect.width),
    height: round(rect.height),
  }
}

function snapshotTarget(target: HTMLElement): VisualTargetSnapshot {
  const text = target.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80)
  return {
    tagName: target.tagName.toLowerCase(),
    ...(target.id ? { id: target.id } : {}),
    ...(typeof target.className === 'string' && target.className
      ? { className: target.className }
      : {}),
    ...(text ? { text } : {}),
  }
}

function snapshotComputedStyle(style: CSSStyleDeclaration): Record<string, string> {
  const snapshot: Record<string, string> = {}
  for (const key of STYLE_KEYS) {
    snapshot[key] = style.getPropertyValue(toCssProperty(key)) || style[key as any] || ''
  }
  return snapshot
}

function snapshotParentLayout(parent: Element | null): VisualParentLayoutSnapshot | undefined {
  if (!(parent instanceof HTMLElement)) return undefined
  const style = window.getComputedStyle(parent)
  return {
    tagName: parent.tagName.toLowerCase(),
    display: style.display,
    gap: style.gap,
    flexDirection: style.flexDirection,
    justifyContent: style.justifyContent,
    alignItems: style.alignItems,
    gridTemplateColumns: style.gridTemplateColumns,
  }
}

function buildPreviewTransform(originalTransform: string, delta: { x: number; y: number }): string {
  const translate = `translate(${round(delta.x)}px, ${round(delta.y)}px)`
  if (!originalTransform || originalTransform === 'none') return translate
  return `${originalTransform} ${translate}`
}

function toCssProperty(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function clampColor(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(255, Math.max(0, value))
}

function stripPx(value: string): string {
  return value.replace(/px/g, '').trim()
}
