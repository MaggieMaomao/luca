// Magic Square — game renderer.
//
// Fill an N×N grid with the numbers 1..N² so that every row, every
// column, and both diagonals sum to the same "magic number". The
// constant is shown at the top; each cell shows the current value
// and highlights green when its row/col/diagonal all sum to the
// magic constant.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GameEngine, type GameRenderContext } from '@luca-game/engine'
import {
  type MagicSquareState, type Cell,
  magicConstant, newPuzzle, setCell, isSolved, isLoss,
} from './magicSquare'
import type { MagicSquareAction, MagicSquareStats } from './magicSquareDefinition'
import { magicSquareDefinition } from './magicSquareDefinition'
import './magicSquare.css'

function renderMagic(
  state: MagicSquareState,
  ctx: GameRenderContext<MagicSquareState, MagicSquareAction, MagicSquareStats>,
) {
  return <MagicSquareBoard state={state} ctx={ctx} />
}

const magicFullDefinition = {
  ...magicSquareDefinition,
  render: renderMagic,
}

const ONBOARD_KEY = 'luca:onboarded:magic_square'

export default function MagicSquare() {
  return <GameEngine definition={magicFullDefinition} className="magic-square" />
}

function MagicSquareBoard({
  state, ctx,
}: {
  state: MagicSquareState
  ctx: GameRenderContext<MagicSquareState, MagicSquareAction, MagicSquareStats>
}) {
  const { t } = useTranslation()
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return window.localStorage.getItem(ONBOARD_KEY) !== '1' }
    catch { return true }
  })
  const [selectedCell, setSelectedCell] = useState<number | null>(null)

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
  const target = magicConstant(n)
  // Don't gate on ctx.interactive — engine starts in 'idle' and
  // transitions to 'playing' on first dispatch. We want first
  // click to be valid.
  const interactive = !isSolved(state)
  const remainingValues = getRemainingValues(state, n)
  const handleCellClick = (idx: number) => {
    if (!interactive) return
    if (selectedCell === idx) {
      setSelectedCell(null)
    } else {
      setSelectedCell(idx)
    }
  }

  const handleValue = (value: number) => {
    if (selectedCell === null) return
    ctx.dispatch({ type: 'SET', payload: { idx: selectedCell, value } })
    setSelectedCell(null)
  }

  const handleClear = (idx: number) => {
    if (!interactive) return
    ctx.dispatch({ type: 'CLEAR', payload: { idx } })
    if (selectedCell === idx) setSelectedCell(null)
  }

  return (
    <div className="ms-wrap">
      {showOnboard && (
        <div className="ms-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
        }}>
          <div className="ms-onboard-inner">
            <strong>{t('games.magic_square.name', 'Magic Square')}</strong>
            <p>{t('games.magic_square.onboard', `Fill the ${n}×${n} grid with numbers 1–${n * n} so every row, column, and diagonal sums to ${target}.`)}</p>
            <button>{t('common.got_it', 'Got it')}</button>
          </div>
        </div>
      )}

      <div className="ms-target">
        <span className="ms-target-label">{t('games.magic_square.target', 'Magic number:')}</span>
        <span className="ms-target-value">{target}</span>
      </div>

      <div className="ms-grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {Array.from({ length: n * n }, (_, idx) => {
          const v = state.grid[idx]
          const isSelected = selectedCell === idx
          const rowSum = rowSumAt(state, idx, n)
          const colSum = colSumAt(state, idx, n)
          const correctRow = rowSum === target
          const correctCol = colSum === target
          return (
            <button
              key={idx}
              className={`ms-cell ${isSelected ? 'selected' : ''} ${v !== 0 ? 'filled' : ''} ${correctRow && correctCol && v !== 0 ? 'correct' : ''}`}
              onClick={() => v !== 0 ? handleClear(idx) : handleCellClick(idx)}
              disabled={!interactive}
              aria-label={`Row ${Math.floor(idx / n) + 1} column ${(idx % n) + 1}${v !== 0 ? ` value ${v}` : ' empty'}`}
            >
              {v !== 0 ? v : ''}
            </button>
          )
        })}
      </div>

      {selectedCell !== null && (
        <div className="ms-palette">
          <div className="ms-palette-label">
            {t('games.magic_square.choose', 'Choose a value:')}
          </div>
          <div className="ms-palette-buttons">
            {Array.from({ length: n * n }, (_, i) => i + 1).map(v => {
              const used = remainingValues.used.has(v)
              return (
                <button
                  key={v}
                  className={`ms-palette-btn ${used ? 'used' : ''}`}
                  onClick={() => handleValue(v)}
                  disabled={used}
                >
                  {v}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {isSolved(state) && (
        <div className="ms-result won">
          <div className="ms-result-title">🏆 {t('games.magic_square.won', 'Perfect!')}</div>
          <div className="ms-result-msg">
            {t('games.magic_square.won_msg', `Every row, column, and diagonal sums to ${target}.`)}
          </div>
          <button onClick={ctx.restart}>{t('common.play_again', 'Play again')}</button>
        </div>
      )}
    </div>
  )
}

function getRemainingValues(state: MagicSquareState, n: number) {
  const used = new Set<number>()
  for (const c of state.grid) if (c !== 0) used.add(c)
  return { used }
}

function rowSumAt(state: MagicSquareState, idx: number, n: number): number {
  let s = 0
  const row = Math.floor(idx / n)
  for (let c = 0; c < n; c++) s += state.grid[row * n + c]
  return s
}

function colSumAt(state: MagicSquareState, idx: number, n: number): number {
  let s = 0
  const col = idx % n
  for (let r = 0; r < n; r++) s += state.grid[r * n + col]
  return s
}