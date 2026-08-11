// Hoops on the engine — pure game logic (no JSX), ported from the original
// useHoopsGame orchestrator into the engine's Game shape. Reuses the tested
// basketball3d/sim physics + rules verbatim. Testable under node strip-types.

import type { ShotResult, Vec3 } from './sim/types.ts'
import { computeShot, defaultShotParams } from './sim/shot.ts'
import { simulateShot } from './sim/ballPhysics.ts'
import { FIXED_DT, RIM_CENTER, RIM_Z, SET_BACK, SET_DROP } from './sim/court.ts'
import { basePoints } from './sim/scoring.ts'
import { SPOTS, defaultSpot, type Spot } from './sim/spots.ts'
import { ThrowSystem, defaultThrowSystemConfig } from '@luca-game/engine/action/input'
import type { Gesture, ThrowIntent } from '@luca-game/engine/action/input'
import type { Outcome } from '@luca-game/engine/action'

export type HoopsStatus = 'ready' | 'shooting' | 'flight' | 'resolved' | 'over'
export type HoopsMode = 'practice' | 'timeattack'
export type HoopsEvent = 'shoot' | 'hit-rim' | 'hit-backboard' | 'bounce' | 'swish' | 'make' | 'miss'
export { SPOTS }
export type { Spot }

export interface ShotTelemetry { strengthPct: number; angleDeg: number; apexM: number; aimDeg: number; speed: number }
export interface HandPose { anchor: Vec3; extend: number; snap: number }

export type HoopsIntent =
  | { kind: 'shoot'; throw: ThrowIntent }
  | { kind: 'setSpot'; spot: Spot }
  | { kind: 'practice' }
  | { kind: 'timeattack' }

export interface HoopsState {
  status: HoopsStatus
  mode: HoopsMode
  spot: Spot
  timeLeftMs: number
  traj: Vec3[]
  idx: number
  result: ShotResult | null
  lastShot: ShotTelemetry | null
  clock: number
  shootStart: number
  flightStart: number
  resolvedStart: number
  resolveAt: number
  emitStep: number
}

const RESOLVE_HOLD_MS = 950
const TIME_ATTACK_MS = 60_000
const SHOOT_MS = 300
const SNAP_MS = 150
const DROP_START_MS = 150
const LOWER_FLIGHT_MS = 300
const HOLD_FRAME = 1
const SHOOT_KEYS = [1, 4, 8]
const FOLLOW_FRAME = 14

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const smooth = (t: number) => { const c = clamp01(t); return c * c * (3 - 2 * c) }
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t })

function setPos(launch: Vec3): Vec3 {
  const ax = launch.x - RIM_CENTER.x
  const az = launch.z - RIM_Z
  const l = Math.hypot(ax, az) || 1
  return { x: launch.x + (ax / l) * SET_BACK, y: launch.y - SET_DROP, z: launch.z + (az / l) * SET_BACK }
}

const thrower = new ThrowSystem({ ...defaultThrowSystemConfig, hardThrowSpeed: 2600 })

const fresh = (mode: HoopsMode, spot: Spot): HoopsState => ({
  status: 'ready', mode, spot, timeLeftMs: TIME_ATTACK_MS, traj: [], idx: 0, result: null,
  lastShot: null, clock: 0, shootStart: 0, flightStart: 0, resolvedStart: 0, resolveAt: 0, emitStep: 0,
})

export const initHoops = (): HoopsState => fresh('practice', defaultSpot)

export function mapHoops(g: Gesture): HoopsIntent | null {
  const intent = thrower.release(g)
  return intent ? { kind: 'shoot', throw: intent } : null
}

export function applyHoops(s: HoopsState, intent: HoopsIntent, emit: (e: HoopsEvent) => void): HoopsState {
  switch (intent.kind) {
    case 'shoot': {
      if (s.status !== 'ready') return s
      const launch = s.spot.launch
      const sol = computeShot(intent.throw, launch)
      const { result, trajectory } = simulateShot(sol.velocity, launch)
      const apex = trajectory.reduce((m, p) => Math.max(m, p.y), 0)
      const { minPower, maxPower } = defaultShotParams
      const lastShot: ShotTelemetry = {
        strengthPct: Math.round(clamp01((intent.throw.power - minPower) / (maxPower - minPower)) * 100),
        angleDeg: Math.round(sol.elevationDeg),
        apexM: Math.round(apex * 10) / 10,
        aimDeg: Math.round(sol.yawDeg),
        speed: Math.round(sol.speed * 10) / 10,
      }
      emit('shoot')
      return { ...s, status: 'shooting', traj: trajectory, idx: 0, result, lastShot, shootStart: s.clock, emitStep: 0 }
    }
    case 'setSpot':
      return { ...s, spot: intent.spot, status: 'ready', traj: [], idx: 0, result: null }
    case 'practice':
      return fresh('practice', s.spot)
    case 'timeattack':
      return fresh('timeattack', s.spot)
  }
}

