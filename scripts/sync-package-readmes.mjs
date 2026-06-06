import { copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = resolve(repoRoot, 'packages/unplugin');

for (const filename of ['README.md', 'README_ZH.md']) {
  copyFileSync(resolve(repoRoot, filename), resolve(packageRoot, filename));
}
