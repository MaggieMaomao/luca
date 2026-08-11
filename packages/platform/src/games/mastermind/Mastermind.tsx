// Mastermind — game renderer.
//
// The computer picks a secret code of N colored pegs. The player
// has 10 attempts to guess it. After each guess, the system gives
// feedback: black pegs = correct color in correct position; white
// pegs = correct color in wrong position.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GameEngine, type GameRenderContext } from '@luca-game/engine'
import {
  type MastermindState, type Code, type Color, type Feedback,
  COLORS, CODE_LENGTH, MAX_GUESSES,
  newGame, isSolved, isLoss,
  scoreGuess,
} from './mastermind'
import type { MastermindAction, MastermindStats } from './mastermindDefinition'
import { mastermindDefinition } from './mastermindDefinition'
import './mastermind.css'

function renderMastermind(
  state: MastermindState,
  ctx: GameRenderContext<MastermindState, MastermindAction, MastermindStats>,
) {
  return <MastermindBoard state={state} ctx={ctx} />
}

const mastermindFullDefinition = {
  ...mastermindDefinition,
  render: renderMastermind,
}

const ONBOARD_KEY = 'luca:onboarded:mastermind'

const COLOR_HEX: Record<Color, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e',
  yellow: '#eab308', orange: '#f97316', purple: '#a855f7',
}

export default function Mastermind() {
  return <GameEngine definition={mastermindFullDefinition} className="mastermind" />
}

function MastermindBoard({
  state, ctx,
}: {
  state: MastermindState
  ctx: GameRenderContext<MastermindState, MastermindAction, MastermindStats>
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

  const isOver = isSolved(state) || isLoss(state)
  const interactive =  // (drop ctx.interactive so first click works)
  !isOver

  const handlePegClick = (slotIdx: number) => {
    if (!interactive) return
    // Cycle through colors
    const current = state.currentGuess[slotIdx]
    const currentIdx = current ? COLORS.indexOf(current) : -1
    const next = COLORS[(currentIdx + 1) % COLORS.length]
    const newGuess: Code = [...state.currentGuess]
    newGuess[slotIdx] = next
    ctx.dispatch({ type: 'SET_SLOT', payload: { idx: slotIdx, color: next } })
  }

  const handleSubmit = () => {
    if (!interactive) return
    if (state.currentGuess.some(c => c === null)) return
    ctx.dispatch({ type: 'GUESS' })
  }

  const handleClear = () => {
    if (!interactive) return
    ctx.dispatch({ type: 'CLEAR' })
  }

  return (
    <div className="mm-wrap">
      {showOnboard && (
        <div className="mm-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
        }}>
          <div className="mm-onboard-inner">
            <strong>{t('games.mastermind.name', 'Mastermind')}</strong>
            <p>{t('games.mastermind.onboard', `Crack the ${CODE_LENGTH}-peg code in ${MAX_GUESSES} tries. Click a slot to cycle through colors, then submit. Black = right color right place, white = right color wrong place.`)}</p>
            <button>{t('common.got_it', 'Got it')}</button>
          </div>
        </div>
      )}

      <div className="mm-palette">
        {COLORS.map(c => (
          <div
            key={c}
            className="mm-palette-peg"
            style={{ background: COLOR_HEX[c] }}
            title={c}
          />
        ))}
      </div>

      <div className="mm-current">
        <div className="mm-current-label">{t('games.mastermind.current', 'Current guess:')}</div>
        <div className="mm-slots">
          {Array.from({ length: CODE_LENGTH }, (_, i) => {
            const color = state.currentGuess[i]
            return (
              <button
                key={i}
                className={`mm-slot ${color ? 'filled' : ''}`}
                onClick={() => handlePegClick(i)}
                disabled={!interactive}
                aria-label={`Slot ${i + 1}${color ? `: ${color}` : ' (empty)'}`}
              >
                {color && (
                  <div
                    className="mm-peg"
                    style={{ background: COLOR_HEX[color] }}
                  />
                )}
              </button>
            )
          })}
        </div>
        <div className="mm-current-actions">
          <button
            className="mm-btn mm-btn-secondary"
            onClick={handleClear}
            disabled={!interactive}
          >
            {t('common.clear', 'Clear')}
          </button>
          <button
            className="mm-btn mm-btn-primary"
            onClick={handleSubmit}
            disabled={!interactive || state.currentGuess.some(c => c === null)}
          >
            {t('games.mastermind.submit', 'Submit')}
          </button>
        </div>
      </div>

      <div className="mm-history">
        <div className="mm-history-label">{t('games.mastermind.history', 'Previous guesses:')}</div>
        {state.history.length === 0 ? (
          <div className="mm-history-empty">—</div>
        ) : (
          <div className="mm-history-list">
            {state.history.map((h, i) => (
              <HistoryRow key={i} guess={h.guess} feedback={h.feedback} />
            ))}
          </div>
        )}
      </div>

      {isOver && (
        <div className={`mm-result ${isSolved(state) ? 'won' : 'lost'}`}>
          <div className="mm-result-title">
            {isSolved(state)
              ? '🎉 ' + t('games.mastermind.won', 'You cracked it!')
              : '😔 ' + t('games.mastermind.lost', 'Out of tries.')}
          </div>
          <div className="mm-secret">
            <span className="mm-secret-label">{t('games.mastermind.was', 'The code was:')}</span>
            <div className="mm-secret-pegs">
              {state.secret.map((c, i) => (
                <div
                  key={i}
                  className="mm-peg"
                  style={{ background: COLOR_HEX[c] }}
                />
              ))}
            </div>
          </div>
          <button onClick={ctx.restart}>{t('common.play_again', 'Play again')}</button>
        </div>
      )}
    </div>
  )
}

function HistoryRow({ guess, feedback }: { guess: Code; feedback: Feedback }) {
  return (
    <div className="mm-history-row">
      <div className="mm-history-pegs">
        {guess.map((c, i) => (
          <div
            key={i}
            className="mm-peg"
            style={{ background: COLOR_HEX[c] }}
          />
        ))}
      </div>
      <div className="mm-history-feedback">
        {Array.from({ length: feedback.black }, (_, i) => (
          <span key={`b${i}`} className="mm-feedback mm-feedback-black" />
        ))}
        {Array.from({ length: feedback.white }, (_, i) => (
          <span key={`w${i}`} className="mm-feedback mm-feedback-white" />
        ))}
        {Array.from({ length: CODE_LENGTH - feedback.black - feedback.white }, (_, i) => (
          <span key={`e${i}`} className="mm-feedback mm-feedback-empty" />
        ))}
      </div>
    </div>
  )
}