export interface PinPosition {
  x: number
  y: number
}

export interface PinMessage {
  type: 'pin'
  id: string
  source: string
  position: PinPosition
  comment: string
}

export type PinStatus = 'editing' | 'sent' | 'done'

export interface PinState {
  id: string
  source: string
  position: PinPosition
  comment: string
  status: PinStatus
}

export interface RectSnapshot {
  x: number
  y: number
  width: number
  height: number
}

export type VisualChangeOperation = 'move' | 'resize' | 'move-resize' | 'design-panel'

export type VisualChangeTargetScope = 'element' | 'parent' | 'group'

export interface VisualTargetSnapshot {
  tagName: string
  id?: string
  className?: string
  text?: string
}

export interface VisualParentLayoutSnapshot {
  tagName: string
  display: string
  gap?: string
  flexDirection?: string
  justifyContent?: string
  alignItems?: string
  gridTemplateColumns?: string
}

export interface DesignPanelChanges {
  layout?: Record<string, string>
  spacing?: Record<string, string>
  size?: Record<string, string>
  style?: Record<string, string>
  typography?: Record<string, string>
}

export interface VisualChangeContext {
  source: string
  operation: VisualChangeOperation
  targetScope?: VisualChangeTargetScope
  intent?: string
  target: VisualTargetSnapshot
  beforeRect: RectSnapshot
  afterRect: RectSnapshot
  delta: RectSnapshot
  computedStyle: Record<string, string>
  parentLayout?: VisualParentLayoutSnapshot
  changes?: DesignPanelChanges
}

export function isPinMessage(msg: unknown): msg is PinMessage {
  if (typeof msg !== 'object' || msg === null) return false
  const m = msg as Record<string, unknown>
  return (
    m.type === 'pin' &&
    typeof m.id === 'string' &&
    typeof m.source === 'string' &&
    typeof m.comment === 'string' &&
    typeof m.position === 'object' &&
    m.position !== null &&
    typeof (m.position as Record<string, unknown>).x === 'number' &&
    typeof (m.position as Record<string, unknown>).y === 'number'
  )
}

// Chat protocol messages (client → server)
export interface SessionStartMessage {
  type: 'session:start'
  pinId: string
  source: string
  prompt?: string
}

export interface ChatSendMessage {
  type: 'chat:send'
  pinId: string
  content: string
  visualChange?: VisualChangeContext
}

export interface SessionEndMessage {
  type: 'session:end'
  pinId: string
}

export interface WorkspaceResetMessage {
  type: 'workspace:reset'
  prompt?: string
}

export type ClientMessage =
  | PinMessage
  | SessionStartMessage
  | ChatSendMessage
  | SessionEndMessage
  | WorkspaceResetMessage

// Chat protocol messages (server → client)
export interface ChatChunkMessage {
  type: 'chat:chunk'
  pinId: string
  text: string
}

export interface ChatToolMessage {
  type: 'chat:tool'
  pinId: string
  tool: string
}

export interface ChatDoneMessage {
  type: 'chat:done'
  pinId: string
}

export interface ChatErrorMessage {
  type: 'chat:error'
  pinId: string
  error: string
}

export interface PingMessage {
  type: 'ping'
}

export interface PongMessage {
  type: 'pong'
}

export type ServerMessage =
  | ChatChunkMessage
  | ChatToolMessage
  | ChatDoneMessage
  | ChatErrorMessage
  | PingMessage

export function isSessionStartMessage(msg: unknown): msg is SessionStartMessage {
  if (typeof msg !== 'object' || msg === null) return false
  const m = msg as Record<string, unknown>
  return (
    m.type === 'session:start' &&
    typeof m.pinId === 'string' &&
    typeof m.source === 'string' &&
    (m.prompt === undefined || typeof m.prompt === 'string')
  )
}

export function isChatSendMessage(msg: unknown): msg is ChatSendMessage {
  if (typeof msg !== 'object' || msg === null) return false
  const m = msg as Record<string, unknown>
  return (
    m.type === 'chat:send' &&
    typeof m.pinId === 'string' &&
    typeof m.content === 'string' &&
    (m.visualChange === undefined || isVisualChangeContext(m.visualChange))
  )
}

export function isSessionEndMessage(msg: unknown): msg is SessionEndMessage {
  if (typeof msg !== 'object' || msg === null) return false
  const m = msg as Record<string, unknown>
  return m.type === 'session:end' && typeof m.pinId === 'string'
}

export function isWorkspaceResetMessage(msg: unknown): msg is WorkspaceResetMessage {
  if (typeof msg !== 'object' || msg === null) return false
  const m = msg as Record<string, unknown>
  return m.type === 'workspace:reset' && (m.prompt === undefined || typeof m.prompt === 'string')
}

export interface PinFixOptions {
  port?: number
  root?: string
  prompt?: string
  hotkey?: string
  fab?: boolean
  escapeTags?: (string | RegExp)[]
  match?: RegExp
  exclude?: RegExp
  debug?: boolean
}

function isVisualChangeContext(value: unknown): value is VisualChangeContext {
  if (!isRecord(value)) return false
  return (
    typeof value.source === 'string' &&
    isVisualChangeOperation(value.operation) &&
    isVisualTargetSnapshot(value.target) &&
    isRectSnapshot(value.beforeRect) &&
    isRectSnapshot(value.afterRect) &&
    isRectSnapshot(value.delta) &&
    isStringRecord(value.computedStyle) &&
    (value.parentLayout === undefined || isVisualParentLayoutSnapshot(value.parentLayout)) &&
    (value.targetScope === undefined || isVisualChangeTargetScope(value.targetScope)) &&
    isOptionalString(value.intent) &&
    (value.changes === undefined || isDesignPanelChanges(value.changes))
  )
}

function isVisualChangeOperation(value: unknown): value is VisualChangeOperation {
  return (
    value === 'move' || value === 'resize' || value === 'move-resize' || value === 'design-panel'
  )
}

function isVisualChangeTargetScope(value: unknown): value is VisualChangeTargetScope {
  return value === 'element' || value === 'parent' || value === 'group'
}

function isDesignPanelChanges(value: unknown): value is DesignPanelChanges {
  if (!isRecord(value)) return false
  return (
    (value.layout === undefined || isStringRecord(value.layout)) &&
    (value.spacing === undefined || isStringRecord(value.spacing)) &&
    (value.size === undefined || isStringRecord(value.size)) &&
    (value.style === undefined || isStringRecord(value.style)) &&
    (value.typography === undefined || isStringRecord(value.typography))
  )
}

function isRectSnapshot(value: unknown): value is RectSnapshot {
  if (!isRecord(value)) return false
  return (
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.width === 'number' &&
    typeof value.height === 'number'
  )
}

function isVisualTargetSnapshot(value: unknown): value is VisualTargetSnapshot {
  if (!isRecord(value)) return false
  return (
    typeof value.tagName === 'string' &&
    isOptionalString(value.id) &&
    isOptionalString(value.className) &&
    isOptionalString(value.text)
  )
}

function isVisualParentLayoutSnapshot(value: unknown): value is VisualParentLayoutSnapshot {
  if (!isRecord(value)) return false
  return (
    typeof value.tagName === 'string' &&
    typeof value.display === 'string' &&
    isOptionalString(value.gap) &&
    isOptionalString(value.flexDirection) &&
    isOptionalString(value.justifyContent) &&
    isOptionalString(value.alignItems) &&
    isOptionalString(value.gridTemplateColumns)
  )
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) return false
  return Object.values(value).every((item) => typeof item === 'string')
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
