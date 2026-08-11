// @luca-game/engine — PixiJSRenderer (default renderer impl).
//
// The default IRendererAdapter. Wraps PixiJS 8. Games don't import
// PixiJS directly — they only use the IRendererAdapter interface.
//
// The renderer is intentionally MINIMAL: it draws circles, rectangles,
// and applies camera shake. No game-specific visuals (no ball sprite,
// no rim, no net, no court) — those are the game's job. The engine
// provides primitives; games compose them.
//
// PixiJS 8 note: Application.init() is async (returns Promise).
// The engine awaits init before calling draw() for the first time.

import { Application, Container, Graphics } from 'pixi.js'
import type { IRendererAdapter, RenderObject, CameraState } from './RenderEngineAPI'
import type { RealTimeRenderEvent, Vector3 } from '../index'

/** Internal: maps a RenderObject to its PixiJS Graphics node. */
interface ObjectEntry {
  obj: RenderObject
  graphics: Graphics
  /** Cached tint color (hex). */
  color: number
}

/** Default renderer. Uses PixiJS 8 with WebGL. */
export class PixiJSRenderer implements IRendererAdapter {
  private app: Application | null = null
  private world: Container | null = null
  private objects: Map<string, ObjectEntry> = new Map()
  private camera: CameraState | null = null
  private _width = 0
  private _height = 0
  private _pixelRatio = 1

  /** Internal: convert a Vector3 to (x, y) on the 2D screen.
   *  MVP uses a simple top-down/3rd-person camera with the y-axis
   *  flipped (canvas y is down, world y is up). */
  private worldToScreen(p: Vector3): { x: number; y: number } {
    if (!this.camera) return { x: 0, y: 0 }
    // Project: simple perspective with the camera at the origin
    // looking down -Z. World units: 1 unit = 1 meter. The camera
    // position is offset from the world origin; we shift everything.
    const dx = p.x - this.camera.position.x
    const dy = p.y - this.camera.position.y
    const dz = p.z - this.camera.position.z
    // Perspective: x_screen = (dx / -dz) * focal_length
    // For MVP, use a simple orthographic-ish projection.
    // Focal length in pixels = (height/2) / tan(fov/2)
    const focal = (this._height / 2) / Math.tan((this.camera.fov * Math.PI / 180) / 2)
    if (dz >= 0) {
      // Behind or at the camera; clamp
      return { x: this._width / 2, y: this._height / 2 }
    }
    const sx = (dx / -dz) * focal + this._width / 2
    const sy = (-dy / -dz) * focal + this._height / 2
    return { x: sx, y: sy }
  }

  /** Internal: world-units per pixel. Used for sizing shapes. */
  private worldUnitsPerPixel(): number {
    if (!this.camera) return 0.01
    return 1 / ((this._height / 2) / Math.tan((this.camera.fov * Math.PI / 180) / 2))
  }

  async init(canvas: HTMLCanvasElement, opts: { width: number; height: number; pixelRatio?: number }): Promise<void> {
    this._width = opts.width
    this._height = opts.height
    this._pixelRatio = opts.pixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

    this.app = new Application()
    await this.app.init({
      canvas,
      width: opts.width,
      height: opts.height,
      resolution: this._pixelRatio,
      autoDensity: true,
      antialias: true,
      backgroundAlpha: 0,   // transparent — host page provides background
      autoStart: true,      // ensure ticker is running
      preserveDrawingBuffer: true,  // allow canvas reads for screenshots/replay
    })
    // Force a render to make the first frame visible. Without this,
    // PixiJS waits for the next ticker iteration to draw, which can
    // race with our test/scene inspection.
    this.app.render()

    // Reset any inline style PixiJS set — let host CSS control display size.
    canvas.style.width = ''
    canvas.style.height = ''

    this.world = new Container()
    this.app.stage.addChild(this.world)

    // Default camera at the origin looking down -Z. Without a camera,
    // worldToScreen returns (0, 0) for all objects and nothing is
    // visible. Games call setCamera() to override this with a better
    // view (e.g., behind the backboard looking at the rim).
    if (!this.camera) {
      this.camera = {
        position: { x: 0, y: 2, z: 8 },   // Behind the hoop, eye-level
        target:   { x: 0, y: 2, z: 0 },   // Looking down -Z toward origin
        up:       { x: 0, y: 1, z: 0 },
        fov: 60,
        near: 0.1,
        far: 100,
        shake:    { x: 0, y: 0, z: 0 },
      }
    }
  }

  /** Resize the renderer to match the canvas's current CSS size.
   *  Called by the host via ResizeObserver. */
  resize(width: number, height: number): void {
    if (!this.app) return
    if (width === this._width && height === this._height) return
    this._width = width
    this._height = height
    this.app.renderer.resize(width, height)
  }

