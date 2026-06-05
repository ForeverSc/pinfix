import { defineConfig } from 'tsup'

export default defineConfig([
  // Plugin code (Node.js)
  {
    entry: {
      index: 'src/index.ts',
      vite: 'src/vite.ts',
      webpack: 'src/webpack.ts',
      rspack: 'src/rspack.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    external: ['@vue/compiler-dom'],
    cjsInterop: true,
    footer({ format }) {
      if (format === 'cjs') {
        return { js: 'if (module.exports.default) module.exports = module.exports.default;' }
      }
      return {}
    },
  },
  // Internal channel server spawned by the plugin at runtime.
  {
    entry: {
      'channel-server': '../channel-server/src/index.ts',
    },
    format: ['esm'],
    dts: false,
    clean: false,
  },
  // Overlay client (IIFE for HTML injection)
  {
    entry: { 'overlay.iife': 'client/overlay.ts' },
    format: ['iife'],
    outDir: 'dist',
    clean: false,
    platform: 'browser',
    globalName: 'PinfixOverlay',
    noExternal: [/.*/],
  },
])
