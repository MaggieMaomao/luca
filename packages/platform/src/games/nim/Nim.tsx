// Nim — game renderer.
//
// Three piles of stones. Each turn, the player removes any positive
// number of stones from one pile. The player who takes the LAST stone
// wins. (Misère variant: loses.) The computer plays randomly.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GameEngine, type GameRenderContext } from '@luca-game/engine'
import {
  type NimState, type NimMove,
  newNimGame, isGameOver, playerWon, optimalMove, isValidMove,
} from './nim'
import type { NimAction, NimStats } from './nimDefinition'
import { nimDefinition } from './nimDefinition'
import './nim.css'

function renderNim(
  state: NimState,
  ctx: GameRenderContext<NimState, NimAction, NimStats>,
) {
  return <NimBoard state={state} ctx={ctx} />
}

const nimFullDefinition = {
  ...nimDefinition,
  render: renderNim,
}

const ONBOARD_KEY = 'luca:onboarded:nim'

export default function Nim() {
  return <GameEngine definition={nimFullDefinition} className="nim" />
}

const PILE_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#a855f7']

function NimBoard({
  state, ctx,
}: {
  state: NimState
  ctx: GameRenderContext<NimState, NimAction, NimStats>
}) {
  const { t } = useTranslation()
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return window.localStorage.getItem(ONBOARD_KEY) !== '1' }
    catch { return true }
  })
  const [selectedPile, setSelectedPile] = useState<number | null>(null)
  const [inputCount, setInputCount] = useState(1)

  useEffect(() => {
    if (state.moves > 0 && showOnboard) {
      setShowOnboard(false)
      try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
    }
  }, [state.moves, showOnboard])

  // Reset selection when game restarts
  useEffect(() => {
    if (state.moves === 0) {
      setSelectedPile(null)
      setInputCount(1)
    }
  }, [state.moves])

  const isOver = isGameOver(state)
  const won = playerWon(state)
  const interactive =  // (drop ctx.interactive so first click works)
  !isOver

  const handlePileClick = (pileIdx: number) => {
    if (!interactive) return
    if (selectedPile === pileIdx) {
      setSelectedPile(null)
      return
    }
    setSelectedPile(pileIdx)
    setInputCount(Math.min(inputCount, state.piles[pileIdx]))
  }

  const handleTake = (count: number) => {
    if (selectedPile === null) return
    if (!isValidMove(state, { pile: selectedPile, count })) return
    ctx.dispatch({ type: 'MOVE', payload: { pile: selectedPile, count } })
    setSelectedPile(null)
    setInputCount(1)
  }

  const handleHint = () => {
    if (!interactive) return
    const hint = optimalMove(state)
    if (hint) setSelectedPile(hint.pile)
  }

  return (
    <div className="nim-wrap">
      {showOnboard && (
        <div className="nim-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
        }}>
          <div className="nim-onboard-inner">
            <strong>{t('games.nim.name', 'Nim')}</strong>
            <p>{t('games.nim.onboard', 'Three piles of stones. Each turn, remove any positive number of stones from one pile. The player who takes the last stone wins.')}</p>
            <button>{t('common.got_it', 'Got it')}</button>
          </div>
        </div>
      )}

      <div className="nim-piles">
        {state.piles.map((count, i) => {
          const isSelected = selectedPile === i
          const isEmpty = count === 0
          return (
            <button
              key={i}
              className={`nim-pile ${isSelected ? 'selected' : ''} ${isEmpty ? 'empty' : ''}`}
              onClick={() => handlePileClick(i)}
              disabled={!interactive || isEmpty}
              aria-label={`Pile ${i + 1} with ${count} stones`}
            >
              <div className="nim-pile-label">Pile {i + 1}</div>
              <div className="nim-pile-stones">
                {Array.from({ length: count }, (_, j) => (
                  <div
                    key={j}
                    className="nim-stone"
                    style={{ background: PILE_COLORS[i % PILE_COLORS.length] }}
                  />
                ))}
                {isEmpty && <div className="nim-pile-empty">—</div>}
              </div>
            </button>
          )
        })}
      </div>

      {selectedPile !== null && state.piles[selectedPile] > 0 && (
        <div className="nim-take">
          <div className="nim-take-label">
            {t('games.nim.take_n_from', `Take how many from pile ${selectedPile + 1}?`)}
          </div>
          <div className="nim-take-buttons">
            {Array.from({ length: state.piles[selectedPile] }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                className={`nim-take-btn ${inputCount === n ? 'selected' : ''}`}
                onClick={() => handleTake(n)}
                disabled={!interactive}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="nim-actions">
        <button
          className="nim-btn nim-btn-secondary"
          onClick={handleHint}
          disabled={!interactive}
        >
          💡 {t('games.nim.hint', 'Hint')}
        </button>
      </div>

      {isOver && (
        <div className={`nim-result ${won ? 'won' : 'lost'}`}>
          <div className="nim-result-title">
            {won ? '🏆 ' + t('games.nim.you_won', 'You won!') : '😢 ' + t('games.nim.you_lost', 'You lost.')}
          </div>
          <div className="nim-result-msg">
            {won
              ? t('games.nim.won_msg', 'You took the last stone.')
              : t('games.nim.lost_msg', 'The computer took the last stone.')}
          </div>
          <button onClick={ctx.restart}>{t('common.play_again', 'Play again')}</button>
        </div>
      )}
    </div>
  )
}