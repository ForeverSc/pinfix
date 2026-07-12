import { DATA_ATTR, type DesignPanelChanges } from '@pinfix/shared'
import { createHighlight, showHighlight, hideHighlight, findSourceElement } from './highlight.js'
import {
  createPinId,
  renderPin,
  updatePinStatus,
  createOrShowGlobalDialog,
  moveDialogToPin,
  hideGlobalDialog,
  getActivePinId,
  setActivePinId,
  appendGlobalMessage,
  showGlobalTyping,
  hideGlobalTyping,
  showGlobalError,
  setGlobalStreaming,
  resetGlobalMessages,
  destroyGlobalDialog,
  getPrompt,
  setGlobalVisualChange,
  type Pin,
} from './pin.js'
import { OVERLAY_STYLES } from './styles.js'
import { isHotkeyPressed, normalizeHotkeyEvent, parseHotkey } from './hotkey.js'
import { isFabDragDistanceExceeded } from './drag.js'
import { ICON_COMMENT, ICON_COMMENT_PLUS } from './icons.js'
import {
  SELECTION_CURSOR_ATTR,
  applySelectionModeState,
  createSelectionCursorRule,
  getSelectionModeAfterSourceClick,
} from './selection-mode.js'
import { createWsUrl, getWorkspaceId } from './ws-url.js'
import { createDesignPanelChangeContext, getDesignPanelDefaults } from './visual-edit.js'

declare const __PINFIX_WS_URL__: string | undefined
declare const __PINFIX_HOTKEY__: string | undefined
declare const __PINFIX_FAB__: boolean | undefined

const WS_URL: string =
  (typeof __PINFIX_WS_URL__ !== 'undefined' && __PINFIX_WS_URL__) ||
  (typeof window !== 'undefined' && (window as any).__PINFIX_WS_URL__) ||
  'ws://localhost:24816'
const WORKSPACE_ID = getWorkspaceId()
const WS_URL_WITH_WORKSPACE = createWsUrl(WS_URL, WORKSPACE_ID)

let active = false
let ws: WebSocket | null = null
let shadowRoot: ShadowRoot
const pins: Pin[] = []
let reconnectDelay = 1000
let heartbeatTimer: ReturnType<typeof setTimeout> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
const cleanupFns: Array<() => void> = []
let disposed = false
let fabEl: HTMLElement | null = null
let selectionMarkerEl: HTMLElement | null = null
let selectionMarkerActive = false
let relocatingPinId: string | null = null
let designPreview: {
  pinId: string
  target: HTMLElement
  targetSnapshot: ReturnType<typeof snapshotTarget>
  previewId: string
  beforeRect: { x: number; y: number; width: number; height: number }
  inlineStyle: Record<string, string>
  textContent: string
} | null = null
const pendingDesignApplyPinIds = new Set<string>()

const HEARTBEAT_TIMEOUT = 45_000
const CLEANUP_KEY = '__PINFIX_OVERLAY_CLEANUP__'
const SELECTION_CURSOR_STYLE_ID = 'pinfix-selection-cursor-style'

export function replacePinsWithSingleTarget(
  currentPins: Pin[],
  nextPin: Pin,
  removePinById: (pinId: string) => void,
) {
  for (const pin of [...currentPins]) {
    removePinById(pin.id)
  }
  currentPins.push(nextPin)
}

export function shouldCommitDesignPreview(
  completedPendingApply: boolean,
  donePinId: string,
  previewPinId: string | null,
) {
  return completedPendingApply && previewPinId === donePinId
}

export function handleRemovedPinUiState(
  removedPinId: string,
  activePinId: string | null,
  effects: {
    setVisualChange: (change: null) => void
    hideTyping: () => void
    setStreaming: (streaming: boolean) => void
    hideDialog: () => void
    setActivePinId: (pinId: string | null) => void
  },
) {
  if (activePinId !== removedPinId) return
  effects.setVisualChange(null)
  effects.hideTyping()
  effects.setStreaming(false)
  effects.hideDialog()
  effects.setActivePinId(null)
}

export function handlePinClick(
  pinId: string,
  activePinId: string | null,
  effects: {
    beginRelocatingPin: (pinId: string) => void
    setSelectionMode: (active: boolean) => void
    activatePin: (pinId: string) => void
  },
) {
  if (activePinId === pinId) {
    effects.beginRelocatingPin(pinId)
    effects.setSelectionMode(true)
    return
  }
  effects.activatePin(pinId)
}

