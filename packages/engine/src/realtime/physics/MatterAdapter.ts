// @luca-game/engine — MatterAdapter (default physics impl).
//
// Wraps Matter.js 0.20+. The engine never imports Matter directly —
// games consume IPhysicsAdapter. Matter is the MVP choice; Rapier
// (WASM) drops in later for deterministic multiplayer.
//
// Matter.js API notes (0.20+):
// - Matter.Engine.create() creates the world
// - Matter.Bodies.circle / rectangle for shapes
// - Matter.Body.setPosition / setVelocity for control
// - Matter.Engine.update(engine, dt) for stepping
// - Matter.Events.on(engine, 'collisionStart', cb) for events
//
// Coordinate system: matter uses (x, y) with y down. We convert
// world Y-up to Y-down at the adapter boundary.

import Matter from 'matter-js'
import type { IPhysicsAdapter, BodySpec, BodyState, ConstraintSpec, PhysicsOpts, CollisionEvent, CollisionKind } from './IPhysicsAdapter'
import type { Vector3 } from '../input/PointerSampler'

/** Internal: maps a body id to the matter body + meta. */
interface BodyEntry {
  id: string
  body: Matter.Body
  kind: CollisionKind
}

export class MatterAdapter implements IPhysicsAdapter {
  private engine: Matter.Engine | null = null
  private world: Matter.World | null = null
  private bodies: Map<string, BodyEntry> = new Map()
  private events: CollisionEvent[] = []
  private tickRate = 60

  /** Internal: classify a body as a surface for the engine (e.g.
   *  'rim', 'backboard'). The game tells us via BodySpec's id
   *  convention (or by tagging). For MVP, we infer from the body
   *  label. */
  private classifyKind(id: string): CollisionKind {
    const lower = id.toLowerCase()
    if (lower.includes('rim')) return 'rim'
    if (lower.includes('backboard')) return 'backboard'
    if (lower.includes('floor')) return 'floor'
    if (lower.includes('wall')) return 'wall'
    if (lower.includes('ball')) return 'ball'
    return 'other'
  }

  init(opts: PhysicsOpts): void {
    this.engine = Matter.Engine.create()
    this.engine.gravity.x = opts.gravity.x
    this.engine.gravity.y = opts.gravity.y
    this.engine.gravity.scale = 0.001  // matter scales gravity by this
    this.world = this.engine.world
    this.tickRate = opts.tickRate

    // Listen for collisions
    Matter.Events.on(this.engine, 'collisionStart', (e: Matter.IEventCollision<Matter.Engine>) => {
      const pair = e.pairs[0]
      if (!pair) return
      const a = pair.bodyA
      const b = pair.bodyB
      // Look up our id by matter body reference
      let aId = ''
      let bId = ''
      let aKind: CollisionKind = 'other'
      let bKind: CollisionKind = 'other'
      for (const [id, entry] of this.bodies.entries()) {
        if (entry.body === a) { aId = id; aKind = entry.kind }
        if (entry.body === b) { bId = id; bKind = entry.kind }
      }
      // Compute impulse proxy: relative velocity magnitude
      const dvx = (a.velocity.x - b.velocity.x)
      const dvy = (a.velocity.y - b.velocity.y)
      const impulse = Math.sqrt(dvx * dvx + dvy * dvy)
      this.events.push({
        bodyA: aId,
        bodyB: bId,
        kindA: aKind,
        kindB: bKind,
        impulse,
        // Matter normal: vector from A to B, but we just use the pair's collision.normal
        position: { x: pair.collision.supports[0]?.x ?? 0, y: pair.collision.supports[0]?.y ?? 0, z: 0 },
        normal: { x: pair.collision.normal.x, y: pair.collision.normal.y, z: 0 },
      })
    })
  }

