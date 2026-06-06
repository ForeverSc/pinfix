<div align="center">
  <h1>PinFix</h1>
  <p><em>Edit frontend pages like leaving comments on a design.</em></p>
</div>

<p align="center">
  <a href="https://www.npmjs.com/package/@pinfix/plugin"><img src="https://img.shields.io/npm/v/%40pinfix%2Fplugin?label=version&style=flat-square&color=0070ea" alt="Version"></a>
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Webpack-5-8DD6F9?style=flat-square&logo=webpack&logoColor=black" alt="Webpack">
  <img src="https://img.shields.io/badge/Rspack-2-FF6600?style=flat-square&logo=rspack&logoColor=white" alt="Rspack">
</p>

<p align="center">
  <a href="./README_ZH.md">中文</a>
</p>

## Preview

https://github.com/user-attachments/assets/e155481b-5582-476a-a108-4ba637cdb9d4

> Click any UI, describe what you want to change, and PinFix lets Claude Code precisely find the source code and apply the edit in real time.<br>
No context switching. No copy-pasting file paths. Just point, describe, and see HMR apply the change.


## Why PinFix?

Traditional Claude Code workflows require you to explain *where* in the codebase something needs to change. PinFix flips this — you visually select the element in the browser, and it already knows the exact source file, line, and column. Your conversation starts with full context.

- **The page is the context** — Point to what you want to change directly on the UI, no window switching, file paths, or location explanations needed
- **Real-time edits** — Claude Code updates your source files directly, and HMR shows the result instantly
- **Visual selection** — Press Alt+Shift+Z to enter crosshair mode, hover to highlight elements, and click to place a pin
- **Framework Agnostic** — Works with React, Vue, Svelte, or any JSX/TSX-based framework.
- **Zero Config** — One plugin line in your build config. The channel server spawns and cleans up automatically.

## Quick Start

```bash
npm install -D @pinfix/plugin
```

Add the plugin to your build config:

**Vite**
```ts
// vite.config.ts
import pinfix from '@pinfix/plugin/vite'

export default defineConfig({
  plugins: [pinfix()]
})
```

**Webpack**
```ts
// webpack.config.js
import pinfix from '@pinfix/plugin/webpack'

export default {
  plugins: [pinfix()]
}
```

**Rspack / Rsbuild**
```ts
// rsbuild.config.ts
import pinfix from '@pinfix/plugin/rspack'

export default {
  tools: {
    rspack: { plugins: [pinfix()] }
  }
}
```

Then start your dev server as usual. PinFix activates automatically in development mode.

## Usage

1. Start your dev server (`npm run dev`)
2. Press **Alt + Shift + Z** (Option + Shift + Z on Mac) to enter annotation mode
3. Hover over any component — it highlights with a blue border
4. Click to place a pin on the element
5. Type your change request in the chat dialog
6. Claude Code streams a response and edits your source code
7. HMR applies the change — see the result immediately
8. Continue the conversation for iterative refinements

## How It Works

```
┌─────────────────┐        WebSocket         ┌─────────────────┐       Claude Agent SDK
│  Browser Client │  ◄──────────────────────► │  Channel Server │  ◄─────────────────────►  Claude Code
│  (Shadow DOM)   │        port 24816         │  (auto-spawned) │
└─────────────────┘                           └─────────────────┘
```

1. **Build plugin** transforms your JSX/TSX/Vue files to inject `data-pinfix-source` attributes with file path, line, and column metadata.
2. **Client overlay** renders inside Shadow DOM — isolated from your app's styles. Handles pin placement, chat UI, and WebSocket communication.
3. **Channel server** spawns automatically alongside your dev server. All pins share a workspace-level Claude Code session with full project context.

## Configuration

```ts
pinfix({
  port: 24816,                        // WebSocket port (default: 24816)
  hotkey: 'alt+shift+z',               // Activation hotkey
  fab: true,                         // Show floating action button
  prompt: 'Custom system prompt...',  // Additional context for Claude Code
  escapeTags: ['Layout', 'Provider'], // Skip these wrapper components
  match: /\.(tsx|jsx|vue)$/,          // Only transform matching files
  exclude: /node_modules/,            // Exclude from transform
  debug: false,                       // Enable debug logging
})
```

## Supported Bundlers

| Bundler | Import Path | Status |
|---------|-------------|--------|
| Vite 5+ | `@pinfix/plugin/vite` | Stable |
| Webpack 5 | `@pinfix/plugin/webpack` | Stable |
| Rspack 2 | `@pinfix/plugin/rspack` | Stable |

## Requirements

- Node.js 18+
- Claude Code installed and usable on your machine
- A dev server with HMR support

## Development

```bash
git clone https://github.com/foreversc/pinfix.git
cd pinfix
pnpm install
pnpm build
pnpm dev:vite-react   # Run the Vite + React example
```

## License

MIT
