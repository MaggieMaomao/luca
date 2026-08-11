// Hoops controls — the topbar (mode toggle + time-attack timer) and the shooting
// spot selector. Rendered above the stage (the engine's Controls slot); its
// buttons dispatch non-gesture intents. Ported from the original HoopsPage.

import { useTranslation } from 'react-i18next'
import type { ControlsProps } from '@luca-game/engine/action'
import { SPOTS, type HoopsState, type HoopsIntent } from './hoopsSim'

export function HoopsControls({ state, dispatch }: ControlsProps<HoopsState, HoopsIntent>) {
  const { t } = useTranslation()
  const seconds = Math.ceil(state.timeLeftMs / 1000)

  return (
    <>
      <div className="hoops-topbar">
        <h1 className="hoops-title">{t('hoops.title', 'Hoops')}</h1>
        {state.mode === 'timeattack' && state.status !== 'over' && (
          <span className={`hoops-timer ${seconds <= 10 ? 'low' : ''}`}>⏱ {seconds}s</span>
        )}
        <button
          className={`cb-btn cb-btn-sm ${state.mode === 'practice' ? 'cb-btn-primary' : 'cb-btn-secondary'}`}
          onClick={() => dispatch({ kind: 'practice' })}
        >
          {t('hoops.practice', 'Practice')}
        </button>
        <button
          className={`cb-btn cb-btn-sm ${state.mode === 'timeattack' ? 'cb-btn-primary' : 'cb-btn-secondary'}`}
          onClick={() => dispatch({ kind: 'timeattack' })}
        >
          {t('hoops.timeAttack', 'Time Attack')}
        </button>
      </div>

      <div className="hoops-spots">
        {SPOTS.map(s => (
          <button
            key={s.id}
            className={`hoops-spot ${state.spot.id === s.id ? 'active' : ''}`}
            onClick={() => dispatch({ kind: 'setSpot', spot: s })}
          >
            {t(`hoops.spot.${s.id}`, s.label)}
          </button>
        ))}
      </div>
    </>
  )
}
