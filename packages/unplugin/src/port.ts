import { createServer } from 'net'

export async function resolveAvailablePort(port: number, maxRetries = 5): Promise<number> {
  let lastError: Error | null = null

  for (let i = 0; i <= maxRetries; i += 1) {
    const candidatePort = port + i
    try {
      await canListen(candidatePort)
      return candidatePort
    } catch (err: any) {
      lastError = err
      if (err.code !== 'EADDRINUSE') throw err
    }
  }

  throw lastError ?? new Error(`No available port found from ${port}`)
}

function canListen(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.once('error', reject)
    server.listen(port, () => {
      server.close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  })
}
