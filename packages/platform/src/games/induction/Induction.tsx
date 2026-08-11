// Induction — game renderer.
//
// The player sees a numeric sequence and picks the next number
// from 4 multiple-choice options. Wrong answer = strike; 3 strikes
// and the game is lost. Correct first-try = +100, second = +50,
// third = +25.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GameEngine, type GameRenderContext } from '@luca-game/engine'
import {
  type InductionState, newState, attempt,
} from './induction'
import type { InductionAction, InductionStats } from './inductionDefinition'
import { inductionDefinition } from './inductionDefinition'
import './induction.css'

function renderInduction(
  state: InductionState,
  ctx: GameRenderContext<InductionState, InductionAction, InductionStats>,
) {
  return <InductionBoard state={state} ctx={ctx} />
}

const inductionFullDefinition = {
  ...inductionDefinition,
  render: renderInduction,
}

const ONBOARD_KEY = 'luca:onboarded:induction'
const MAX_ATTEMPTS = 3

export default function Induction() {
  return <GameEngine definition={inductionFullDefinition} className="induction" />
}

function InductionBoard({
  state, ctx,
}: {
  state: InductionState
  ctx: GameRenderContext<InductionState, InductionAction, InductionStats>
}) {
  const { t } = useTranslation()
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return window.localStorage.getItem(ONBOARD_KEY) !== '1' }
    catch { return true }
  })
  const [showHint, setShowHint] = useState(false)
  const [feedback, setFeedback] = useState<{ correct: boolean; value: number } | null>(null)

  useEffect(() => {
    if (state.moves > 0 && showOnboard) {
      setShowOnboard(false)
      try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
    }
  }, [state.moves, showOnboard])

  // Clear feedback on restart
  useEffect(() => {
    if (state.moves === 0) {
      setFeedback(null)
      setShowHint(false)
    }
  }, [state.moves])

  const isOver = state.solved || state.attempts >= MAX_ATTEMPTS
  const interactive =  // (drop ctx.interactive so first click works)
  !isOver
  const options = state.sequence.options ?? []
  const strikes = state.attempts

  const handleGuess = (value: number) => {
    if (!interactive) return
    const isCorrect = value === state.sequence.next
    setFeedback({ correct: isCorrect, value })
    setTimeout(() => {
      ctx.dispatch({ type: 'GUESS', payload: { value } })
      setFeedback(null)
    }, 700)
  }

  return (
    <div className="induction-wrap">
      {showOnboard && (
        <div className="induction-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
        }}>
          <div className="induction-onboard-inner">
            <strong>{t('games.induction.name', 'Induction')}</strong>
            <p>{t('games.induction.onboard', 'See a number sequence, figure out the pattern, click the next number. You have 3 attempts.')}</p>
            <button>{t('common.got_it', 'Got it')}</button>
          </div>
        </div>
      )}

      <div className="induction-strikes">
        {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
          <span key={i} className={`induction-strike ${i < strikes ? 'used' : ''}`}>
            {i < strikes ? '✕' : '○'}
          </span>
        ))}
      </div>

      <div className="induction-sequence">
        {state.sequence.terms.map((n, i) => (
          <span key={i} className="induction-term">
            {n}
            {i < state.sequence.terms.length - 1 && <span className="induction-comma">,</span>}
          </span>
        ))}
        <span className="induction-term induction-term-mystery">?</span>
      </div>

      <div className="induction-prompt">
        {t('games.induction.choose_next', 'Choose the next number:')}
      </div>

      <div className="induction-options">
        {options.map((opt, i) => {
          const isThisFeedback = feedback?.value === opt
          const isFeedbackCorrect = feedback?.correct && isThisFeedback
          const isFeedbackWrong = feedback && !feedback.correct && isThisFeedback
          return (
            <button
              key={i}
              className={`induction-option ${isFeedbackCorrect ? 'correct' : ''} ${isFeedbackWrong ? 'wrong' : ''}`}
              onClick={() => handleGuess(opt)}
              disabled={!interactive || feedback !== null}
            >
              {opt}
            </button>
          )
        })}
      </div>

      <div className="induction-hint-toggle">
        <button
          className="induction-hint-btn"
          onClick={() => setShowHint(!showHint)}
          disabled={!interactive}
        >
          {showHint
            ? t('games.induction.hide_hint', 'Hide hint')
            : t('games.induction.show_hint', '💡 Show hint')}
        </button>
        {showHint && (
          <div className="induction-hint-text">
            {state.sequence.hint}
          </div>
        )}
      </div>

      {isOver && (
        <div className={`induction-result ${state.solved ? 'won' : 'lost'}`}>
          <div className="induction-result-title">
            {state.solved
              ? `🎉 ${state.sequence.next}`
              : `😔 ${state.sequence.next}`}
          </div>
          <div className="induction-result-msg">
            {state.solved
              ? t('games.induction.correct_msg', 'Correct! Well done.')
              : t('games.induction.wrong_msg', 'Out of attempts. The answer was:')}
          </div>
          <div className="induction-result-rule">
            {state.sequence.hint}
          </div>
          <button onClick={ctx.restart}>
            {t('common.play_again', 'Play again')}
          </button>
        </div>
      )}
    </div>
  )
}