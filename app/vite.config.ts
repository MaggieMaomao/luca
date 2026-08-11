// Vite config for the luca mobile app.
//
// Bundles the luca platform (engine + basketball game) as a
// standalone web app that Capacitor wraps in a native shell.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Resolve the luca packages to their package.json roots.
// Vite + Node will then resolve subpaths like
// `@luca-game/platform/games/basketball` automatically.
const engineRoot = fileURLToPath(new URL('../packages/engine', import.meta.url))
const platformRoot = fileURLToPath(new URL('../packages/platform', import.meta.url))

export default defineConfig({
  plugins: [react()],

  // Capacitor loads the app from the device's filesystem, so all
  // asset paths need to be relative (./assets/...) not absolute (/assets/...)
  base: './',

  resolve: {
    alias: [
      // Force @luca-game/engine and @luca-game/platform to resolve to
      // the package roots (not the dist files — Node then resolves
      // subpath imports like @luca-game/platform/games/basketball).
      { find: /^@luca-game\/engine$/, replacement: engineRoot },
      { find: /^@luca-game\/platform$/, replacement: platformRoot },
    ],
    // Prefer the file: / dist entry points over package.json "main"
    // (which has ESM/CJS interop issues with the engine's CSS import).
    mainFields: ['module', 'jsnext', 'jsnext:main', 'browser', 'main'],
  },

  // The web app's entry point. Basketball is the MVP.
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    minify: 'esbuild',
  },

  server: {
    port: 5173,
    strictPort: false,
  },
})