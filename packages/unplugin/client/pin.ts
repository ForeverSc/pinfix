import { renderMarkdown, bindCopyButtons } from './markdown.js'

// --- SVG Icons (18px, stroke-based) ---
const ICON_EDIT = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`
const ICON_REFRESH = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`
const ICON_SETTINGS = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z"/></svg>`
const ICON_MINIMIZE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`
const ICON_CLOSE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
const ICON_SEND = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`
const ICON_STOP = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" stroke="none"/></svg>`
const ICON_BACK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool'
  text: string
  el?: HTMLElement
}

export interface Pin {
  id: string
  source: string
  x: number
  y: number
  comment: string
  status: 'editing' | 'sent' | 'done'
  el?: HTMLElement
  targetEl?: Element
  lastUserContent?: string
}

declare const __PINFIX_PROMPT__: string | undefined

const PROMPT_STORAGE_KEY = 'pinfix-prompt'
const DIALOG_WIDTH = 320
const DIALOG_HEIGHT = 448
const DIALOG_MARGIN = 8
const DIALOG_PIN_GAP = 16
const DIALOG_PIN_Y_OFFSET = -4

let pinCounter = 0

// --- Global dialog state ---
let globalDialog: HTMLElement | null = null
const globalMessages: ChatMessage[] = []
let activePinId: string | null = null
let globalMessagesEl: HTMLElement | null = null
let globalInputEl: HTMLTextAreaElement | null = null
let globalSendBtn: HTMLElement | null = null
let globalStreaming = false
let globalDragged = false
let globalCurrentView: 'chat' | 'settings' = 'chat'
let globalChatViewEl: HTMLElement | null = null
let globalSettingsViewEl: HTMLElement | null = null
let globalHeaderEl: HTMLElement | null = null
let globalPathSpan: HTMLElement | null = null

// Callbacks stored from createOrShowGlobalDialog
let onSendCallback: ((content: string) => void) | null = null
let onCloseCallback: (() => void) | null = null
let onStopCallback: (() => void) | null = null
let onResetCallback: (() => void) | null = null

export function createPinId(): string {
  return `pin_${++pinCounter}_${Date.now()}`
}

export function getPrompt(): string {
  const stored = localStorage.getItem(PROMPT_STORAGE_KEY)
  if (stored) return stored
  if (typeof __PINFIX_PROMPT__ !== 'undefined' && __PINFIX_PROMPT__) {
    return __PINFIX_PROMPT__
  }
  if (typeof window !== 'undefined' && (window as any).__PINFIX_PROMPT__) {
    return (window as any).__PINFIX_PROMPT__
  }
  return ''
}

export function renderPin(root: ShadowRoot, pin: Pin): HTMLElement {
  const container = document.createElement('div')
  container.className = 'pinfix-pin'
  container.dataset.pinId = pin.id
  Object.assign(container.style, {
    position: 'fixed',
    left: `${pin.x - 12}px`,
    top: `${pin.y - 12}px`,
    zIndex: '99999',
  })

  const dot = document.createElement('div')
  dot.className = 'pinfix-pin-dot'
  dot.dataset.status = pin.status
  container.appendChild(dot)

  root.appendChild(container)
  pin.el = container
  return container
}

export function updatePinStatus(pin: Pin, status: Pin['status']) {
  pin.status = status
  if (pin.el) {
    const dot = pin.el.querySelector('.pinfix-pin-dot') as HTMLElement
    if (dot) dot.dataset.status = status
  }
}

// --- Global Dialog API ---

export function getActivePinId(): string | null {
  return activePinId
}

export function setActivePinId(id: string | null) {
  activePinId = id
}

export function isGlobalDialogVisible(): boolean {
  if (!globalDialog) return false
  return globalDialog.style.display !== 'none'
}

export function showGlobalDialog() {
  if (globalDialog) {
    globalDialog.style.display = ''
    if (globalInputEl) setTimeout(() => globalInputEl!.focus(), 0)
  }
}

export function hideGlobalDialog() {
  if (globalDialog) {
    globalDialog.style.display = 'none'
  }
}

export function shouldMoveDialogToPin(wasDragged: boolean, options?: { force?: boolean }): boolean {
  return Boolean(options?.force) || !wasDragged
}