export function movePinToPointer(pin: Pin, point: { x: number; y: number }) {
  pin.x = point.x
  pin.y = point.y
  if (pin.el) {
    pin.el.style.left = `${point.x - 12}px`
    pin.el.style.top = `${point.y - 12}px`
  }
}

export function shouldShowFabForPinCount(pinCount: number): boolean {
  return pinCount === 0
}

export function init() {
  const previousCleanup = (window as any)[CLEANUP_KEY]
  if (typeof previousCleanup === 'function' && previousCleanup !== cleanupOverlay) {
    previousCleanup()
  }
  cleanupOverlay()
  disposed = false
  pins.length = 0
  document.getElementById('pinfix-root')?.remove()
  ;(window as any)[CLEANUP_KEY] = cleanupOverlay

  const host = document.createElement('div')
  host.id = 'pinfix-root'
  host.style.position = 'fixed'
  host.style.top = '0'
  host.style.left = '0'
  host.style.width = '0'
  host.style.height = '0'
  host.style.zIndex = '99999'
  document.body.appendChild(host)
  cleanupFns.push(() => host.remove())
  shadowRoot = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = OVERLAY_STYLES
  shadowRoot.appendChild(style)

  createHighlight(shadowRoot)
  connectWs()
  bindHotkeys()

  if (isFabEnabled()) {
    renderFab(shadowRoot)
  }

  window.addEventListener('scroll', repositionPins, { passive: true })
  window.addEventListener('resize', repositionPins, { passive: true })
  cleanupFns.push(() => {
    window.removeEventListener('scroll', repositionPins)
    window.removeEventListener('resize', repositionPins)
  })
}

function connectWs() {
  if (disposed) return
  ws = new WebSocket(WS_URL_WITH_WORKSPACE)
  ws.onopen = () => {
    reconnectDelay = 1000
    resetHeartbeat()
    // Restore sessions for existing pins after reconnect
    for (const pin of pins) {
      if (pin.status !== 'done') {
        startSession(pin.id, pin.source)
      }
    }
  }
  ws.onmessage = (event) => {
    resetHeartbeat()
    try {
      const msg = JSON.parse(event.data)

      // Server-level ping — respond with pong
      if (msg.type === 'ping') {
        wsSend({ type: 'pong' })
        return
      }

      const pin = pins.find((p) => p.id === msg.pinId)
      if (!pin) return

      if (msg.type === 'chat:chunk') {
        hideGlobalTyping()
        appendGlobalMessage('assistant', msg.text)
      } else if (msg.type === 'chat:tool') {
        hideGlobalTyping()
        appendGlobalMessage('tool', msg.tool)
      } else if (msg.type === 'chat:done') {
        hideGlobalTyping()
        setGlobalStreaming(false)
        updatePinStatus(pin, 'done')
        if (
          shouldCommitDesignPreview(
            pendingDesignApplyPinIds.delete(pin.id),
            pin.id,
            designPreview?.pinId ?? null,
          )
        ) {
          resetDesignPreview()
        }
      } else if (msg.type === 'chat:error') {
        pendingDesignApplyPinIds.delete(pin.id)
        hideGlobalTyping()
        setGlobalStreaming(false)
        showGlobalError(msg.error, () => {
          // Retry: restart session then resend last user message
          if (pin.lastUserContent) {
            showGlobalTyping()
            setGlobalStreaming(true)
            wsSend({ type: 'session:end', pinId: pin.id })
            startSession(pin.id, pin.source)
            wsSend({ type: 'chat:send', pinId: pin.id, content: pin.lastUserContent })
          }
        })
      }
    } catch {}
  }
  ws.onclose = () => {
    clearHeartbeat()
    if (disposed) return
    reconnectTimer = setTimeout(connectWs, reconnectDelay)
    reconnectDelay = Math.min(reconnectDelay * 2, 30000)
  }
  ws.onerror = () => {
    // will trigger onclose
  }
}

function resetHeartbeat() {
  clearHeartbeat()
  heartbeatTimer = setTimeout(() => {
    // No message received within timeout — connection likely dead
    if (ws) {
      ws.close()
    }
  }, HEARTBEAT_TIMEOUT)
}

function clearHeartbeat() {
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer)
    heartbeatTimer = null
  }
}

function wsSend(data: object) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data))
  }
}

