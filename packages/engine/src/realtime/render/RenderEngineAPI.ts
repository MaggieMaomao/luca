// @luca-game/engine — IRendererAdapter interface.
//
// The engine never imports from a specific renderer (PixiJS, Three.js,
// Babylon.js). It publishes "events to render" (positions, particle
// effects, camera shake) through this interface and the default
// adapter (PixiJS) translates them to draw calls.
//
// Games can swap in their own renderer for stylistic reasons:
// - Cartoon / stylized look using Canvas 2D
// - 3D using Three.js (future)
// - Headless / server-side for testing
//
// All renderers implement the same interface. The engine treats them
// identically.

import type { RealTimeRenderEvent } from '../contracts'
import type { Vector3 } from '../input/PointerSampler'

/** Camera state. Updated by the game's update() and read by the
 *  renderer. */
export interface CameraState {
  /** World-space position of the camera. */
  position: Vector3
  /** World-space point the camera looks at. */
  target: Vector3
  /** Up vector (typically (0, 1, 0)). */
  up: Vector3
  /** Field of view in degrees. */
  fov: number
  /** Near clip plane in world units. */
  near: number
  /** Far clip plane in world units. */
  far: number
  /** Screen shake offset (added to position on render). */
  shake: Vector3
}

/** A drawable object on the canvas. Games add these to the renderer
 *  via `addObject()`. The renderer manages their lifecycle.
 *
 *  MVP: this is a minimal interface — just position, scale, and a
 *  draw fn. Real PixiJS objects are wrapped in this. */
export interface RenderObject {
  /** Stable id (the game's stable key). */
  id: string
  /** World position. */
  position: Vector3
  /** Uniform scale (1.0 = default). */
  scale: number
  /** Rotation around Z axis in radians. */
  rotation: number
  /** Color (hex string, e.g. "#ff7700"). */
  color?: string
  /** Free-form shape hint: "ball" | "rim" | "backboard" | "court"
   *  | "wall" | "floor". The renderer interprets it. */
  shape: 'ball' | 'rim' | 'backboard' | 'court' | 'wall' | 'floor' | 'rect'
  /** Width and depth in world units. For 'rect' / 'floor' / 'wall'
   *  this is the half-extent; for 'ball' this is the radius. */
  size: { width: number; height: number; depth?: number }
}

/** Renderer adapter interface. All renderers (PixiJS, Three.js,
 *  Canvas 2D, headless) implement this. */
export interface IRendererAdapter {
  /** Initialize the canvas. Engine calls once when the host mounts. */
  init(canvas: HTMLCanvasElement, opts: { width: number; height: number; pixelRatio?: number }): void | Promise<void>

  /** Whether the renderer is currently initialized. Used by the host
   *  to detect StrictMode double-mounts and avoid re-init. */
  isReady?(): boolean

  /** Resize the renderer's internal buffer to match new dimensions.
   *  Engine calls when the host element resizes (via ResizeObserver). */
  resize?(width: number, height: number): void

  /** Add a drawable object. Returns the object id (which may be the
   *  same as the input, or a renderer-assigned handle). */
  addObject(obj: RenderObject): string

  /** Update an existing object's transform/color. */
  updateObject(id: string, patch: Partial<RenderObject>): void

  /** Remove an object from the render scene. */
  removeObject(id: string): void

  /** Apply a render-side effect (camera shake, particles, etc.). */
  applyEffect(effect: RealTimeRenderEvent): void

  /** Update the camera state (called every frame with new camera). */
  setCamera(camera: CameraState): void

  /** Get current canvas dimensions. */
  getSize(): { width: number; height: number }

  /** Optional: take a screenshot. Used by replay. */
  screenshot?(): Promise<Blob>

  /** Tear down. Engine calls on unmount. */
  destroy(): void
}
