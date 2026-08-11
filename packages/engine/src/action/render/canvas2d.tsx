// Engine render — 2D canvas adapter.
//
// Runs a rAF loop: each frame it advances the sim (tick), then calls the game's
// imperative draw(ctx, state, view). DPR-aware. Proves the core is
// renderer-agnostic — the same Game contract backs both 2D and 3D.

import { useEffect, useRef } from 'react'
import type { StageProps } from './types'

export function Canvas2DStage<S>({ game, getState, tick }: StageProps<S>) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    const draw = game.draw
    if (!cv || !draw) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const rect = cv.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = Math.round(rect.width * dpr)
      const h = Math.round(rect.height * dpr)
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h }

      tick(dt)
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, rect.width, rect.height)
      draw(ctx, getState(), { width: rect.width, height: rect.height })
      ctx.restore()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [game, getState, tick])

  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
}
