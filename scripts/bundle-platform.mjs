#!/usr/bin/env node
/**
 * bundle-platform.mjs
 *
 * Builds the @luca-game/platform tarball with @luca-game/engine bundled
 * inside it as a bundledDependency. This is a workaround for npm/yarn's
 * inability to install two `file:` deps where one references the other.
 *
 * Usage: node scripts/bundle-platform.mjs [output-dir]
 *
 * Output: <output-dir>/luca-game-platform-0.1.0.tgz
 *
 * The output tarball can be used in another project's package.json:
 *   "@luca-game/platform": "file:./vendor/luca-game-platform-0.1.0.tgz"
 *
 * Engine is bundled inside at node_modules/@luca-game/engine/ inside
 * the platform's extracted directory, so npm/yarn install without
 * needing to resolve @luca-game/engine as a separate package.
 *
 * This is a temporary fix until Phase 5 publishes to npm.
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const outputDir = process.argv[2] ?? join(ROOT, 'dist-bundles')
const PLATFORM_DIR = join(ROOT, 'packages', 'platform')
const ENGINE_DIR = join(ROOT, 'packages', 'engine')
const TMP_DIR = join(ROOT, '.tmp-pack')

console.log('Step 1: Pack engine and platform separately')
console.log('  output dir:', outputDir)

mkdirSync(outputDir, { recursive: true })
mkdirSync(TMP_DIR, { recursive: true })

const engineTar = join(TMP_DIR, 'luca-game-engine-0.1.0.tgz')
const platformTarBefore = join(TMP_DIR, 'luca-game-platform-0.1.0.tgz')

console.log('  packing engine...')
execSync(`npm pack --pack-destination "${TMP_DIR}"`, { cwd: ENGINE_DIR, stdio: 'inherit' })

console.log('  packing platform...')
execSync(`npm pack --pack-destination "${TMP_DIR}"`, { cwd: PLATFORM_DIR, stdio: 'inherit' })

console.log('\nStep 2: Extract, patch, re-pack platform tarball')

const extractDir = join(TMP_DIR, 'extract')
mkdirSync(extractDir, { recursive: true })

console.log('  extracting platform tarball...')
try {
  execSync(`tar -xzf "${platformTarBefore}" -C "${extractDir}"`, { stdio: 'inherit' })
} catch (e) {
  console.error('  FAILED extracting platform. Tar file:', platformTarBefore, 'exists?', existsSync(platformTarBefore))
  throw e
}

// Patch package.json: remove engine dep, add bundledDependencies
const pkgPath = join(extractDir, 'package', 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
if (pkg.dependencies) {
  delete pkg.dependencies['@luca-game/engine']
}
pkg.bundledDependencies = ['@luca-game/engine']
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
console.log('  patched package.json (engine → bundledDependencies)')

// Extract engine into a temp dir
const engineExtractDir = join(TMP_DIR, 'engine-extract')
mkdirSync(engineExtractDir, { recursive: true })
console.log('  extracting engine tarball...')
execSync(`tar -xzf "${engineTar}" -C "${engineExtractDir}"`, { stdio: 'inherit' })

// Move engine into platform's node_modules
const enginePackageDir = join(engineExtractDir, 'package')
const platformNodeModules = join(extractDir, 'package', 'node_modules')
mkdirSync(platformNodeModules, { recursive: true })
const platformEngineDest = join(platformNodeModules, '@luca-game', 'engine')
mkdirSync(dirname(platformEngineDest), { recursive: true })

console.log('  moving engine into platform/node_modules/@luca-game/engine...')
execSync(`mv "${enginePackageDir}" "${platformEngineDest}"`, { stdio: 'inherit' })

// Repack
const finalTar = join(outputDir, 'luca-game-platform-0.1.0.tgz')
console.log('  repacking to', finalTar)
execSync(`tar -czf "${finalTar}" -C "${extractDir}" package`, { stdio: 'inherit' })

console.log('\nStep 3: Cleanup')
rmSync(TMP_DIR, { recursive: true, force: true })

console.log('\nDone. Output:', finalTar)
console.log('\nUsage in your consumer project:')
console.log('  "@luca-game/platform": "file:' + finalTar + '"')