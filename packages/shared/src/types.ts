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
}

export interface SessionEndMessage {
  type: 'session:end'
  pinId: string
}

export interface WorkspaceResetMessage {
  type: 'workspace:reset'
  prompt?: string
}

export type ClientMessage = PinMessage | SessionStartMessage | ChatSendMessage | SessionEndMessage | WorkspaceResetMessage

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

export type ServerMessage = ChatChunkMessage | ChatToolMessage | ChatDoneMessage | ChatErrorMessage | PingMessage

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
  return m.type === 'chat:send' && typeof m.pinId === 'string' && typeof m.content === 'string'
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
