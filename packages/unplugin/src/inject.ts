import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

function getRuntimeDir(): string {
  return typeof __dirname === 'string'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url))
}

/**
 * Read the bundled overlay client code (IIFE format).
 */
function getClientBundle(onError?: (msg: string) => void): string {
  const clientPath = resolve(getRuntimeDir(), 'overlay.iife.global.js')
  try {
    return readFileSync(clientPath, 'utf-8')
  } catch (err: any) {
    onError?.(
      `overlay bundle not found at ${clientPath}; run pinfix build before using the plugin (${err.message})`,
    )
    return ''
  }
}

/**
 * Generate the <script> block to inject into HTML.
 * Used by both Vite (transformIndexHtml) and Webpack/Rspack (processAssets).
 */
export function getInjectionScript(options: {
  wsUrl: string
  prompt: string
  hotkey?: string
  fab?: boolean
  onError?: (msg: string) => void
}): string {
  const clientCode = getClientBundle(options.onError)
  if (!clientCode) return ''

  return [
    `<script>`,
    `window.__PINFIX_WS_URL__ = ${JSON.stringify(options.wsUrl)};`,
    `window.__PINFIX_PROMPT__ = ${JSON.stringify(options.prompt)};`,
    `window.__PINFIX_HOTKEY__ = ${JSON.stringify(options.hotkey || 'alt+shift+z')};`,
    `window.__PINFIX_FAB__ = ${JSON.stringify(options.fab !== false)};`,
    clientCode,
    `</script>`,
  ].join('\n')
}
