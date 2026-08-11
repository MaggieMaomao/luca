// Fix import paths in compiled dist/*.js files.
//
// TypeScript with `module: ESNext + moduleResolution: Bundler` does
// NOT add `.js` extensions to relative imports. But Node ESM requires
// them. This script adds `.js` to relative imports in compiled .js
// files, making them runnable as native ESM.
//
// Strategy:
//   1. Read the file
//   2. For each line, if it contains `from './X'` or `from '../X'`,
//      add `.js` (or `/index.js` if X is a directory)
//   3. Skip lines that are inside a comment or string
//
// We do this line-by-line to avoid the regex-with-callback complexity
// that was the source of the previous bug.

import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')

/** Check if a path is a directory. */
async function isDirectory(path) {
  try {
    const s = await stat(path)
    return s.isDirectory()
  } catch {
    return false
  }
}

/** Fix a single import path: './foo' -> './foo.js' (or './foo/index.js'). */
async function fixImportPath(fromDir, importPath) {
  // If it already has an extension, leave it
  if (/\.(js|json|css|ts|tsx|jsx|mjs)$/.test(importPath)) {
    return importPath
  }
  // Check if it's a directory (./realtime)
  if (await isDirectory(join(fromDir, importPath))) {
    return `${importPath}/index.js`
  }
  // Otherwise add .js
  return `${importPath}.js`
}

/** Process a single file: fix all relative imports. */
async function fixFile(filePath) {
  const content = await readFile(filePath, 'utf-8')
  const dir = dirname(filePath)
  const lines = content.split('\n')
  let changed = false
  const out = []

  for (const line of lines) {
    // Find all `from './X'` or `from "../X"` in this line
    // Skip if line is a comment
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      out.push(line)
      continue
    }

    // Match the import pattern and rebuild the line
    const newLine = await replaceImportsInLine(line, dir)
    if (newLine !== line) {
      changed = true
    }
    out.push(newLine)
  }

  if (changed) {
    await writeFile(filePath, out.join('\n'))
    console.log(`Fixed ${relative(DIST, filePath)}`)
  }
}

/** Replace all `from '...'` paths in a line. */
async function replaceImportsInLine(line, dir) {
  // Simple regex: from "..." or from '...'  (relative path with ./ or ../)
  // Note: we don't try to handle multi-line imports. If an import spans
  // lines, tsc will put it on one line anyway.
  const regex = /from\s+(['"])(\.\.?\/[^'"]+)\1/g
  let result = line
  let match
  const matches = []
  while ((match = regex.exec(line)) !== null) {
    matches.push({ full: match[0], quote: match[1], path: match[2], index: match.index })
  }
  // Process matches in reverse so indices stay valid
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i]
    const newPath = await fixImportPath(dir, m.path)
    if (newPath !== m.path) {
      const newFull = `from ${m.quote}${newPath}${m.quote}`
      result = result.slice(0, m.index) + newFull + result.slice(m.index + m.full.length)
    }
  }
  return result
}

/** Recursively walk dist/ and fix all .js files. */
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(fullPath)
    } else if (entry.name.endsWith('.js')) {
      await fixFile(fullPath)
    }
  }
}

await walk(DIST)
console.log('Done.')