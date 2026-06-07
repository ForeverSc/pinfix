import { rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageRoot = resolve(repoRoot, 'packages/unplugin')

for (const filename of ['README.md', 'README_ZH.md']) {
  rmSync(resolve(packageRoot, filename), { force: true })
}
