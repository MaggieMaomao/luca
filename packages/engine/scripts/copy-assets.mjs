// Copies non-TS assets (CSS) from src/ to dist/.
// TypeScript only emits .js/.d.ts files; CSS imports need the actual files.

import { copyFile, mkdir, readdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = join(__dirname, '..', 'src')
const DIST = join(__dirname, '..', 'dist')

async function copyIfExists(srcPath, destPath) {
  try {
    await stat(srcPath)
  } catch {
    return // not found, skip
  }
  await mkdir(dirname(destPath), { recursive: true })
  await copyFile(srcPath, destPath)
  console.log(`copied ${srcPath} → ${destPath}`)
}

async function walk(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      await walk(full, base)
    } else if (e.isFile()) {
      const ext = e.name.slice(e.name.lastIndexOf('.'))
      if (ext === '.css') {
        const rel = full.slice(base.length + 1)
        await copyIfExists(full, join(DIST, rel))
      }
    }
  }
}

await walk(SRC)
console.log('done.')