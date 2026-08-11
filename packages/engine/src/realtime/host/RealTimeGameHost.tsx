// @luca-game/engine — RealTimeGameHost React component.
//
// The React shell for real-time games. Mirrors `<GameEngine>` (the
// turn-based shell) but renders a canvas (for PixiJS) and hosts the
// real-time controller hook.
//
// Games use this like:
//   <RealTimeGameHost
//     definition={basketballDef}
//     config={{ gravity: 9.8 }}
//   >
//     <MyGameHUD />
//   </RealTimeGameHost>
//
// The host owns the canvas, mounts the renderer (PixiJS by default)
// and the physics adapter (Matter.js by default). Games can pass their
// own implementations for either.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRealTimeController } from './useRealTimeController'
import type {
  RealTimeGameDefinition,
  RealTimeGameConfig,
  RealTimeInput,
  RealTimeControllerResult,
} from '../contracts'
import type { IRendererAdapter, RenderObject } from '../render/RenderEngineAPI'
import type { IPhysicsAdapter, BodySpec } from '../physics/IPhysicsAdapter'
import { PixiJSRenderer } from '../render/PixiJSRenderer'
import { MatterAdapter } from '../physics/MatterAdapter'

// ── Module-level canvas → renderer cache ──────────────────────────────
// One PixiJS Application per canvas. Sharing instances across host
// remounts (e.g. StrictMode) is critical — PixiJS can't own two
// WebGL contexts on the same canvas.
const sharedCache = new WeakMap<HTMLCanvasElement, {
  renderer: IRendererAdapter
  physics: IPhysicsAdapter
}>()

function getSharedRenderer(canvas: HTMLCanvasElement) {
  return sharedCache.get(canvas) ?? { renderer: null as any, physics: null as any }
}
function setSharedRenderer(canvas: HTMLCanvasElement, renderer: IRendererAdapter, physics: IPhysicsAdapter) {
  sharedCache.set(canvas, { renderer, physics })
}
import type { Vector3 } from '../input/PointerSampler'

// ── RealTimeRenderContext ─────────────────────────────────────────────────

/** What children of <RealTimeGameHost> receive. */
export interface RealTimeRenderContext<
  TState,
  TInput extends RealTimeInput,
  TConfig extends RealTimeGameConfig
> extends Pick<
  RealTimeControllerResult<TState, TInput, TConfig>,
  'state' | 'status' | 'interactive' | 'telemetry' | 'config' | 'submitInput'
> {
  /** The canvas element (the engine mounts the renderer onto this). */
  canvas: HTMLCanvasElement | null
  /** The renderer instance. Games add objects via renderer.addObject. */
  renderer: IRendererAdapter | null
  /** The physics adapter. Games add bodies via physics.addBody. */
  physics: IPhysicsAdapter | null
}

// ── Component ────────────────────────────────────────────────────────────

export interface RealTimeGameHostProps<
  TState,
  TInput extends RealTimeInput,
  TConfig extends RealTimeGameConfig
> {
  definition: RealTimeGameDefinition<TState, TInput, TConfig>
  /** Optional config overrides. */
  config?: Partial<TConfig>
  /** Optional CSS class. */
  className?: string
  /** Optional: provide a custom renderer (defaults to PixiJSRenderer). */
  renderer?: IRendererAdapter
  /** Optional: provide a custom physics adapter (defaults to MatterAdapter). */
  physics?: IPhysicsAdapter
  /** Optional: provide an initial scene (objects to add on init). */
  initialObjects?: RenderObject[]
  /** Optional: provide an initial physics scene (bodies to add on init). */
  initialBodies?: BodySpec[]
  /** Children (HUD, debug panel, etc.) get the render context. */
  children?: (ctx: RealTimeRenderContext<TState, TInput, TConfig>) => ReactNode
}

/**
 * The React shell for real-time games. Renders a <canvas>, mounts
 * PixiJSRenderer + MatterAdapter (or custom adapters), and wires up
 * the real-time controller.
 */
export function RealTimeGameHost<
  TState,
  TInput extends RealTimeInput,
  TConfig extends RealTimeGameConfig
