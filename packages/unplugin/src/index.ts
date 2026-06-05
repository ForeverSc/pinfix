import { createUnplugin } from 'unplugin'
import { transformCode } from './transform.js'
import { startChannelServer, stopChannelServer } from './server.js'
import { getInjectionScript } from './inject.js'
import { WS_PORT_DEFAULT, type PinFixOptions } from '@pinfix/shared'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

export type { PinFixOptions } from '@pinfix/shared'

function injectHtml(html: string, script: string): string {
  if (!script || html.includes('__PINFIX_WS_URL__')) return html
  return html.replace('<head>', `<head>\n${script}`)
}

export const unplugin = createUnplugin((options: PinFixOptions = {}) => {
  const port = options.port ?? WS_PORT_DEFAULT
  let root = options.root ?? process.cwd()
  const wsUrl = `ws://localhost:${port}`
  const debug = options.debug ?? false
  const logError = (msg: string) => console.warn(`[pinfix] ${msg}`)

  function setupWebpackLikeCompiler(compiler: any) {
    let serverStarted = false
    const startServer = () => {
      if (serverStarted) return
      serverStarted = true
      startChannelServer({
        port,
        cwd: root,
        watch: true,
        onLog: debug ? (msg) => console.log(`[pinfix] ${msg}`) : undefined,
        onError: debug ? (msg) => console.warn(`[pinfix] ${msg}`) : undefined,
      })
    }

    if (compiler.watchMode || process.env.WEBPACK_SERVE === 'true' || process.env.RSPACK_SERVE === 'true') {
      startServer()
    }

    compiler.hooks?.watchRun?.tap('pinfix', startServer)

    // Cleanup on shutdown
    if (compiler.hooks?.shutdown) {
      compiler.hooks.shutdown.tap('pinfix', stopChannelServer)
    } else {
      process.on('exit', stopChannelServer)
    }

    // Inject client into HTML assets
    compiler.hooks?.compilation?.tap('pinfix', (compilation: any) => {
      const script = getInjectionScript({ wsUrl, prompt: options.prompt ?? '', hotkey: options.hotkey, fab: options.fab, onError: logError })

      // Prefer HTML plugin hooks because HtmlWebpackPlugin/HtmlRspackPlugin
      // finalize HTML after early processAssets stages.
      const htmlPluginCtors = new Set<any>(
        (compiler.options?.plugins ?? [])
          .map((plugin: any) => plugin?.constructor)
          .filter((ctor: any) => typeof ctor?.getHooks === 'function' || typeof ctor?.getCompilationHooks === 'function'),
      )

      for (const HtmlPlugin of htmlPluginCtors) {
        const hooks = HtmlPlugin.getHooks?.(compilation) ?? HtmlPlugin.getCompilationHooks?.(compilation)
        if (!hooks?.beforeEmit?.tapPromise) continue
        hooks.beforeEmit.tapPromise({ name: 'pinfix' }, async (data: any) => {
          if (typeof data.html === 'string') {
            data.html = injectHtml(data.html, script)
          }
          return data
        })
      }

      if (compilation.hooks?.processAssets) {
        const CompilerRuntime = compiler.webpack ?? compiler.rspack
        const stage = CompilerRuntime?.Compilation?.PROCESS_ASSETS_STAGE_REPORT ?? 5000
        compilation.hooks.processAssets.tapAsync(
          { name: 'pinfix', stage },
          (assets: Record<string, any>, cb: () => void) => {
            if (!script) { cb(); return }

            const RawSource = CompilerRuntime?.sources?.RawSource
            for (const name of Object.keys(assets)) {
              if (!name.endsWith('.html')) continue
              const source = assets[name].source()
              if (typeof source !== 'string') continue
              const newHtml = injectHtml(source, script)
              if (newHtml === source) continue
              if (typeof compilation.updateAsset === 'function' && RawSource) {
                compilation.updateAsset(name, new RawSource(newHtml))
              } else {
                assets[name] = {
                  source: () => newHtml,
                  size: () => newHtml.length,
                }
              }
            }
            cb()
          },
        )
      }
    })
  }

  return {
    name: 'pinfix',
    enforce: 'pre' as const,

    transformInclude(id: string) {
      const [filePath] = id.split('?', 2)
      return /\.(jsx|tsx|vue)$/.test(filePath)
    },

    transform(code: string, id: string) {
      let relativePath = id
      const [absFilePath] = id.split('?', 2)
      if (absFilePath.startsWith(root)) {
        const rel = absFilePath.slice(root.length)
        relativePath = (rel.startsWith('/') ? rel.slice(1) : rel) + (id.includes('?') ? '?' + id.split('?')[1] : '')
      }

      const relFile = relativePath.split('?')[0]
      if (options.match && !options.match.test(relFile)) return null
      if (options.exclude && options.exclude.test(relFile)) return null

      return transformCode(code, relativePath, id, { escapeTags: options.escapeTags })
    },

    // === Vite-specific hooks ===
    vite: {
      configResolved(config: any) {
        root = config.root
      },
      config() {
        return {
          define: {
            __PINFIX_WS_URL__: JSON.stringify(wsUrl),
            __PINFIX_PROMPT__: JSON.stringify(options.prompt ?? ''),
            __PINFIX_HOTKEY__: JSON.stringify(options.hotkey ?? 'alt+shift+z'),
            __PINFIX_FAB__: JSON.stringify(options.fab !== false),
          },
        }
      },
      transformIndexHtml(html: string) {
        // In dev mode, use source import for HMR; getInjectionScript returns '' if no IIFE built yet
        const injected = getInjectionScript({ wsUrl, prompt: options.prompt ?? '', hotkey: options.hotkey, fab: options.fab, onError: logError })
        if (injected) {
          return html.replace('<head>', `<head>\n${injected}`)
        }
        // Fallback: dev mode source import
        const script = `<script type="module" src="/@pinfix/overlay.js"></script>`
        return html.replace('</body>', `${script}\n</body>`)
      },
      configureServer(server: any) {
        startChannelServer({
          port,
          cwd: root,
          watch: true,
          onLog: debug ? (msg) => server.config.logger.info(`[pinfix] ${msg}`) : undefined,
          onError: debug ? (msg) => server.config.logger.warn(`[pinfix] ${msg}`) : undefined,
        })

        server.httpServer?.on('close', stopChannelServer)

        // Serve overlay client source for HMR in dev mode
        server.middlewares.use((req: any, res: any, next: any) => {
          if (req.url === '/@pinfix/overlay.js') {
            const clientDir = resolve(dirname(fileURLToPath(import.meta.url)), '../client')
            res.setHeader('Content-Type', 'application/javascript')
            res.end(`import "${clientDir}/overlay.ts";`)
            return
          }
          next()
        })
      },
    },

    // === Webpack/Rspack-specific hooks ===
    webpack(compiler: any) {
      setupWebpackLikeCompiler(compiler)
    },

    rspack(compiler: any) {
      setupWebpackLikeCompiler(compiler)
    },
  }
})

export default unplugin
