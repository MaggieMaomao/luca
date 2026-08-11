// Engine input — bind a DOM element's pointer events to a smoothed gesture
// stream. Emits a Gesture on pointer-up; the game maps it to an intent via
// Game.mapGesture. Works for mouse, touch, and pen (Pointer Events).

import { useEffect, useRef } from 'react'
import { OneEuroFilter } from './OneEuroFilter'
import { GestureEngine } from './GestureEngine'
import type { Gesture, PointerSample } from './types'

export function useGestureInput(
  elementRef: React.RefObject<HTMLElement | null>,
  onGesture: (g: Gesture) => void,
  enabled = true,
): void {
  const cb = useRef(onGesture)
  cb.current = onGesture

  useEffect(() => {
    const el = elementRef.current
    if (!el || !enabled) return

    const filter = new OneEuroFilter()
    const gestures = new GestureEngine()
    let samples: PointerSample[] = []
    let active = false
    const now = () => performance.now() / 1000

    const sample = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const t = now()
      const f = filter.filter(e.clientX - rect.left, e.clientY - rect.top, t)
      samples.push({ t, x: f.x, y: f.y, pressure: e.pressure || 0.5, id: e.pointerId })
    }
    const onDown = (e: PointerEvent) => {
      active = true; samples = []; filter.reset()
      try { el.setPointerCapture(e.pointerId) } catch { /* ignore */ }
      sample(e)
    }
    const onMove = (e: PointerEvent) => { if (active) sample(e) }
    const onUp = (e: PointerEvent) => {
      if (!active) return
      active = false; sample(e)
      try { el.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
      const g = gestures.buildGesture(samples)
      samples = []
      cb.current(g)
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [elementRef, enabled])
}
