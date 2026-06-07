import { describe, expect, it, vi } from 'vitest'

vi.mock('../server.js', () => ({
  startChannelServer: vi.fn(),
  stopChannelServer: vi.fn(),
}))

vi.mock('../port.js', () => ({
  resolveAvailablePort: vi.fn(async (port: number) => port),
}))

vi.mock('../inject.js', () => ({
  getInjectionScript: vi.fn(() => '<script>window.__PINFIX_TEST__ = true;</script>'),
}))

import { unplugin } from '../index'
import { resolveAvailablePort } from '../port'
import { startChannelServer } from '../server'
import { getInjectionScript } from '../inject'

type BundlerAdapter = 'webpack' | 'rspack'

function createCompiler(adapter: BundlerAdapter = 'webpack', options?: { watchMode?: boolean }) {
  let compilationCallback: ((compilation: any) => void) | undefined
  let processAssetsTap:
    | { options: any; callback: (assets: Record<string, any>, cb: () => void) => void }
    | undefined
  let beforeEmitTap: ((data: { html: string }) => Promise<{ html: string }>) | undefined

  class FakeHtmlPlugin {
    static getCompilationHooks() {
      return {
        beforeEmit: {
          tapPromise(
            _options: any,
            callback: (data: { html: string }) => Promise<{ html: string }>,
          ) {
            beforeEmitTap = callback
          },
        },
      }
    }
  }

  const compilation = {
    hooks: {
      processAssets: {
        tapAsync(options: any, callback: (assets: Record<string, any>, cb: () => void) => void) {
          processAssetsTap = { options, callback }
        },
      },
    },
  }

  const bundlerRuntime = {
    Compilation: {
      PROCESS_ASSETS_STAGE_ADDITIONS: -2000,
      PROCESS_ASSETS_STAGE_REPORT: 5000,
    },
    experiments: {},
  }

  const compiler = {
    context: '/tmp/pinfix-test',
    watchMode: options?.watchMode ?? false,
    options: {
      context: '/tmp/pinfix-test',
      module: { rules: [] },
      plugins: [new FakeHtmlPlugin()],
    },
    [adapter]: bundlerRuntime,
    hooks: {
      shutdown: { tap: vi.fn() },
      compilation: {
        tap(_name: string, callback: (compilation: any) => void) {
          compilationCallback = callback
        },
      },
    },
  }

  return {
    compiler,
    compilation,
    getProcessAssetsTap() {
      compilationCallback?.(compilation)
      return processAssetsTap
    },
    getBeforeEmitTap() {
      compilationCallback?.(compilation)
      return beforeEmitTap
    },
  }
}

function createBundlerPlugin(adapter: BundlerAdapter) {
  return unplugin[adapter]({})
}

describe.each<BundlerAdapter>(['webpack', 'rspack'])('%s HTML injection', (adapter) => {
  it('uses a late processAssets stage so HtmlWebpackPlugin HTML is available', () => {
    const plugin = createBundlerPlugin(adapter)
    const { compiler, getProcessAssetsTap } = createCompiler(adapter)

    plugin.apply(compiler as any)

    const tap = getProcessAssetsTap()

    expect(tap?.options.stage).toBe(5000)
  })

  it('injects overlay script into HTML assets', async () => {
    const plugin = createBundlerPlugin(adapter)
    const { compiler, getProcessAssetsTap } = createCompiler(adapter)

    plugin.apply(compiler as any)
    const tap = getProcessAssetsTap()
    const assets = {
      'index.html': {
        source: () => '<html><head></head><body></body></html>',
        size: () => 39,
      },
    }

    await new Promise<void>((resolve) => {
      tap?.callback(assets, resolve)
    })

    expect(assets['index.html'].source()).toContain('window.__PINFIX_TEST__ = true')
  })

  it('injects overlay script through HTML plugin beforeEmit hooks', async () => {
    const plugin = createBundlerPlugin(adapter)
    const { compiler, getBeforeEmitTap } = createCompiler(adapter)

    plugin.apply(compiler as any)
    const beforeEmit = getBeforeEmitTap()

    const result = await beforeEmit?.({ html: '<html><head></head><body></body></html>' })

    expect(result?.html).toContain('window.__PINFIX_TEST__ = true')
  })

  it('uses the plugin-selected server port for server startup and HTML injection', async () => {
    vi.mocked(resolveAvailablePort).mockResolvedValueOnce(24817)
    const plugin = unplugin[adapter]({ port: 24816 })
    const { compiler, getBeforeEmitTap } = createCompiler(adapter, { watchMode: true })

    plugin.apply(compiler as any)
    const beforeEmit = getBeforeEmitTap()

    await beforeEmit?.({ html: '<html><head></head><body></body></html>' })

    expect(startChannelServer).toHaveBeenCalledWith(expect.objectContaining({ port: 24817 }))
    expect(getInjectionScript).toHaveBeenCalledWith(
      expect.objectContaining({ wsUrl: 'ws://localhost:24817' }),
    )
  })

  it('does not probe ports for build-only HTML injection', async () => {
    vi.mocked(resolveAvailablePort).mockClear()
    vi.mocked(getInjectionScript).mockClear()
    const plugin = unplugin[adapter]({ port: 24816 })
    const { compiler, getBeforeEmitTap } = createCompiler(adapter)

    plugin.apply(compiler as any)
    const beforeEmit = getBeforeEmitTap()

    await beforeEmit?.({ html: '<html><head></head><body></body></html>' })

    expect(resolveAvailablePort).not.toHaveBeenCalled()
    expect(getInjectionScript).toHaveBeenCalledWith(
      expect.objectContaining({ wsUrl: 'ws://localhost:24816' }),
    )
  })
})
