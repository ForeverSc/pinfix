import { createHash } from 'crypto'
import { resolve } from 'path'

export function createWorkspaceId(root: string): string {
  return createHash('sha256').update(resolve(root)).digest('hex').slice(0, 16)
}
