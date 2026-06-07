const packageRoot = 'packages/unplugin'
const packageName = '@pinfix/plugin'

export default {
  branches: ['main'],
  tagFormat: `${packageName}@\${version}`,
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/changelog',
      {
        changelogFile: `${packageRoot}/CHANGELOG.md`,
        changelogTitle: `# ${packageName} Changelog`,
      },
    ],
    [
      '@semantic-release/npm',
      {
        pkgRoot: packageRoot,
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: [`${packageRoot}/package.json`, `${packageRoot}/CHANGELOG.md`],
        message: `chore(release): ${packageName} \${nextRelease.version} [skip ci]\n\n\${nextRelease.notes}`,
      },
    ],
    '@semantic-release/github',
  ],
}
