import { WebSocketServer, WebSocket } from 'ws'
import {
  isSessionStartMessage,
  isChatSendMessage,
  isSessionEndMessage,
  isWorkspaceResetMessage,
  type ServerMessage,
} from '@pinfix/shared'
import type { AISession } from './types.js'
import { claudeProvider } from './claude-provider.js'

function log(msg: string) {
  process.stderr.write(`[ws] ${msg}\n`)
}

function logEvent(event: string, payload: Record<string, unknown> = {}) {
  const fields = Object.entries(payload)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${formatValue(value)}`)
    .join(' ')
  log(fields ? `${event} ${fields}` : event)
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value)
  if (value === null) return 'null'
  return String(value)
}

interface WsServerOptions {
  port: number
  cwd?: string
  maxPortRetries?: number
}

const HEARTBEAT_INTERVAL = 30_000
const HEARTBEAT_TIMEOUT = 45_000

async function tryListen(port: number, maxRetries: number): Promise<WebSocketServer> {
  let lastError: Error | null = null
  for (let i = 0; i <= maxRetries; i++) {
    const candidatePort = port + i
    try {
      const wss = new WebSocketServer({ port: candidatePort })
      await new Promise<void>((resolve, reject) => {
        wss.once('listening', resolve)
        wss.once('error', reject)
      })
      return wss
    } catch (err: any) {
      lastError = err
      if (err.code !== 'EADDRINUSE') throw err
    }
  }
  throw lastError
}

const DEFAULT_SYSTEM_PROMPT = `You are PinFix, a coding assistant. The user has annotated a UI element in their running app. You will receive the source location (file:line:column) and their request.

Rules:
- Read the relevant file first to understand context before making changes
- Keep changes minimal and focused on what was asked
- Reply concisely, explain what was changed
- If the request is ambiguous, ask before modifying`

export async function createWsServer(options: WsServerOptions) {
  const { port, cwd, maxPortRetries = 5 } = options
  const pinContexts = new Map<string, { source: string }>()
  let workspaceSession: AISession | null = null
  let workspacePrompt: string | undefined
  let activeTurn: { pinId: string; ws: WebSocket; turnId: number; source: string } | null = null
  let workspaceSessionId = 0
  let nextTurnId = 1

  const wss = await tryListen(port, maxPortRetries)
  const actualPort = (wss.address() as { port: number }).port

  // Heartbeat: ping all clients periodically, terminate unresponsive ones
  const heartbeatInterval = setInterval(() => {
    for (const ws of wss.clients) {
      const client = ws as WebSocket & { isAlive?: boolean }
      if (client.isAlive === false) {
        client.terminate()
        continue
      }
      client.isAlive = false
      client.ping()
      // Also send application-level ping so browser clients can detect liveness
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'ping' }))
      }
    }
  }, HEARTBEAT_INTERVAL)

  wss.on('connection', (ws) => {
    const client = ws as WebSocket & { isAlive?: boolean }
    client.isAlive = true

    ws.on('pong', () => {
      client.isAlive = true
    })

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())

        // Application-level pong from client
        if (msg.type === 'pong') return

        if (isSessionStartMessage(msg)) {
          logEvent('session start', {
            pinId: msg.pinId,
            source: msg.source,
            prompt: msg.prompt ? 'custom' : undefined,
          })
          handleSessionStart(ws, msg.pinId, msg.source, msg.prompt)
        } else if (isChatSendMessage(msg)) {
          handleChatSend(ws, msg.pinId, msg.content)
        } else if (isSessionEndMessage(msg)) {
          logEvent('session end', { pinId: msg.pinId })
          handleSessionEnd(msg.pinId)
        } else if (isWorkspaceResetMessage(msg)) {
          logEvent('workspace reset', {
            prompt: msg.prompt ? 'custom' : undefined,
          })
          handleWorkspaceReset(msg.prompt)
        }
      } catch {
        // ignore malformed messages
      }
    })
  })

  function handleSessionStart(_ws: WebSocket, pinId: string, source: string, prompt?: string) {
    pinContexts.set(pinId, { source })
    if (prompt !== undefined) {
      workspacePrompt = prompt || undefined
    }
    ensureWorkspaceSession()
  }

  function ensureWorkspaceSession() {
    if (workspaceSession) return workspaceSession

    const systemPrompt = workspacePrompt || DEFAULT_SYSTEM_PROMPT
    workspaceSessionId += 1
    logEvent('workspace session', {
      workspace: workspaceSessionId,
      cwd: cwd ?? null,
      prompt: workspacePrompt ? 'custom' : 'default',
    })
    const session = claudeProvider.createSession(systemPrompt, cwd)

    session.onChunk((text) => {
      if (!activeTurn) return
      send(activeTurn.ws, { type: 'chat:chunk', pinId: activeTurn.pinId, text })
    })

    session.onTool((tool) => {
      if (!activeTurn) return
      send(activeTurn.ws, { type: 'chat:tool', pinId: activeTurn.pinId, tool })
    })

    session.onDone(() => {
      if (!activeTurn) return
      const turn = activeTurn
      activeTurn = null
      logEvent('turn done', {
        workspace: workspaceSessionId,
        turn: turn.turnId,
        pinId: turn.pinId,
        source: turn.source,
      })
      send(turn.ws, { type: 'chat:done', pinId: turn.pinId })
    })

    session.onError((error) => {
      const turn = activeTurn
      activeTurn = null
      workspaceSession = null
      logEvent('turn error', {
        workspace: workspaceSessionId,
        turn: turn?.turnId ?? null,
        pinId: turn?.pinId ?? null,
        source: turn?.source ?? null,
        error,
      })
      if (turn) {
        send(turn.ws, { type: 'chat:error', pinId: turn.pinId, error })
      }
    })

    workspaceSession = session
    return session
  }

  function handleChatSend(ws: WebSocket, pinId: string, content: string) {
    const pinContext = pinContexts.get(pinId)
    if (!pinContext) {
      send(ws, { type: 'chat:error', pinId, error: 'No active session' })
      return
    }

    if (activeTurn) {
      send(ws, { type: 'chat:error', pinId, error: 'Workspace session is busy' })
      return
    }

    const session = ensureWorkspaceSession()
    const turnId = nextTurnId++
    const message = buildTurnPrompt(pinContext.source, content)
    activeTurn = { pinId, ws, turnId, source: pinContext.source }
    logEvent('turn send', {
      workspace: workspaceSessionId,
      turn: turnId,
      pinId,
      source: pinContext.source,
      cwd: cwd ?? null,
      message,
    })
    session.sendMessage(message)
  }

  function handleSessionEnd(pinId: string) {
    pinContexts.delete(pinId)
    if (activeTurn?.pinId === pinId) {
      logEvent('turn cancel', {
        workspace: workspaceSessionId,
        turn: activeTurn.turnId,
        pinId,
        source: activeTurn.source,
      })
      activeTurn = null
      if (workspaceSession) {
        workspaceSession.kill()
        workspaceSession = null
      }
    }
  }

  function handleWorkspaceReset(prompt?: string) {
    workspacePrompt = prompt
    activeTurn = null
    if (workspaceSession) {
      workspaceSession.kill()
      workspaceSession = null
    }
    ensureWorkspaceSession()
  }

  const close = () => {
    clearInterval(heartbeatInterval)
    if (workspaceSession) {
      workspaceSession.kill()
      workspaceSession = null
    }
    pinContexts.clear()
    activeTurn = null
    wss.close()
  }

  return { port: actualPort, close }
}

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg))
  }
}

function buildTurnPrompt(source: string, content: string) {
  return `[source: ${source}]\n\n${content}`
}