export function stepHoops(s: HoopsState, dt: number, emit: (e: HoopsEvent) => void): HoopsState {
  const dtMs = dt * 1000
  const now = s.clock + dtMs
  let n: HoopsState = { ...s, clock: now }
  if (n.mode === 'timeattack' && n.status !== 'over') n.timeLeftMs = Math.max(0, n.timeLeftMs - dtMs)

  if (n.status === 'shooting') {
    if (now - n.shootStart >= SHOOT_MS) { n.status = 'flight'; n.flightStart = now; n.idx = 0 }
  } else if (n.status === 'flight') {
    n.idx = n.idx + dtMs / 1000 / FIXED_DT
    const last = n.traj.length - 1
    const upto = Math.floor(n.idx)
    const evs = n.result?.contactEvents
    if (evs) {
      for (const c of evs) {
        if (c.step > n.emitStep && c.step <= upto) {
          emit(c.type === 'rim' ? 'hit-rim' : c.type === 'backboard' ? 'hit-backboard' : 'bounce')
        }
      }
    }
    if (upto > n.emitStep) n.emitStep = upto
    if (n.idx >= last) {
      n.idx = last
      const oc = n.result?.outcome
      emit(oc === 'swish' ? 'swish' : oc === 'make' ? 'make' : 'miss')
      n.status = 'resolved'; n.resolvedStart = now; n.resolveAt = now + RESOLVE_HOLD_MS
    }
  } else if (n.status === 'resolved') {
    if (now >= n.resolveAt) {
      if (n.mode === 'timeattack' && n.timeLeftMs <= 0) n.status = 'over'
      else { n.status = 'ready'; n.traj = []; n.idx = 0; n.result = null }
    }
  } else if (n.status === 'ready') {
    if (n.mode === 'timeattack' && n.timeLeftMs <= 0) n.status = 'over'
  }
  return n
}

export function outcomeHoops(s: HoopsState, prev: HoopsState): Outcome | null {
  if (prev.status === 'flight' && s.status === 'resolved' && s.result) {
    return { points: basePoints(s.result.outcome), won: s.result.scored, comboBonus: true, label: s.result.outcome }
  }
  return null
}

// ── render read-helpers (pure functions of state) ────────────────────────────
export function getHands(s: HoopsState): HandPose {
  const launch = s.spot.launch
  const set = setPos(launch)
  const now = s.clock
  switch (s.status) {
    case 'shooting': {
      const p = smooth((now - s.shootStart) / SHOOT_MS)
      return { anchor: lerp3(set, launch, p), extend: p, snap: 0 }
    }
    case 'flight': {
      const t = now - s.flightStart
      const e = t < DROP_START_MS ? 1 : 1 - smooth((t - DROP_START_MS) / LOWER_FLIGHT_MS)
      const snap = clamp01(t / SNAP_MS) * (e < 1 ? e : 1)
      return { anchor: lerp3(set, launch, e), extend: e, snap }
    }
    default:
      return { anchor: set, extend: 0, snap: 0 }
  }
}

export function getBallPos(s: HoopsState): Vec3 {
  if (s.status === 'flight' && s.traj.length > 0) {
    const i = Math.min(s.traj.length - 1, Math.max(0, Math.floor(s.idx)))
    return s.traj[i]
  }
  return getHands(s).anchor
}

export function getShotFrame(s: HoopsState): number {
  const now = s.clock
  switch (s.status) {
    case 'shooting': return SHOOT_KEYS[Math.min(SHOOT_KEYS.length - 1, Math.floor(clamp01((now - s.shootStart) / SHOOT_MS) * SHOOT_KEYS.length))]
    case 'flight': return FOLLOW_FRAME
    default: return HOLD_FRAME
  }
}
