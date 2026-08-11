// FPS Hoops — turn a ThrowIntent (2D flick) into an initial 3D ball velocity.
//
// This is the game-specific mapping the engine's ThrowSystem deliberately
// leaves to the game (it returns direction.z = 0). Design:
//   • flick steepness (dir.y)  → launch ELEVATION angle
//   • flick lateral (dir.x)    → YAW left/right, softened by AIM ASSIST
//   • flick strength (power)   → speed, as a factor around the IDEAL swish speed
//
// Because speed is expressed relative to the ideal swish speed for the chosen
// arc, a medium flick with a sane arc goes in; too soft falls short, too hard
// sails long. Aim-assist keeps left/right forgiving (more so on sloppy flicks),
// so skill lives mostly in strength calibration — a fair, learnable free throw.

import type { ThrowIntent } from '@luca-game/engine/action/input'
import type { Vec3 } from './types.ts'
import { scale } from './types.ts'
import { GRAVITY, LAUNCH_POS, RIM_CENTER, RIM_HEIGHT } from './court.ts'

const DEG = Math.PI / 180

export interface ShotParams {
  /** Power range the ThrowIntent.power is normalized against (ThrowSystem defaults). */
  minPower: number
  maxPower: number
  /** Elevation band mapped from flick steepness. */
  minElevDeg: number
  maxElevDeg: number
  /** Max lateral yaw (deg) from a full-sideways flick, before assist. */
  maxYawDeg: number
  /** Base fraction of lateral error removed; extra added as release gets sloppy. */
  baseAssist: number
  extraAssist: number
  /** Strength factor band: normalized power 0→1 maps here (1.0 = ideal speed). */
  minStrength: number
  maxStrength: number
  /** Compensates the drag-free idealSpeed for the sim's light air drag, so a
   *  mid-strength flick actually reaches rim center. */
  dragComp: number
}

export const defaultShotParams: ShotParams = {
  minPower: 5,
  maxPower: 25,
  minElevDeg: 46,
  maxElevDeg: 52,
  maxYawDeg: 16,
  baseAssist: 0.55,
  extraAssist: 0.35,
  minStrength: 0.86,
  maxStrength: 1.14,
  // Places a mid-strength flick in the middle of the scoring band (a solid
  // make, a hair over the swish speed). Tuned for the overhead release point.
  dragComp: 1.025,
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export interface ShotSolution {
  velocity: Vec3
  elevationDeg: number
  yawDeg: number
  speed: number
  idealSpeed: number
}

/** Ideal launch speed to pass through the rim, for the given elevation, at
 *  horizontal distance L and height gain dy. Standard projectile range solve. */
export function idealSpeed(elevRad: number, L: number, dy: number): number {
  const denom = 2 * Math.cos(elevRad) ** 2 * (L * Math.tan(elevRad) - dy)
  if (denom <= 0) return Infinity // arc too flat to reach the rim
  return Math.sqrt((GRAVITY * L * L) / denom)
}

/** Turn a flick into a 3D launch velocity from a given spot. Aims toward the
 *  rim from `launch`; flick steepness → arc, flick lateral → yaw (aim-assisted),
 *  flick strength → speed around the ideal-swish speed for that distance. */
export function computeShot(intent: ThrowIntent, launch: Vec3 = LAUNCH_POS, p: ShotParams = defaultShotParams): ShotSolution {
  const strength01 = clamp01((intent.power - p.minPower) / (p.maxPower - p.minPower))
  const strengthFactor = lerp(p.minStrength, p.maxStrength, strength01)

  const steep = clamp01(intent.direction.y)
  const elevDeg = lerp(p.minElevDeg, p.maxElevDeg, steep)
  const elevRad = elevDeg * DEG

  // Heading toward the rim in the xz-plane (unit).
  const hx0 = RIM_CENTER.x - launch.x
  const hz0 = RIM_CENTER.z - launch.z
  const L = Math.hypot(hx0, hz0) || 1e-6
  const hx = hx0 / L, hz = hz0 / L

  // Lateral yaw from flick x, softened toward the rim heading by aim-assist.
  const assist = Math.min(0.92, p.baseAssist + (1 - intent.releaseQuality) * p.extraAssist)
  const yawDeg = clamp(intent.direction.x, -1, 1) * p.maxYawDeg * (1 - assist)
  const yawRad = yawDeg * DEG

  // Rotate the heading by yaw about Y (flick-right → aim right).
  const cy = Math.cos(yawRad), sy = Math.sin(yawRad)
  const rhx = hx * cy - hz * sy
  const rhz = hx * sy + hz * cy

  const cosE = Math.cos(elevRad)
  const dir: Vec3 = { x: cosE * rhx, y: Math.sin(elevRad), z: cosE * rhz }

  const dy = RIM_HEIGHT - launch.y
  const ideal = idealSpeed(elevRad, L, dy)
  const speed = (Number.isFinite(ideal) ? ideal : 9) * strengthFactor * p.dragComp

  return { velocity: scale(dir, speed), elevationDeg: elevDeg, yawDeg, speed, idealSpeed: ideal }
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}
