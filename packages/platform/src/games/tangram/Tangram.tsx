// Tangram — game renderer (uses GameEngine).
//
// Renders the 7 pieces on a grid, draggable. Click "Check" to see
// which pieces are locked (in their target position).

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GameEngine, type GameRenderContext } from '@luca-game/engine'
import {
  type TangramState, type Piece, type PieceId, type TargetShape,
  ALL_TARGETS, cellsEqual, pieceMatchesTarget, lockedCount,
} from './tangram'
import type { TangramAction, TangramStats } from './tangramDefinition'
import { tangramDefinition } from './tangramDefinition'
import './tangram.css'

const ONBOARD_KEY = 'luca:onboarded:tangram'

function renderTangram(
  state: TangramState,
  ctx: GameRenderContext<TangramState, TangramAction, TangramStats>,
) {
  return <TangramBoard state={state} ctx={ctx} />
}

const tangramFullDefinition = {
  ...tangramDefinition,
  render: renderTangram,
}

export default function Tangram() {
  return <GameEngine definition={tangramFullDefinition} className="tangram" />
}

const CELL_SIZE = 32

function TangramBoard({
  state, ctx,
}: {
  state: TangramState
  ctx: GameRenderContext<TangramState, TangramAction, TangramStats>
}) {
  const { t } = useTranslation()
  const [dragging, setDragging] = useState<{ id: PieceId; startX: number; startY: number; origCells: Array<[number, number]> } | null>(null)

  // Onboarding
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return window.localStorage.getItem(ONBOARD_KEY) !== '1' }
    catch { return true }
  })

  useEffect(() => {
    if (state.moves > 0 && showOnboard) {
      setShowOnboard(false)
      try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
    }
  }, [state.moves, showOnboard])

  // Compute canvas size from the union of all piece + target extents.
  const allCells = [
    ...state.pieces.flatMap(p => p.cells),
    ...state.target.cells,
  ]
  const maxR = Math.max(...allCells.map(([r]) => r), 4)
  const maxC = Math.max(...allCells.map(([, c]) => c), 11)
  const width = (maxC + 1) * CELL_SIZE
  const height = (maxR + 1) * CELL_SIZE

  // Drag-and-drop
  const onPointerDown = (id: PieceId, e: React.PointerEvent) => {
    if (!ctx.interactive) return
    const piece = state.pieces.find(p => p.id === id)
    if (!piece) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging({ id, startX: e.clientX, startY: e.clientY, origCells: piece.cells })
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const dx = Math.round((e.clientX - dragging.startX) / CELL_SIZE)
    const dy = Math.round((e.clientY - dragging.startY) / CELL_SIZE)
    if (dx === 0 && dy === 0) return
    const newCells = dragging.origCells.map(([r, c]) => [r + dy, c + dx] as [number, number])
    ctx.dispatch({ type: 'MOVE', payload: { id: dragging.id, cells: newCells } })
    setDragging({ id: dragging.id, startX: e.clientX, startY: e.clientY, origCells: dragging.origCells })
  }

  const onPointerUp = () => {
    setDragging(null)
  }

  const locked = lockedCount(state)
  const total = state.pieces.length

  return (
    <div className="tangram-wrap">
      {showOnboard && (
        <div className="tangram-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
        }}>
          <div className="tangram-onboard-inner">
            <strong>{t('games.tangram.name', 'Tangram')}</strong>
            <p>{t('games.tangram.onboard', 'Drag the 7 pieces to form the target shape. Pieces snap to a grid.')}</p>
            <button>{t('common.got_it', 'Got it')}</button>
          </div>
        </div>
      )}

      <div className="tangram-header">
        <div className="tangram-target-label">
          Target: <strong>{state.target.name}</strong>
        </div>
        <div className="tangram-progress">
          {locked} / {total} pieces placed
        </div>
      </div>

      <div className="tangram-board" style={{ width, height }}>
        {/* Target shape (background, faded) */}
        <div
          className="tangram-target-overlay"
          style={{
            left: state.target.cells[0][1] * CELL_SIZE,
            top: state.target.cells[0][0] * CELL_SIZE,
            width: (Math.max(...state.target.cells.map(([, c]) => c)) - Math.min(...state.target.cells.map(([, c]) => c)) + 1) * CELL_SIZE,
            height: (Math.max(...state.target.cells.map(([r]) => r)) - Math.min(...state.target.cells.map(([r]) => r)) + 1) * CELL_SIZE,
          }}
        />

        {/* Pieces */}
        {state.pieces.map(piece => {
          const isLocked = state.locked[piece.id]
          return (
            <PieceView
              key={piece.id}
              piece={piece}
              locked={isLocked}
              onPointerDown={e => onPointerDown(piece.id, e)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              interactive={ctx.interactive}
            />
          )
        })}
      </div>

      <div className="tangram-controls">
        <label>
          Target: {' '}
          <select
            value={state.target.name}
            onChange={e => {
              const t = ALL_TARGETS.find(t => t.name === e.target.value)
              if (t) ctx.dispatch({ type: 'SELECT_TARGET', payload: { target: t } })
            }}
            disabled={!ctx.interactive}
          >
            {ALL_TARGETS.map(t => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
        </label>
        <button onClick={() => ctx.dispatch({ type: 'RESTART' })} disabled={!ctx.interactive}>
          {t('common.restart', 'Restart')}
        </button>
      </div>
    </div>
  )
}

function PieceView({
  piece, locked, onPointerDown, onPointerMove, onPointerUp, interactive,
}: {
  piece: Piece
  locked: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
  interactive: boolean
}) {
  const minR = Math.min(...piece.cells.map(([r]) => r))
  const minC = Math.min(...piece.cells.map(([, c]) => c))
  const maxR = Math.max(...piece.cells.map(([r]) => r))
  const maxC = Math.max(...piece.cells.map(([, c]) => c))
  return (
    <div
      className={`tangram-piece ${locked ? 'locked' : ''}`}
      style={{
        left: minC * CELL_SIZE,
        top: minR * CELL_SIZE,
        width: (maxC - minC + 1) * CELL_SIZE,
        height: (maxR - minR + 1) * CELL_SIZE,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {piece.cells.map(([r, c], idx) => (
        <div
          key={idx}
          className="tangram-cell"
          style={{
            left: (c - minC) * CELL_SIZE,
            top: (r - minR) * CELL_SIZE,
            width: CELL_SIZE,
            height: CELL_SIZE,
            background: PIECE_COLORS[piece.id],
          }}
        />
      ))}
    </div>
  )
}

const PIECE_COLORS: Record<PieceId, string> = {
  0: '#4f9eff',  // big triangle — blue
  1: '#fbbf24',  // medium triangle — yellow
  2: '#22c55e',  // small triangle 1 — green
  3: '#ef4444',  // small triangle 2 — red
  4: '#a855f7',  // square — purple
  5: '#f97316',  // parallelogram — orange
  6: '#06b6d4',  // tiny triangle — cyan
}