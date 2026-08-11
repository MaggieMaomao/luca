// FPS Hoops — court geometry & physics constants (NBA-real, meters).
//
// Coordinate origin is at the shooter's feet on the free-throw line.
// The hoop is straight ahead at negative Z. Heights are world Y.

import type { Vec3 } from './types.ts'

export const GRAVITY = 9.81            // m/s² (real gravity; realistic arc at real dims)
export const AIR_DRAG = 0.02           // s⁻¹ linear drag (very light; arcade)

export const BALL_RADIUS = 0.12        // men's basketball ≈ 24 cm diameter

// Cache-buster for the in-place public/ image assets (frames + ball). These
// keep stable filenames but change between releases, so bump this when the
// shot frames or ball cutout are re-cut to force browsers/CDN to refetch.
export const ASSET_VERSION = '3'

// Rim: 10 ft high, 18" diameter.
export const RIM_HEIGHT = 3.05
export const RIM_RADIUS = 0.2286       // 0.4572 m diameter / 2
export const RIM_TUBE = 0.008          // rim bar radius (~5/8")

// Free-throw line is 4.57 m from the backboard; rim center is 0.15 m out from
// the board → ~4.42 m from the line. Shooter stands a touch behind the line.
export const RIM_Z = -4.35             // rim center Z (in front of shooter)
export const RIM_CENTER: Vec3 = { x: 0, y: RIM_HEIGHT, z: RIM_Z }

// Backboard: 1.83 m wide × 1.07 m tall, inner bottom at 2.90 m, sits 0.15 m
// behind the rim center.
export const BACKBOARD_Z = RIM_Z - 0.15
export const BACKBOARD_W = 1.83
export const BACKBOARD_H = 1.07
export const BACKBOARD_BOTTOM = 2.90
export const BACKBOARD_TOP = BACKBOARD_BOTTOM + BACKBOARD_H
export const BACKBOARD_CENTER_Y = (BACKBOARD_BOTTOM + BACKBOARD_TOP) / 2

// Ball RELEASE point — above the head, just in front, as a real jump/set shot
// leaves the fingertips. Physics flight begins here. The lower "set/hold"
// position (waist/chest) is derived from this at render time (SET_DROP/BACK).
export const LAUNCH_POS: Vec3 = { x: 0, y: 2.05, z: -0.05 }

// Set/hold pose: how far below + behind the release the ball rests before the
// shot. Kept modest so the held ball sits near eye level and the wrists show.
export const SET_DROP = 0.45
export const SET_BACK = 0.2

export const FLOOR_Y = 0

// Restitution (arcade-tuned).
export const RIM_RESTITUTION = 0.55
export const BACKBOARD_RESTITUTION = 0.5
export const FLOOR_RESTITUTION = 0.6

// Fixed simulation timestep.
export const FIXED_DT = 1 / 120        // s
export const MAX_STEPS = 120 * 6       // 6 s safety cap per shot
