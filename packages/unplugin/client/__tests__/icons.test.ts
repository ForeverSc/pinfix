import { describe, expect, it } from 'vitest'
import { COMMENT_BUBBLE_PATH, ICON_COMMENT, ICON_COMMENT_PLUS } from '../icons'

describe('overlay icons', () => {
  it('uses filled Codex-style comment icons for the annotation entry points', () => {
    expect(ICON_COMMENT).toContain('fill="var(--pinfix-comment-fill, #0070ea)"')
    expect(ICON_COMMENT).toContain('stroke="var(--pinfix-comment-stroke, #fff)"')
    expect(ICON_COMMENT).toContain('stroke-width="1.6"')
    expect(ICON_COMMENT).toContain('M12 2.5C6.75 2.5')
    expect(ICON_COMMENT_PLUS).toContain('fill="var(--pinfix-comment-fill, #0070ea)"')
    expect(ICON_COMMENT_PLUS).toContain('stroke-width="1.6"')
    expect(ICON_COMMENT_PLUS).toContain(COMMENT_BUBBLE_PATH)
    expect(ICON_COMMENT_PLUS).toContain('M12 8v6')
    expect(ICON_COMMENT_PLUS).toContain('stroke="var(--pinfix-comment-stroke, #fff)"')
    expect(ICON_COMMENT).not.toContain('M12 3C6.48')
  })

  it('does not use the old edit-pencil icon for comment entry points', () => {
    expect(ICON_COMMENT).not.toContain('M18.5 2.5')
    expect(ICON_COMMENT_PLUS).not.toContain('M18.5 2.5')
  })
})
