import { spawn, type ChildProcess } from 'child_process'
import { existsSync, watchFile, unwatchFile, readFileSync, unlinkSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

let channelProc: ChildProcess | null = null
let currentOptions: StartChannelServerOptions | null = null
let watchedServerBin: string | null = null
let restartTimer: ReturnType<typeof setTimeout> | null = null

function getRuntimeDir(): string {
  return typeof __dirname === 'string'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url))
}

interface StartChannelServerOptions {
  port: number
  cwd: string
  watch?: boolean
  onLog?: (msg: string) => void
  onError?: (msg: string) => void
}

function cleanStalePid(cwd: string) {
  const pidFile = resolve(cwd, 'node_modules', '.cache', 'pinfix', 'server.pid')
  if (!existsSync(pidFile)) return
  try {
    const pid = parseInt(readFileSync(pidFile, 'utf-8').trim(), 10)
    if (!isNaN(pid)) {
      try {
        process.kill(pid, 0) // Check if alive
        process.kill(pid, 'SIGTERM') // Kill stale process
      } catch {
        // Process already dead, just clean up file
      }
    }
  } catch {
    // File read error, ignore
  }
  try { unlinkSync(pidFile) } catch {}
}

function getServerBin(): string {
  return resolve(getRuntimeDir(), 'channel-server.js')
}

function spawnChannelServer(options: StartChannelServerOptions, serverBin: string): ChildProcess | null {
  if (!existsSync(serverBin)) {
    options.onError?.(`channel-server entry not found: ${serverBin}`)
    return null
  }

  try {
    const proc = spawn(process.execPath, [serverBin], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PINFIX_PORT: String(options.port),
        PINFIX_CWD: options.cwd,
      },
    })
    proc.stderr?.on('data', (d: Buffer) => {
      const msg = d.toString().trim()
      if (msg) options.onLog?.(msg)
    })
    proc.on('error', () => {
      options.onError?.('channel-server failed to start')
    })
    proc.on('exit', () => {
      if (channelProc === proc) channelProc = null
    })
    channelProc = proc
    return proc
  } catch {
    return null
  }
}

function watchChannelServer(serverBin: string) {
  if (watchedServerBin === serverBin) return
  unwatchChannelServer()
  watchedServerBin = serverBin

  watchFile(serverBin, { interval: 500 }, (curr, prev) => {
    if (curr.mtimeMs === prev.mtimeMs) return
    scheduleChannelServerRestart()
  })
}

function unwatchChannelServer() {
  if (!watchedServerBin) return
  unwatchFile(watchedServerBin)
  watchedServerBin = null
}

function scheduleChannelServerRestart() {
  if (!currentOptions) return
  if (restartTimer) clearTimeout(restartTimer)
  restartTimer = setTimeout(() => {
    restartTimer = null
    restartChannelServer()
  }, 150)
}

function restartChannelServer() {
  if (!currentOptions) return
  const options = currentOptions
  const serverBin = getServerBin()

  options.onLog?.('channel-server changed, restarting')
  if (channelProc && !channelProc.killed) {
    const oldProc = channelProc
    channelProc = null
    oldProc.once('exit', () => {
      spawnChannelServer(options, serverBin)
    })
    oldProc.kill()
    setTimeout(() => {
      if (oldProc.exitCode === null && oldProc.signalCode === null) {
        oldProc.kill('SIGKILL')
      }
    }, 1_000)
    return
  }

  spawnChannelServer(options, serverBin)
}

export function startChannelServer(options: StartChannelServerOptions): ChildProcess | null {
  cleanStalePid(options.cwd)
  currentOptions = options
  const serverBin = getServerBin()
  if (options.watch) watchChannelServer(serverBin)
  if (channelProc && !channelProc.killed) return channelProc

  return spawnChannelServer(options, serverBin)
}

export function stopChannelServer(): void {
  if (restartTimer) {
    clearTimeout(restartTimer)
    restartTimer = null
  }
  unwatchChannelServer()
  currentOptions = null
  if (channelProc && !channelProc.killed) {
    channelProc.kill()
    channelProc = null
  }
}
