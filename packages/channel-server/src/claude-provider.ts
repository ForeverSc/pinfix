import { query, type SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'
import type { AIProvider, AISession } from './types.js'

function log(msg: string) {
  process.stderr.write(`[claude] ${msg}\n`)
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

let nextSessionId = 1

export function createClaudeSession(contextPrefix: string, cwd?: string): AISession {
  const sessionId = nextSessionId++
  let chunkCb: ((text: string) => void) | null = null
  let toolCb: ((toolName: string) => void) | null = null
  let doneCb: (() => void) | null = null
  let errorCb: ((error: string) => void) | null = null
  let killed = false
  let startupError: string | null = null
  const abortController = new AbortController()

  // Resolve function for the next user message
  let resolveNextMessage: ((value: SDKUserMessage) => void) | null = null
  let firstMessage = true
  let turnId = 0

  // Async generator that yields user messages on demand
  async function* userMessages(): AsyncGenerator<SDKUserMessage> {
    while (!killed) {
      const msg = await new Promise<SDKUserMessage>((resolve) => {
        resolveNextMessage = resolve
      })
      if (killed) break
      yield msg
    }
  }

  // Start the query with streaming input
  async function startSession() {
    try {
      const stream = query({
        prompt: userMessages(),
        options: {
          permissionMode: 'auto',
          includePartialMessages: true,
          abortController,
          ...(cwd ? { cwd } : {}),
        },
      })

      for await (const message of stream) {
        if (killed) break

        // Streaming partial text deltas
        if (message.type === 'stream_event' && (message as any).event) {
          const event = (message as any).event
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            if (chunkCb) chunkCb(event.delta.text)
          }
          // Tool use start - notify separately
          if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
            const toolName = event.content_block.name
            logEvent('tool', { name: toolName })
            if (toolCb) toolCb(toolName)
          }
        }

        // Tool progress (elapsed time updates)
        if (message.type === 'tool_progress') {
          // Could show progress but keep it minimal
        }

        if (message.type === 'result') {
          if (doneCb) doneCb()
        }
      }
    } catch (err: any) {
      if (!killed) {
        const errorMessage = err.message || 'Unknown error'
        startupError = errorMessage
        logEvent('error', { session: sessionId, message: errorMessage })
        if (errorCb) errorCb(errorMessage)
      }
    }
  }

  startSession()

  function sendMessage(content: string) {
    if (killed) return
    if (startupError) {
      if (errorCb) errorCb(startupError)
      return
    }
    turnId += 1
    let prompt = content
    const includesContextPrefix = firstMessage && Boolean(contextPrefix)
    if (firstMessage) {
      if (contextPrefix) {
        prompt = `${contextPrefix}\n\n${content}`
      }
      firstMessage = false
    }
    const sdkMessage: SDKUserMessage = {
      type: 'user',
      message: { role: 'user', content: prompt },
      parent_tool_use_id: null,
    }
    logEvent('send', {
      session: sessionId,
      turn: turnId,
      cwd: cwd ?? null,
      context: includesContextPrefix,
    })
    if (resolveNextMessage) {
      const resolve = resolveNextMessage
      resolveNextMessage = null
      resolve(sdkMessage)
    } else {
      logEvent('send-lost', {
        session: sessionId,
        turn: turnId,
        content: sdkMessage.message.content,
      })
    }
  }

  function kill() {
    killed = true
    chunkCb = null
    toolCb = null
    doneCb = null
    errorCb = null
    abortController.abort()
    // Unblock pending promise
    if (resolveNextMessage) {
      resolveNextMessage({
        type: 'user',
        message: { role: 'user', content: '' },
        parent_tool_use_id: null,
      })
      resolveNextMessage = null
    }
  }

  return {
    sendMessage,
    kill,
    onChunk: (cb) => {
      chunkCb = cb
    },
    onTool: (cb) => {
      toolCb = cb
    },
    onDone: (cb) => {
      doneCb = cb
    },
    onError: (cb) => {
      errorCb = cb
    },
  }
}

export const claudeProvider: AIProvider = {
  name: 'claude',
  createSession: createClaudeSession,
}
