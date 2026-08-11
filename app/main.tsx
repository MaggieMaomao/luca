// Luca mobile app — entry point.
//
// This is a standalone web app that ships the basketball game (and
// future real-time games) as a Capacitor-wrapped iOS/Android app.
//
// Per the Phase 7 design:
//   - One codebase, one bundle, multiple platforms (web, iOS, Android)
//   - The luca platform provides the games; this app provides the shell
//   - Capacitor wraps this in a native WebView + status bar + haptics
//
// Routes:
//   /            → gallery (placeholder for Phase 7.0)
//   /game/basketball → the basketball vertical slice (Phase 6)

import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { GameLifecycleProvider } from '@luca-game/engine'
import { initCapacitor } from './src/capacitor-init'
import './index.css'

/** The MVP screen: just the basketball game.
 *  In a future phase, the gallery would let users pick a game. */
function BasketballScreen() {
  // Lazy import so the basketball game (which pulls in pixi.js +
  // matter.js + a chunk of the engine) is only loaded when the
  // user navigates here. Future optimization: pre-load in the
  // background after the gallery renders.
  const [Game, setGame] = React.useState<React.ComponentType | null>(null)
  React.useEffect(() => {
    import('@luca-game/platform/games/basketball').then(mod => {
      setGame(() => mod.default)
    })
  }, [])
  if (!Game) {
    return <div className="loading">Loading basketball…</div>
  }
  return <Game />
}

/** Top-level gallery — Phase 7.0 MVP just has one game. */
function Gallery() {
  return (
    <div className="gallery">
      <header className="gallery-header">
        <h1>Luca Games</h1>
        <p className="tagline">Real-time games on the go.</p>
      </header>
      <div className="gallery-grid">
        <Link to="/game/basketball" className="game-card">
          <span className="game-icon">🏀</span>
          <h2>Basketball</h2>
          <p>Swipe to shoot. Real-time physics.</p>
        </Link>
        <div className="game-card coming-soon">
          <span className="game-icon">⚽</span>
          <h2>Soccer Penalty</h2>
          <p>Coming soon</p>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <StrictMode>
      <GameLifecycleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Gallery />} />
            <Route path="/game/basketball" element={<BasketballScreen />} />
          </Routes>
        </BrowserRouter>
      </GameLifecycleProvider>
    </StrictMode>
  )
}

const root = createRoot(document.getElementById('root')!)

// Initialize Capacitor plugins (StatusBar, SplashScreen, Haptics, Network)
// before rendering. This is a no-op in the browser.
initCapacitor().then(() => {
  root.render(<App />)
})