// FPS Hoops — hand-rolled 3D ball physics (no physics library).
//
// Semi-implicit Euler with a fixed timestep. Collisions are analytic:
//   • rim      → nearest-point-on-ring test (front/back/side lips)
//   • backboard→ front-facing plane within the board's bounds
//   • floor    → ground plane
// Deterministic: same initial velocity → same trajectory.

import type { BallState, Contact, ContactEvent, ShotOutcome, ShotResult, Vec3 } from './types.ts'
import { add, distXZ, dot, len, scale, sub, v } from './types.ts'
import {
  AIR_DRAG, BACKBOARD_BOTTOM, BACKBOARD_RESTITUTION, BACKBOARD_TOP, BACKBOARD_W, BACKBOARD_Z,
  BALL_RADIUS, FIXED_DT, FLOOR_RESTITUTION, FLOOR_Y, GRAVITY, MAX_STEPS,
  RIM_CENTER, RIM_HEIGHT, RIM_RADIUS, RIM_RESTITUTION, RIM_TUBE, RIM_Z,
} from './court.ts'

/** Reflect velocity across normal n (unit) with restitution, only if the ball
 *  is moving into the surface. */
function bounce(vel: Vec3, n: Vec3, restitution: number): Vec3 {
  const vn = dot(vel, n)
  if (vn >= 0) return vel // separating already
  // v' = v - (1+e)(v·n) n
  return sub(vel, scale(n, (1 + restitution) * vn))
}

const RIM_INNER = RIM_RADIUS - BALL_RADIUS   // clean-pass window (ball fits)
const RIM_OUTER = RIM_RADIUS + BALL_RADIUS   // beyond this the ball misses the ring

/** Evaluate the rim at a descending crossing of the rim plane. Given the pre-
 *  and post-step positions (which straddle RIM_HEIGHT), interpolate the (x,z)
 *  at the crossing and decide: clean through, rim bounce, or no interaction. */
function rimAtCrossing(prev: Vec3, s: BallState): { state: BallState; contact: 'rim' | null; through: boolean } {
  const f = (prev.y - RIM_HEIGHT) / (prev.y - s.pos.y) // 0..1 along the step
  const cx = prev.x + (s.pos.x - prev.x) * f
  const cz = prev.z + (s.pos.z - prev.z) * f
  const dxz = Math.hypot(cx - RIM_CENTER.x, cz - RIM_Z)
  if (dxz < RIM_INNER) return { state: s, contact: null, through: true } // clean swish lane
  if (dxz > RIM_OUTER) return { state: s, contact: null, through: false } // missed the ring
  // Caught the ring: bounce off the nearest ring point (3D).
  const ux = cx - RIM_CENTER.x, uz = cz - RIM_Z
  const horiz = Math.hypot(ux, uz) || 1e-6
  const ringPoint = v(RIM_CENTER.x + RIM_RADIUS * (ux / horiz), RIM_HEIGHT, RIM_Z + RIM_RADIUS * (uz / horiz))
  const delta = sub(s.pos, ringPoint)
  const d = len(delta)
  const n = d > 1e-6 ? scale(delta, 1 / d) : v(0, 1, 0)
  const pos = add(ringPoint, scale(n, BALL_RADIUS + RIM_TUBE))
  const vel = bounce(s.vel, n, RIM_RESTITUTION)
  return { state: { pos, vel }, contact: 'rim', through: false }
}

/** Collide with the front face of the backboard (a +Z-facing plane). */
function collideBackboard(s: BallState): { state: BallState; hit: boolean } {
  const frontZ = BACKBOARD_Z + BALL_RADIUS
  if (s.pos.z > frontZ || s.vel.z >= 0) return { state: s, hit: false }
  if (Math.abs(s.pos.x) > BACKBOARD_W / 2) return { state: s, hit: false }
  if (s.pos.y < BACKBOARD_BOTTOM || s.pos.y > BACKBOARD_TOP) return { state: s, hit: false }
  const n = v(0, 0, 1)
  const pos = v(s.pos.x, s.pos.y, frontZ)
  const vel = bounce(s.vel, n, BACKBOARD_RESTITUTION)
  return { state: { pos, vel }, hit: true }
}

