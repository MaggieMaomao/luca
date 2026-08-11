// Game engine — the React shell.
//
// Wraps any GameDefinition with:
//   - Stats row (engine-supplied or game-supplied stat)
//   - Header with restart button
//   - Keyboard input (mapped from definition.controls.keyboard)
//   - Touch input (when definition.controls.touch is set)
//   - Help overlay (powered by definition.help)
//   - Win banner (engine-supplied)
//   - Loss banner (engine-supplied)
//   - The game's render function in the middle
//
// Games implement GameDefinition + provide a render function. Everything
// else comes from this engine.

import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  GameAction, GameDefinition, GameRenderContext, GameScore, GameStats,
} from './contracts'
import { useGameController } from './useGameController'
import { defaultStorage } from './GameStorage'
import { useGameLifecycle } from './GameLifecycle'

const EMPTY_SCORE: GameScore = { best: 0, plays: 0, lastPlayedAt: '' }

export interface GameEngineProps<
  TState,
  TAction extends GameAction,
  TStats extends GameStats,
> {
  definition: GameDefinition<TState, TAction, TStats>
  /** Optional CSS class for the outer wrapper. */
  className?: string
}

/** Re-export for games that want to embed the engine in their own wrapper. */
export { useGameController }

export function GameEngine<
  TState,
  TAction extends GameAction,
  TStats extends GameStats,
>({ definition, className = '' }: GameEngineProps<TState, TAction, TStats>) {
  const { t } = useTranslation()
  const lifecycle = useGameLifecycle()
  const controller = useGameController({
    definition,
    storage: defaultStorage,
    // Bridge the engine's terminal event to the host's lifecycle handler
    // (e.g. the platform's completion bridge). The engine itself stays
    // ignorant of what `onComplete` does.
    onComplete: ({ status, state, stats }) => {
      lifecycle.onComplete?.({
        slug: definition.meta.slug,
        status,
        // Send the canonical completion shape if the game provides one
        // (e.g. 2048 tile-objects → number grid); else the state as-is.
        state: definition.serializeCompletion ? definition.serializeCompletion(state) : state,
        stats,
        reportedComplete: status === 'won',
      })
    },
  })

  // Build the render context once per render — uses stable callbacks
  // so the game's render function isn't re-created unnecessarily.
  const ctx: GameRenderContext<TState, TAction, TStats> = useMemo(() => ({
    state: controller.state,
    dispatch: controller.dispatch,
    stats: controller.stats,
    status: controller.status,
    interactive: controller.interactive,
    t: t as any,
    persistedScore: controller.persistedScore ?? EMPTY_SCORE,
    restart: () => controller.restart(),
  }), [controller, t])

  // Wire keyboard input from definition.controls.keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.target instanceof HTMLTextAreaElement) return
      // Check exact match first, then case-insensitive
      const action = (definition.controls.keyboard[e.key]
        ?? definition.controls.keyboard[e.key.toLowerCase()]) as TAction | undefined
      if (action) {
        e.preventDefault()
        controller.dispatch(action)
        return
      }
      // Game-specific keyboard handler (context-aware input like
      // "type 5 to fill the currently-selected cell"). Runs after
      // the static keyboard map. Return true to signal handled.
      if (definition.controls.onKeyDown && controller.interactive) {
        const handled = definition.controls.onKeyDown(e, {
          state: controller.state,
          dispatch: (a) => controller.dispatch(a),
          interactive: controller.interactive,
        })
        if (handled) {
          e.preventDefault()
          return
        }
      }
      // Help overlay toggle
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        controller.setShowHelp(!controller.showHelp)
        return
      }
      // Pause toggle
      if (e.key === 'Escape' && definition.controls.pausable) {
        e.preventDefault()
        if (controller.status === 'playing') controller.pause()
        else if (controller.status === 'paused') controller.resume()
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [definition.controls, controller])

  // Compute the displayed stat
  const displayedStat = useMemo(() => {
    if (definition.stat) {
      return {
        label: (t as any)(definition.stat.label, { defaultValue: definition.meta.slug }),
        value: definition.stat.compute(controller.state, controller.stats),
      }
    }
    return {
      label: t('games.play.score', 'Score'),
      value: controller.stats.score,
    }
  }, [definition, controller.state, controller.stats, t])

  return (
    <div className={`game-engine ${className}`}>
      <header className="game-engine-header">
        <div className="game-engine-stat-block">
          <div className="game-engine-stat-label">{displayedStat.label}</div>
          <div className="game-engine-stat-value">{displayedStat.value}</div>
        </div>
        <div className="game-engine-stat-block">
          <div className="game-engine-stat-label">{t('games.play.moves', 'Moves')}</div>
          <div className="game-engine-stat-value">{controller.stats.moves}</div>
        </div>
        <div className="game-engine-stat-block">
          <div className="game-engine-stat-label">{t('games.play.best_score', 'Best')}</div>
          <div className="game-engine-stat-value">
            {controller.persistedScore?.best ?? 0}
          </div>
        </div>
        <div className="game-engine-stat-block">
          <div className="game-engine-stat-label">{t('games.play.times_played', 'Plays')}</div>
          <div className="game-engine-stat-value">
            {controller.persistedScore?.plays ?? 0}
          </div>
        </div>
      </header>

      <div className="game-engine-body">
        {definition.render(controller.state, ctx)}
      </div>

      <footer className="game-engine-foot">
        <button
          type="button"
          className="cb-btn cb-btn-md cb-btn-primary game-engine-restart"
          onClick={() => controller.restart()}
        >
          {t('games.play.restart', 'Restart')}
        </button>
        <button
          type="button"
          className="cb-btn cb-btn-md cb-btn-secondary game-engine-help-toggle"
          onClick={() => controller.setShowHelp(!controller.showHelp)}
          aria-label="Help"
        >
          {controller.showHelp ? '×' : '?'}
        </button>
      </footer>

      {controller.status === 'won' && (
        <WinBanner t={t} onRestart={() => controller.restart()} />
      )}

      {controller.status === 'lost' && (
        <LossBanner t={t} finalScore={controller.stats.score} onRestart={() => controller.restart()} />
      )}

      {controller.showHelp && (
        <HelpOverlay
          t={t}
          description={definition.help.description}
          controls={definition.help.controls}
          goal={definition.help.goal}
          onClose={() => controller.setShowHelp(false)}
        />
      )}
    </div>
  )
}

