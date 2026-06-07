import { createServer } from 'net'
import { describe, expect, it } from 'vitest'
import { resolveAvailablePort } from '../port'

describe('resolveAvailablePort', () => {
  it('selects the next available port in the plugin process', async () => {
    const occupied = createServer()
    await new Promise<void>((resolve, reject) => {
      occupied.once('error', reject)
      occupied.listen(0, () => resolve())
    })

    const occupiedPort = (occupied.address() as { port: number }).port

    try {
      const selectedPort = await resolveAvailablePort(occupiedPort, 2)

      expect(selectedPort).toBe(occupiedPort + 1)
    } finally {
      occupied.close()
    }
  })
})
