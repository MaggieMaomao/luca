// Towers of Hanoi — game renderer (uses GameEngine).
//
// Tap a peg to select it (the smallest disk on top gets highlighted),
// then tap another peg to move the top disk there. The move is only
// executed if it's legal (smaller disk onto larger).
//
// Desktop: click the source peg, then click the destination. Same flow.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GameEngine, type GameRenderContext } from '@luca-game/engine'
import {
  type HanoiState, type Peg, PEGS,
  isLegal as isLegalMove, optimalMoveCount, progress,
} from './towersOfHanoi'
import type { TowersAction, TowersStats } from './towersOfHanoiDefinition'
import { towersOfHanoiDefinition } from './towersOfHanoiDefinition'
import './towersOfHanoi.css'

const ONBOARD_KEY = 'luca:onboarded:towers_of_hanoi'

function renderTowers(
  state: HanoiState,
  ctx: GameRenderContext<HanoiState, TowersAction, TowersStats>,
) {
  return <TowersBoard state={state} ctx={ctx} />
}

const towersFullDefinition = {
  ...towersOfHanoiDefinition,
  render: renderTowers,
}

export default function TowersOfHanoi() {
  return <GameEngine definition={towersFullDefinition} className="towers-of-hanoi" />
}

function TowersBoard({
  state, ctx,
}: {
  state: HanoiState
  ctx: GameRenderContext<HanoiState, TowersAction, TowersStats>
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Peg | null>(null)

  // Onboarding
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(ONBOARD_KEY) !== '1'
    } catch {
      return true
    }
  })

  // Hide onboard on first move
  useEffect(() => {
    if (state.moves > 0 && showOnboard) {
      setShowOnboard(false)
      try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
    }
  }, [state.moves, showOnboard])

  // Reset selection on restart
  useEffect(() => {
    setSelected(null)
  }, [state.disks, state.moves === 0 ? 0 : -1])

  const handlePegClick = (peg: Peg) => {
    if (!ctx.interactive) return

    if (selected === null) {
      // First click: select if the peg has a disk
      if (state.pegs[peg].length > 0) {
        setSelected(peg)
      }
      return
    }

    if (selected === peg) {
      // Clicked the same peg — deselect
      setSelected(null)
      return
    }

    // Second click: try to move from selected to peg
    const move = { from: selected, to: peg }
    if (isLegalMove(state, move)) {
      ctx.dispatch({ type: 'MOVE', payload: move })
      setSelected(null)
    } else {
      // Illegal — flash the error, keep the source selected so the
      // user can try a different destination
      // (The error is already in state.error; render surfaces it.)
    }
  }

  const optimal = optimalMoveCount(state.disks)
  const progPct = Math.round(progress(state) * 100)

  return (
    <div className="towers-board">
      {showOnboard && (
        <div className="towers-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
        }}>
          <div className="towers-onboard-inner">
            <strong>{t('games.towers_of_hanoi.name', 'Towers of Hanoi')}</strong>
            <p>{t('games.towers_of_hanoi.onboard', 'Tap a peg to pick up its top disk, then tap another peg to set it down. Move all disks from A to C.')}</p>
            <button>{t('common.got_it', 'Got it')}</button>
          </div>
        </div>
      )}

      <div className="towers-progress">
        <div className="towers-progress-bar">
          <div className="towers-progress-fill" style={{ width: `${progPct}%` }} />
        </div>
        <div className="towers-progress-text">
          {state.pegs.C.length} / {state.disks} disks on C · {state.moves} {state.moves === 1 ? 'move' : 'moves'} (optimal: {optimal})
        </div>
      </div>

      <div className="towers-pegs">
        {PEGS.map(peg => {
          const tower = state.pegs[peg]
          const isSelected = selected === peg
          const topDisk = tower.length > 0 ? tower[tower.length - 1] : null
          const canSelect = tower.length > 0
          return (
            <button
              key={peg}
              className={`tower ${isSelected ? 'selected' : ''} ${selected && selected !== peg ? 'target' : ''}`}
              onClick={() => handlePegClick(peg)}
              disabled={!ctx.interactive && !canSelect}
              aria-label={`Peg ${peg} with ${tower.length} disk${tower.length === 1 ? '' : 's'}`}
            >
              <div className="tower-label">{peg}</div>
              <div className="tower-stack">
                {tower.length === 0 ? (
                  <div className="tower-empty" />
                ) : (
                  tower.map((disk, idx) => {
                    // Disks are stored bottom-to-top: index 0 = largest (bottom)
                    // Render in stacking order: bottom first, top last
                    const isTop = idx === tower.length - 1
                    return (
                      <div
                        key={idx}
                        className={`disk ${isTop ? 'top' : ''} ${isSelected && isTop ? 'selected' : ''}`}
                        style={{
                          width: `${30 + disk * 30}px`,
                          background: `hsl(${(disk / state.disks) * 60 + 180}, 60%, 55%)`,
                        }}
                      >
                        <span className="disk-label">{disk}</span>
                      </div>
                    )
                  })
                )}
              </div>
              <div className="tower-base" />
            </button>
          )
        })}
      </div>

      {state.error && (
        <div className="towers-error" role="alert">
          {state.error}
        </div>
      )}

      <div className="towers-controls">
        <label>
          {t('games.towers_of_hanoi.disks', 'Disks')}: {' '}
          <select
            value={state.disks}
            onChange={e => ctx.dispatch({ type: 'SET_DISKS', payload: { disks: Number(e.target.value) } })}
            disabled={!ctx.interactive}
          >
            {[3, 4, 5, 6, 7, 8].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <button
          onClick={() => ctx.dispatch({ type: 'RESTART' })}
          disabled={!ctx.interactive}
        >
          {t('common.restart', 'Restart')}
        </button>
      </div>
    </div>
  )
}