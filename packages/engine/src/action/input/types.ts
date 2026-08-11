// FPS Hoops — input primitives.
//
// Ported from luca @luca-game/engine realtime/input (PointerSampler.ts).
// Pure, dependency-free types shared by the gesture pipeline. Copied into
// catobigato so the 3D game is fully decoupled from the luca package.

/** A single pointer event captured during a drag. */
export interface PointerSample {
  /** Wall-clock time in seconds (from performance.now() / 1000). */
  t: number
  /** Position in CSS pixels (not device pixels). */
  x: number
  y: number
  /** Optional pressure (0-1). 0.5 on devices that don't support it. */
  pressure: number
  /** Pointer id (for multi-touch, future). */
  id: number
}

export type GestureType = 'tap' | 'swipe' | 'cancel' | 'in-progress'

/** A gesture is a sequence of samples from pointerdown to pointerup. */
export interface Gesture {
  type: GestureType
  samples: PointerSample[]
  startT: number
  endT: number
  /** Straight-line distance from start to end (CSS px). */
  displacement: number
  /** Time span of the gesture in seconds. */
  duration: number
}

/** Plain numeric 3-vector (no three.js dependency at the input layer). */
export interface Vector3 {
  x: number
  y: number
  z: number
}

/** The sports contract produced by ThrowSystem, consumed by the game.
 *  `direction` is a normalized 2D screen vector (y flipped so up = +y);
 *  `z` is left 0 — mapping to 3D world space is the game's job (sim/shot.ts). */
export interface ThrowIntent {
  /** Normalized throw direction. x = lateral, y = up (screen y flipped), z = 0. */
  direction: Vector3
  /** Power in m/s. */
  power: number
  /** Spin in rad/s. 0 = none. */
  spin: number
  /** 0–1; how clean the release was. 1 = perfect. */
  releaseQuality: number
  /** 0–1; confidence this is a real throw vs. accidental tap. */
  confidence: number
}