export function getDialogDragStart(
  dialog: HTMLElement,
  pointer: { x: number; y: number },
  fallback: { x: number; y: number },
): { dialogX: number; dialogY: number; dragX: number; dragY: number } {
  const dialogX = parsePixelValue(dialog.style.left) ?? fallback.x
  const dialogY = parsePixelValue(dialog.style.top) ?? fallback.y
  return {
    dialogX,
    dialogY,
    dragX: pointer.x - dialogX,
    dragY: pointer.y - dialogY,
  }
}

export function getDialogPositionNearPin(
  pin: { x: number; y: number },
  dialogSize: { width: number; height: number },
  viewport: { width: number; height: number },
  margin = DIALOG_MARGIN,
): { x: number; y: number } {
  const preferredX = pin.x + DIALOG_PIN_GAP
  const preferredY = pin.y + DIALOG_PIN_Y_OFFSET
  const maxX = Math.max(margin, viewport.width - dialogSize.width - margin)
  const maxY = Math.max(margin, viewport.height - dialogSize.height - margin)
  return {
    x: clamp(preferredX, margin, maxX),
    y: clamp(preferredY, margin, maxY),
  }
}

export function moveDialogToPin(pin: Pin, options?: { force?: boolean }) {
  if (!globalDialog) return
  // Update path regardless of drag state
  if (globalPathSpan) {
    globalPathSpan.textContent = pin.source
    globalPathSpan.title = pin.source
  }
  // Only reposition if user hasn't manually dragged
  if (!shouldMoveDialogToPin(globalDragged, options)) return
  if (options?.force) globalDragged = false
  positionDialogNearPin(globalDialog, pin)
}

