import { describe, it, expect } from 'vitest'
import { transformCode } from '../transform'

describe('transformCode - JSX', () => {
  it('injects data-pinfix-source into JSX elements', () => {
    const code = `function App() {\n  return <div className="app">hello</div>\n}`
    const result = transformCode(code, '/src/App.tsx')
    expect(result).not.toBeNull()
    expect(result!.code).toContain('data-pinfix-source="/src/App.tsx:2:')
    expect(result!.map).toBeDefined()
  })

  it('handles multiple JSX elements', () => {
    const code = `function App() {\n  return <div><span>hi</span></div>\n}`
    const result = transformCode(code, '/src/App.tsx')
    expect(result).not.toBeNull()
    const matches = result!.code.match(/data-pinfix-source/g)
    expect(matches).toHaveLength(2)
  })

  it('returns null for non-JSX files', () => {
    const code = `const x = 1`
    const result = transformCode(code, '/src/utils.ts')
    expect(result).toBeNull()
  })

  it('preserves original code structure', () => {
    const code = `function App() {\n  return <div className="app">hello</div>\n}`
    const result = transformCode(code, '/src/App.tsx')
    expect(result!.code).toContain('className="app"')
    expect(result!.code).toContain('>hello</div>')
  })
})

describe('transformJsx with escapeTags', () => {
  it('skips elements matching escapeTags strings', () => {
    const code = `function App() {\n  return <div><svg><path /></svg></div>\n}`
    const result = transformCode(code, 'src/App.tsx', undefined, { escapeTags: ['svg', 'path'] })
    expect(result).not.toBeNull()
    const matches = result!.code.match(/data-pinfix-source/g)
    expect(matches).toHaveLength(1) // only <div>
  })

  it('skips elements matching escapeTags regex', () => {
    const code = `function App() {\n  return <div><Icon /><IconButton /></div>\n}`
    const result = transformCode(code, 'src/App.tsx', undefined, { escapeTags: [/^Icon/] })
    expect(result).not.toBeNull()
    const matches = result!.code.match(/data-pinfix-source/g)
    expect(matches).toHaveLength(1) // only <div>
  })

  it('works with empty escapeTags', () => {
    const code = `function App() {\n  return <div><span /></div>\n}`
    const result = transformCode(code, 'src/App.tsx', undefined, { escapeTags: [] })
    expect(result).not.toBeNull()
    const matches = result!.code.match(/data-pinfix-source/g)
    expect(matches).toHaveLength(2) // both div and span
  })
})

describe('file type routing', () => {
  it('routes .vue?lang=tsx to JSX transform', () => {
    const code = `export default { render() { return <div>hi</div> } }`
    const result = transformCode(code, 'src/App.vue?lang=tsx')
    expect(result).not.toBeNull()
    expect(result!.code).toContain('data-pinfix-source')
  })

  it('routes .vue?lang=jsx to JSX transform', () => {
    const code = `export default { render() { return <div>hi</div> } }`
    const result = transformCode(code, 'src/App.vue?lang=jsx')
    expect(result).not.toBeNull()
    expect(result!.code).toContain('data-pinfix-source')
  })

  it('skips .vue?type=style', () => {
    const code = `.app { color: red; }`
    const result = transformCode(code, 'src/App.vue?type=style')
    expect(result).toBeNull()
  })

  it('handles .tsx with query params', () => {
    const code = `function App() { return <div>hi</div> }`
    const result = transformCode(code, 'src/App.tsx?query=1')
    expect(result).not.toBeNull()
    expect(result!.code).toContain('data-pinfix-source')
  })

  it('routes .vue?type=template to Vue transform', () => {
    const code = `<template>\n  <div>hello</div>\n</template>\n<script setup>\n</script>`
    const result = transformCode(code, 'src/App.vue?type=template')
    expect(result).not.toBeNull()
    expect(result!.code).toContain('data-pinfix-source')
  })

  it('routes plain .vue to Vue transform', () => {
    const code = `<template>\n  <div>hello</div>\n</template>\n<script setup>\n</script>`
    const result = transformCode(code, 'src/App.vue')
    expect(result).not.toBeNull()
    expect(result!.code).toContain('data-pinfix-source')
  })
})

