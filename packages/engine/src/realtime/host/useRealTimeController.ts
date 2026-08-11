// @luca-game/engine — useRealTimeController hook.
//
// The React surface of the real-time engine. Mirrors the turn-based
// useGameController but for continuous-state games.
//
// This is intentionally minimal in the MVP — it owns the state, drives
// the FixedTimestepScheduler, and exposes React-friendly accessors.
// Games consume this hook; the engine abstracts the loop details.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type RealTimeGameDefinition,
  type RealTimeGameConfig,
  type RealTimeInput,
  type RealTimeControllerResult,
  type RealTimeRenderEvent,
} from '../contracts'
import { FixedTimestepScheduler } from './FixedTimestepScheduler'
import { canTransition, isFinished, isInteractive } from '../../GameState'
import { defaultStorage, type GameStorage } from '../../GameStorage'
import { useGameLifecycle } from '../../GameLifecycle'
import type { GameStats } from '../../contracts'
import type { ReplayHandle } from './ReplayRecorder'

// ── Telemetry ─────────────────────────────────────────────────────────────

/** Live metrics the engine exposes to the dev panel. */
export interface GameTelemetry {
  /** Total ticks elapsed since start. */
  tickCount: number
  /** Total seconds since start. */
  elapsedSeconds: number
  /** Configured tick rate. */
  tickRate: number
  /** Current scheduler status: 'idle' | 'running' | 'paused'. */
  status: 'idle' | 'running' | 'paused'
}

// ── Hook options ──────────────────────────────────────────────────────────

export interface UseRealTimeControllerOptions<
  TState,
  TInput extends RealTimeInput,
  TConfig extends RealTimeGameConfig
> {
  definition: RealTimeGameDefinition<TState, TInput, TConfig>
  /** Optional config overrides. */
  config?: Partial<TConfig>
  /** Optional storage adapter (defaults to localStorage). */
  storage?: GameStorage
  /** Optional completion callback (e.g. for server-side validation). */
  onComplete?: (info: {
    slug: string
    status: 'won' | 'lost'
    state: unknown
    stats: GameStats
    reportedComplete: boolean
  }) => void
}

// ── Hook ─────────────────────────────────────────────────────────────────

/**
 * The main hook for real-time games. Returns the controller state +
 * control methods.
 *
 * This is the React surface of the engine. Games consume it like:
 *
 *   const ctrl = useRealTimeController({ definition })
 *   const { state, status, submitInput } = ctrl
 *
 * The hook internally drives a FixedTimestepScheduler. State updates
 * are pushed via subscribe() so React only re-renders when state
 * actually changes (not every tick).
 */
export function useRealTimeController<
  TState,
  TInput extends RealTimeInput,
  TConfig extends RealTimeGameConfig
