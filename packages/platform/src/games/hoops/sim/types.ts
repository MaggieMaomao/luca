// FPS Hoops — simulation types + tiny 3D vector helpers.
//
// World coordinates follow three.js: +X right, +Y up, +Z toward the viewer.
// The shooter faces down-court, so the hoop sits at NEGATIVE Z (in front).
// Units are meters, seconds, m/s. Everything here is pure (no three.js).

export interface Vec3 {
  x: number
  y: number
  z: number
}

export const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })
export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
export const scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s })
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z
export const len = (a: Vec3): number => Math.sqrt(dot(a, a))
export const normalize = (a: Vec3): Vec3 => {
  const l = len(a)
  return l > 1e-9 ? scale(a, 1 / l) : { x: 0, y: 0, z: 0 }
}
/** Horizontal (xz-plane) distance between two points. */
export const distXZ = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.z - b.z)

export interface BallState {
  pos: Vec3
  vel: Vec3
}

export type Contact = 'rim' | 'backboard' | 'floor'

/** A contact tagged with the trajectory step it happened on (for timing sounds
 *  + effects during flight playback). */
export interface ContactEvent {
  step: number
  type: Contact
}

/** Outcome of a resolved shot. */
export type ShotOutcome =
  | 'swish'      // clean through, no rim/backboard touch
  | 'make'       // through the hoop after a rim/backboard touch
  | 'rim'        // hit the rim, no make
  | 'backboard'  // hit the backboard, no make
  | 'airball'    // never reached the rim neighborhood
  | 'short'      // fell short in front of the rim

export interface ShotResult {
  outcome: ShotOutcome
  points: number       // 2 for a make/swish (v1); 0 otherwise
  scored: boolean
  contacts: Contact[]
  /** Every contact with its trajectory-step timing (rim/backboard/floor). */
  contactEvents: ContactEvent[]
  /** Number of fixed steps the flight took (for tests/telemetry). */
  steps: number
}
