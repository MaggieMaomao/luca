// BombDefuser — game renderer (uses GameEngine).
//
// Visual: 4 colored wires in a row, a big timer counting down, and
// a clue text at the top. Click a wire to cut it. Cut the right
// wire = defuse. Cut the wrong one = explode. Timer hits 0 = explode.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { GameEngine, type GameRenderContext } from '@luca-game/engine'
import {
  type BombState, type Wire, WIRES, newGame, isSolved, isLoss,
  getClue, cut as cutWire,
} from './bombDefuser'
import type { BombAction, BombStats } from './bombDefuserDefinition'
import { bombDefuserDefinition } from './bombDefuserDefinition'
import './bombDefuser.css'

const ONBOARD_KEY = 'luca:onboarded:bomb_defuser'

const WIRE_COLORS: Record<Wire, string> = {
  red:    '#ef4444',
  blue:   '#3b82f6',
  green:  '#22c55e',
  yellow: '#eab308',
}

function renderBomb(
  state: BombState,
  ctx: GameRenderContext<BombState, BombAction, BombStats>,
) {
  return <BombBoard state={state} ctx={ctx} />
}

const bombFullDefinition = {
  ...bombDefuserDefinition,
  render: renderBomb,
}

export default function BombDefuser() {
  return <GameEngine definition={bombFullDefinition} className="bomb-defuser" />
}

function BombBoard({
  state, ctx,
}: {
  state: BombState
  ctx: GameRenderContext<BombState, BombAction, BombStats>
}) {
  const { t } = useTranslation()
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return window.localStorage.getItem(ONBOARD_KEY) !== '1' }
    catch { return true }
  })

  // Onboarding dismiss
  useEffect(() => {
    if (state.moves > 0 && showOnboard) {
      setShowOnboard(false)
      try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
    }
  }, [state.moves, showOnboard])

  // Timer — tick every second. The engine's TICK action decrements
  // state.timeRemaining by 1, which the engine re-renders.
  // We use a ref for the interval ID so React StrictMode (which
  // double-invokes effects in dev) doesn't accidentally run two
  // timers at once.
  //
  // We deliberately omit `state.timeRemaining` from the dep array
  // so the effect doesn't reset every tick. The interval is only
  // started/stopped when the game ends (exploded/defused) or
  // restarts (state.moves drops back to 0).
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    // Always clear any existing timer first (idempotent)
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (state.exploded || state.defused) return
    if (state.timeRemaining <= 0) return
    timerRef.current = setInterval(() => {
      ctx.dispatch({ type: 'TICK' })
    }, 1000)
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.exploded, state.defused, ctx])

  const handleCut = useCallback((wire: Wire) => {
    if (state.exploded || state.defused) return
    if (state.cut.includes(wire)) return
    ctx.dispatch({ type: 'CUT', payload: { wire } })
  }, [ctx, state.exploded, state.defused, state.cut])

  // Use the engine's built-in restart (not dispatching RESTART) so
  // the lifecycle status is also reset from won/lost back to idle.
  // Dispatching RESTART alone only resets state + stats, leaving the
  // status as 'lost' or 'won' — so the engine's loss/win banner
  // would stay visible.
  const handleRestart = useCallback(() => {
    ctx.restart()
  }, [ctx])

  const clue = getClue(state.correctWire)
  const isOver = state.exploded || state.defused

  return (
    <div className="bomb-wrap">
      {showOnboard && (
        <div className="bomb-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
        }}>
          <div className="bomb-onboard-inner">
            <strong>{t('games.bomb_defuser.name', 'Bomb Defuser')}</strong>
            <p>{t('games.bomb_defuser.onboard', 'Read the clue, find the matching color wire, click it to cut. One wrong cut = boom. You have 60 seconds.')}</p>
            <button>{t('common.got_it', 'Got it')}</button>
          </div>
        </div>
      )}

      <div className="bomb-header">
        <div className="bomb-timer" data-low={state.timeRemaining <= 10 ? 'low' : 'ok'}>
          <div className="bomb-timer-label">{t('games.bomb_defuser.time_left', 'Time left')}</div>
          <div className="bomb-timer-value">{Math.ceil(state.timeRemaining)}s</div>
        </div>
        <div className="bomb-clue">
          <div className="bomb-clue-label">{t('games.bomb_defuser.clue', 'Clue')}</div>
          <div className="bomb-clue-text">"{clue}"</div>
        </div>
      </div>

      <div className="bomb-stage">
        <div className="bomb-device">
          <div className="bomb-led" data-state={state.exploded ? 'exploded' : state.defused ? 'defused' : 'armed'} />
          <div className="bomb-body">
            <div className="bomb-wires">
              {WIRES.map(wire => {
                const isCut = state.cut.includes(wire)
                const isClickable = !isOver && !isCut
                return (
                  <button
                    key={wire}
                    className={`bomb-wire ${isCut ? 'cut' : ''} ${isOver ? 'disabled' : ''}`}
                    onClick={() => handleCut(wire)}
                    disabled={!isClickable}
                    aria-label={`Wire ${wire}${isCut ? ' (cut)' : ''}`}
                  >
                    <div
                      className="bomb-wire-cable"
                      style={{ background: WIRE_COLORS[wire] }}
                    />
                    <div className="bomb-wire-label">{wire.toUpperCase()}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* No restart button here — the engine's header has one, and
        the result overlay has Try Again / Play Again. Adding a third
        would just be confusing. */}

      {state.exploded && (
        <div className="bomb-result exploded">
          <div className="bomb-result-title">💥 BOOM</div>
          <div className="bomb-result-msg">
            {t('games.bomb_defuser.exploded_msg', 'The bomb exploded. Try again — read the clue more carefully.')}
          </div>
          <button onClick={handleRestart}>{t('common.try_again', 'Try again')}</button>
        </div>
      )}
      {state.defused && (
        <div className="bomb-result defused">
          <div className="bomb-result-title">✅ DEFUSED</div>
          <div className="bomb-result-msg">
            {t('games.bomb_defuser.defused_msg', `You cut the ${state.correctWire} wire in time. Nice work.`)}
          </div>
          <button onClick={handleRestart}>{t('common.play_again', 'Play again')}</button>
        </div>
      )}
    </div>
  )
}