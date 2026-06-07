import { describe, expect, it } from 'vitest'
import { createWsUrl } from '../ws-url'

describe('createWsUrl', () => {
  it('uses the selected server URL without scanning retry ports', () => {
    expect(createWsUrl('ws://localhost:24817', 'workspace-a')).toBe(
      'ws://localhost:24817/?workspaceId=workspace-a',
    )
  })

  it('preserves existing query params when adding the workspace id', () => {
    expect(createWsUrl('ws://localhost:24817/pinfix?debug=1', 'workspace-a')).toBe(
      'ws://localhost:24817/pinfix?debug=1&workspaceId=workspace-a',
    )
  })
})
