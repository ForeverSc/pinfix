export interface AISession {
  sendMessage(content: string): void
  kill(): void
  onChunk(cb: (text: string) => void): void
  onTool(cb: (toolName: string) => void): void
  onDone(cb: () => void): void
  onError(cb: (error: string) => void): void
}

export interface AIProvider {
  name: string
  createSession(systemPrompt: string, cwd?: string): AISession
}
