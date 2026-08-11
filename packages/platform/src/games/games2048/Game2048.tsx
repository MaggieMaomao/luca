// 2048 — game renderer (uses GameEngine).
//
// The engine provides state machine, persistence, keyboard input.
// This file provides the board render + touch swipe handling, which
// is specific to 2048.

import { useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GameEngine, type GameRenderContext } from '@luca-game/engine'
import { WIN_VALUE } from './game2048'
import type {
  Game2048Action,
  Game2048Stats,
  Board2048,
  Tile2048,
} from './game2048Definition'
import { game2048Definition } from './game2048Definition'
import './2048.css'

const ONBOARD_KEY = 'luca:onboarded:2048'

// Build the full definition (with render) here since render needs JSX.
function render2048(
  state: Board2048,
  ctx: GameRenderContext<Board2048, Game2048Action, Game2048Stats>,
) {
  return <Board2048 state={state} ctx={ctx} />
}

const game2048FullDefinition = {
  ...game2048Definition,
  render: render2048,
}

export default function Game2048() {
  return <GameEngine definition={game2048FullDefinition} className="g2048" />
}

function Board2048({
  state, ctx,
}: {
  state: Board2048
  ctx: GameRenderContext<Board2048, Game2048Action, Game2048Stats>
}) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Onboarding visibility — only show on first visit
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(ONBOARD_KEY) !== '1'
    } catch {
      return true
    }
  })

  const dismissOnboard = () => {
    setShowOnboard(false)
    try {
      window.localStorage.setItem(ONBOARD_KEY, '1')
    } catch {
      // ignore
    }
  }

  // Touch handlers (swipe detection). Keyboard input is handled by
  // GameEngine automatically via the keyboard map in the definition.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let startX = 0, startY = 0
    let tracking = false

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      startX = t.clientX
      startY = t.clientY
      tracking = true
    }
    const onMove = (e: TouchEvent) => {
      if (tracking) e.preventDefault()
    }
    const onEnd = (e: TouchEvent) => {
      if (!tracking) return
      tracking = false
      const t = e.changedTouches[0]
      const dx = t.clientX - startX
      const dy = t.clientY - startY
      const THRESHOLD = 30
      if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return
      if (Math.abs(dx) > Math.abs(dy)) {
        ctx.dispatch({ type: 'MOVE', payload: dx > 0 ? 'right' : 'left' })
      } else {
        ctx.dispatch({ type: 'MOVE', payload: dy > 0 ? 'down' : 'up' })
      }
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [ctx])

  // Auto-hide onboard on first move (any tile ID > initial set means
  // a move happened — safer to just check for any non-zero tile)
  useEffect(() => {
    const isEmpty = state.every(row => row.every(c => c.value === 0))
    if (!isEmpty) setShowOnboard(false)
  }, [state])

  return (
    <div ref={containerRef}>
      {showOnboard && (
        <div className="g2048-onboard" role="region" aria-label="How to play 2048">
          <div className="g2048-onboard-icon" aria-hidden="true">?</div>
          <div className="g2048-onboard-body">
            <h3 className="g2048-onboard-title">
              {t('games.2048.onboard_title', 'How to play 2048')}
            </h3>
            <ul className="g2048-onboard-rules">
              <li>
                {t(
                  'games.2048.onboard_rule_1_short',
                  'Arrow keys or swipe to slide',
                )}
              </li>
              <li>
                {t(
                  'games.2048.onboard_rule_2_short',
                  'Same numbers merge into their sum',
                )}
              </li>
              <li>
                {t(
                  'games.2048.onboard_rule_3_short',
                  'Reach 2048 to win',
                )}
              </li>
            </ul>
            <div className="g2048-onboard-actions">
              <button
                type="button"
                className="cb-btn cb-btn-md cb-btn-primary"
                onClick={dismissOnboard}
              >
                {t('games.2048.onboard_got_it', 'Got it — start playing')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="g2048-board"
        role="application"
        aria-label="2048 board"
      >
        {state.map((row) =>
          row.map((tile) => (
            <Tile key={tile.id} tile={tile} />
          )),
        )}
      </div>
    </div>
  )
}

function Tile({ tile }: { tile: Tile2048 }) {
  return (
    <div
      className={`g2048-tile ${tile.value === 0 ? 'g2048-tile-empty' : ''} g2048-tile-${tile.value}`}
      aria-label={tile.value > 0 ? `Tile ${tile.value}` : 'Empty cell'}
    >
      {tile.value > 0 ? tile.value : ''}
    </div>
  )
}

// Re-export so the engine can read WIN_VALUE for the help text.
export { WIN_VALUE }