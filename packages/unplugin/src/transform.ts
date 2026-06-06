import { parse } from '@babel/parser'
import _traverse from '@babel/traverse'
import MagicString from 'magic-string'
import { DATA_ATTR, VUE_BUILTINS } from '@pinfix/shared'
import { readFileSync } from 'fs'
import { parse as vueParse } from '@vue/compiler-dom'

// Handle CJS/ESM interop
const traverse = ((_traverse as any).default || _traverse) as typeof _traverse

export interface TransformOptions {
  escapeTags?: (string | RegExp)[]
}

export function transformCode(
  code: string,
  id: string,
  absolutePath?: string,
  options?: TransformOptions,
): { code: string; map: any } | null {
  const [filePath, query] = id.split('?', 2)
  const params = new URLSearchParams(query || '')

  // Vue JSX blocks → JSX path
  if (filePath.endsWith('.vue') && (
    params.get('lang') === 'tsx' ||
    params.get('lang') === 'jsx'
  )) {
    return transformJsx(code, id, absolutePath, options)
  }

  // Vue SFC (only raw .vue file without query, or template block)
  if (filePath.endsWith('.vue') && (!query || params.get('type') === 'template')) {
    return transformVue(code, filePath, options)
  }

  // JSX/TSX files
  if (/\.(jsx|tsx)$/.test(filePath)) {
    return transformJsx(code, id, absolutePath, options)
  }

  return null
}

function transformJsx(code: string, id: string, absolutePath?: string, options?: TransformOptions): { code: string; map: any } | null {
  const sourceId = id.split('?')[0]
  // Read original source file to get accurate line numbers
  // (code may have been modified by earlier plugins like @vitejs/plugin-react)
  let originalSource: string
  try {
    const filePath = absolutePath || sourceId
    originalSource = readFileSync(filePath.split('?')[0], 'utf-8')
  } catch {
    originalSource = code
  }

  let ast: ReturnType<typeof parse>
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
    })
  } catch {
    return null
  }

  // Parse original to build a line-mapping: for each JSX tag in the
  // transformed code, find its matching position in the original source.
  // Strategy: parse original source for its own line numbers.
  let originalAst: ReturnType<typeof parse> | null = null
  if (originalSource !== code) {
    try {
      originalAst = parse(originalSource, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'decorators-legacy'],
      })
    } catch {
      originalAst = null
    }
  }

  // Build a set of original JSX positions (line:col) indexed by tag name + order
  const originalPositions = new Map<string, { line: number; column: number }>()
  if (originalAst) {
    const tagCounts = new Map<string, number>()
    traverse(originalAst, {
      JSXOpeningElement(path) {
        const node = path.node
        const loc = node.loc?.start
        if (!loc) return
        const name = getJsxName(node.name)
        const count = (tagCounts.get(name) || 0) + 1
        tagCounts.set(name, count)
        originalPositions.set(`${name}#${count}`, { line: loc.line, column: loc.column + 1 })
      },
    })
  }

  const s = new MagicString(code)
  let hasChanges = false
  const tagCounts = new Map<string, number>()
  const escapeTags = options?.escapeTags ?? []

  traverse(ast, {
    JSXOpeningElement(path) {
      const node = path.node
      const loc = node.loc?.start
      if (!loc) return

      const name = getJsxName(node.name)
      if (isEscaped(name, escapeTags)) return
      const count = (tagCounts.get(name) || 0) + 1
      tagCounts.set(name, count)

      // Use original position if available
      let line = loc.line
      let column = loc.column + 1
      const origPos = originalPositions.get(`${name}#${count}`)
      if (origPos) {
        line = origPos.line
        column = origPos.column
      }

      const attrStr = ` ${DATA_ATTR}="${sourceId}:${line}:${column}"`
      const nameEnd = node.name.end!
      s.appendLeft(nameEnd, attrStr)
      hasChanges = true
    },
  })

  if (!hasChanges) return null
  return { code: s.toString(), map: s.generateMap({ source: id, hires: true, includeContent: true }) }
}

function getJsxName(node: any): string {
  if (node.type === 'JSXIdentifier') return node.name
  if (node.type === 'JSXMemberExpression') {
    return getJsxName(node.object) + '.' + node.property.name
  }
  if (node.type === 'JSXNamespacedName') {
    return node.namespace.name + ':' + node.name.name
  }
  return 'unknown'
}

function isEscaped(tagName: string, escapeTags: (string | RegExp)[]): boolean {
  return escapeTags.some(tag =>
    typeof tag === 'string' ? tag === tagName : tag.test(tagName),
  )
}

function transformVue(code: string, id: string, options?: TransformOptions): { code: string; map: any } | null {
  const ast = vueParse(code, { comments: true })

  // Find the <template> root node
  const templateNode = ast.children.find(
    (node): node is typeof node & { tag: string } =>
      (node as any).type === 1 && (node as any).tag === 'template',
  )
  if (!templateNode) return null

  const s = new MagicString(code)
  let hasChanges = false
  const escapeTags = options?.escapeTags ?? []

  function walkNode(node: any) {
    // type 1 = ElementNode
    if (node.type !== 1) return

    const tagName = node.tag as string

    // Skip builtins and escaped tags
    if (!VUE_BUILTINS.has(tagName) && !isEscaped(tagName, escapeTags)) {
      const line = node.loc.start.line
      const column = node.loc.start.column
      const insertPos = node.loc.start.offset + 1 + tagName.length
      const attrStr = ` ${DATA_ATTR}="${id}:${line}:${column}"`
      s.appendLeft(insertPos, attrStr)
      hasChanges = true
    }

    // Walk children recursively
    if (node.children) {
      for (const child of node.children) {
        walkNode(child)
      }
    }
  }

  // Walk children of the <template> node
  for (const child of (templateNode as any).children) {
    walkNode(child)
  }

  if (!hasChanges) return null
  return { code: s.toString(), map: s.generateMap({ source: id, hires: true, includeContent: true }) }
}
