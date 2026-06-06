<div align="center">
  <h1>PinFix</h1>
  <p><em>像在设计稿上批注一样修改前端页面。</em></p>
</div>

<p align="center">
  <a href="https://www.npmjs.com/package/@pinfix/plugin"><img src="https://img.shields.io/npm/v/%40pinfix%2Fplugin?label=version&style=flat-square&color=0070ea" alt="Version"></a>
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Webpack-5-8DD6F9?style=flat-square&logo=webpack&logoColor=black" alt="Webpack">
  <img src="https://img.shields.io/badge/Rspack-2-FF6600?style=flat-square&logo=rspack&logoColor=white" alt="Rspack">
</p>

<p align="center">
  <a href="./README.md">English</a>
</p>

## 预览
https://github.com/user-attachments/assets/e155481b-5582-476a-a108-4ba637cdb9d4
> 点击任意 UI，描述你想改什么，PinFix 会让 Claude Code 精准找到源代码并实时完成修改。<br>
无需切换窗口，无需复制文件路径，指哪改哪，HMR 即刻生效。

## 为什么选择 PinFix？

传统 Claude Code 工作流需要你解释代码*在哪里*需要修改。PinFix 反转了这个流程 —— 你在浏览器中直接选择元素，它已经知道精确的源文件、行号和列号。对话从完整的上下文开始。

- **页面即上下文** — 直接在 UI 上标注需求，无需切换窗口、复制路径或解释组件位置
- **实时编辑** — Claude Code 直接修改源文件，HMR 即时应用变更
- **可视化选择** — Alt+Shift+Z 激活十字准星模式，悬停高亮，点击固定
- **框架无关** — 支持 React、Vue、Svelte 或任何 JSX/TSX 框架
- **零配置** — 构建配置中加一行插件即可，服务自动启停

## 快速开始

```bash
npm install -D @pinfix/plugin
```

在构建配置中添加插件：

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

添加后正常启动开发服务器即可，PinFix 在开发模式下自动激活。

## 使用方式

1. 启动开发服务器 (`npm run dev`)
2. 按下 **Alt + Shift + Z**（Mac 上为 Option + Shift + Z）进入标注模式
3. 鼠标悬停任意组件 —— 蓝色边框高亮显示
4. 点击放置 pin 标注点
5. 在弹出的对话框中输入修改需求
6. Claude Code 流式响应并编辑源代码
7. HMR 热更新即刻生效 —— 立即看到结果
8. 继续对话进行迭代调整

## 工作原理

```
┌─────────────────┐        WebSocket         ┌─────────────────┐       Claude Agent SDK
│   浏览器客户端   │  ◄──────────────────────► │   Channel 服务   │  ◄─────────────────────►  Claude Code
│  (Shadow DOM)   │        port 24816         │   (自动启动)     │
└─────────────────┘                           └─────────────────┘
```

1. **构建插件**转换 JSX/TSX/Vue 文件，注入 `data-pinfix-source` 属性，包含文件路径、行号和列号元数据
2. **客户端覆盖层**在 Shadow DOM 内渲染 —— 与应用样式完全隔离。负责 pin 放置、聊天 UI 和 WebSocket 通信
3. **Channel 服务**随开发服务器自动启动。所有 pin 共享工作区级别的 Claude Code 会话，拥有完整项目上下文

## 配置选项

```ts
pinfix({
  port: 24816,                        // WebSocket 端口（默认 24816）
  hotkey: 'alt+shift+z',               // 激活快捷键
  fab: true,                         // 显示浮动操作按钮
  prompt: '自定义系统提示词...',       // 为 Claude Code 提供额外上下文
  escapeTags: ['Layout', 'Provider'], // 跳过这些包装组件
  match: /\.(tsx|jsx|vue)$/,          // 仅转换匹配的文件
  exclude: /node_modules/,            // 排除的文件
  debug: false,                       // 启用调试日志
})
```

## 支持的构建工具

| 构建工具 | 导入路径 | 状态 |
|---------|-------------|--------|
| Vite 5+ | `@pinfix/plugin/vite` | 稳定 |
| Webpack 5 | `@pinfix/plugin/webpack` | 稳定 |
| Rspack 2 | `@pinfix/plugin/rspack` | 稳定 |

## 环境要求

- Node.js 18+
- 本机已安装并可使用 Claude Code
- 支持 HMR 的开发服务器

## 本地开发

```bash
git clone https://github.com/foreversc/pinfix.git
cd pinfix
pnpm install
pnpm build
pnpm dev:vite-react   # 运行 Vite + React 示例
```

## 许可证

MIT