>(props: RealTimeGameHostProps<TState, TInput, TConfig>) {
  const {
    definition, config, className,
    renderer: providedRenderer, physics: providedPhysics,
    initialObjects, initialBodies,
    children,
  } = props
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [renderer, setRenderer] = useState<IRendererAdapter | null>(null)
  const [physics, setPhysics] = useState<IPhysicsAdapter | null>(null)

  const ctrl = useRealTimeController({ definition, config })

  // Mount the renderer + physics adapter on first render.
  // StrictMode-safe: the renderer/physics instances are stored in
  // refs that survive the effect's mount/unmount cycle. On the
  // second mount, we reuse the existing instances instead of
  // creating new ones (which would break the WebGL context).
  const rendererRef = useRef<IRendererAdapter | null>(null)
  const physicsRef = useRef<IPhysicsAdapter | null>(null)

  useEffect(() => {
    console.log('[RealTimeGameHost] mount effect running')
    let cancelled = false
    const canvas = canvasRef.current
    if (!canvas) {
      console.log('[RealTimeGameHost] no canvas ref')
      return
    }

    // Reuse existing instances from a prior mount (StrictMode dev)
    // This is critical: PixiJS can only own one WebGL context per
    // canvas. Reusing the same Application prevents context loss.
    if (rendererRef.current && physicsRef.current) {
      console.log('[RealTimeGameHost] reusing existing renderer/physics')
      setRenderer(rendererRef.current)
      setPhysics(physicsRef.current)
      return
    }

    // Use a single shared Application per canvas. We track instances
    // in a module-level WeakMap keyed by canvas, so even if the
    // host component unmounts and remounts (e.g. StrictMode), we
    // don't create a new Application.
    const shared = getSharedRenderer(canvas)
    if (shared.renderer && shared.physics) {
      console.log('[RealTimeGameHost] using shared renderer/physics from cache')
      setRenderer(shared.renderer)
      setPhysics(shared.physics)
      rendererRef.current = shared.renderer
      physicsRef.current = shared.physics
      return
    }

    // For the FIRST init, wait for canvas to be properly sized.
    // StrictMode's first run may mount before layout, causing
    // width=0 issues. We defer with rAF.
    const rect = canvas.getBoundingClientRect()
    let width = rect.width || 800
    let height = rect.height || 600
    if (width === 0 || height === 0) {
      console.log('[RealTimeGameHost] canvas has 0 size, deferring init')
      // Defer init until next frame
      setTimeout(() => {
        if (!cancelled) {
          // Re-run the effect with a sized canvas
          // (StrictMode will handle the cleanup)
        }
      }, 0)
      return
    }

    const r: IRendererAdapter = providedRenderer ?? new PixiJSRenderer()
    const p: IPhysicsAdapter = providedPhysics ?? new MatterAdapter()
    console.log('[RealTimeGameHost] canvas size:', width, height)

    ;(async () => {
      try {
        // Only init if not already initialized
        if (!r.isReady?.()) {
          await r.init(canvas, { width, height, pixelRatio: window.devicePixelRatio || 1 })
        }
        // Note: in StrictMode, the first effect's cleanup runs WHILE
        // we're awaiting init. We don't destroy on cancel — the
        // instance stays in the shared cache for the next mount.
        // Add initial objects. Idempotent — if the same obj.id is added
        // twice PixiJS will just add another graphics, so we check.
        for (const obj of initialObjects ?? []) {
          if (!r.isReady?.()) continue
          // (If we re-init, adding again is safe — PixiJS will just
          //  add another graphics object. The init only happens once
          //  per renderer since we check isReady above.)
          r.addObject(obj)
        }
        // Init physics (idempotent via isReady)
        if (p.isReady?.() === false) {
          const cfg = ctrl.config
          p.init({
            gravity: { x: 0, y: (cfg as any).gravity ?? -9.8, z: 0 },
            tickRate: cfg.tickRate ?? 120,
          })
          for (const spec of initialBodies ?? []) {
            p.addBody(spec)
          }
        }

        // Store in shared cache BEFORE the cancelled check. Even if
        // this mount's cleanup ran while we were awaiting init, the
        // cache must be populated so the next mount (e.g. StrictMode's
        // second pass or a real remount) can reuse the renderer.
        setSharedRenderer(canvas, r, p)
        rendererRef.current = r
        physicsRef.current = p
        setRenderer(r)
        setPhysics(p)

        if (cancelled) {
          return  // Second mount will handle subsequent stuff
        }

        // Reset canvas inline styles after init. PixiJS sets
        // canvas.style.width/height during init() — we replace
        // them with `100%` so the host's CSS rules (width:100%,
        // height:100%) can drive the rendered size. Then resize
        // the renderer's internal buffer to match the actual
        // host size.
        canvas.style.width = '100%'
        canvas.style.height = '100%'
        requestAnimationFrame(() => {
          const rect = canvas.getBoundingClientRect()
          if (rect.width > 0 && rect.height > 0) {
            r.resize?.(rect.width, rect.height)
          }
        })
      } catch (err) {
        console.error('Failed to mount real-time host:', err)
        // Don't destroy — let it GC naturally. PixiJS Application
        // may already be in a broken state.
      }
    })()

    // Watch for size changes via ResizeObserver. PixiJS Application
    // is given an explicit width/height during init (which may be
    // stale or wrong), then we resize it to match the actual host
    // dimensions. ResizeObserver catches subsequent layout shifts.
    const hostEl = canvas.parentElement
    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && hostEl) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          if (width === 0 || height === 0) continue
          // Use the active renderer (the first one created, since
          // StrictMode reuses the same instance across remounts).
          const activeRenderer = rendererRef.current
          activeRenderer?.resize?.(width, height)
        }
      })
      resizeObserver.observe(hostEl)
    }

    return () => {
      cancelled = true
      // Disconnect the ResizeObserver so it doesn't fire after unmount
      resizeObserver?.disconnect()
      // Do NOT destroy here. The refs hold the instance alive
      // for the second mount. The actual destroy happens on
      // unmount (when the component fully leaves the tree).
    }
  }, [providedRenderer, providedPhysics, initialObjects, initialBodies, ctrl])  // eslint-disable-line react-hooks/exhaustive-deps

  // Full unmount cleanup: only when the component truly leaves
  // (e.g. the user navigates away from the game).
  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        try { rendererRef.current.destroy() } catch {}
        rendererRef.current = null
      }
      if (physicsRef.current) {
        try { physicsRef.current.destroy() } catch {}
        physicsRef.current = null
      }
    }
  }, [])

  // Auto-start the controller when the host mounts (after renderer
  // and physics are ready).
  useEffect(() => {
    if (renderer && physics) {
      ctrl.restart()
    }
  }, [renderer, physics])  // eslint-disable-line react-hooks/exhaustive-deps

  // Drive the physics simulation forward each frame and copy
  // body positions back into the renderer. Games that animate
  // bodies via tweens (basketball) can ignore the ball position
  // readback by writing their own `renderer.updateObject('ball', ...)`
  // in a tween loop after each tick.
  useEffect(() => {
    if (!physicsRef.current || !rendererRef.current) return
    let raf = 0
    let lastT = performance.now()
    const FIXED_DT_MS = 16.67
    const tick = (now: number): void => {
      const rawDt = now - lastT
      lastT = now
      const dt = Math.min(50, Math.max(FIXED_DT_MS, rawDt))
      const p = physicsRef.current
      const r = rendererRef.current
      if (!p || !r) return
      p.step(dt)
      const ballState = p.getState('ball') as unknown as { position: { x: number; y: number }; angle?: number } | undefined
      if (ballState && ballState.position) {
        r.updateObject('ball', {
          position: { x: ballState.position.x, y: ballState.position.y, z: 0 },
          rotation: ballState.angle ?? 0,
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(physics), Boolean(renderer)])

  const renderCtx: RealTimeRenderContext<TState, TInput, TConfig> = {
    state: ctrl.state,
    status: ctrl.status,
    interactive: ctrl.interactive,
    telemetry: ctrl.telemetry,
    config: ctrl.config,
    canvas: canvasRef.current,
    submitInput: ctrl.submitInput,
    renderer,
    physics,
  }

  return (
    <div className={className ?? 'luca-rt-host'} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          touchAction: 'none',  // prevent browser gesture handling
        }}
      />
      {children?.(renderCtx)}
    </div>
  )
}
