declare const __PINFIX_WORKSPACE_ID__: string | undefined

export function getWorkspaceId(): string {
  const defineWorkspaceId =
    typeof __PINFIX_WORKSPACE_ID__ !== 'undefined' ? __PINFIX_WORKSPACE_ID__ : undefined
  const globalWorkspaceId =
    typeof window !== 'undefined' ? (window as any).__PINFIX_WORKSPACE_ID__ : undefined
  return defineWorkspaceId || globalWorkspaceId || ''
}

export function createWsUrl(baseUrl: string, workspaceId: string): string {
  return workspaceId ? withWorkspaceId(baseUrl, workspaceId) : baseUrl
}

function withWorkspaceId(rawUrl: string, workspaceId: string): string {
  try {
    const url = new URL(rawUrl)
    url.searchParams.set('workspaceId', workspaceId)
    return url.toString()
  } catch {
    return rawUrl
  }
}