describe('transformCode - Vue', () => {
  it('injects data-pinfix-source into template elements', () => {
    const code = `<template>\n  <div class="app">hello</div>\n</template>\n<script setup>\n</script>`
    const result = transformCode(code, '/src/App.vue')
    expect(result).not.toBeNull()
    expect(result!.code).toContain('data-pinfix-source="/src/App.vue:2:')
    expect(result!.map).toBeDefined()
  })

  it('returns null for Vue SFC without template', () => {
    const code = `<script setup>\nconst x = 1\n</script>`
    const result = transformCode(code, '/src/App.vue')
    expect(result).toBeNull()
  })

  it('skips Vue builtin components', () => {
    const code = `<template>\n  <transition>\n    <div class="app">hello</div>\n  </transition>\n</template>\n<script setup>\n</script>`
    const result = transformCode(code, '/src/App.vue')
    expect(result).not.toBeNull()
    // Should inject into <div> but NOT into <transition>
    const matches = result!.code.match(/data-pinfix-source/g)
    expect(matches).toHaveLength(1)
    expect(result!.code).not.toContain('<transition data-pinfix-source')
    expect(result!.code).toContain('<div data-pinfix-source')
  })

  it('skips all Vue builtins (teleport, keep-alive, suspense, etc.)', () => {
    const code = `<template>\n  <teleport to="body">\n    <keep-alive>\n      <suspense>\n        <div>content</div>\n      </suspense>\n    </keep-alive>\n  </teleport>\n</template>`
    const result = transformCode(code, '/src/App.vue')
    expect(result).not.toBeNull()
    const matches = result!.code.match(/data-pinfix-source/g)
    expect(matches).toHaveLength(1) // only <div>
  })

  it('handles nested components', () => {
    const code = `<template>\n  <div>\n    <MyComponent>\n      <span>text</span>\n    </MyComponent>\n  </div>\n</template>`
    const result = transformCode(code, '/src/App.vue')
    expect(result).not.toBeNull()
    const matches = result!.code.match(/data-pinfix-source/g)
    expect(matches).toHaveLength(3) // div, MyComponent, span
  })

  it('does not inject into comments', () => {
    const code = `<template>\n  <!-- <div>this is a comment</div> -->\n  <span>real</span>\n</template>`
    const result = transformCode(code, '/src/App.vue')
    expect(result).not.toBeNull()
    const matches = result!.code.match(/data-pinfix-source/g)
    expect(matches).toHaveLength(1) // only <span>
    expect(result!.code).toContain('<!-- <div>this is a comment</div> -->')
  })

  it('handles self-closing tags', () => {
    const code = `<template>\n  <img src="test.png" />\n  <MyIcon />\n</template>`
    const result = transformCode(code, '/src/App.vue')
    expect(result).not.toBeNull()
    const matches = result!.code.match(/data-pinfix-source/g)
    expect(matches).toHaveLength(2) // img, MyIcon
    expect(result!.code).toContain('<img data-pinfix-source')
    expect(result!.code).toContain('<MyIcon data-pinfix-source')
  })

  it('supports escapeTags option with string', () => {
    const code = `<template>\n  <div>\n    <MyIcon />\n    <span>text</span>\n  </div>\n</template>`
    const result = transformCode(code, '/src/App.vue', undefined, { escapeTags: ['MyIcon'] })
    expect(result).not.toBeNull()
    const matches = result!.code.match(/data-pinfix-source/g)
    expect(matches).toHaveLength(2) // div, span (not MyIcon)
    expect(result!.code).not.toContain('<MyIcon data-pinfix-source')
  })

  it('supports escapeTags option with RegExp', () => {
    const code = `<template>\n  <div>\n    <ElButton>click</ElButton>\n    <ElInput />\n    <span>text</span>\n  </div>\n</template>`
    const result = transformCode(code, '/src/App.vue', undefined, { escapeTags: [/^El/] })
    expect(result).not.toBeNull()
    const matches = result!.code.match(/data-pinfix-source/g)
    expect(matches).toHaveLength(2) // div, span (not El*)
    expect(result!.code).not.toContain('<ElButton data-pinfix-source')
    expect(result!.code).not.toContain('<ElInput data-pinfix-source')
  })

  it('produces correct line and column numbers', () => {
    const code = `<template>\n  <div>\n    <span>hi</span>\n  </div>\n</template>`
    const result = transformCode(code, '/src/App.vue')
    expect(result).not.toBeNull()
    // <div> is on line 2, column 3 (1-based, after 2 spaces)
    expect(result!.code).toContain('data-pinfix-source="/src/App.vue:2:3"')
    // <span> is on line 3, column 5 (1-based, after 4 spaces)
    expect(result!.code).toContain('data-pinfix-source="/src/App.vue:3:5"')
  })

  it('embeds source content in Vue sourcemaps so Vite does not resolve missing files', () => {
    const code = `<template>\n  <div>hello</div>\n</template>`
    const result = transformCode(code, 'src/App.vue')

    expect(result).not.toBeNull()
    expect(result!.map.sources).toEqual(['src/App.vue'])
    expect(result!.map.sourcesContent).toEqual([code])
  })
})
