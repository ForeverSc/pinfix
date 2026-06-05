import { describe, it, expect, afterEach } from 'vitest'
import WebSocket from 'ws'
import { createWsServer } from '../ws-server'

describe('WebSocket server', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => { cleanup?.() })

  it('ignores malformed messages', async () => {
    const { port, close } = await createWsServer({ port: 0 })
    cleanup = close

    const ws = new WebSocket(`ws://localhost:${port}`)
    await new Promise((r) => ws.on('open', r))

    ws.send('not json')
    ws.send(JSON.stringify({ type: 'unknown' }))

    await new Promise((r) => setTimeout(r, 100))
    ws.close()
  })

  it('responds with error when sending chat to non-existent session', async () => {
    const { port, close } = await createWsServer({ port: 0 })
    cleanup = close

    const ws = new WebSocket(`ws://localhost:${port}`)
    await new Promise((r) => ws.on('open', r))

    const messages: unknown[] = []
    ws.on('message', (raw) => {
      messages.push(JSON.parse(raw.toString()))
    })

    ws.send(JSON.stringify({
      type: 'chat:send',
      pinId: 'pin_01',
      content: 'hello',
    }))

    await new Promise((r) => setTimeout(r, 100))
    ws.close()

    expect(messages).toHaveLength(1)
    expect((messages[0] as any).type).toBe('chat:error')
    expect((messages[0] as any).error).toBe('No active session')
  })
})