  addObject(obj: RenderObject): string {
    if (!this.world) return obj.id
    const graphics = new Graphics()
    this.objects.set(obj.id, { obj, graphics, color: 0xffffff })
    this.world.addChild(graphics)
    this.redrawObject(this.objects.get(obj.id)!)
    return obj.id
  }

  updateObject(id: string, patch: Partial<RenderObject>): void {
    const entry = this.objects.get(id)
    if (!entry) return
    entry.obj = { ...entry.obj, ...patch }
    this.redrawObject(entry)
  }

  removeObject(id: string): void {
    const entry = this.objects.get(id)
    if (!entry || !this.world) return
    this.world.removeChild(entry.graphics)
    entry.graphics.destroy()
    this.objects.delete(id)
  }

  applyEffect(effect: RealTimeRenderEvent): void {
    if (effect.kind === 'cameraShake') {
      if (this.camera) {
        this.camera.shake = {
          x: (Math.random() - 0.5) * effect.intensity,
          y: (Math.random() - 0.5) * effect.intensity,
          z: 0,
        }
        // Decay the shake over duration
        setTimeout(() => {
          if (this.camera) this.camera.shake = { x: 0, y: 0, z: 0 }
        }, effect.duration * 1000)
      }
    }
    // particleBurst, flash, sound: TODO Phase 6.3+
  }

  setCamera(camera: CameraState): void {
    this.camera = camera
    // Apply shake offset to world container
    if (this.world && camera.shake) {
      this.world.x = camera.shake.x
      this.world.y = camera.shake.y
    }
  }

  getSize(): { width: number; height: number } {
    return { width: this._width, height: this._height }
  }

  async screenshot(): Promise<Blob> {
    if (!this.app) throw new Error('Renderer not initialized')
    return new Promise<Blob>((resolve, reject) => {
      try {
        const canvas = this.app!.canvas
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create blob'))
        }, 'image/png')
      } catch (e) {
        reject(e)
      }
    })
  }

  destroy(): void {
    for (const entry of this.objects.values()) {
      entry.graphics.destroy()
    }
    this.objects.clear()
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true })
      this.app = null
    }
    this.world = null
  }

  isReady(): boolean {
    return this.app !== null
  }

  /** Internal: redraw a single object based on its current state.
   *  PixiJS 8 Graphics: clear() then redraw. */
  private redrawObject(entry: ObjectEntry): void {
    const { obj, graphics } = entry
    const { x, y } = this.worldToScreen(obj.position)
    const units = this.worldUnitsPerPixel()
    const color = obj.color ? this.parseColor(obj.color) : 0xffffff

    graphics.clear()
    graphics.x = x
    graphics.y = y
    graphics.rotation = obj.rotation
    graphics.scale = obj.scale

    switch (obj.shape) {
      case 'ball': {
        // Circle in world units; convert to pixels
        const rPx = obj.size.width / units
        graphics.circle(0, 0, rPx)
        graphics.fill({ color })
        break
      }
      case 'rim': {
        // Rim = a ring (annulus). Outer radius = size.width,
        // inner radius = ~80% of outer.
        const rOuter = obj.size.width / units
        const rInner = rOuter * 0.78
        graphics.circle(0, 0, rOuter)
        graphics.fill({ color: 0x000000, alpha: 0 })  // transparent
        graphics.stroke({ width: (rOuter - rInner), color })
        break
      }
      case 'rect': {
        const wPx = obj.size.width / units
        const hPx = obj.size.height / units
        graphics.rect(-wPx, -hPx, wPx * 2, hPx * 2)
        graphics.fill({ color })
        break
      }
      case 'court':
      case 'floor':
      case 'wall': {
        // Same as rect but with a thin stroke
        const wPx = obj.size.width / units
        const hPx = obj.size.height / units
        graphics.rect(-wPx, -hPx, wPx * 2, hPx * 2)
        graphics.fill({ color, alpha: 0.8 })
        graphics.stroke({ width: 1, color: 0x000000, alpha: 0.3 })
        break
      }
      case 'backboard': {
        // Backboard = a rectangle with an inner square
        const wPx = obj.size.width / units
        const hPx = obj.size.height / units
        graphics.rect(-wPx, -hPx, wPx * 2, hPx * 2)
        graphics.fill({ color })
        graphics.stroke({ width: 4, color: 0x000000, alpha: 0.5 })
        break
      }
    }
  }

  /** Internal: parse hex color string to a 24-bit integer. */
  private parseColor(hex: string): number {
    const m = hex.match(/^#?([0-9a-fA-F]{6})$/)
    if (m) return parseInt(m[1], 16)
    return 0xffffff
  }
}
