# scripts/

Helper scripts for the luca monorepo.

## bundle-platform.mjs

Builds a self-contained `@luca-game/platform` tarball with
`@luca-game/engine` bundled inside it as a `bundledDependency`.

This works around npm/yarn's inability to install two `file:` deps
where one references the other. See [../docs/DISTRIBUTION.md](../docs/DISTRIBUTION.md)
for the full explanation.

**Usage:**

```bash
node scripts/bundle-platform.mjs /path/to/output/dir
```

**Output:** `<output-dir>/luca-game-platform-0.1.0.tgz`

**Consumer's package.json:**

```json
{
  "dependencies": {
    "@luca-game/platform": "file:./vendor/luca-game-platform-0.1.0.tgz"
  }
}
```

After running `npm install`, the engine is available at
`node_modules/@luca-game/platform/node_modules/@luca-game/engine/`
and works transparently because Node's module resolution walks up
`node_modules` directories.

## Future (Phase 5)

When we publish to npm registry, this workaround becomes unnecessary
and the script can be deleted. Consumers will use semver ranges
like `"@luca-game/platform": "^0.1.0"` directly.