function startSession(pinId: string, source: string) {
  const prompt = getPrompt()
  wsSend({ type: 'session:start', pinId, source, ...(prompt ? { prompt } : {}) })
}

function setSelectionMode(nextActive: boolean) {
  active = nextActive
  applySelectionModeState(active, {
    setCursor: setPageCursor,
    setFabActive: (active) => {
      if (fabEl) fabEl.classList.toggle('active', active)
    },
    setMarkerVisible: setSelectionMarkerVisible,
    hideHighlight,
  })
  if (active && relocatingPinId) {
    setSelectionMarkerVisible(false)
  }
  if (!active) {
    clearRelocatingPin()
  }
}

function syncFabVisibility() {
  if (!fabEl) return
  fabEl.classList.toggle('pinfix-fab-hidden', !shouldShowFabForPinCount(pins.length))
}

function ensureSelectionMarker(): HTMLElement {
  if (selectionMarkerEl) return selectionMarkerEl

  const marker = document.createElement('div')
  marker.className = 'pinfix-selection-marker'
  marker.innerHTML = ICON_COMMENT
  shadowRoot.appendChild(marker)
  selectionMarkerEl = marker
  return marker
}

function setSelectionMarkerVisible(visible: boolean) {
  selectionMarkerActive = visible
  if (!visible && !selectionMarkerEl) return
  const marker = visible ? ensureSelectionMarker() : selectionMarkerEl!
  marker.classList.toggle('pinfix-selection-marker-active', visible)
  if (!visible) {
    marker.classList.remove('pinfix-selection-marker-positioned')
  }
}

function moveSelectionMarker(x: number, y: number) {
  const marker = ensureSelectionMarker()
  marker.style.left = `${x}px`
  marker.style.top = `${y}px`
  marker.classList.add('pinfix-selection-marker-positioned')
  if (selectionMarkerActive) {
    marker.classList.add('pinfix-selection-marker-active')
  }
}

function beginRelocatingPin(pinId: string) {
  const pin = pins.find((p) => p.id === pinId)
  if (!pin) return
  relocatingPinId = pinId
  pin.el?.classList.add('pinfix-pin-relocating')
  resetDesignPreview({ restore: true })
  setGlobalVisualChange(null)
  hideGlobalTyping()
  setGlobalStreaming(false)
  hideGlobalDialog()
}

function clearRelocatingPin() {
  if (!relocatingPinId) return
  const pin = pins.find((p) => p.id === relocatingPinId)
  pin?.el?.classList.remove('pinfix-pin-relocating')
  relocatingPinId = null
}

function moveRelocatingPin(x: number, y: number) {
  if (!relocatingPinId) return
  const pin = pins.find((p) => p.id === relocatingPinId)
  if (!pin) {
    relocatingPinId = null
    return
  }
  movePinToPointer(pin, { x, y })
}

function setPageCursor(cursor: string) {
  document.body.style.cursor = cursor
  document.documentElement.style.cursor = cursor

  if (!cursor) {
    document.documentElement.removeAttribute(SELECTION_CURSOR_ATTR)
    document.getElementById(SELECTION_CURSOR_STYLE_ID)?.remove()
    return
  }

  document.documentElement.setAttribute(SELECTION_CURSOR_ATTR, 'true')
  let styleEl = document.getElementById(SELECTION_CURSOR_STYLE_ID) as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = SELECTION_CURSOR_STYLE_ID
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = createSelectionCursorRule(cursor)
}

function getHotkeyConfig(): { keys: Set<string> } {
  const raw =
    (typeof __PINFIX_HOTKEY__ !== 'undefined' && __PINFIX_HOTKEY__) ||
    (typeof window !== 'undefined' && (window as any).__PINFIX_HOTKEY__) ||
    'alt+shift+z'
  return { keys: parseHotkey(raw) }
}

function isFabEnabled(): boolean {
  if (typeof __PINFIX_FAB__ !== 'undefined') return __PINFIX_FAB__
  if (typeof window !== 'undefined' && (window as any).__PINFIX_FAB__ !== undefined)
    return (window as any).__PINFIX_FAB__
  return true
}

