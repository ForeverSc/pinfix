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

  it('rejects clients from a different workspace id', async () => {
    const { port, close } = await createWsServer({ port: 0, workspaceId: 'workspace-a' })
    cleanup = close

    const ws = new WebSocket(`ws://localhost:${port}?workspaceId=workspace-b`)
    const closeEvent = await new Promise<{ code: number; reason: string }>((resolve) => {
      ws.on('close', (code, reason) => {
        resolve({ code, reason: reason.toString() })
      })
    })

    expect(closeEvent).toEqual({
      code: 1008,
      reason: 'PinFix workspace mismatch',
    })
  })

  it('keeps retry-port servers isolated by workspace id', async () => {
    const first = await createWsServer({ port: 0, workspaceId: 'workspace-a' })
    const second = await createWsServer({ port: first.port, workspaceId: 'workspace-b' })
    cleanup = () => {
      second.close()
      first.close()
    }

    expect(second.port).toBeGreaterThan(first.port)

    const wrongWs = new WebSocket(`ws://localhost:${first.port}?workspaceId=workspace-b`)
    const closeEvent = await new Promise<{ code: number; reason: string }>((resolve) => {
      wrongWs.on('close', (code, reason) => {
        resolve({ code, reason: reason.toString() })
      })
    })

    expect(closeEvent.code).toBe(1008)

    const rightWs = new WebSocket(`ws://localhost:${second.port}?workspaceId=workspace-b`)
    await new Promise((resolve) => rightWs.on('open', resolve))

    rightWs.close()
  })
})