>(
  options: UseRealTimeControllerOptions<TState, TInput, TConfig>
): RealTimeControllerResult<TState, TInput, TConfig> {
  const { definition, config: configOverride, storage: _storage = defaultStorage, onComplete: onCompleteProp } = options

  // Merge default config with overrides
  const config = useMemo<TConfig>(
    () => ({ ...definition.defaultConfig, ...configOverride } as TConfig),
    [definition, configOverride]
  )

  const lifecycle = useGameLifecycle()
  const schedulerRef = useRef<FixedTimestepScheduler | null>(null)
  const statusRef = useRef<'idle' | 'playing' | 'paused' | 'won' | 'lost' | 'loading'>('idle')
  const stateRef = useRef<TState | null>(null)
  const telemetryRef = useRef<GameTelemetry>({
    tickCount: 0,
    elapsedSeconds: 0,
    tickRate: config.tickRate ?? 120,
    status: 'idle',
  })
  const inputRef = useRef<TInput>({} as TInput)
  const subscribersRef = useRef<Set<() => void>>(new Set())

  // Lazy init: only on first render
  if (stateRef.current === null) {
    stateRef.current = definition.initialState(config)
  }

  // State for forcing re-renders. notifyAll() bumps this counter,
  // causing the component to re-read the latest refs and pass
  // them to children (HUD, etc.). The state itself lives in stateRef
  // and is mutated by the tick callback — refs are the source of
  // truth, state is just the render trigger.
  const [, forceRender] = useState(0)
  const notifyAll = (): void => {
    forceRender(n => n + 1)
  }

  // Set up the scheduler (once, when config/definition changes)
  useEffect(() => {
    const sched = new FixedTimestepScheduler({
      tickRate: config.tickRate ?? 120,
      renderRate: config.renderRate ?? 60,
    })
    schedulerRef.current = sched

    sched.onTick((dt) => {
      if (!isInteractive(statusRef.current)) return
      const prevState = stateRef.current!
      const nextState = definition.update(prevState, dt, inputRef.current)
      const events = definition.detectEvents?.(nextState) ?? []
      stateRef.current = nextState
      telemetryRef.current = {
        ...telemetryRef.current,
        tickCount: telemetryRef.current.tickCount + 1,
        elapsedSeconds: telemetryRef.current.elapsedSeconds + dt,
        status: 'running',
      }
      // Check for win/loss transitions
      if (statusRef.current === 'playing') {
        if (definition.isWin(nextState)) {
          statusRef.current = 'won'
        } else if (definition.isLoss?.(nextState)) {
          statusRef.current = 'lost'
        }
      }
      notifyAll()
      if (events.length > 0) {
        // TODO (Phase 6.3): forward events to render bus
      }
      if (isFinished(statusRef.current)) {
        sched.pause()
        const info = {
          slug: definition.meta.slug,
          status: statusRef.current === 'won' ? ('won' as const) : ('lost' as const),
          state: nextState,
          stats: { score: 0, moves: 0, elapsed: telemetryRef.current.elapsedSeconds } as GameStats,
          reportedComplete: statusRef.current === 'won',
        }
        onCompleteProp?.(info)
        lifecycle.onComplete?.(info)
      }
    })

    return () => {
      sched.stop()
      schedulerRef.current = null
    }
  }, [config.tickRate, config.renderRate, definition, onCompleteProp, lifecycle])

  // The snapshot returned to consumers. We read from refs at render
  // time — refs are the source of truth, this just exposes the
  // current values. forceRender (via notifyAll) keeps the component
  // in sync with the tick loop.
  const status = statusRef.current
  const interactive = isInteractive(status)

  return {
    state: stateRef.current!,
    config,
    status,
    interactive,
    submitInput: (input: TInput) => {
      inputRef.current = { ...inputRef.current, ...input }
    },
    pause: () => {
      schedulerRef.current?.pause()
      statusRef.current = 'paused'
      telemetryRef.current = { ...telemetryRef.current, status: 'paused' }
      definition.onPause?.(stateRef.current!)
      notifyAll()
    },
    resume: () => {
      schedulerRef.current?.resume()
      if (canTransition(statusRef.current, 'playing')) {
        statusRef.current = 'playing' as typeof statusRef.current
      }
      definition.onResume?.(stateRef.current!)
      notifyAll()
    },
    restart: () => {
      const fresh = definition.initialState(config)
      stateRef.current = fresh
      statusRef.current = 'idle' as typeof statusRef.current
      telemetryRef.current = {
        tickCount: 0,
        elapsedSeconds: 0,
        tickRate: config.tickRate ?? 120,
        status: 'idle',
      }
      definition.onStart?.(fresh)
      schedulerRef.current?.start()
      statusRef.current = 'playing' as typeof statusRef.current
      telemetryRef.current = { ...telemetryRef.current, status: 'running' as GameTelemetry['status'] }
      notifyAll()
    },
    onRenderEvent: (_cb: (e: RealTimeRenderEvent) => void) => {
      // TODO (Phase 6.3): wire up the render bus
      return () => {}
    },
    replay: {
      isRecording: false,
      recordedFrames: 0,
      isPlaying: false,
      currentFrame: 0,
      totalFrames: 0,
      play: () => {},
      pause: () => {},
      stop: () => {},
      seek: () => {},
      export: async () => '',
      import: () => {},
    } as ReplayHandle,
    telemetry: telemetryRef.current,
  }
}
