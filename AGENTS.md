# PinFix — Agent Knowledge Base

## What is PinFix

PinFix is a dev-only browser overlay that lets developers annotate UI elements and chat with Claude Code to modify source code in real-time. It works as a build plugin (Vite/Webpack/Rspack) that injects a client overlay and spawns a WebSocket-based channel server for Claude Code communication.

## Architecture

```
Browser Overlay (Shadow DOM) ←→ WebSocket (port 24816) ←→ Channel Server ←→ Claude Agent SDK
```

### Packages

| Package | Path | Purpose |
|---------|------|---------|
| `pinfix` | `packages/unplugin/` | Build plugin (Vite/Webpack/Rspack) + browser client |
| `@pinfix/channel-server` | `packages/channel-server/` | WebSocket server + Claude Code integration |
| `@pinfix/shared` | `packages/shared/` | Shared types & constants |

### Key Directories

- `packages/unplugin/client/` — Browser overlay UI (plain JS, Shadow DOM, no framework)
- `packages/unplugin/src/` — Plugin entry points, code transform, HTML injection, server spawn
- `packages/channel-server/src/` — WS server, Claude provider, session management
- `examples/` — Demo apps (vite-react, vite-vue, webpack-react, rspack-react)

## Tech Stack

- **Runtime**: Node.js, TypeScript 5.8
- **Build**: tsup, pnpm workspaces
- **Client**: Plain JS (imperative DOM), Shadow DOM, WebSocket API
- **Transform**: @babel/parser + @babel/traverse (JSX/TSX), @vue/compiler-dom (Vue SFC)
- **AI**: @anthropic-ai/claude-agent-sdk
- **Testing**: Vitest 3.2

## Conventions

### Client Code (`packages/unplugin/client/`)

- All UI lives inside a Shadow DOM — no external CSS, no frameworks
- Class names prefixed with `pinfix-` to avoid collisions
- SVG icons defined as string constants (inline, `stroke="currentColor"`)
- Single global dialog instance, reused across all pins
- State managed via module-level variables
- Animations use `@keyframes` with `pinfix-` prefix

### Code Transform

- JSX/TSX: Babel parser injects `data-pinfix-source="file:line:col"` attributes
- Vue SFC: @vue/compiler-dom walker, skips Vue builtins (slot, transition, keep-alive, etc.)
- `escapeTags` option allows users to exclude specific components from transformation
- Only runs in development mode

### WebSocket Protocol

Message types follow the pattern `category:action`:
- `session:start`, `session:end` — lifecycle
- `chat:send`, `chat:stream`, `chat:end` — conversation
- `workspace:reset` — clear all sessions
- `ping`, `pong` — heartbeat (30s interval, 45s timeout)

### Build Plugin

- Spawns channel server as child process on first dev server start
- Injects client script into HTML via middleware (Vite) or HTML plugin hooks (Webpack/Rspack)
- Channel server auto-terminates when parent process exits

## Design Tokens (Client UI)

| Token | Value | Usage |
|-------|-------|-------|
| primary | `#0070ea` | Pin dot, user messages, links |
| surface | `#2d3135` | Dialog background |
| on-surface | `#eef1f6` | Primary text |
| outline | `rgba(113, 119, 134, 0.3)` | Borders |
| success | `#22c55e` | Pin "done" state |
| error | `#ef4444` | Stop/error states |

## Dialog Specs

- Width: 320px, max-height: 460px, border-radius: 12px
- Font: Inter 13px base, JetBrains Mono for code
- Pin dot: 24px circle, positioned at element top-right
- Activation: Alt+Shift+Z hotkey (configurable) or FAB button

## Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm dev:vite-react   # Run Vite+React example
pnpm dev:vite-vue     # Run Vite+Vue example
pnpm dev:webpack      # Run Webpack+React example
pnpm dev:rspack       # Run Rspack+React example
pnpm release          # Build & publish pinfix package
```

## Configuration

```ts
pinfix({
  port: 24816,                     // WebSocket port
  root: process.cwd(),             // Project root
  prompt: '...',                   // System prompt for Claude Code
  hotkey: 'alt+shift+z',             // Activation hotkey
  fab: true,                       // Show floating action button
  escapeTags: ['Layout'],          // Skip these components
  match: /\.(tsx|jsx|vue)$/,       // Only transform matching files
  exclude: /node_modules/,         // Exclude from transform
  debug: false,                    // Debug logging
})
```
