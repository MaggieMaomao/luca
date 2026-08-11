// Sliding Blocks — game renderer (uses GameEngine).
//
// Click any tile adjacent to the empty space to slide it there.
// Shows correct-tile count, Manhattan distance to goal, and move count.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GameEngine, type GameRenderContext } from '@luca-game/engine'
import {
  type Board, type SlidingMove, isAdjacent, rcToIdx,
  correctTiles, manhattanDistance, toRows,
} from './slidingBlocks'
import type { SlidingAction, SlidingStats } from './slidingBlocksDefinition'
import { slidingBlocksDefinition } from './slidingBlocksDefinition'
import './slidingBlocks.css'

const ONBOARD_KEY = 'luca:onboarded:sliding_blocks'

function renderSliding(
  state: Board,
  ctx: GameRenderContext<Board, SlidingAction, SlidingStats>,
) {
  return <SlidingBoard state={state} ctx={ctx} />
}

const slidingFullDefinition = {
  ...slidingBlocksDefinition,
  render: renderSliding,
}

export default function SlidingBlocks() {
  return <GameEngine definition={slidingFullDefinition} className="sliding-blocks" />
}

function SlidingBoard({
  state, ctx,
}: {
  state: Board
  ctx: GameRenderContext<Board, SlidingAction, SlidingStats>
}) {
  const { t } = useTranslation()
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  // Onboarding
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(ONBOARD_KEY) !== '1'
    } catch {
      return true
    }
  })

  useEffect(() => {
    if (state.moves > 0 && showOnboard) {
      setShowOnboard(false)
      try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
    }
  }, [state.moves, showOnboard])

  const handleTileClick = (idx: number) => {
    if (!ctx.interactive) return
    if (!isAdjacent(idx, state.emptyIdx, state.size)) return
    const r = Math.floor(idx / state.size)
    const c = idx % state.size
    ctx.dispatch({ type: 'SLIDE', payload: { r, c } })
  }

  const total = state.size * state.size
  const correct = correctTiles(state)
  const distance = manhattanDistance(state)
  const progPct = Math.round((correct / total) * 100)

  return (
    <div className="sliding-board-wrap">
      {showOnboard && (
        <div className="sliding-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
        }}>
          <div className="sliding-onboard-inner">
            <strong>{t('games.sliding_blocks.name', 'Sliding Blocks')}</strong>
            <p>{t('games.sliding_blocks.onboard', 'Tap a tile next to the empty space to slide it. Arrange the numbers in order.')}</p>
            <button>{t('common.got_it', 'Got it')}</button>
          </div>
        </div>
      )}

      <div className="sliding-status">
        <div className="sliding-progress">
          <div className="sliding-progress-bar">
            <div className="sliding-progress-fill" style={{ width: `${progPct}%` }} />
          </div>
          <div className="sliding-progress-text">
            {correct} / {total} tiles correct · {distance} {distance === 1 ? 'move' : 'moves'} to go · {state.moves} total
          </div>
        </div>
      </div>

      <div
        className="sliding-board"
        style={{
          gridTemplateColumns: `repeat(${state.size}, 1fr)`,
          gridTemplateRows: `repeat(${state.size}, 1fr)`,
        }}
      >
        {state.cells.map((tile, idx) => {
          if (tile === 0) {
            return <div key={idx} className="sliding-empty" />
          }
          const isSlidable = isAdjacent(idx, state.emptyIdx, state.size)
          const isHover = hoverIdx === idx
          // Goal position: the tile's "home" cell.
          const goalIdx = tile - 1
          const isHome = idx === goalIdx
          return (
            <button
              key={idx}
              className={`sliding-tile ${isSlidable ? 'slidable' : 'locked'} ${isHover ? 'hover' : ''} ${isHome ? 'home' : ''}`}
              onClick={() => handleTileClick(idx)}
              onMouseEnter={() => isSlidable && setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
              disabled={!ctx.interactive || !isSlidable}
              aria-label={`Tile ${tile}${isSlidable ? ' (can move)' : ''}`}
            >
              {tile}
            </button>
          )
        })}
      </div>

      <div className="sliding-controls">
        <label>
          {t('games.sliding_blocks.size', 'Size')}: {' '}
          <select
            value={state.size}
            onChange={e => ctx.dispatch({ type: 'SET_SIZE', payload: { size: Number(e.target.value) as 3 | 4 | 5 } })}
            disabled={!ctx.interactive}
          >
            <option value={3}>3 × 3 (easy)</option>
            <option value={4}>4 × 4 (medium)</option>
            <option value={5}>5 × 5 (hard)</option>
          </select>
        </label>
        <button
          onClick={() => ctx.dispatch({ type: 'RESTART' })}
          disabled={!ctx.interactive}
        >
          {t('common.shuffle', 'Shuffle')}
        </button>
      </div>
    </div>
  )
}