import { describe, expect, it, vi } from 'vitest'

vi.mock('../server.js', () => ({
  startChannelServer: vi.fn(),
  stopChannelServer: vi.fn(),
}))

vi.mock('../inject.js', () => ({
  getInjectionScript: vi.fn(() => '<script>window.__PINFIX_TEST__ = true;</script>'),
}))

import { unplugin } from '../index'

type BundlerAdapter = 'webpack' | 'rspack'

function createCompiler(adapter: BundlerAdapter = 'webpack') {
  let compilationCallback: ((compilation: any) => void) | undefined
  let processAssetsTap: { options: any; callback: (assets: Record<string, any>, cb: () => void) => void } | undefined
  let beforeEmitTap: ((data: { html: string }) => Promise<{ html: string }>) | undefined

  class FakeHtmlPlugin {
    static getCompilationHooks() {
      return {
        beforeEmit: {
          tapPromise(_options: any, callback: (data: { html: string }) => Promise<{ html: string }>) {
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

  it('injects overlay script into HTML assets', () => {
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

    tap?.callback(assets, vi.fn())

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
})
