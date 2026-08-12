// @luca-game/engine — Real-time engine public API barrel.
//
// Consumers import from `@luca-game/engine/realtime` (or just
// `@luca-game/engine` for both turn-based and real-time engines).
//
// The real-time engine is a SIBLING of the turn-based engine. The
// two share infrastructure (storage, lifecycle, completion, React
// hosting) but not the state-machine model.
//
// See docs/GESTURE_ALGORITHM.md for the gesture-to-shot algorithm.

// ── React surface ──────────────────────────────────────────────────────────

export { RealTimeGameHost } from './host/RealTimeGameHost'
export type {
  RealTimeGameHostProps,
  RealTimeRenderContext,
} from './host/RealTimeGameHost'

export { useRealTimeController } from './host/useRealTimeController'
export type {
  UseRealTimeControllerOptions,
  GameTelemetry,
} from './host/useRealTimeController'

// ── Scheduler ─────────────────────────────────────────────────────────────

export { FixedTimestepScheduler } from './host/FixedTimestepScheduler'
export type {
  TickCallback,
  RenderCallback,
  SchedulerStatus,
} from './host/FixedTimestepScheduler'

// ── Replay ────────────────────────────────────────────────────────────────

export type { ReplayHandle, ReplayFrame } from './host/ReplayRecorder'
export type { ReplayData } from './host/ReplayRecorder-impl'
export { ReplayRecorder } from './host/ReplayRecorder-impl'

// ── Input primitives ──────────────────────────────────────────────────────

export type {
  PointerSample,
  Gesture,
  GestureType,
  ThrowIntent,
  Vector3,
} from './input/PointerSampler'
export { PointerSampler } from './input/PointerSampler'
export type {
  PointerSamplerOptions,
  PointerSampleCallback,
  GestureEndCallback,
} from './input/PointerSampler'

export { OneEuroFilter } from './input/OneEuroFilter'
export { GestureEngine, defaultGestureEngineConfig } from './input/GestureEngine'
export type { GestureEngineConfig } from './input/GestureEngine'
export { ThrowSystem, defaultThrowSystemConfig } from './input/ThrowSystem'
export type { ThrowSystemConfig } from './input/ThrowSystem'

// ── Sports framework ──────────────────────────────────────────────────────

export { ShotClassifier } from './sports/ShotClassifier'
export type {
  ShotContext,
  ShotContact,
  ShotClassification,
  ShotClassifierRule,
} from './sports/ShotClassifier'

// ── Core contracts ────────────────────────────────────────────────────────

export type {
  RealTimeGameDefinition,
  RealTimeGameConfig,
  RealTimeInput,
  RealTimeEvent,
  RealTimeRenderEvent,
  RealTimeControllerResult,
} from './contracts'

// ── Version ──────────────────────────────────────────────────────────────

export const REALTIME_ENGINE_VERSION = '0.1.0'

// ── Renderer bridge ──────────────────────────────────────────────────────

export type {
  IRendererAdapter,
  RenderObject,
  CameraState,
} from './render/RenderEngineAPI'
export { PixiJSRenderer } from './render/PixiJSRenderer'

// ── Physics bridge ───────────────────────────────────────────────────────

export type {
  IPhysicsAdapter,
  BodySpec,
  BodyState,
  BodyShape,
  BodyKind,
  CollisionEvent,
  CollisionKind,
  ConstraintSpec,
  PhysicsOpts,
} from './physics/IPhysicsAdapter'
export { MatterAdapter } from './physics/MatterAdapter'