/** Collide with the floor plane. */
function collideFloor(s: BallState): { state: BallState; hit: boolean } {
  const groundY = FLOOR_Y + BALL_RADIUS
  if (s.pos.y > groundY) return { state: s, hit: false }
  const pos = v(s.pos.x, groundY, s.pos.z)
  let vel = bounce(s.vel, v(0, 1, 0), FLOOR_RESTITUTION)
  vel = v(vel.x * 0.8, vel.y, vel.z * 0.8) // ground friction
  return { state: { pos, vel }, hit: true }
}

/** Advance the ball one fixed step. Returns the new state, any contact, and
 *  whether the ball passed cleanly through the rim opening this step. */
export function stepBall(state: BallState, dt: number = FIXED_DT): { state: BallState; contact: Contact | null; through: boolean } {
  const prev = state.pos
  // Integrate: gravity + light linear drag.
  let vel = v(state.vel.x, state.vel.y - GRAVITY * dt, state.vel.z)
  const decay = Math.max(0, 1 - AIR_DRAG * dt)
  vel = scale(vel, decay)
  const pos = add(prev, scale(vel, dt))
  let cur: BallState = { pos, vel }
  let contact: Contact | null = null
  let through = false

  // Rim: evaluated only at a downward crossing of the rim plane.
  if (prev.y >= RIM_HEIGHT && cur.pos.y < RIM_HEIGHT && cur.vel.y < 0) {
    const rim = rimAtCrossing(prev, cur)
    cur = rim.state
    if (rim.contact) contact = rim.contact
    through = rim.through
  }

  const board = collideBackboard(cur)
  if (board.hit) { cur = board.state; contact = contact ?? 'backboard' }
  const floor = collideFloor(cur)
  if (floor.hit) { cur = floor.state; contact = contact ?? 'floor' }

  return { state: cur, contact, through }
}

/** Run a full shot from an initial velocity and classify the outcome.
 *  Pure + deterministic — the basis for the Phase-0 tests. */
export function simulateShot(v0: Vec3, launch: Vec3): { result: ShotResult; trajectory: Vec3[] } {
  let state: BallState = { pos: { ...launch }, vel: { ...v0 } }
  const trajectory: Vec3[] = [state.pos]
  const contacts: Contact[] = []
  const contactEvents: ContactEvent[] = []
  let passedThrough = false
  let touchedBeforePass = false
  let minHorizDist = Infinity
  let steps = 0

  for (; steps < MAX_STEPS; steps++) {
    const next = stepBall(state)
    state = next.state
    trajectory.push(state.pos)

    if (next.contact) {
      contactEvents.push({ step: steps + 1, type: next.contact })
      if (next.contact !== 'floor' && !contacts.includes(next.contact)) {
        contacts.push(next.contact)
      }
    }
    minHorizDist = Math.min(minHorizDist, distXZ(state.pos, RIM_CENTER))

    if (!passedThrough && next.through) {
      passedThrough = true
      touchedBeforePass = contacts.includes('rim') || contacts.includes('backboard')
      break
    }
    // Stop once the ball is resting/rolling on the floor.
    if (next.contact === 'floor' && Math.abs(state.vel.y) < 0.6 && state.pos.y <= FLOOR_Y + BALL_RADIUS + 1e-3) {
      break
    }
  }

  let outcome: ShotOutcome
  if (passedThrough) {
    outcome = touchedBeforePass ? 'make' : 'swish'
  } else if (contacts.includes('rim')) {
    outcome = 'rim'
  } else if (contacts.includes('backboard')) {
    outcome = 'backboard'
  } else if (minHorizDist < 1.2) {
    outcome = 'short' // came reasonably close but under/over-thrown
  } else {
    outcome = 'airball' // wild miss, never near the rim
  }

  const scored = outcome === 'swish' || outcome === 'make'
  return {
    result: { outcome, points: scored ? 2 : 0, scored, contacts, contactEvents, steps },
    trajectory,
  }
}
