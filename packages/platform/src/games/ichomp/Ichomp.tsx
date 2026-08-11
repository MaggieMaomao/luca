// iChomp — game renderer.
//
// A ROWS×COLS grid (both adjustable). Click a cell to "eat" it and all
// cells below & to the right. The top-left cell is poison — you and the
// AI alternate, and whoever is forced to eat the poison loses.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GameEngine, type GameRenderContext } from '@luca-game/engine'
import {
  type IchompState,
  isLegal, isWin, isLoss, isGameOver, remainingCount,
} from './ichomp'
import type { IchompAction, IchompStats } from './ichompDefinition'
import { ichompDefinition } from './ichompDefinition'
import './ichomp.css'

function renderIchomp(
  state: IchompState,
  ctx: GameRenderContext<IchompState, IchompAction, IchompStats>,
) {
  return <IchompBoard state={state} ctx={ctx} />
}

const ichompFullDefinition = {
  ...ichompDefinition,
  render: renderIchomp,
}

const ONBOARD_KEY = 'luca:onboarded:ichomp'

export default function Ichomp() {
  return <GameEngine definition={ichompFullDefinition} className="ichomp" />
}

function IchompBoard({
  state, ctx,
}: {
  state: IchompState
  ctx: GameRenderContext<IchompState, IchompAction, IchompStats>
}) {
  const { t } = useTranslation()
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

  const isOver = isGameOver(state)
  // Don't gate on ctx.interactive — engine starts in 'idle' and
  // transitions to 'playing' on the first dispatch. We want the
  // first click to be valid. Only the player's turn is interactive.
  const interactive = !isOver && state.turn === 'player'

  const handleClick = (r: number, c: number) => {
    if (!interactive) return
    if (!isLegal(state, r, c)) return
    ctx.dispatch({ type: 'CHOMP', payload: { r, c } })
  }

  return (
    <div className="ich-wrap">
      {showOnboard && (
        <div className="ich-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
        }}>
          <div className="ich-onboard-inner">
            <strong>{t('games.ichomp.name', 'iChomp')}</strong>
            <p>{t('games.ichomp.onboard', 'Chomp vs the device. Click a cell to eat it and everything below & to the right. The top-left ☠ is poison — you and the AI take turns, and whoever is forced to eat it loses. You go first.')}</p>
            <button>{t('common.got_it', 'Got it')}</button>
          </div>
        </div>
      )}

      <div className="ich-size">
        <label className="ich-size-field">
          <span>{t('games.ichomp.rows', 'Rows')}</span>
          <select
            value={state.rows}
            onChange={(e) => ctx.dispatch({ type: 'NEW', payload: { rows: Number(e.target.value), cols: state.cols } })}
          >
            {[3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <span className="ich-size-x">×</span>
        <label className="ich-size-field">
          <span>{t('games.ichomp.cols', 'Columns')}</span>
          <select
            value={state.cols}
            onChange={(e) => ctx.dispatch({ type: 'NEW', payload: { rows: state.rows, cols: Number(e.target.value) } })}
          >
            {[3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <div className="ich-info">
        <span className="ich-label">{t('games.ichomp.remaining', 'Cells left:')}</span>
        <span className="ich-value">{remainingCount(state)}</span>
        <span className="ich-spacer" />
        <span className="ich-turn">
          {isOver ? '' : state.turn === 'player' ? t('games.ichomp.your_turn', 'Your turn') : t('games.ichomp.ai_turn', 'AI…')}
        </span>
      </div>

      <div
        className="ich-grid"
        style={{ gridTemplateColumns: `repeat(${state.cols}, 1fr)` }}
      >
        {state.grid.map((row, r) =>
          row.map((present, c) => {
            const isPoison = r === 0 && c === 0
            return (
              <button
                key={`${r},${c}`}
                className={`ich-cell ${present ? 'present' : 'eaten'} ${isPoison ? 'poison' : ''} ${isOver ? 'disabled' : ''}`}
                onClick={() => handleClick(r, c)}
                disabled={!interactive || !present}
                aria-label={`Row ${r + 1} column ${c + 1}${isPoison ? ' (poison)' : ''}${present ? '' : ' (eaten)'}`}
              >
                {isPoison ? '☠' : present ? '' : ''}
              </button>
            )
          })
        )}
      </div>

      {isOver && (
        <div className={`ich-result ${isWin(state) ? 'won' : 'lost'}`}>
          <div className="ich-result-title">
            {isWin(state)
              ? '🏆 ' + t('games.ichomp.won', 'You won!')
              : '☠ ' + t('games.ichomp.lost', 'You ate the poison!')}
          </div>
          <div className="ich-result-msg">
            {isWin(state)
              ? t('games.ichomp.won_msg', 'You forced the AI to take the poison.')
              : t('games.ichomp.lost_msg', 'Avoid the top-left!')}
          </div>
          <button onClick={ctx.restart}>{t('common.play_again', 'Play again')}</button>
        </div>
      )}
    </div>
  )
}