export function createOrShowGlobalDialog(
  root: ShadowRoot,
  pin: Pin,
  onSend: (content: string) => void,
  onClose: () => void,
  onStop: () => void,
  onResetWorkspaceSession: () => void,
): HTMLElement {
  activePinId = pin.id
  onSendCallback = onSend
  onCloseCallback = onClose
  onStopCallback = onStop
  onResetCallback = onResetWorkspaceSession

  if (globalDialog) {
    moveDialogToPin(pin, { force: true })
    showGlobalDialog()
    return globalDialog
  }

  globalDragged = false

  const dialog = document.createElement('div')
  dialog.className = 'pinfix-chat'
  Object.assign(dialog.style, {
    position: 'fixed',
    left: `${pin.x + DIALOG_PIN_GAP}px`,
    top: `${pin.y + DIALOG_PIN_Y_OFFSET}px`,
    zIndex: '99999',
  })

  // Header
  const header = document.createElement('div')
  header.className = 'pinfix-chat-header'

  const headerIcon = document.createElement('div')
  headerIcon.className = 'pinfix-chat-header-icon'
  headerIcon.innerHTML = ICON_EDIT
  header.appendChild(headerIcon)

  const titleSpan = document.createElement('span')
  titleSpan.className = 'pinfix-chat-title'
  titleSpan.textContent = 'PinFix'
  header.appendChild(titleSpan)

  // Header action buttons
  const actionsDiv = document.createElement('div')
  actionsDiv.className = 'pinfix-chat-header-actions'

  const settingsBtn = document.createElement('button')
  settingsBtn.className = 'pinfix-chat-header-btn'
  settingsBtn.innerHTML = ICON_SETTINGS
  settingsBtn.title = 'Settings'
  actionsDiv.appendChild(settingsBtn)

  const resetBtn = document.createElement('button')
  resetBtn.className = 'pinfix-chat-header-btn'
  resetBtn.innerHTML = ICON_REFRESH
  resetBtn.title = 'New session'
  resetBtn.addEventListener('click', () => {
    if (onResetCallback) onResetCallback()
  })
  actionsDiv.appendChild(resetBtn)

  const minimizeBtn = document.createElement('button')
  minimizeBtn.className = 'pinfix-chat-header-btn'
  minimizeBtn.innerHTML = ICON_MINIMIZE
  minimizeBtn.title = 'Minimize'
  minimizeBtn.addEventListener('click', () => {
    hideGlobalDialog()
  })
  actionsDiv.appendChild(minimizeBtn)

  const closeBtn = document.createElement('button')
  closeBtn.className = 'pinfix-chat-header-btn'
  closeBtn.innerHTML = ICON_CLOSE
  closeBtn.title = 'Close'
  closeBtn.addEventListener('click', () => {
    if (onCloseCallback) onCloseCallback()
  })
  actionsDiv.appendChild(closeBtn)

  header.appendChild(actionsDiv)
  dialog.appendChild(header)
  globalHeaderEl = header

  // Drag handling
  let dragX = 0
  let dragY = 0
  let dialogX = pin.x + 16
  let dialogY = pin.y - 4

  function initDrag(e: MouseEvent) {
    if ((e.target as HTMLElement).closest?.('button')) return
    e.preventDefault()
    const dragStart = getDialogDragStart(
      dialog,
      { x: e.clientX, y: e.clientY },
      { x: dialogX, y: dialogY },
    )
    dialogX = dragStart.dialogX
    dialogY = dragStart.dialogY
    dragX = dragStart.dragX
    dragY = dragStart.dragY

    const onMouseMove = (ev: MouseEvent) => {
      globalDragged = true
      dialogX = ev.clientX - dragX
      dialogY = ev.clientY - dragY
      dialog.style.left = `${dialogX}px`
      dialog.style.top = `${dialogY}px`
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  header.addEventListener('mousedown', initDrag)

  // === Chat View ===
  const chatView = document.createElement('div')
  chatView.className = 'pinfix-chat-view'
  globalChatViewEl = chatView

  // Source file path bar
  const pathSpan = document.createElement('div')
  pathSpan.className = 'pinfix-chat-path'
  pathSpan.textContent = pin.source
  pathSpan.title = pin.source
  chatView.appendChild(pathSpan)
  globalPathSpan = pathSpan

  // Messages container
  const messagesEl = document.createElement('div')
  messagesEl.className = 'pinfix-chat-messages'
  chatView.appendChild(messagesEl)
  globalMessagesEl = messagesEl

  // Empty state
  const empty = document.createElement('div')
  empty.className = 'pinfix-chat-empty'
  empty.textContent = 'Describe the changes you want'
  messagesEl.appendChild(empty)

  // Input row
  const inputRow = document.createElement('div')
  inputRow.className = 'pinfix-chat-input-row'

  const growWrap = document.createElement('div')
  growWrap.className = 'pinfix-chat-grow-wrap'
  growWrap.dataset.value = ''

  const textarea = document.createElement('textarea')
  textarea.className = 'pinfix-chat-textarea'
  textarea.placeholder = 'Ask AI to edit...'
  textarea.rows = 1
  textarea.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  })
  textarea.addEventListener('input', () => {
    growWrap.dataset.value = textarea.value
  })
  growWrap.appendChild(textarea)
  inputRow.appendChild(growWrap)
  globalInputEl = textarea

  const sendBtn = document.createElement('button')
  sendBtn.className = 'pinfix-chat-send'
  sendBtn.innerHTML = ICON_SEND
  sendBtn.title = 'Send'
  sendBtn.addEventListener('click', () => {
    if (globalStreaming) {
      if (onStopCallback) onStopCallback()
    } else {
      send()
    }
  })
  inputRow.appendChild(sendBtn)
  globalSendBtn = sendBtn

  chatView.appendChild(inputRow)
  dialog.appendChild(chatView)

  // === Settings View (full-dialog replacement) ===
  const settingsView = document.createElement('div')
  settingsView.className = 'pinfix-settings-view'
  settingsView.style.display = 'none'
  globalSettingsViewEl = settingsView

  const settingsHeader = document.createElement('div')
  settingsHeader.className = 'pinfix-settings-header'

  const backBtn = document.createElement('button')
  backBtn.className = 'pinfix-settings-back-btn'
  backBtn.innerHTML = ICON_BACK
  backBtn.title = 'Back'
  backBtn.addEventListener('click', () => switchView('chat'))
  settingsHeader.appendChild(backBtn)

  const settingsTitle = document.createElement('span')
  settingsTitle.className = 'pinfix-settings-title'
  settingsTitle.textContent = 'Settings'
  settingsHeader.appendChild(settingsTitle)

  settingsHeader.addEventListener('mousedown', initDrag)
  settingsView.appendChild(settingsHeader)

  const settingsBody = document.createElement('div')
  settingsBody.className = 'pinfix-settings-body'

  const promptLabel = document.createElement('div')
  promptLabel.className = 'pinfix-settings-label'
  promptLabel.textContent = 'System Prompt'
  settingsBody.appendChild(promptLabel)

  const promptTextarea = document.createElement('textarea')
  promptTextarea.className = 'pinfix-settings-textarea'
  const defaultPrompt =
    (typeof __PINFIX_PROMPT__ !== 'undefined' && __PINFIX_PROMPT__) ||
    (typeof window !== 'undefined' && (window as any).__PINFIX_PROMPT__) ||
    ''
  promptTextarea.placeholder = defaultPrompt || 'Enter custom prompt...'
  promptTextarea.value = localStorage.getItem(PROMPT_STORAGE_KEY) || ''
  promptTextarea.addEventListener('input', () => {
    const val = promptTextarea.value.trim()
    if (val) {
      localStorage.setItem(PROMPT_STORAGE_KEY, val)
    } else {
      localStorage.removeItem(PROMPT_STORAGE_KEY)
    }
  })
  settingsBody.appendChild(promptTextarea)
  settingsView.appendChild(settingsBody)
  dialog.appendChild(settingsView)

  // Settings button toggles view
  settingsBtn.addEventListener('click', () => {
    const target = globalCurrentView === 'settings' ? 'chat' : 'settings'
    switchView(target)
  })

  globalCurrentView = 'chat'

  root.appendChild(dialog)
  globalDialog = dialog
  positionDialogNearPin(dialog, pin)

  setTimeout(() => textarea.focus(), 0)

  function send() {
    const content = textarea.value.trim()
    if (!content) return
    const emptyEl = messagesEl.querySelector('.pinfix-chat-empty')
    if (emptyEl) emptyEl.remove()
    appendGlobalMessage('user', content)
    textarea.value = ''
    growWrap.dataset.value = ''
    if (onSendCallback) onSendCallback(content)
    showGlobalTyping()
    setGlobalStreaming(true)
  }

  return dialog
}

