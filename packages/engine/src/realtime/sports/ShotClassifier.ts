// @luca-game/engine — ShotClassifier (engine-level shot classification).
//
// The engine provides the FRAMEWORK for shot classification:
//   - ShotType (string) is game-defined
//   - ShotContext (game-agnostic input: ball trajectory, surfaces hit)
//   - classify() returns a list of (type, score) candidates
//
// The GAME provides the actual classification rules — basketball
// decides what counts as a "swish" vs "rim"; soccer decides what
// counts as a "goal" vs "post"; tennis decides what counts as "in"
// vs "out". The engine just provides the data structure.
//
// Per the vertical-slice loop, this generalizes after 1+ game
// proves it useful.

import type { Vector3 } from '../input/PointerSampler'

/** A surface that the ball touched during a shot. */
export interface ShotContact {
  /** Stable id of the surface (e.g. "rim-front", "backboard"). */
  surfaceId: string
  /** Hint for what kind of surface (from the physics adapter's
   *  CollisionKind). The game decides what each kind means. */
  kind: string
  /** World-space contact position. */
  position: Vector3
  /** Time of contact (seconds since shot start). */
  t: number
  /** Impulse magnitude (proxy for how hard the ball hit). */
  impulse: number
}

/** A shot's trajectory metadata. */
export interface ShotContext {
  /** Where the ball was released (m). */
  releasePoint: Vector3
  /** Where the ball is now (m). */
  currentPoint: Vector3
  /** Total elapsed time since release (s). */
  elapsed: number
  /** Contacts in chronological order. */
  contacts: ShotContact[]
  /** Has the ball passed below the rim level (for basketball). */
  belowRim: boolean
  /** Has the ball's velocity gone to zero (settled on the floor). */
  hasSettled: boolean
}

/** A classification candidate from the engine's ShotClassifier. */
export interface ShotClassification {
  /** Game-defined shot type, e.g. "swish", "make", "miss". */
  type: string
  /** 0-1 confidence in this classification. */
  confidence: number
  /** Optional: human-readable detail (e.g. "touched rim before going in"). */
  detail?: string
}

/** A classifier rule. Each rule takes a context and returns either
 *  a classification (with confidence) or null. The engine runs all
 *  rules and returns the highest-confidence result. */
export type ShotClassifierRule = (ctx: ShotContext) => ShotClassification | null

/** The engine's ShotClassifier. Games register rules; the engine
 *  runs them in order and picks the highest-confidence result. */
export class ShotClassifier {
  private rules: ShotClassifierRule[] = []

  /** Register a classifier rule. */
  addRule(rule: ShotClassifierRule): void {
    this.rules.push(rule)
  }

  /** Run all rules. Returns the highest-confidence classification,
 *  or null if no rule matches. */
  classify(ctx: ShotContext): ShotClassification | null {
    let best: ShotClassification | null = null
    for (const rule of this.rules) {
      const result = rule(ctx)
      if (result && (!best || result.confidence > best.confidence)) {
        best = result
      }
    }
    return best
  }
}