function bindHotkeys() {
  const { keys } = getHotkeyConfig()
  const pressed = new Set<string>()

  const onKeyDown = (e: KeyboardEvent) => {
    pressed.add(normalizeHotkeyEvent(e))
    if (isHotkeyPressed(keys, pressed)) {
      e.preventDefault()
      e.stopPropagation()
      if (!active) {
        setSelectionMode(true)
      }
    }
  }

  const onKeyUp = (e: KeyboardEvent) => {
    pressed.delete(normalizeHotkeyEvent(e))
    if (!isHotkeyPressed(keys, pressed) && active) {
      setSelectionMode(false)
    }
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!active) return
    if (relocatingPinId) {
      moveRelocatingPin(e.clientX, e.clientY)
    } else {
      moveSelectionMarker(e.clientX, e.clientY)
    }
    const el = findSourceElement(e.target)
    if (el) showHighlight(el)
    else hideHighlight()
  }

  const onClick = (e: MouseEvent) => {
    if (!active) return
    const el = findSourceElement(e.target)
    if (!el) return

    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
    setSelectionMode(getSelectionModeAfterSourceClick(active))

    const source = el.getAttribute(DATA_ATTR)!
    const pin: Pin = {
      id: createPinId(),
      source,
      x: e.clientX,
      y: e.clientY,
      comment: '',
      status: 'editing',
      targetEl: el,
    }

    replacePinsWithSingleTarget(pins, pin, removePin)
    renderPin(shadowRoot, pin)
    syncFabVisibility()

    // Pin dot click — pick up current pin, or switch if legacy state exists
    pin.el!.addEventListener('click', (ev) => {
      ev.stopPropagation()
      handlePinClick(pin.id, getActivePinId(), {
        beginRelocatingPin,
        setSelectionMode,
        activatePin: () => {
          setActivePinId(pin.id)
          resetDesignPreview({ restore: true })
          setGlobalVisualChange(pin.visualChange ?? null)
          moveDialogToPin(pin, { force: true })
        },
      })
    })

    // Start session
    startSession(pin.id, source)

    // Open global dialog (create if first pin, or show+move if exists)
    createOrShowGlobalDialog(
      shadowRoot,
      pin,
      (content, visualChange) => {
        const activePid = getActivePinId()
        const activePin = pins.find((p) => p.id === activePid)
        if (activePin) {
          activePin.lastUserContent = content
          updatePinStatus(activePin, 'sent')
          wsSend({
            type: 'chat:send',
            pinId: activePin.id,
            content,
            ...(visualChange ? { visualChange } : {}),
          })
          if (visualChange && designPreview?.pinId === activePin.id) {
            pendingDesignApplyPinIds.add(activePin.id)
          }
        }
      },
      () => {
        const activePid = getActivePinId()
        if (activePid) removePin(activePid)
      },
      () => {
        // Stop generation
        const activePid = getActivePinId()
        const activePin = pins.find((p) => p.id === activePid)
        if (activePin) {
          wsSend({ type: 'session:end', pinId: activePin.id })
          hideGlobalTyping()
          setGlobalStreaming(false)
          // Restart session so user can continue chatting
          startSession(activePin.id, activePin.source)
        }
      },
      () => {
        // Reset — clear messages + rebuild Claude session
        resetGlobalMessages()
        for (const p of pins) p.lastUserContent = undefined
        const prompt = getPrompt()
        wsSend({ type: 'workspace:reset', ...(prompt ? { prompt } : {}) })
      },
      () => readDesignDefaults(),
      (changes) => previewDesignChange(changes),
      (changes) => previewDesignChange(changes),
      () => {
        const activePid = getActivePinId()
        const activePin = pins.find((p) => p.id === activePid)
        resetDesignPreview({ restore: true })
        if (activePin) activePin.visualChange = undefined
        setGlobalVisualChange(null)
      },
    )
  }

  const onBlur = () => {
    pressed.clear()
    if (active) {
      setSelectionMode(false)
    }
  }

  document.addEventListener('keydown', onKeyDown, { capture: true })
  document.addEventListener('keyup', onKeyUp, { capture: true })
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('click', onClick, { capture: true })
  window.addEventListener('blur', onBlur)
  cleanupFns.push(() => {
    document.removeEventListener('keydown', onKeyDown, true)
    document.removeEventListener('keyup', onKeyUp, true)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('click', onClick, true)
    window.removeEventListener('blur', onBlur)
    setPageCursor('')
    setSelectionMarkerVisible(false)
  })
}

