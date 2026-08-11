// Hoops HUD — stat line + live shot telemetry + streak + outcome flash + the
// time-attack game-over panel. Reads the engine session (score/combo/bests) and
// the game state (status/telemetry). Ported from the original hoops Hud.

import { useTranslation } from 'react-i18next'
import type { HudProps } from '@luca-game/engine/action'
import { accuracy } from '@luca-game/engine/action'
import { defaultShotParams } from './sim/shot'
import type { HoopsState, HoopsIntent } from './hoopsSim'

const OUTCOME_LABEL: Record<string, string> = {
  swish: '🏀 Swish! +3', make: '✓ Bucket! +2', rim: 'Rim', backboard: 'Off the glass', short: 'Short', airball: 'Airball',
}

export function HoopsHud({ state, session, bests, dispatch }: HudProps<HoopsState, HoopsIntent>) {
  const { t } = useTranslation()
  const ls = state.lastShot
  const showFlash = state.status === 'resolved' && session.lastOutcome
  const scored = session.lastOutcome === 'swish' || session.lastOutcome === 'make'
  const acc = accuracy(session)

  return (
    <>
      <div className="hoops-hud">
        <div className="hoops-hero">
          <span className="hoops-hero-label">{t('hoops.score', 'Score')}</span>
          <span className="hoops-hero-value">{session.score}</span>
        </div>
        <div className="hoops-substats">
          <Stat label={t('hoops.combo', 'Combo')} value={session.combo} />
          <Stat label={t('hoops.shots', 'Shots')} value={session.plays} />
          <Stat label={t('hoops.acc', 'Acc')} value={acc === null ? '—' : `${acc}%`} />
          <Stat label={t('hoops.best', 'Best')} value={bests.bestScore} />
        </div>
      </div>

      <div className="hoops-telemetry">
        <div className="tele-title">{t('hoops.lastShot', 'Last shot')}</div>
        <Meter label={t('hoops.strength', 'Strength')} display={ls ? `${ls.strengthPct}%` : '—'} fill={ls ? ls.strengthPct / 100 : 0} />
        <Meter label={t('hoops.angle', 'Angle')} display={ls ? `${ls.angleDeg}°` : '—'} fill={ls ? (ls.angleDeg - 30) / 40 : 0} />
        <Meter label={t('hoops.height', 'Height')} display={ls ? `${ls.apexM.toFixed(1)} m` : '—'} fill={ls ? (ls.apexM - 3) / 2.5 : 0} />
        <Meter label={t('hoops.aim', 'Aim')} display={ls ? aimText(ls.aimDeg, t) : '—'} fill={ls ? 0.5 + ls.aimDeg / (2 * defaultShotParams.maxYawDeg) : 0.5} centered />
      </div>

      {session.combo >= 3 && <div className="hoops-streak">🔥 {session.combo} {t('hoops.streak', 'in a row')}</div>}
      {showFlash && <div className={`hoops-flash ${scored ? 'scored' : 'missed'}`}>{OUTCOME_LABEL[session.lastOutcome as string] ?? ''}</div>}

      {state.status === 'over' && (
        <div className="hoops-over">
          <div className="hoops-over-title">⏱ {t('hoops.timeUp', "Time's up!")}</div>
          <div className="hoops-over-score">{t('hoops.finalScore', 'Score')}: <b>{session.score}</b></div>
          <div className="hoops-over-sub">{t('hoops.makes', 'Makes')} {session.wins}/{session.plays} · {t('hoops.best', 'Best')} {bests.bestScore}</div>
          <button className="cb-btn cb-btn-md cb-btn-primary" onClick={() => dispatch({ kind: 'timeattack' })}>{t('hoops.playAgain', 'Play again')}</button>
        </div>
      )}
    </>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <span className="hoops-stat"><span className="hoops-stat-label">{label}</span><span className="hoops-stat-value">{value}</span></span>
}

function Meter({ label, display, fill, centered }: { label: string; display: string; fill: number; centered?: boolean }) {
  const pct = Math.max(0, Math.min(100, fill * 100))
  return (
    <div className="tele-row">
      <span className="tele-label">{label}</span>
      <span className="tele-track">{centered ? <span className="tele-needle" style={{ left: `${pct}%` }} /> : <span className="tele-fill" style={{ width: `${pct}%` }} />}</span>
      <span className="tele-value">{display}</span>
    </div>
  )
}

function aimText(deg: number, t: (k: string, d: string) => string): string {
  if (deg === 0) return t('hoops.aimCenter', 'Center')
  return deg > 0 ? `${deg}° ${t('hoops.aimR', 'R')}` : `${-deg}° ${t('hoops.aimL', 'L')}`
}