// --- Message operations ---

export function appendGlobalMessage(role: ChatMessage['role'], text: string) {
  if (globalMessagesEl) {
    const emptyEl = globalMessagesEl.querySelector('.pinfix-chat-empty')
    if (emptyEl) emptyEl.remove()
  }

  // Tool messages get special collapsible rendering
  if (role === 'tool') {
    appendToolUse(text)
    return
  }

  const last = globalMessages[globalMessages.length - 1]
  if (last && last.role === role) {
    last.text += text
    if (last.el) {
      if (role === 'assistant') {
        last.el.innerHTML = renderMarkdown(last.text)
        bindCopyButtons(last.el)
      } else {
        last.el.textContent = last.text
      }
    }
  } else {
    const msg: ChatMessage = { role, text }
    const el = createMessageEl(role, text)
    msg.el = el
    globalMessages.push(msg)
    if (globalMessagesEl) globalMessagesEl.appendChild(el)
  }
  scrollToBottom()
}

function appendToolUse(toolName: string) {
  if (!globalMessagesEl) return
  const lastEl = globalMessagesEl.lastElementChild
  const lastToolEl = lastEl?.classList.contains('pinfix-tool-group') ? lastEl : null
  if (lastToolEl) {
    const list = lastToolEl.querySelector('.pinfix-tool-list')
    if (list) {
      const item = document.createElement('div')
      item.className = 'pinfix-tool-item'
      item.textContent = toolName
      list.appendChild(item)
      const summary = lastToolEl.querySelector('.pinfix-tool-summary') as HTMLElement
      const count = list.children.length
      summary.textContent = `\u2699 Using ${count} tool${count > 1 ? 's' : ''}...`
    }
  } else {
    const group = document.createElement('div')
    group.className = 'pinfix-tool-group'

    const summary = document.createElement('div')
    summary.className = 'pinfix-tool-summary'
    summary.textContent = `\u2699 Using 1 tool...`
    summary.addEventListener('click', () => {
      group.classList.toggle('expanded')
    })
    group.appendChild(summary)

    const list = document.createElement('div')
    list.className = 'pinfix-tool-list'
    const item = document.createElement('div')
    item.className = 'pinfix-tool-item'
    item.textContent = toolName
    list.appendChild(item)
    group.appendChild(list)

    globalMessagesEl.appendChild(group)
  }
  globalMessages.push({ role: 'tool', text: toolName })
  scrollToBottom()
}