function renderFab(root: ShadowRoot) {
  const fab = document.createElement('div')
  fab.className = 'pinfix-fab'
  fab.title = 'PinFix: click to annotate'
  fab.innerHTML = ICON_COMMENT_PLUS

  let fabDragged = false

  fab.addEventListener('click', (e) => {
    if (fabDragged) {
      fabDragged = false
      return
    }
    if (!active) {
      moveSelectionMarker(e.clientX, e.clientY)
    }
    setSelectionMode(!active)
  })

  // Drag support
  fab.addEventListener('mousedown', (e) => {
    e.preventDefault()
    fabDragged = false
    const startPointer = { x: e.clientX, y: e.clientY }
    const startX = e.clientX - fab.getBoundingClientRect().left
    const startY = e.clientY - fab.getBoundingClientRect().top
    const onMove = (ev: MouseEvent) => {
      if (
        !fabDragged &&
        !isFabDragDistanceExceeded(startPointer, { x: ev.clientX, y: ev.clientY })
      ) {
        return
      }
      fabDragged = true
      fab.style.right = 'auto'
      fab.style.bottom = 'auto'
      fab.style.left = ev.clientX - startX + 'px'
      fab.style.top = ev.clientY - startY + 'px'
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  })

  root.appendChild(fab)
  fabEl = fab
  syncFabVisibility()
  cleanupFns.push(() => fab.remove())
}

function repositionPins() {
  const activePid = getActivePinId()
  for (const pin of pins) {
    if (!pin.targetEl || !pin.el) continue
    const rect = pin.targetEl.getBoundingClientRect()
    const x = rect.right - 12
    const y = rect.top
    pin.el.style.left = `${x}px`
    pin.el.style.top = `${y}px`
    pin.x = x + 12
    pin.y = y + 12
    // If active pin moved, move dialog too
    if (pin.id === activePid) {
      moveDialogToPin(pin)
    }
  }
}

function removePin(pinId: string) {
  const idx = pins.findIndex((p) => p.id === pinId)
  if (idx === -1) return
  const pin = pins[idx]
  if (designPreview?.pinId === pinId) {
    resetDesignPreview({ restore: true })
  }
  pendingDesignApplyPinIds.delete(pinId)
  wsSend({ type: 'session:end', pinId })
  pin.el?.remove()
  pins.splice(idx, 1)
  syncFabVisibility()
  handleRemovedPinUiState(pinId, getActivePinId(), {
    setVisualChange: setGlobalVisualChange,
    hideTyping: hideGlobalTyping,
    setStreaming: setGlobalStreaming,
    hideDialog: hideGlobalDialog,
    setActivePinId,
  })
}

function cleanupOverlay() {
  disposed = true
  active = false
  clearHeartbeat()
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (ws) {
    ws.onclose = null
    ws.close()
    ws = null
  }
  resetDesignPreview({ restore: true })
  pendingDesignApplyPinIds.clear()
  destroyGlobalDialog()
  for (const cleanup of cleanupFns.splice(0)) {
    cleanup()
  }
}

function readDesignDefaults(): DesignPanelChanges | null {
  const activePid = getActivePinId()
  const activePin = pins.find((p) => p.id === activePid)
  if (!activePin || !(activePin.targetEl instanceof HTMLElement)) return null

  const style = window.getComputedStyle(activePin.targetEl)
  return getDesignPanelDefaults({
    textContent: activePin.targetEl.textContent?.trim().replace(/\s+/g, ' ') ?? '',
    flexDirection: style.flexDirection,
    justifyContent: style.justifyContent,
    alignItems: style.alignItems,
    gap: style.gap,
    padding: style.padding,
    margin: style.margin,
    width: style.width,
    height: style.height,
    borderRadius: style.borderRadius,
    borderColor: style.borderColor,
    borderWidth: style.borderWidth,
    backgroundColor: style.backgroundColor,
    color: style.color,
    opacity: style.opacity,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
  })
}

function previewDesignChange(
  changes: DesignPanelChanges,
): ReturnType<typeof createDesignPanelChangeContext> | null {
  const activePid = getActivePinId()
  const activePin = pins.find((p) => p.id === activePid)
  if (!activePin || !(activePin.targetEl instanceof HTMLElement)) return null

  const target = activePin.targetEl

  if (designPreview && (designPreview.pinId !== activePin.id || designPreview.target !== target)) {
    resetDesignPreview({ restore: true })
  }

  if (!designPreview) {
    designPreview = {
      pinId: activePin.id,
      target,
      targetSnapshot: snapshotTarget(target),
      beforeRect: snapshotRect(target.getBoundingClientRect()),
      inlineStyle: snapshotInlineStyle(target),
      textContent: target.textContent ?? '',
    }
  }

  restoreInlineStyle(target, designPreview.inlineStyle)
  target.textContent = designPreview.textContent
  applyDesignStyles(target, changes)

  const change = createDesignPanelChangeContext({
    source: activePin.source,
    targetScope: 'element',
    target: designPreview.targetSnapshot,
    beforeRect: designPreview.beforeRect,
    afterRect: snapshotRect(target.getBoundingClientRect()),
    computedStyle: snapshotComputedStyle(window.getComputedStyle(target)),
    parentLayout: snapshotParentLayout(activePin.targetEl.parentElement),
    changes,
  })

  activePin.visualChange = change
  setGlobalVisualChange(change)
  return change
}

function resetDesignPreview(options?: { restore?: boolean }) {
  if (!designPreview) return
  const preview = designPreview
  if (options?.restore) {
    restoreInlineStyle(preview.target, preview.inlineStyle)
    preview.target.textContent = preview.textContent
  }
  designPreview = null
}

const DESIGN_STYLE_KEYS = [
  'display',
  'flexDirection',
  'justifyContent',
  'alignItems',
  'gap',
  'padding',
  'margin',
  'width',
  'height',
  'borderRadius',
  'borderColor',
  'borderWidth',
  'backgroundColor',
  'color',
  'opacity',
  'fontFamily',
  'fontSize',
  'fontWeight',
] as const

function snapshotInlineStyle(target: HTMLElement): Record<string, string> {
  const snapshot: Record<string, string> = {}
  for (const key of DESIGN_STYLE_KEYS) {
    snapshot[key] = target.style[key]
  }
  return snapshot
}

function restoreInlineStyle(target: HTMLElement, snapshot: Record<string, string>) {
  for (const key of DESIGN_STYLE_KEYS) {
    target.style[key] = snapshot[key] ?? ''
  }
}

function applyDesignStyles(target: HTMLElement, changes: DesignPanelChanges) {
  const content = changes.content ?? {}
  if (content.text !== undefined) target.textContent = content.text

  const layout = changes.layout ?? {}
  if (layout.flexDirection || layout.justifyContent || layout.alignItems || layout.gap) {
    target.style.display = 'flex'
  }
  if (layout.flexDirection) target.style.flexDirection = layout.flexDirection
  if (layout.justifyContent) target.style.justifyContent = layout.justifyContent
  if (layout.alignItems) target.style.alignItems = layout.alignItems
  if (layout.gap) target.style.gap = layout.gap

  const spacing = changes.spacing ?? {}
  if (spacing.padding) target.style.padding = spacing.padding
  if (spacing.margin) target.style.margin = spacing.margin

  const size = changes.size ?? {}
  if (size.width) target.style.width = size.width
  if (size.height) target.style.height = size.height

  const style = changes.style ?? {}
  if (style.borderRadius) target.style.borderRadius = style.borderRadius
  if (style.borderColor) target.style.borderColor = style.borderColor
  if (style.borderWidth) target.style.borderWidth = style.borderWidth
  if (style.backgroundColor) target.style.backgroundColor = style.backgroundColor
  if (style.color) target.style.color = style.color
  if (style.opacity) target.style.opacity = style.opacity

  const typography = changes.typography ?? {}
  if (typography.fontFamily) target.style.fontFamily = typography.fontFamily
  if (typography.fontSize) target.style.fontSize = typography.fontSize
  if (typography.fontWeight) target.style.fontWeight = typography.fontWeight
}

function snapshotRect(rect: DOMRect): { x: number; y: number; width: number; height: number } {
  return {
    x: round(rect.x),
    y: round(rect.y),
    width: round(rect.width),
    height: round(rect.height),
  }
}

function snapshotTarget(target: HTMLElement) {
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
  return {
    display: style.display,
    position: style.position,
    width: style.width,
    height: style.height,
    margin: style.margin,
    padding: style.padding,
    gap: style.gap,
    color: style.color,
    backgroundColor: style.backgroundColor,
    borderRadius: style.borderRadius,
    borderColor: style.borderColor,
    borderWidth: style.borderWidth,
    opacity: style.opacity,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
  }
}

function snapshotParentLayout(parent: Element | null) {
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

function round(value: number): number {
  return Math.round(value * 100) / 100
}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