function WinBanner({ t, onRestart }: {
  t: any; onRestart: () => void
}) {
  return (
    <div className="game-engine-banner game-engine-banner-win">
      <strong>{t('games.play.win_title', 'You won!')}</strong>
      <p>{t('games.play.win_text', 'Well done. Play again?')}</p>
      <button type="button" className="cb-btn cb-btn-md cb-btn-primary" onClick={onRestart}>
        {t('games.play.restart', 'Restart')}
      </button>
    </div>
  )
}

function LossBanner({ t, finalScore, onRestart }: {
  t: any;
  finalScore: number;
  onRestart: () => void;
}) {
  return (
    <div className="game-engine-banner game-engine-banner-loss">
      <strong>{t('games.play.lose_title', 'Game over')}</strong>
      <p>{t('games.play.lose_text', 'Final score: {{score}}.', { score: finalScore })}</p>
      <button type="button" className="cb-btn cb-btn-md cb-btn-primary" onClick={onRestart}>
        {t('games.play.restart', 'Restart')}
      </button>
    </div>
  )
}

function HelpOverlay({
  t, description, controls, goal, onClose,
}: {
  t: any;
  description: string;
  controls: Array<{ keys?: string; action: string }>;
  goal?: string;
  onClose: () => void;
}) {
  return (
    <div className="game-engine-help" onClick={onClose}>
      <div className="game-engine-help-card" onClick={e => e.stopPropagation()}>
        <h3>{description}</h3>
        <h4>{t('games.play.controls_label', 'Controls')}</h4>
        <ul>
          {controls.map((c, i) => (
            <li key={i}>
              {c.keys && (
                <>
                  {c.keys.split(' ').map((k, j) => (
                    <kbd key={j}>{k}</kbd>
                  ))}
                  {' — '}
                </>
              )}
              {c.action}
            </li>
          ))}
        </ul>
        {goal && (
          <p className="game-engine-help-goal">
            {t('games.play.target_label', 'Goal')}: {goal}
          </p>
        )}
        <button type="button" className="cb-btn cb-btn-md" onClick={onClose}>
          {t('games.play.help_close', 'Got it')}
        </button>
      </div>
    </div>
  )
}