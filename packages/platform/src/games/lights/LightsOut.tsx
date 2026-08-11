// Lights Out — game renderer (uses GameEngine).

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GameEngine, type GameRenderContext } from '@luca-game/engine'
import type { Board } from './lights'
import { countOn, difficulty as rateDifficulty } from './lights'
import type { LightsAction, LightsStats } from './lightsDefinition'
import { lightsDefinition } from './lightsDefinition'
import './lights.css'

const ONBOARD_KEY = 'luca:onboarded:lights'

function renderLights(
  state: Board,
  ctx: GameRenderContext<Board, LightsAction, LightsStats>,
) {
  return <LightsBoard state={state} ctx={ctx} />
}

const lightsFullDefinition = {
  ...lightsDefinition,
  render: renderLights,
}

export default function LightsOut() {
  return <GameEngine definition={lightsFullDefinition} className="lights" />
}

function LightsBoard({
  state, ctx,
}: {
  state: Board
  ctx: GameRenderContext<Board, LightsAction, LightsStats>
}) {
  const { t } = useTranslation()
  const on = countOn(state)
  const diff = rateDifficulty(on)

  // Onboarding visibility — only show on first visit
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(ONBOARD_KEY) !== '1'
    } catch {
      return true
    }
  })

  const dismissOnboard = () => {
    setShowOnboard(false)
    try {
      window.localStorage.setItem(ONBOARD_KEY, '1')
    } catch {
      // ignore
    }
  }

  // Auto-hide onboard on first move
  useEffect(() => {
    const hasAnyClick = state.some(row => row.some(v => v === false))
    // "All on" is the initial state; once any cell is off, the user has clicked
    if (hasAnyClick) setShowOnboard(false)
  }, [state])

  return (
    <>
      {showOnboard && (
        <div className="lights-onboard" role="region" aria-label="How to play Lights Out">
          <div className="lights-onboard-icon" aria-hidden="true">?</div>
          <div className="lights-onboard-body">
            <h3 className="lights-onboard-title">
              {t('games.lights.onboard_title', 'How to play Lights Out')}
            </h3>
            <p className="lights-onboard-text">
              {t(
                'games.lights.onboard_intro',
                'Click any cell to toggle it and its neighbors. Turn all the lights off to win.',
              )}
            </p>
            <ul className="lights-onboard-rules">
              <li>
                {t(
                  'games.lights.onboard_rule_1',
                  'Clicking a cell flips it (on↔off) plus the 4 cells directly above, below, left, and right.',
                )}
              </li>
              <li>
                {t(
                  'games.lights.onboard_rule_2',
                  'Each puzzle is solvable — every starting board can be turned off.',
                )}
              </li>
              <li>
                {t(
                  'games.lights.onboard_rule_3',
                  'Fewer moves = better score. Press R for a new puzzle.',
                )}
              </li>
            </ul>
            <div className="lights-onboard-actions">
              <button
                type="button"
                className="cb-btn cb-btn-md cb-btn-primary"
                onClick={dismissOnboard}
              >
                {t('games.lights.onboard_got_it', 'Got it — start playing')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="lights-diff-inline">
        {t(`games.difficulty.${diff}`, diff)}
      </div>
      <div className="lights-grid" role="application" aria-label="Lights Out board">
        {state.map((row, r) =>
          row.map((value, c) => (
            <CellButton
              key={`${r}-${c}`}
              value={value}
              r={r}
              c={c}
              onClick={(rr, cc) => ctx.dispatch({ type: 'CLICK', payload: { r: rr, c: cc } })}
            />
          )),
        )}
      </div>
    </>
  )
}

function CellButton({
  value, r, c, onClick,
}: {
  value: boolean; r: number; c: number; onClick: (r: number, c: number) => void
}) {
  return (
    <button
      type="button"
      className={`lights-cell ${value ? 'lights-cell-on' : 'lights-cell-off'}`}
      onClick={() => onClick(r, c)}
      aria-label={`Cell row ${r + 1} column ${c + 1} ${value ? 'on' : 'off'}`}
    >
      {value ? '●' : ''}
    </button>
  )
}