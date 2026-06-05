export const OVERLAY_STYLES = `
  /* Pin dot */
  .pinfix-pin-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #0070ea;
    border: 2px solid #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pinfix-pin-dot[data-status="sent"] {
    animation: pinfix-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  .pinfix-pin-dot[data-status="sent"] { background: #2563eb; }
  .pinfix-pin-dot[data-status="done"] { background: #22c55e; }
  @keyframes pinfix-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
  }

  /* Chat dialog */
  .pinfix-chat {
    background: #2d3135;
    border: 1px solid rgba(113, 119, 134, 0.3);
    border-radius: 12px;
    width: 320px;
    height: 448px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    color: #eef1f6;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Header */
  .pinfix-chat-header {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: #2d3135;
    border-bottom: 1px solid rgba(113, 119, 134, 0.2);
    cursor: grab;
    user-select: none;
    gap: 8px;
  }
  .pinfix-chat-header:active {
    cursor: grabbing;
  }
  .pinfix-chat-header-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 112, 234, 0.2);
    color: #adc7ff;
    border-radius: 4px;
    font-size: 14px;
    flex-shrink: 0;
  }
  .pinfix-chat-title {
    font-size: 14px;
    font-weight: 600;
    color: #eef1f6;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pinfix-chat-header-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .pinfix-chat-header-btn {
    background: none;
    border: none;
    color: rgba(193, 198, 215, 0.6);
    cursor: pointer;
    padding: 4px;
    line-height: 0;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
  }
  .pinfix-chat-header-btn:hover {
    color: #fff;
    background: rgba(255,255,255,0.08);
  }

  /* Source file path bar below header */
  .pinfix-chat-path {
    display: block;
    padding: 4px 12px;
    font-size: 11px;
    color: rgba(193, 198, 215, 0.6);
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
  }

  /* Messages */
  .pinfix-chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .pinfix-chat-msg {
    padding: 8px 12px;
    border-radius: 12px;
    max-width: 90%;
    word-wrap: break-word;
    line-height: 1.5;
    font-size: 13px;
  }
  .pinfix-chat-msg[data-role="user"] {
    white-space: pre-wrap;
    background: #0070ea;
    color: #fefcff;
    align-self: flex-end;
    border-top-right-radius: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  .pinfix-chat-msg[data-role="assistant"] {
    white-space: normal;
    background: rgba(224, 227, 232, 0.1);
    border: 1px solid rgba(113, 119, 134, 0.2);
    color: #eef1f6;
    align-self: flex-start;
    border-top-left-radius: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  /* Markdown prose styles for assistant messages */
  .pinfix-chat-msg[data-role="assistant"] p {
    margin: 0 0 8px 0;
  }
  .pinfix-chat-msg[data-role="assistant"] p:last-child {
    margin-bottom: 0;
  }
  .pinfix-chat-msg[data-role="assistant"] code {
    background: rgba(0,0,0,0.3);
    padding: 2px 5px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', 'SF Mono', Monaco, Consolas, monospace;
    font-size: 12px;
  }
  .pinfix-chat-msg[data-role="assistant"] pre {
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(113, 119, 134, 0.2);
    border-radius: 6px;
    padding: 10px 12px;
    overflow-x: auto;
    margin: 8px 0;
  }
  .pinfix-chat-msg[data-role="assistant"] pre code {
    background: none;
    padding: 0;
    font-size: 12px;
    line-height: 1.5;
  }
  .pinfix-chat-msg[data-role="assistant"] ul,
  .pinfix-chat-msg[data-role="assistant"] ol {
    margin: 4px 0;
    padding-left: 20px;
  }
  .pinfix-chat-msg[data-role="assistant"] li {
    margin: 2px 0;
  }
  .pinfix-chat-msg[data-role="assistant"] strong {
    color: #adc7ff;
  }
  .pinfix-chat-msg[data-role="assistant"] a {
    color: #adc7ff;
    text-decoration: underline;
  }
  .pinfix-chat-msg[data-role="assistant"] blockquote {
    border-left: 3px solid #0070ea;
    margin: 8px 0;
    padding: 4px 12px;
    color: rgba(193, 198, 215, 0.8);
  }
  .pinfix-chat-msg[data-role="assistant"] h1,
  .pinfix-chat-msg[data-role="assistant"] h2,
  .pinfix-chat-msg[data-role="assistant"] h3 {
    margin: 8px 0 4px;
    font-size: 13px;
    font-weight: 600;
    color: #fff;
  }

  /* Auto-grow textarea (CSS Grid mirror) */
  .pinfix-chat-grow-wrap {
    display: grid;
    flex: 1;
    min-height: 32px;
    max-height: 80px;
  }
  .pinfix-chat-grow-wrap::after {
    content: attr(data-value) " ";
    white-space: pre-wrap;
    visibility: hidden;
    padding: 7px 14px;
    font: inherit;
    font-size: 13px;
    line-height: 18px;
    border: 1px solid transparent;
    grid-area: 1 / 1 / 2 / 2;
    min-height: 32px;
    max-height: 80px;
    overflow: hidden;
    word-break: break-all;
  }

  /* Input area */
  .pinfix-chat-input-row {
    display: flex;
    align-items: center;
    padding: 16px;
    padding-top: 8px;
    gap: 8px;
    border-top: 1px solid rgba(113, 119, 134, 0.2);
    background: #2d3135;
  }
  .pinfix-chat-textarea {
    grid-area: 1 / 1 / 2 / 2;
    background: rgba(224, 227, 232, 0.1);
    border: 1px solid rgba(113, 119, 134, 0.3);
    border-radius: 8px;
    color: #eef1f6;
    padding: 7px 14px;
    font-size: 13px;
    outline: none;
    font-family: inherit;
    resize: none;
    min-height: 32px;
    max-height: 80px;
    line-height: 18px;
    overflow-y: auto;
    transition: border-color 0.2s, box-shadow 0.2s;
    word-break: break-all;
  }
  .pinfix-chat-textarea::placeholder {
    color: rgba(193, 198, 215, 0.5);
  }
  .pinfix-chat-textarea:focus {
    border-color: #adc7ff;
    box-shadow: 0 0 0 1px rgba(0, 112, 234, 0.4);
  }
  .pinfix-chat-send {
    background: none;
    border: none;
    color: #adc7ff;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, transform 0.1s;
    width: 32px;
    height: 32px;
    min-width: 32px;
    border-radius: 4px;
    line-height: 0;
  }
  .pinfix-chat-send:hover {
    color: #fff;
  }
  .pinfix-chat-send:active {
    transform: scale(0.95);
  }

  /* Code block with header */
  .pinfix-code-block {
    position: relative;
    margin: 8px 0;
    border: 1px solid rgba(113, 119, 134, 0.2);
    border-radius: 6px;
    overflow: hidden;
  }
  .pinfix-code-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 10px;
    background: rgba(0,0,0,0.3);
    border-bottom: 1px solid rgba(113, 119, 134, 0.2);
    font-size: 11px;
  }
  .pinfix-code-lang {
    color: rgba(193, 198, 215, 0.6);
    font-family: 'JetBrains Mono', 'SF Mono', Monaco, Consolas, monospace;
  }
  .pinfix-code-copy {
    background: none;
    border: 1px solid rgba(113, 119, 134, 0.3);
    border-radius: 4px;
    color: rgba(193, 198, 215, 0.6);
    font-size: 11px;
    padding: 2px 8px;
    cursor: pointer;
    transition: color 0.2s, border-color 0.2s;
  }
  .pinfix-code-copy:hover {
    color: #eef1f6;
    border-color: rgba(193, 198, 215, 0.5);
  }
  .pinfix-code-block pre {
    background: rgba(0,0,0,0.2);
    padding: 10px 12px;
    margin: 0;
    overflow-x: auto;
  }
  .pinfix-code-block pre code {
    background: none;
    padding: 0;
    font-family: 'JetBrains Mono', 'SF Mono', Monaco, Consolas, monospace;
    font-size: 12px;
    line-height: 1.5;
  }

  /* highlight.js token colors */
  .hljs-keyword { color: #c678dd; }
  .hljs-string { color: #98c379; }
  .hljs-number { color: #d19a66; }
  .hljs-comment { color: #5c6370; font-style: italic; }
  .hljs-function { color: #61afef; }
  .hljs-title { color: #61afef; }
  .hljs-params { color: #e0e0e0; }
  .hljs-built_in { color: #e6c07b; }
  .hljs-literal { color: #d19a66; }
  .hljs-attr { color: #d19a66; }
  .hljs-selector-class { color: #e6c07b; }
  .hljs-selector-tag { color: #e06c75; }
  .hljs-tag { color: #e06c75; }
  .hljs-name { color: #e06c75; }
  .hljs-attribute { color: #d19a66; }
  .hljs-variable { color: #e06c75; }
  .hljs-type { color: #e6c07b; }
  .hljs-meta { color: #61afef; }
  .hljs-punctuation { color: #abb2bf; }

  /* Typing indicator */
  .pinfix-typing {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    align-self: flex-start;
  }
  .pinfix-typing-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(193, 198, 215, 0.5);
    animation: pinfix-bounce 1.4s infinite;
  }
  .pinfix-typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .pinfix-typing-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes pinfix-bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-4px); }
  }

  /* Error message */
  .pinfix-chat-error {
    background: rgba(186, 26, 26, 0.15);
    border: 1px solid rgba(186, 26, 26, 0.3);
    color: #fca5a5;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    align-self: flex-start;
    max-width: 85%;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .pinfix-chat-retry {
    background: none;
    border: 1px solid rgba(186, 26, 26, 0.3);
    border-radius: 4px;
    color: #fca5a5;
    font-size: 11px;
    padding: 3px 10px;
    cursor: pointer;
    align-self: flex-start;
    transition: background 0.15s;
  }
  .pinfix-chat-retry:hover {
    background: rgba(186, 26, 26, 0.3);
    color: #fff;
  }

  /* Stop button */
  .pinfix-chat-stop {
    background: none;
    border: none;
    color: #adc7ff;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    min-width: 32px;
    border-radius: 4px;
    transition: color 0.15s;
    line-height: 0;
  }
  .pinfix-chat-stop:hover {
    color: #fff;
  }

  /* Empty state */
  .pinfix-chat-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    color: rgba(193, 198, 215, 0.5);
    font-size: 13px;
    text-align: center;
    flex: 1;
  }

  /* Settings view */
  .pinfix-chat-view {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }
  .pinfix-settings-view {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }
  .pinfix-settings-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(113, 119, 134, 0.2);
    background: #2d3135;
    cursor: grab;
    user-select: none;
  }
  .pinfix-settings-header:active {
    cursor: grabbing;
  }
  .pinfix-settings-back-btn {
    background: none;
    border: none;
    color: rgba(193, 198, 215, 0.6);
    cursor: pointer;
    padding: 2px;
    line-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.15s;
  }
  .pinfix-settings-back-btn:hover {
    color: #fff;
  }
  .pinfix-settings-title {
    font-size: 14px;
    color: #eef1f6;
    font-weight: 600;
  }
  .pinfix-settings-body {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  .pinfix-settings-label {
    font-size: 12px;
    color: rgba(193, 198, 215, 0.6);
    margin-bottom: 8px;
  }
  .pinfix-settings-textarea {
    width: 100%;
    flex: 1;
    background: rgba(224, 227, 232, 0.1);
    border: 1px solid rgba(113, 119, 134, 0.3);
    border-radius: 8px;
    color: #eef1f6;
    padding: 10px 12px;
    font-size: 13px;
    font-family: inherit;
    resize: none;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .pinfix-settings-textarea:focus {
    border-color: #adc7ff;
    box-shadow: 0 0 0 1px rgba(0, 112, 234, 0.4);
  }

  /* Tool use collapsible */
  .pinfix-tool-group {
    align-self: flex-start;
    max-width: 85%;
    font-size: 12px;
  }
  .pinfix-tool-summary {
    color: rgba(193, 198, 215, 0.6);
    cursor: pointer;
    padding: 4px 10px;
    border-radius: 6px;
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(113, 119, 134, 0.2);
    user-select: none;
    transition: background 0.15s;
  }
  .pinfix-tool-summary:hover {
    background: rgba(0,0,0,0.3);
  }
  .pinfix-tool-list {
    display: none;
    padding: 4px 10px;
    margin-top: 4px;
    font-size: 11px;
    color: rgba(193, 198, 215, 0.5);
  }
  .pinfix-tool-group.expanded .pinfix-tool-list {
    display: block;
  }
  .pinfix-tool-item {
    padding: 2px 0;
    font-family: 'JetBrains Mono', 'SF Mono', Monaco, Consolas, monospace;
  }
  .pinfix-tool-item::before {
    content: '• ';
    color: #0070ea;
  }

  /* Table styles */
  .pinfix-chat-msg[data-role="assistant"] table {
    border-collapse: collapse;
    width: 100%;
    margin: 8px 0;
    font-size: 12px;
  }
  .pinfix-chat-msg[data-role="assistant"] th,
  .pinfix-chat-msg[data-role="assistant"] td {
    border: 1px solid rgba(113, 119, 134, 0.2);
    padding: 4px 8px;
    text-align: left;
  }
  .pinfix-chat-msg[data-role="assistant"] th {
    background: rgba(0,0,0,0.2);
    font-weight: 600;
  }
  .pinfix-chat-msg[data-role="assistant"] tr:nth-child(even) {
    background: rgba(255,255,255,0.02);
  }

  /* Scrollbar */
  .pinfix-chat-messages::-webkit-scrollbar {
    width: 4px;
  }
  .pinfix-chat-messages::-webkit-scrollbar-track {
    background: transparent;
  }
  .pinfix-chat-messages::-webkit-scrollbar-thumb {
    background: rgba(193, 198, 215, 0.2);
    border-radius: 2px;
  }
  .pinfix-chat-messages::-webkit-scrollbar-thumb:hover {
    background: rgba(193, 198, 215, 0.4);
  }

  /* Floating Action Button */
  .pinfix-fab {
    position: fixed;
    bottom: 16px;
    right: 16px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #2d3135;
    border: 1px solid rgba(113, 119, 134, 0.3);
    box-shadow: 0 2px 12px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #adc7ff;
    cursor: pointer;
    z-index: 99998;
    transition: background 0.2s, transform 0.1s;
    user-select: none;
  }
  .pinfix-fab:hover {
    background: #3a3f44;
    transform: scale(1.05);
  }
  .pinfix-fab.active {
    background: #0070ea;
    color: #fff;
    border-color: #0070ea;
  }
`
