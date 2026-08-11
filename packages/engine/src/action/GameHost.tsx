// Engine — the host that RUNS any Game.
//
// Owns the game state (in a ref, mutated by step/apply — no 60fps React
// re-renders), the fixed-step loop, the event bus, the sound player, and the
// scoring session. Binds pointer input → mapGesture → apply. Picks the renderer
// adapter from meta.renderer, mounts the game's Scene/draw + HUD, and persists
// per-game bests. Games never touch any of this — they just implement Game.

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EventBus } from './core/events'
import { fixedLoop } from './core/loop'
import {
  applyOutcome, emptySession, loadBests, saveBests, type Bests, type SessionState,
} from './core/session'
import { makeSoundPlayer } from './audio/synth'
import { useGestureInput } from './input/useGestureInput'
import type { Game } from './game'
import type { StageProps } from './render/types'
import { Canvas2DStage } from './render/canvas2d'
import './ui/engine.css'

// The r3f stage pulls in three.js / @react-three (peer deps). Load it lazily so
// 2D-only games — and 2D-only consumers — never bundle or fetch three.js.
const R3FStage = lazy(() => import('./render/r3f').then(m => ({ default: m.R3FStage })))

const FIXED_DT = 1 / 120

export function GameHost<S, I, E extends string>({ game }: { game: Game<S, I, E> }) {
  const stateRef = useRef<S>(game.init())
  const prevRef = useRef<S>(stateRef.current)
  const stageRef = useRef<HTMLDivElement>(null)

  const bus = useMemo(() => new EventBus<string>(), [])
  const sound = useMemo(() => makeSoundPlayer(), [])
  const [session, setSession] = useState<SessionState>(emptySession)
  const [bests, setBests] = useState<Bests>(() => loadBests(game.meta.id))
  const [hud, setHud] = useState<S>(stateRef.current)

  const emit = useCallback((e: string) => bus.emit(e), [bus])

  const loop = useMemo(() => fixedLoop(FIXED_DT, dt => {
    prevRef.current = stateRef.current
    stateRef.current = game.step(stateRef.current, dt, emit as (e: E) => void)
    const oc = game.outcome?.(stateRef.current, prevRef.current)
    if (oc) setSession(s => applyOutcome(s, oc))
  }), [game, emit])

  const tick = useCallback((dt: number) => loop.advance(dt), [loop])
  const getState = useCallback(() => stateRef.current, [])

  // Apply an intent from a gesture OR a UI control (spot/mode buttons).
  const dispatch = useCallback((intent: I) => {
    prevRef.current = stateRef.current
    stateRef.current = game.apply(stateRef.current, intent, emit as (e: E) => void)
    const oc = game.outcome?.(stateRef.current, prevRef.current)
    if (oc) setSession(s => applyOutcome(s, oc))
    setHud(stateRef.current)
  }, [game, emit])

  // Sound cues on events.
  useEffect(() => bus.on(e => sound.play(game.sounds?.[e as E])), [bus, sound, game])

  // Persist per-game bests as the session improves.
  useEffect(() => {
    setBests(saveBests(game.meta.id, { bestScore: session.score, bestCombo: session.bestCombo }))
  }, [session.score, session.bestCombo, game.meta.id])

  // Refresh the HUD snapshot ~10fps (cheap; HUD is DOM text/bars).
  useEffect(() => {
    const id = setInterval(() => setHud(stateRef.current), 100)
    return () => clearInterval(id)
  }, [])

  // Player input: gesture → intent → apply.
  useGestureInput(stageRef, g => {
    const intent = game.mapGesture(g)
    if (intent != null) dispatch(intent)
  })

  const stageProps: StageProps<S> = { game, getState, bus, tick }
  const { Hud, Overlay, Controls } = game

  return (
    <div className="engine-game">
      {Controls && <Controls state={hud} session={session} dispatch={dispatch} />}
      <div className="engine-stage" ref={stageRef}>
        {game.meta.renderer === 'r3f'
          ? <Suspense fallback={<div className="engine-loading" />}><R3FStage {...(stageProps as StageProps<unknown>)} /></Suspense>
          : <Canvas2DStage {...stageProps} />}
        {Overlay && <Overlay getState={getState} bus={bus} dispatch={dispatch} />}
        {Hud && <Hud state={hud} session={session} bests={bests} dispatch={dispatch} />}
      </div>
      {game.meta.hint && <p className="engine-hint">{game.meta.hint}</p>}
    </div>
  )
}
