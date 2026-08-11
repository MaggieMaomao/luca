// @luca-game/engine — IPhysicsAdapter interface.
//
// The engine never imports from a specific physics library (Matter.js,
// Rapier, Cannon). It publishes "body specs" and "constraint specs"
// and gets back "body state" + "collision events".
//
// Games can swap in Rapier (WASM) for deterministic multiplayer.
// Same interface — drop-in replacement.

import type { Vector3 } from '../input/PointerSampler'

// ── Body spec ────────────────────────────────────────────────────────────

/** What kind of physics body to create. */
export type BodyKind = 'dynamic' | 'static' | 'kinematic'

/** Shape for the body collider. MVP supports circle and rectangle. */
export type BodyShape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rect'; width: number; height: number }

/** A body's physical properties. */
export interface BodySpec {
  /** Stable id (the game's key). */
  id: string
  /** What kind of body. */
  bodyKind: BodyKind
  /** World position (center). */
  position: Vector3
  /** Initial velocity. (0,0,0) for static / resting dynamic bodies. */
  velocity?: Vector3
  /** Shape. */
  shape: BodyShape
  /** Mass (kg). Ignored for static bodies. */
  mass?: number
  /** Coefficient of restitution (bounciness). 0 = no bounce, 1 = perfect bounce. */
  restitution?: number
  /** Friction coefficient. 0 = frictionless, 1 = sticky. */
  friction?: number
  /** Linear damping (air drag). 0 = no drag, higher = more drag. */
  linearDamping?: number
  /** Angular damping. 0 = no spin decay, higher = spin slows faster. */
  angularDamping?: number
}

// ── Constraint spec ──────────────────────────────────────────────────────

/** A constraint between two bodies. MVP only needs a weld
 *  (pin two bodies together at a fixed offset) for things like
 *  the rim being made of 8 circle bodies welded into a ring. */
export type ConstraintSpec =
  | {
    kind: 'weld'
    bodyA: string
    bodyB: string
    /** Local offset on body A. */
    pointA: Vector3
    /** Local offset on body B. */
    pointB: Vector3
  }
  // future: 'spring', 'rope', 'revolute', 'distance'

// ── Body state (read-only snapshot) ──────────────────────────────────────

/** What the engine reads back from the physics adapter each tick. */
export interface BodyState {
  id: string
  position: Vector3
  velocity: Vector3
  /** Rotation in radians around the Z axis (2D physics; 3D would have a quaternion). */
  rotation: number
  /** Angular velocity in rad/s. */
  angularVelocity: number
}

// ── Collision event ──────────────────────────────────────────────────────

/** What kind of collision happened. */
export type CollisionKind = 'rim' | 'backboard' | 'floor' | 'wall' | 'ball' | 'other'

/** A single collision event from a physics step. */
export interface CollisionEvent {
  /** The two bodies involved. */
  bodyA: string
  bodyB: string
  /** Hint about what kind of surface bodyA is (the engine / game
   *  can use this for shot classification later). */
  kindA: CollisionKind
  /** Same for bodyB. */
  kindB: CollisionKind
  /** Impulse magnitude (proportional to bounce strength). */
  impulse: number
  /** World position of the contact. */
  position: Vector3
  /** Normal vector at the contact. */
  normal: Vector3
}

// ── Adapter interface ────────────────────────────────────────────────────

/** Physics adapter options. */
export interface PhysicsOpts {
  /** World gravity. MVP uses -Y. */
  gravity: Vector3
  /** Physics tick rate (Hz). MVP uses 120. */
  tickRate: number
}

export interface IPhysicsAdapter {
  /** Initialize the world. */
  init(opts: PhysicsOpts): void

  /** Whether the physics adapter is currently initialized. */
  isReady?(): boolean

  /** Add a body. Returns the id (or a renderer-assigned handle). */
  addBody(spec: BodySpec): string

  /** Add a constraint. */
  addConstraint(spec: ConstraintSpec): string

  /** Remove a body (and any constraints attached to it). */
  removeBody(id: string): void

  /** Step the simulation by dt seconds. */
  step(dt: number): void

  /** Get a snapshot of all body states. */
  getStates(): BodyState[]

  /** Get a specific body's state. */
  getState(id: string): BodyState | undefined

  /** Set a body's velocity directly. Used for shots. */
  setVelocity(id: string, velocity: Vector3): void

  /** Drain collision events accumulated since the last step. */
  drainEvents(): CollisionEvent[]

  /** Tear down. */
  destroy(): void
}