  addBody(spec: BodySpec): string {
    if (!this.world) return spec.id
    let body: Matter.Body
    const pos = { x: spec.position.x, y: -spec.position.y }   // world y-up -> matter y-down
    const vel = spec.velocity ? { x: spec.velocity.x, y: -spec.velocity.y } : { x: 0, y: 0 }
    if (spec.shape.kind === 'circle') {
      body = Matter.Bodies.circle(pos.x, pos.y, spec.shape.radius, {
        label: spec.id,
        isStatic: spec.bodyKind === 'static',
        isSleeping: false,
        restitution: spec.restitution ?? 0.5,
        friction: spec.friction ?? 0.1,
        frictionAir: spec.linearDamping ?? 0.01,
        mass: spec.mass,
        angle: spec.position.z ?? 0,
      })
    } else {
      body = Matter.Bodies.rectangle(pos.x, pos.y, spec.shape.width, spec.shape.height, {
        label: spec.id,
        isStatic: spec.bodyKind === 'static',
        isSleeping: false,
        restitution: spec.restitution ?? 0.5,
        friction: spec.friction ?? 0.1,
        frictionAir: spec.linearDamping ?? 0.01,
        mass: spec.mass,
        angle: spec.position.z ?? 0,
      })
    }
    Matter.Body.setVelocity(body, vel)
    Matter.Composite.add(this.world, body)
    this.bodies.set(spec.id, {
      id: spec.id,
      body,
      kind: this.classifyKind(spec.id),
    })
    return spec.id
  }

  addConstraint(spec: ConstraintSpec): string {
    if (!this.world) return `${spec.bodyA}-${spec.bodyB}`
    const a = this.bodies.get(spec.bodyA)?.body
    const b = this.bodies.get(spec.bodyB)?.body
    if (!a || !b) return `${spec.bodyA}-${spec.bodyB}`
    // MVP: only weld. Use a stiff distance constraint at zero length
    // (effectively a weld). For more sophisticated constraints, use
    // Matter.Constraint.create with stiffness=1, length=0.
    const constraint = Matter.Constraint.create({
      bodyA: a,
      bodyB: b,
      pointA: { x: spec.pointA.x, y: -spec.pointA.y },
      pointB: { x: spec.pointB.x, y: -spec.pointB.y },
      stiffness: 1,
      damping: 0,
      length: 0,
    })
    Matter.Composite.add(this.world, constraint)
    return `${spec.bodyA}-${spec.bodyB}`
  }

  removeBody(id: string): void {
    const entry = this.bodies.get(id)
    if (!entry || !this.world) return
    Matter.Composite.remove(this.world, entry.body)
    this.bodies.delete(id)
  }

  step(dt: number): void {
    if (!this.engine) return
    // Matter.Engine.update takes delta in milliseconds.
    // The basketball game's rAF loop calls this once per fixed-timestep
    // tick (every ~16.67ms) and passes dt in milliseconds. If a future
    // caller passes dt in seconds, they should multiply by 1000 first.
    Matter.Engine.update(this.engine, dt)
  }

  getStates(): BodyState[] {
    const out: BodyState[] = []
    for (const entry of this.bodies.values()) {
      out.push(this.snapshotEntry(entry))
    }
    return out
  }

  getState(id: string): BodyState | undefined {
    const entry = this.bodies.get(id)
    if (!entry) return undefined
    return this.snapshotEntry(entry)
  }

  setVelocity(id: string, velocity: Vector3): void {
    const entry = this.bodies.get(id)
    if (!entry) return
    Matter.Body.setVelocity(entry.body, { x: velocity.x, y: -velocity.y })
  }

  drainEvents(): CollisionEvent[] {
    const out = this.events
    this.events = []
    return out
  }

  destroy(): void {
    if (this.engine) {
      Matter.Engine.clear(this.engine)
      this.engine = null
    }
    this.world = null
    this.bodies.clear()
    this.events = []
  }

  /** Internal: snapshot a body for the engine. */
  private snapshotEntry(entry: BodyEntry): BodyState {
    const b = entry.body
    return {
      id: entry.id,
      position: { x: b.position.x, y: -b.position.y, z: b.angle },
      velocity: { x: b.velocity.x, y: -b.velocity.y, z: b.angularVelocity },
      rotation: b.angle,
      angularVelocity: b.angularVelocity,
    }
  }

  /** Whether the physics adapter is currently initialized. */
  isReady(): boolean {
    return this.engine !== null
  }
}
