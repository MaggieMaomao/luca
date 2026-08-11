// Toss — pure game logic (no JSX/React), so it's unit-testable under
// `node --experimental-strip-types`. The Game object (with HUD + sounds) is
// assembled in toss.tsx from these.

// Import from the specific pure modules (not the barrel, which re-exports the
// JSX host) so this logic stays testable under node --experimental-strip-types.
import { ThrowSystem, defaultThrowSystemConfig } from '@luca-game/engine/action/input'
import type { Gesture } from '@luca-game/engine/action/input'
import type { Outcome } from '@luca-game/engine/action'
import type { View2D } from '@luca-game/engine/action'

// Normalized coords: x,y in 0..1; y=0 floor, y=1 top.
export interface Ball { x: number; y: number; vx: number; vy: number }
export interface TossState {
  phase: 'ready' | 'flight' | 'resolved'
  ball: Ball
  target: { x: number; w: number }
  timer: number
  won: boolean | null
}
export interface Launch { vx: number; vy: number }
export type TossEvent = 'toss' | 'score' | 'miss'

export const G = 1.8
export const BALL_R = 0.028
export const FLOOR = 0.06
const START = { x: 0.5, y: FLOOR + BALL_R }
const RESOLVE_HOLD = 0.8

const thrower = new ThrowSystem({ ...defaultThrowSystemConfig, hardThrowSpeed: 2400 })
const rndTarget = () => ({ x: 0.25 + Math.random() * 0.5, w: 0.14 })

export const initToss = (): TossState => ({
  phase: 'ready', ball: { ...START, vx: 0, vy: 0 }, target: rndTarget(), timer: 0, won: null,
})

export function mapToss(g: Gesture): Launch | null {
  const intent = thrower.release(g)
  if (!intent || intent.power < 6) return null
  const speed = intent.power * 0.05
  return { vx: intent.direction.x * speed, vy: Math.max(0.15, intent.direction.y) * speed }
}

export function applyToss(s: TossState, launch: Launch, emit: (e: TossEvent) => void): TossState {
  if (s.phase !== 'ready') return s
  emit('toss')
  return { ...s, phase: 'flight', ball: { ...START, vx: launch.vx, vy: launch.vy } }
}

export function stepToss(s: TossState, dt: number, emit: (e: TossEvent) => void): TossState {
  if (s.phase === 'flight') {
    const b = s.ball
    const vy = b.vy - G * dt
    const x = b.x + b.vx * dt
    const y = b.y + vy * dt
    if (y <= FLOOR + BALL_R && vy < 0) {
      const won = Math.abs(x - s.target.x) < s.target.w / 2
      emit(won ? 'score' : 'miss')
      return { ...s, phase: 'resolved', ball: { x, y: FLOOR + BALL_R, vx: 0, vy: 0 }, timer: RESOLVE_HOLD, won }
    }
    if (x < -0.1 || x > 1.1) {
      emit('miss')
      return { ...s, phase: 'resolved', ball: { x, y, vx: 0, vy: 0 }, timer: RESOLVE_HOLD, won: false }
    }
    return { ...s, ball: { x, y, vx: b.vx, vy } }
  }
  if (s.phase === 'resolved') {
    const timer = s.timer - dt
    if (timer <= 0) return { phase: 'ready', ball: { ...START, vx: 0, vy: 0 }, target: rndTarget(), timer: 0, won: null }
    return { ...s, timer }
  }
  return s
}

export function outcomeToss(s: TossState, prev: TossState): Outcome | null {
  if (prev.phase === 'flight' && s.phase === 'resolved') {
    return { points: s.won ? 2 : 0, won: !!s.won, comboBonus: true, label: s.won ? 'in' : 'miss' }
  }
  return null
}

export function drawToss(ctx: CanvasRenderingContext2D, s: TossState, view: View2D): void {
  const { width: W, height: H } = view
  const px = (x: number) => x * W
  const py = (y: number) => (1 - y) * H
  ctx.fillStyle = '#c8a15a'
  ctx.fillRect(0, py(FLOOR), W, H - py(FLOOR))
  const tx = px(s.target.x), tw = s.target.w * W, fy = py(FLOOR)
  ctx.strokeStyle = s.phase === 'resolved' && s.won ? '#7ddc7d' : '#e8641c'
  ctx.lineWidth = Math.max(3, W * 0.006)
  ctx.beginPath()
  ctx.moveTo(tx - tw / 2, fy - H * 0.11); ctx.lineTo(tx - tw / 2, fy)
  ctx.lineTo(tx + tw / 2, fy); ctx.lineTo(tx + tw / 2, fy - H * 0.11)
  ctx.stroke()
  ctx.fillStyle = '#e2751f'
  ctx.beginPath(); ctx.arc(px(s.ball.x), py(s.ball.y), BALL_R * H, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#20140c'; ctx.lineWidth = Math.max(1, W * 0.0015)
  ctx.beginPath(); ctx.moveTo(px(s.ball.x) - BALL_R * H, py(s.ball.y)); ctx.lineTo(px(s.ball.x) + BALL_R * H, py(s.ball.y)); ctx.stroke()
}
