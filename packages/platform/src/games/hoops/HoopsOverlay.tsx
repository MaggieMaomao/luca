// Hoops — the first-person hands viewmodel: a real-photo frame sequence driven
// LIVE off the shot state (its own rAF, crossfaded). A live DOM overlay over the
// stage (the engine's Overlay slot). Ported from the original HoopsPage.

import { useEffect, useMemo, useRef } from 'react'
import type { OverlayProps } from '@luca-game/engine/action'
import { getShotFrame, type HoopsState, type HoopsIntent } from './hoopsSim'

// Bundled shot frames (f00–f14). `new URL(..., import.meta.url)` is standard ESM
// (tsc-clean); the consumer's bundler resolves + content-hashes each, so no
// manual ?v= cache-bust is needed.
const SHOT_FRAMES = [
  new URL('./assets/shot/f00.png', import.meta.url).href,
  new URL('./assets/shot/f01.png', import.meta.url).href,
  new URL('./assets/shot/f02.png', import.meta.url).href,
  new URL('./assets/shot/f03.png', import.meta.url).href,
  new URL('./assets/shot/f04.png', import.meta.url).href,
  new URL('./assets/shot/f05.png', import.meta.url).href,
  new URL('./assets/shot/f06.png', import.meta.url).href,
  new URL('./assets/shot/f07.png', import.meta.url).href,
  new URL('./assets/shot/f08.png', import.meta.url).href,
  new URL('./assets/shot/f09.png', import.meta.url).href,
  new URL('./assets/shot/f10.png', import.meta.url).href,
  new URL('./assets/shot/f11.png', import.meta.url).href,
  new URL('./assets/shot/f12.png', import.meta.url).href,
  new URL('./assets/shot/f13.png', import.meta.url).href,
  new URL('./assets/shot/f14.png', import.meta.url).href,
]

export function HoopsOverlay({ getState }: OverlayProps<HoopsState, HoopsIntent>) {
  const layerA = useRef<HTMLImageElement>(null)
  const layerB = useRef<HTMLImageElement>(null)
  const active = useRef(0)
  const curFrame = useRef(1)

  const frameUrls = useMemo(() => SHOT_FRAMES, [])
  useEffect(() => { frameUrls.forEach(u => { const im = new Image(); im.src = u }) }, [frameUrls])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const f = Math.min(frameUrls.length - 1, getShotFrame(getState()))
      if (f !== curFrame.current) {
        const layers = [layerA.current, layerB.current]
        const next = 1 - active.current
        const nextImg = layers[next], curImg = layers[active.current]
        if (nextImg && curImg) {
          nextImg.src = frameUrls[f]; nextImg.style.opacity = '1'; curImg.style.opacity = '0'; active.current = next
        }
        curFrame.current = f
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [getState, frameUrls])

  return (
    <div className="hoops-vm">
      <img ref={layerA} className="hoops-vm-img" src={frameUrls[1]} style={{ opacity: 1 }} alt="" draggable={false} />
      <img ref={layerB} className="hoops-vm-img" src={frameUrls[1]} style={{ opacity: 0 }} alt="" draggable={false} />
    </div>
  )
}