export function showGlobalTyping() {
  if (!globalMessagesEl) return
  hideGlobalTyping()
  const typing = document.createElement('div')
  typing.className = 'pinfix-typing'
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div')
    dot.className = 'pinfix-typing-dot'
    typing.appendChild(dot)
  }
  globalMessagesEl.appendChild(typing)
  scrollToBottom()
}

export function hideGlobalTyping() {
  if (!globalMessagesEl) return
  const el = globalMessagesEl.querySelector('.pinfix-typing')
  if (el) el.remove()
}

export function showGlobalError(error: string, onRetry: () => void) {
  if (!globalMessagesEl) return
  const el = document.createElement('div')
  el.className = 'pinfix-chat-error'

  const text = document.createElement('span')
  text.textContent = error
  el.appendChild(text)

  const retryBtn = document.createElement('button')
  retryBtn.className = 'pinfix-chat-retry'
  retryBtn.textContent = 'Retry'
  retryBtn.addEventListener('click', () => {
    el.remove()
    onRetry()
  })
  el.appendChild(retryBtn)

  globalMessagesEl.appendChild(el)
  scrollToBottom()
}

export function setGlobalStreaming(streaming: boolean) {
  globalStreaming = streaming
  if (!globalSendBtn) return
  if (streaming) {
    globalSendBtn.className = 'pinfix-chat-stop'
    globalSendBtn.innerHTML = ICON_STOP
    globalSendBtn.title = 'Stop'
  } else {
    globalSendBtn.className = 'pinfix-chat-send'
    globalSendBtn.innerHTML = ICON_SEND
    globalSendBtn.title = 'Send'
  }
}

export function resetGlobalMessages() {
  globalMessages.length = 0
  if (globalMessagesEl) {
    globalMessagesEl.innerHTML = ''
    const empty = document.createElement('div')
    empty.className = 'pinfix-chat-empty'
    empty.textContent = 'Describe the changes you want'
    globalMessagesEl.appendChild(empty)
  }
  setGlobalStreaming(false)
}

export function destroyGlobalDialog() {
  if (globalDialog) {
    globalDialog.remove()
    globalDialog = null
  }
  globalMessages.length = 0
  activePinId = null
  globalMessagesEl = null
  globalInputEl = null
  globalSendBtn = null
  globalStreaming = false
  globalDragged = false
  globalCurrentView = 'chat'
  globalChatViewEl = null
  globalSettingsViewEl = null
  globalHeaderEl = null
  globalPathSpan = null
  onSendCallback = null
  onCloseCallback = null
  onStopCallback = null
  onResetCallback = null
}

// --- Private helpers ---

function parsePixelValue(value: string): number | null {
  if (!value.endsWith('px')) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function positionDialogNearPin(dialog: HTMLElement, pin: Pin) {
  const position = getDialogPositionNearPin(pin, getDialogSize(dialog), getViewportSize())
  dialog.style.left = `${position.x}px`
  dialog.style.top = `${position.y}px`
}

function getDialogSize(dialog: HTMLElement): { width: number; height: number } {
  const rect = dialog.getBoundingClientRect()
  return {
    width: rect.width || DIALOG_WIDTH,
    height: rect.height || DIALOG_HEIGHT,
  }
}

function getViewportSize(): { width: number; height: number } {
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function switchView(view: 'chat' | 'settings') {
  globalCurrentView = view
  if (globalHeaderEl) globalHeaderEl.style.display = view === 'chat' ? '' : 'none'
  if (globalChatViewEl) globalChatViewEl.style.display = view === 'chat' ? '' : 'none'
  if (globalSettingsViewEl) globalSettingsViewEl.style.display = view === 'settings' ? '' : 'none'
  if (view === 'chat' && globalInputEl) {
    setTimeout(() => globalInputEl!.focus(), 0)
  }
}

function createMessageEl(role: string, text: string): HTMLElement {
  const el = document.createElement('div')
  el.className = 'pinfix-chat-msg'
  el.dataset.role = role
  if (role === 'assistant') {
    el.innerHTML = renderMarkdown(text)
    bindCopyButtons(el)
  } else {
    el.textContent = text
  }
  return el
}

function scrollToBottom() {
  if (globalMessagesEl) {
    globalMessagesEl.scrollTop = globalMessagesEl.scrollHeight
  }
}
