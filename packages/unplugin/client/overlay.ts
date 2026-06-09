import { DATA_ATTR, type DesignPanelChanges } from '@pinfix/shared'
import { createHighlight, showHighlight, hideHighlight, findSourceElement } from './highlight.js'
import {
  createPinId,
  renderPin,
  updatePinStatus,
  createOrShowGlobalDialog,
  moveDialogToPin,
  showGlobalDialog,
  hideGlobalDialog,
  isGlobalDialogVisible,
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
let designPreview: {
  pinId: string
  target: HTMLElement
  beforeRect: { x: number; y: number; width: number; height: number }
  inlineStyle: Record<string, string>
} | null = null

const HEARTBEAT_TIMEOUT = 45_000
const CLEANUP_KEY = '__PINFIX_OVERLAY_CLEANUP__'

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
      } else if (msg.type === 'chat:error') {
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
        active = true
        document.body.style.cursor = 'crosshair'
        if (fabEl) fabEl.classList.add('active')
      }
    }
  }

  const onKeyUp = (e: KeyboardEvent) => {
    pressed.delete(normalizeHotkeyEvent(e))
    if (!isHotkeyPressed(keys, pressed) && active) {
      active = false
      document.body.style.cursor = ''
      if (fabEl) fabEl.classList.remove('active')
      hideHighlight()
    }
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!active) return
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

    pins.push(pin)
    renderPin(shadowRoot, pin)

    // Pin dot click — toggle or switch dialog
    pin.el!.addEventListener('click', (ev) => {
      ev.stopPropagation()
      const currentActive = getActivePinId()
      if (currentActive === pin.id) {
        // Same pin — toggle visibility
        if (isGlobalDialogVisible()) {
          hideGlobalDialog()
        } else {
          showGlobalDialog()
        }
      } else {
        // Different pin — move dialog to this pin
        setActivePinId(pin.id)
        resetDesignPreview({ restore: true })
        setGlobalVisualChange(pin.visualChange ?? null)
        moveDialogToPin(pin, { force: true })
        showGlobalDialog()
      }
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
      active = false
      document.body.style.cursor = ''
      if (fabEl) fabEl.classList.remove('active')
      hideHighlight()
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
    document.body.style.cursor = ''
  })
}

function renderFab(root: ShadowRoot) {
  const fab = document.createElement('div')
  fab.className = 'pinfix-fab'
  fab.title = 'PinFix: click to annotate'
  fab.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`

  let fabDragged = false

  fab.addEventListener('click', () => {
    if (fabDragged) {
      fabDragged = false
      return
    }
    active = !active
    document.body.style.cursor = active ? 'crosshair' : ''
    fab.classList.toggle('active', active)
    if (!active) hideHighlight()
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
    setGlobalVisualChange(null)
  }
  wsSend({ type: 'session:end', pinId })
  pin.el?.remove()
  pins.splice(idx, 1)
  if (getActivePinId() === pinId) {
    hideGlobalDialog()
    setActivePinId(null)
  }
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
    flexDirection: style.flexDirection,
    justifyContent: style.justifyContent,
    alignItems: style.alignItems,
    gap: style.gap,
    padding: style.padding,
    margin: style.margin,
    width: style.width,
    height: style.height,
    borderRadius: style.borderRadius,
    backgroundColor: style.backgroundColor,
    color: style.color,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    textAlign: style.textAlign,
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
      beforeRect: snapshotRect(target.getBoundingClientRect()),
      inlineStyle: snapshotInlineStyle(target),
    }
  }

  restoreInlineStyle(target, designPreview.inlineStyle)
  applyDesignStyles(target, changes)

  const change = createDesignPanelChangeContext({
    source: activePin.source,
    targetScope: 'element',
    target: snapshotTarget(activePin.targetEl),
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
  if (options?.restore) {
    restoreInlineStyle(designPreview.target, designPreview.inlineStyle)
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
  'backgroundColor',
  'color',
  'fontSize',
  'fontWeight',
  'textAlign',
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
  if (style.backgroundColor) target.style.backgroundColor = style.backgroundColor
  if (style.color) target.style.color = style.color

  const typography = changes.typography ?? {}
  if (typography.fontSize) target.style.fontSize = typography.fontSize
  if (typography.fontWeight) target.style.fontWeight = typography.fontWeight
  if (typography.textAlign) target.style.textAlign = typography.textAlign
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
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    textAlign: style.textAlign,
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
