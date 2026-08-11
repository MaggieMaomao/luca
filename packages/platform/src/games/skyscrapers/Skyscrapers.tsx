// Skyscrapers - game renderer.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GameEngine, type GameRenderContext } from '@luca-game/engine'
import {
  type SkyscraperState,
  newPuzzle, setCell, isSolved, isLoss,
} from './skyscrapers'
import type { SkyscrapersAction, SkyscrapersStats } from './skyscrapersDefinition'
import { skyscrapersDefinition } from './skyscrapersDefinition'
import './skyscrapers.css'

function renderSky(
  state: SkyscraperState,
  ctx: GameRenderContext<SkyscraperState, SkyscrapersAction, SkyscrapersStats>,
) {
  return <SkyscrapersBoard state={state} ctx={ctx} />
}

const skyFullDefinition = {
  ...skyscrapersDefinition,
  render: renderSky,
}

const ONBOARD_KEY = 'luca:onboarded:skyscrapers'

export default function Skyscrapers() {
  return <GameEngine definition={skyFullDefinition} className="skyscrapers" />
}

function SkyscrapersBoard({
  state, ctx,
}: {
  state: SkyscraperState
  ctx: GameRenderContext<SkyscraperState, SkyscrapersAction, SkyscrapersStats>
}) {
  const { t } = useTranslation()
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return window.localStorage.getItem(ONBOARD_KEY) !== '1' }
    catch { return true }
  })
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null)

  useEffect(() => {
    if (state.moves > 0 && showOnboard) {
      setShowOnboard(false)
      try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
    }
  }, [state.moves, showOnboard])

  useEffect(() => {
    if (state.moves === 0) setSelectedCell(null)
  }, [state.moves])

  const n = state.size
  const interactive =  // (drop ctx.interactive so first click works)
  !isSolved(state)

  const handleCellClick = (r: number, c: number) => {
    if (!interactive) return
    setSelectedCell({ r, c })
  }

  const handleValue = (value: number) => {
    if (selectedCell === null) return
    ctx.dispatch({ type: 'SET', payload: { r: selectedCell.r, c: selectedCell.c, value } })
  }

  const handleClear = () => {
    if (selectedCell === null) return
    ctx.dispatch({ type: 'CLEAR', payload: { r: selectedCell.r, c: selectedCell.c } })
    setSelectedCell(null)
  }

  return (
    <div className="sk-wrap">
      {showOnboard && (
        <div className="sk-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
        }}>
          <div className="sk-onboard-inner">
            <strong>{t('games.skyscrapers.name', 'Skyscrapers')}</strong>
            <p>{t('games.skyscrapers.onboard', 'Fill the grid so each row and column has heights 1..N (no repeats), and the edge clues match the visible skyscrapers from that side.')}</p>
            <button>{t('common.got_it', 'Got it')}</button>
          </div>
        </div>
      )}

      <div className="sk-board">
        <div className="sk-corner" />
        <div className="sk-edge sk-edge-top">
          {state.clues.top.map((c, i) => (
            <div key={i} className="sk-clue">{c || ''}</div>
          ))}
        </div>
        <div className="sk-corner" />
        <div className="sk-edge sk-edge-left">
          {state.clues.left.map((c, i) => (
            <div key={i} className="sk-clue">{c || ''}</div>
          ))}
        </div>
        <div className="sk-grid" style={{ gridTemplateColumns: 'repeat(' + n + ', 1fr)' }}>
          {state.grid.flatMap((row, r) =>
            row.map((value, c) => {
              const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c
              return (
                <button
                  key={r + ',' + c}
                  className={'sk-cell' + (isSelected ? ' selected' : '') + (value !== 0 ? ' filled' : '')}
                  onClick={() => handleCellClick(r, c)}
                  disabled={!interactive}
                  aria-label={'Row ' + (r + 1) + ' column ' + (c + 1)}
                >
                  {value !== 0 ? value : ''}
                </button>
              )
            })
          )}
        </div>
        <div className="sk-edge sk-edge-right">
          {state.clues.right.map((c, i) => (
            <div key={i} className="sk-clue">{c || ''}</div>
          ))}
        </div>
        <div className="sk-corner" />
        <div className="sk-edge sk-edge-bottom">
          {state.clues.bottom.map((c, i) => (
            <div key={i} className="sk-clue">{c || ''}</div>
          ))}
        </div>
        <div className="sk-corner" />
      </div>

      {selectedCell !== null && (
        <div className="sk-palette">
          <div className="sk-palette-label">
            {t('games.skyscrapers.pick', 'Pick a height:')}
          </div>
          <div className="sk-palette-buttons">
            {Array.from({ length: n }, (_, i) => i + 1).map(v => (
              <button key={v} className="sk-palette-btn" onClick={() => handleValue(v)}>
                {v}
              </button>
            ))}
            <button className="sk-palette-btn sk-clear" onClick={handleClear}>
              X
            </button>
          </div>
        </div>
      )}

      {isSolved(state) && (
        <div className="sk-result won">
          <div className="sk-result-title">You did it!</div>
          <div className="sk-result-msg">All clues match.</div>
          <button onClick={ctx.restart}>Play again</button>
        </div>
      )}
    </div>
  )
}