import { marked, Renderer } from 'marked'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'

// Register languages
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('css', css)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('json', json)
hljs.registerLanguage('python', python)
hljs.registerLanguage('bash', bash)

// Register aliases
hljs.registerAliases('js', { languageName: 'javascript' })
hljs.registerAliases('ts', { languageName: 'typescript' })
hljs.registerAliases('html', { languageName: 'xml' })
hljs.registerAliases('sh', { languageName: 'bash' })

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Custom renderer with syntax highlighting
const renderer = new Renderer()

renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  const language = lang && hljs.getLanguage(lang) ? lang : ''
  const highlighted = language
    ? hljs.highlight(text, { language }).value
    : escapeHtml(text)
  const label = language || 'text'
  const escapedCode = escapeHtml(text)

  return `<div class="pinfix-code-block">
  <div class="pinfix-code-header">
    <span class="pinfix-code-lang">${label}</span>
    <button class="pinfix-code-copy" data-code="${escapedCode}">Copy</button>
  </div>
  <pre><code class="hljs">${highlighted}</code></pre>
</div>`
}

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
  renderer,
})

export function renderMarkdown(text: string): string {
  return marked.parse(text) as string
}

export function bindCopyButtons(container: HTMLElement): void {
  const buttons = container.querySelectorAll<HTMLButtonElement>('.pinfix-code-copy')
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-code')
      if (!code) return
      // Unescape HTML entities to get the raw code
      const raw = code
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
      navigator.clipboard.writeText(raw).then(() => {
        const original = btn.textContent
        btn.textContent = '\u2713'
        setTimeout(() => {
          btn.textContent = original
        }, 1500)
      })
    })
  })
}
