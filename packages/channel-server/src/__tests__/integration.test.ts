import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import WebSocket from 'ws'
import { createWsServer } from '../ws-server'

// Mock the Claude Agent SDK
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}))

import { query } from '@anthropic-ai/claude-agent-sdk'

const mockedQuery = vi.mocked(query)

function waitForMessages(ws: WebSocket, count: number, timeoutMs = 5000): Promise<any[]> {
  return new Promise((resolve) => {
    const messages: any[] = []
    const timeout = setTimeout(() => {
      resolve(messages) // resolve with what we have
    }, timeoutMs)

    ws.on('message', (raw) => {
      messages.push(JSON.parse(raw.toString()))
      if (messages.length >= count) {
        clearTimeout(timeout)
        resolve(messages)
      }
    })
  })
}

describe('Integration: full chat flow', () => {
  let cleanup: (() => void) | undefined

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup?.()
  })

  it('completes a full session:start → chat:send → chunks → done flow', async () => {
    mockedQuery.mockImplementation(({ prompt }) => {
      // Consume the async generator to trigger streaming
      const iter = (prompt as AsyncIterable<any>)[Symbol.asyncIterator]()
      return (async function* () {
        // Wait for the first user message
        await iter.next()
        // Emit text chunks
        yield {
          type: 'stream_event',
          event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello ' } },
        }
        yield {
          type: 'stream_event',
          event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'world' } },
        }
        yield { type: 'result' }
      })() as any
    })

    const { port, close } = await createWsServer({ port: 0 })
    cleanup = close

    const ws = new WebSocket(`ws://localhost:${port}`)
    await new Promise((r) => ws.on('open', r))

    const msgPromise = waitForMessages(ws, 3)

    // Start session
    ws.send(JSON.stringify({ type: 'session:start', pinId: 'pin_1', source: 'src/App.tsx:10:5' }))

    // Send chat message
    await new Promise((r) => setTimeout(r, 50))
    ws.send(JSON.stringify({ type: 'chat:send', pinId: 'pin_1', content: 'make it blue' }))

    const messages = await msgPromise

    expect(messages.length).toBeGreaterThanOrEqual(3)
    expect(messages[0]).toEqual({ type: 'chat:chunk', pinId: 'pin_1', text: 'Hello ' })
    expect(messages[1]).toEqual({ type: 'chat:chunk', pinId: 'pin_1', text: 'world' })
    expect(messages[2]).toEqual({ type: 'chat:done', pinId: 'pin_1' })

    ws.close()
  })

  it('handles Claude SDK errors gracefully', async () => {
    mockedQuery.mockImplementation(({ prompt }) => {
      const iter = (prompt as AsyncIterable<any>)[Symbol.asyncIterator]()
      return (async function* () {
        await iter.next()
        throw new Error('API rate limited')
      })() as any
    })

    const { port, close } = await createWsServer({ port: 0 })
    cleanup = close

    const ws = new WebSocket(`ws://localhost:${port}`)
    await new Promise((r) => ws.on('open', r))

    const msgPromise = waitForMessages(ws, 1)

    ws.send(JSON.stringify({ type: 'session:start', pinId: 'pin_2', source: 'src/App.tsx:5:1' }))
    await new Promise((r) => setTimeout(r, 50))
    ws.send(JSON.stringify({ type: 'chat:send', pinId: 'pin_2', content: 'hello' }))

    const messages = await msgPromise

    expect(messages[0]).toEqual({
      type: 'chat:error',
      pinId: 'pin_2',
      error: 'API rate limited',
    })

    ws.close()
  })

  it('reports Claude startup errors when the user sends a message', async () => {
    mockedQuery.mockImplementation(() => {
      throw new Error('Native CLI binary for darwin-arm64 not found')
    })

    const { port, close } = await createWsServer({ port: 0 })
    cleanup = close

    const ws = new WebSocket(`ws://localhost:${port}`)
    await new Promise((r) => ws.on('open', r))

    const msgPromise = waitForMessages(ws, 1, 1000)

    ws.send(
      JSON.stringify({
        type: 'session:start',
        pinId: 'pin_startup_error',
        source: 'src/App.tsx:5:1',
      }),
    )
    await new Promise((r) => setTimeout(r, 50))
    ws.send(JSON.stringify({ type: 'chat:send', pinId: 'pin_startup_error', content: 'hello' }))

    const messages = await msgPromise

    expect(messages[0]).toEqual({
      type: 'chat:error',
      pinId: 'pin_startup_error',
      error: 'Native CLI binary for darwin-arm64 not found',
    })

    ws.close()
  })

  it('returns error when sending to ended session', async () => {
    mockedQuery.mockImplementation(({ prompt }) => {
      const iter = (prompt as AsyncIterable<any>)[Symbol.asyncIterator]()
      return (async function* () {
        await iter.next()
        yield { type: 'result' }
      })() as any
    })

    const { port, close } = await createWsServer({ port: 0 })
    cleanup = close

    const ws = new WebSocket(`ws://localhost:${port}`)
    await new Promise((r) => ws.on('open', r))

    // Start and immediately end the session
    ws.send(JSON.stringify({ type: 'session:start', pinId: 'pin_3', source: 'src/App.tsx:1:1' }))
    await new Promise((r) => setTimeout(r, 50))
    ws.send(JSON.stringify({ type: 'session:end', pinId: 'pin_3' }))
    await new Promise((r) => setTimeout(r, 50))

    const msgPromise = waitForMessages(ws, 1, 1000)

    // Try to send to the ended session
    ws.send(JSON.stringify({ type: 'chat:send', pinId: 'pin_3', content: 'hello again' }))

    const messages = await msgPromise

    expect(messages[0]).toEqual({
      type: 'chat:error',
      pinId: 'pin_3',
      error: 'No active session',
    })

    ws.close()
  })

  it('shows tool use as separate chat:tool messages', async () => {
    mockedQuery.mockImplementation(({ prompt }) => {
      const iter = (prompt as AsyncIterable<any>)[Symbol.asyncIterator]()
      return (async function* () {
        await iter.next()
        yield {
          type: 'stream_event',
          event: {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Editing file...' },
          },
        }
        yield {
          type: 'stream_event',
          event: {
            type: 'content_block_start',
            content_block: { type: 'tool_use', name: 'write_file' },
          },
        }
        yield {
          type: 'stream_event',
          event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Done!' } },
        }
        yield { type: 'result' }
      })() as any
    })

    const { port, close } = await createWsServer({ port: 0 })
    cleanup = close

    const ws = new WebSocket(`ws://localhost:${port}`)
    await new Promise((r) => ws.on('open', r))

    const msgPromise = waitForMessages(ws, 4)

    ws.send(JSON.stringify({ type: 'session:start', pinId: 'pin_4', source: 'src/App.tsx:1:1' }))
    await new Promise((r) => setTimeout(r, 50))
    ws.send(JSON.stringify({ type: 'chat:send', pinId: 'pin_4', content: 'fix the bug' }))

    const messages = await msgPromise

    // Should have: chunk (text), tool (write_file), chunk (text), done
    const toolMsgs = messages.filter((m) => m.type === 'chat:tool')
    expect(toolMsgs.length).toBe(1)
    expect(toolMsgs[0].tool).toBe('write_file')
    expect(messages[messages.length - 1].type).toBe('chat:done')

    ws.close()
  })

  it('reuses one workspace Claude session across multiple pins', async () => {
    mockedQuery.mockImplementation(({ prompt }) => {
      const iter = (prompt as AsyncIterable<any>)[Symbol.asyncIterator]()
      return (async function* () {
        const first = await iter.next()
        expect(first.value.message.content).toContain('[source: src/App.tsx:10:5]')
        yield {
          type: 'stream_event',
          event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'first' } },
        }
        yield { type: 'result' }

        const second = await iter.next()
        expect(second.value.message.content).toContain('[source: src/Button.tsx:2:1]')
        yield {
          type: 'stream_event',
          event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'second' } },
        }
        yield { type: 'result' }
      })() as any
    })

    const { port, close } = await createWsServer({ port: 0 })
    cleanup = close

    const ws = new WebSocket(`ws://localhost:${port}`)
    await new Promise((r) => ws.on('open', r))

    ws.send(JSON.stringify({ type: 'session:start', pinId: 'pin_1', source: 'src/App.tsx:10:5' }))
    const firstMessagesPromise = waitForMessages(ws, 2)
    await new Promise((r) => setTimeout(r, 50))
    ws.send(JSON.stringify({ type: 'chat:send', pinId: 'pin_1', content: 'make it blue' }))
    const firstMessages = await firstMessagesPromise

    ws.send(JSON.stringify({ type: 'session:start', pinId: 'pin_2', source: 'src/Button.tsx:2:1' }))
    const secondMessagesPromise = waitForMessages(ws, 2)
    await new Promise((r) => setTimeout(r, 50))
    ws.send(JSON.stringify({ type: 'chat:send', pinId: 'pin_2', content: 'make it red' }))
    const secondMessages = await secondMessagesPromise

    expect(mockedQuery).toHaveBeenCalledTimes(1)
    expect(firstMessages[0]).toEqual({ type: 'chat:chunk', pinId: 'pin_1', text: 'first' })
    expect(firstMessages[1]).toEqual({ type: 'chat:done', pinId: 'pin_1' })
    expect(secondMessages[0]).toEqual({ type: 'chat:chunk', pinId: 'pin_2', text: 'second' })
    expect(secondMessages[1]).toEqual({ type: 'chat:done', pinId: 'pin_2' })

    ws.close()
  })

  it('uses a prompt from session:start when creating the workspace session', async () => {
    let firstMessageContent = ''
    mockedQuery.mockImplementation(({ prompt }) => {
      const iter = (prompt as AsyncIterable<any>)[Symbol.asyncIterator]()
      return (async function* () {
        const first = await iter.next()
        firstMessageContent = first.value.message.content
        yield { type: 'result' }
      })() as any
    })

    const { port, close } = await createWsServer({ port: 0 })
    cleanup = close

    const ws = new WebSocket(`ws://localhost:${port}`)
    await new Promise((r) => ws.on('open', r))

    ws.send(
      JSON.stringify({
        type: 'session:start',
        pinId: 'pin_prompt',
        source: 'src/App.tsx:10:5',
        prompt: 'custom system prompt',
      }),
    )
    await new Promise((r) => setTimeout(r, 50))
    ws.send(JSON.stringify({ type: 'chat:send', pinId: 'pin_prompt', content: 'make it blue' }))
    await waitForMessages(ws, 1)

    expect(firstMessageContent).toContain('custom system prompt')
    expect(firstMessageContent).not.toContain('You are PinFix, a coding assistant')

    ws.close()
  })

  it('creates a new workspace Claude session only after workspace reset', async () => {
    mockedQuery.mockImplementation(({ prompt }) => {
      const iter = (prompt as AsyncIterable<any>)[Symbol.asyncIterator]()
      return (async function* () {
        await iter.next()
        yield { type: 'result' }
      })() as any
    })

    const { port, close } = await createWsServer({ port: 0 })
    cleanup = close

    const ws = new WebSocket(`ws://localhost:${port}`)
    await new Promise((r) => ws.on('open', r))

    ws.send(JSON.stringify({ type: 'session:start', pinId: 'pin_1', source: 'src/App.tsx:10:5' }))
    await new Promise((r) => setTimeout(r, 50))
    ws.send(JSON.stringify({ type: 'chat:send', pinId: 'pin_1', content: 'first' }))
    await waitForMessages(ws, 1)

    ws.send(JSON.stringify({ type: 'workspace:reset' }))
    await new Promise((r) => setTimeout(r, 50))
    ws.send(JSON.stringify({ type: 'session:start', pinId: 'pin_2', source: 'src/Button.tsx:2:1' }))
    await new Promise((r) => setTimeout(r, 50))
    ws.send(JSON.stringify({ type: 'chat:send', pinId: 'pin_2', content: 'second' }))
    await waitForMessages(ws, 1)

    expect(mockedQuery).toHaveBeenCalledTimes(2)

    ws.close()
  })

  it('logs compact turn payloads across multiple turns', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    mockedQuery.mockImplementation(({ prompt }) => {
      const iter = (prompt as AsyncIterable<any>)[Symbol.asyncIterator]()
      return (async function* () {
        await iter.next()
        yield { type: 'result' }
        await iter.next()
        yield { type: 'result' }
      })() as any
    })

    const { port, close } = await createWsServer({ port: 0, cwd: '/repo/app' })
    cleanup = close

    const ws = new WebSocket(`ws://localhost:${port}`)
    await new Promise((r) => ws.on('open', r))

    ws.send(JSON.stringify({ type: 'session:start', pinId: 'pin_1', source: 'src/App.tsx:10:5' }))
    await new Promise((r) => setTimeout(r, 50))
    ws.send(
      JSON.stringify({
        type: 'chat:send',
        pinId: 'pin_1',
        content: 'first turn content with enough text to inspect',
      }),
    )
    await waitForMessages(ws, 1)

    ws.send(JSON.stringify({ type: 'session:start', pinId: 'pin_2', source: 'src/Button.tsx:2:1' }))
    await new Promise((r) => setTimeout(r, 50))
    ws.send(
      JSON.stringify({
        type: 'chat:send',
        pinId: 'pin_2',
        content: 'second turn content with enough text to inspect',
      }),
    )
    await waitForMessages(ws, 1)

    try {
      const logs = stderrSpy.mock.calls.map(([chunk]) => String(chunk)).join('')
      expect(logs).toContain('[ws] session start pinId="pin_1" source="src/App.tsx:10:5"')
      expect(logs).toContain(
        '[ws] turn send workspace=1 turn=1 pinId="pin_1" source="src/App.tsx:10:5" cwd="/repo/app"',
      )
      expect(logs).toMatch(/\[claude\] send session=\d+ turn=1 cwd="\/repo\/app" context=true/)
      expect(logs).toContain(
        '[source: src/App.tsx:10:5]\\n\\nfirst turn content with enough text to inspect',
      )
      expect(logs).toContain(
        '[ws] turn send workspace=1 turn=2 pinId="pin_2" source="src/Button.tsx:2:1" cwd="/repo/app"',
      )
      expect(logs).toMatch(/\[claude\] send session=\d+ turn=2 cwd="\/repo\/app" context=false/)
      expect(logs).toContain(
        '[source: src/Button.tsx:2:1]\\n\\nsecond turn content with enough text to inspect',
      )
      expect(logs).not.toContain('[pinfix:claude]')
      expect(logs).not.toContain('[pinfix:ws]')
      expect(logs).not.toContain('query:result')
      expect(logs).not.toContain('sdk:yield_user_message')
      expect(logs).not.toContain('You are PinFix, a coding assistant')
    } finally {
      ws.close()
      stderrSpy.mockRestore()
    }
  })
})

describe('Port retry', () => {
  it('retries on port conflict', async () => {
    // Occupy a port
    const { port: occupiedPort, close: closeFirst } = await createWsServer({ port: 0 })

    // Try to start on same port - should succeed on next port
    const { port: actualPort, close: closeSecond } = await createWsServer({
      port: occupiedPort,
      maxPortRetries: 5,
    })

    expect(actualPort).toBeGreaterThan(occupiedPort)

    closeSecond()
    closeFirst()
  })
})
