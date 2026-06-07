#!/usr/bin/env node
import { WS_PORT_DEFAULT } from '@pinfix/shared'
import { createWsServer } from './ws-server.js'
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs'
import { resolve } from 'path'

async function main() {
  const port = parseInt(process.env.PINFIX_PORT || String(WS_PORT_DEFAULT), 10)
  const cwd = process.env.PINFIX_CWD || process.cwd()
  const workspaceId = process.env.PINFIX_WORKSPACE_ID || undefined
  const maxPortRetries = parseInt(process.env.PINFIX_MAX_PORT_RETRIES || '0', 10)
  const parentPid = process.ppid

  const server = await createWsServer({ port, cwd, workspaceId, maxPortRetries })

  // Write PID file
  const pidDir = resolve(cwd, 'node_modules', '.cache', 'pinfix')
  if (!existsSync(pidDir)) mkdirSync(pidDir, { recursive: true })
  const pidFile = resolve(pidDir, 'server.pid')
  writeFileSync(pidFile, String(process.pid))

  function cleanup() {
    try { unlinkSync(pidFile) } catch {}
    server.close()
    process.exit(0)
  }

  process.on('SIGTERM', cleanup)
  process.on('SIGINT', cleanup)
  process.on('disconnect', cleanup)

  // Check if parent process is still alive every 5s
  const parentCheck = setInterval(() => {
    try {
      process.kill(parentPid, 0)
    } catch {
      clearInterval(parentCheck)
      cleanup()
    }
  }, 5000)
  parentCheck.unref()

  process.stderr.write(`[server] ready port=${server.port} cwd=${JSON.stringify(cwd)}\n`)
}

main().catch((err) => {
  process.stderr.write(`[server] fatal message=${JSON.stringify(err.message)}\n`)
  process.exit(1)
})
