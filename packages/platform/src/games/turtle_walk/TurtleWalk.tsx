// Turtle Walk — game renderer.
//
// A series of movement commands (Forward, Left, Right) are given.
// The player predicts where the turtle ends up by entering the
// final (x, y) and direction. Game shows: starting position,
// command sequence, then x/y/direction input controls.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GameEngine, type GameRenderContext } from '@luca-game/engine'
import {
  type TurtleState, type Direction, type Position, type Command,
  newPuzzle, predict, isSolved, isLoss, executeCommands, COMMANDS,
} from './turtleWalk'
import type { TurtleAction, TurtleStats } from './turtleWalkDefinition'
import { turtleWalkDefinition } from './turtleWalkDefinition'
import './turtle_walk.css'

function renderTurtle(
  state: TurtleState,
  ctx: GameRenderContext<TurtleState, TurtleAction, TurtleStats>,
) {
  return <TurtleBoard state={state} ctx={ctx} />
}

const turtleFullDefinition = {
  ...turtleWalkDefinition,
  render: renderTurtle,
}

const ONBOARD_KEY = 'luca:onboarded:turtle_walk'
const DIR_LABELS: Record<Direction, string> = { 0: 'N', 1: 'E', 2: 'S', 3: 'W' }
const DIR_SYMBOLS: Record<Direction, string> = { 0: '↑', 1: '→', 2: '↓', 3: '←' }
const CMD_SYMBOLS: Record<Command, string> = { F: '↑', L: '↰', R: '↱' }

export default function TurtleWalk() {
  return <GameEngine definition={turtleFullDefinition} className="turtle-walk" />
}

function TurtleBoard({
  state, ctx,
}: {
  state: TurtleState
  ctx: GameRenderContext<TurtleState, TurtleAction, TurtleStats>
}) {
  const { t } = useTranslation()
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return window.localStorage.getItem(ONBOARD_KEY) !== '1' }
    catch { return true }
  })
  const [predX, setPredX] = useState(0)
  const [predY, setPredY] = useState(0)
  const [predDir, setPredDir] = useState<Direction>(0)

  useEffect(() => {
    if (state.moves > 0 && showOnboard) {
      setShowOnboard(false)
      try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
    }
  }, [state.moves, showOnboard])

  useEffect(() => {
    if (state.moves === 0) {
      setPredX(0)
      setPredY(0)
      setPredDir(0)
    }
  }, [state.moves])

  const isOver = isSolved(state) || isLoss(state)
  const interactive =  // (drop ctx.interactive so first click works)
  !isOver
  const expected = executeCommands(state.start, state.commands)
  const predicted = state.prediction

  const handleSubmit = () => {
    if (!interactive) return
    ctx.dispatch({ type: 'PREDICT', payload: { x: predX, y: predY, dir: predDir } })
  }

  return (
    <div className="tw-wrap">
      {showOnboard && (
        <div className="tw-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, '1') } catch {}
        }}>
          <div className="tw-onboard-inner">
            <strong>{t('games.turtle_walk.name', 'Turtle Walk')}</strong>
            <p>{t('games.turtle_walk.onboard', 'The turtle starts at (0, 0) facing N. Read the command list and predict where it ends up. F = forward, L = left turn, R = right turn.')}</p>
            <button>{t('common.got_it', 'Got it')}</button>
          </div>
        </div>
      )}

      <div className="tw-start">
        <span className="tw-label">{t('games.turtle_walk.start', 'Start:')}</span>
        <span className="tw-value">
          ({state.start.x}, {state.start.y}) facing {DIR_LABELS[state.start.dir]} {DIR_SYMBOLS[state.start.dir]}
        </span>
      </div>

      <div className="tw-commands">
        <div className="tw-commands-label">{t('games.turtle_walk.commands', 'Commands:')}</div>
        <div className="tw-command-list">
          {state.commands.map((c, i) => (
            <span key={i} className={`tw-cmd tw-cmd-${c}`}>
              <span className="tw-cmd-symbol">{CMD_SYMBOLS[c]}</span>
              <span className="tw-cmd-name">{c}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="tw-predict">
        <div className="tw-predict-label">{t('games.turtle_walk.predict', 'Predict the final position:')}</div>
        <div className="tw-predict-row">
          <label className="tw-field">
            <span>X</span>
            <input
              type="number"
              value={predX}
              onChange={e => setPredX(parseInt(e.target.value || '0'))}
              disabled={!interactive}
            />
          </label>
          <label className="tw-field">
            <span>Y</span>
            <input
              type="number"
              value={predY}
              onChange={e => setPredY(parseInt(e.target.value || '0'))}
              disabled={!interactive}
            />
          </label>
          <label className="tw-field">
            <span>Dir</span>
            <select
              value={predDir}
              onChange={e => setPredDir(parseInt(e.target.value) as Direction)}
              disabled={!interactive}
            >
              {([0, 1, 2, 3] as Direction[]).map(d => (
                <option key={d} value={d}>{DIR_LABELS[d]} {DIR_SYMBOLS[d]}</option>
              ))}
            </select>
          </label>
          <button
            className="tw-submit"
            onClick={handleSubmit}
            disabled={!interactive}
          >
            {t('games.turtle_walk.submit', 'Submit')}
          </button>
        </div>
      </div>

      {predicted && (
        <div className={`tw-result ${isSolved(state) ? 'won' : isLoss(state) ? 'lost' : 'pending'}`}>
          {isSolved(state) ? (
            <>
              <div className="tw-result-title">🎉 {t('games.turtle_walk.correct', 'Correct!')}</div>
              <div className="tw-result-msg">
                {t('games.turtle_walk.correct_msg', `The turtle ended at (${expected.x}, ${expected.y}) facing ${DIR_LABELS[expected.dir]}.`)}
              </div>
            </>
          ) : (
            <>
              <div className="tw-result-title">❌ {t('games.turtle_walk.wrong', 'Wrong')}</div>
              <div className="tw-result-msg">
                {t('games.turtle_walk.wrong_msg', `Expected: (${expected.x}, ${expected.y}) facing ${DIR_LABELS[expected.dir]}. You predicted: (${predicted.x}, ${predicted.y}) facing ${DIR_LABELS[predicted.dir]}.`)}
              </div>
            </>
          )}
          <button onClick={ctx.restart}>{t('common.play_again', 'Try another')}</button>
        </div>
      )}
    </div>
  )
}