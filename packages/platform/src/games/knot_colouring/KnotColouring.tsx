// KnotColouring - game renderer.
//
// Draws the trefoil knot as three arcs (a parametric (2,3) torus-knot
// projection split into thirds). Click a strand to cycle its colour. Markers
// at the three crossings turn green when the Fox relation holds there.

import { useMemo, useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { GameEngine, type GameRenderContext } from "@luca-game/engine"
import {
  type KnotColoringState,
  isSolved, isLoss, allColored, crossingValid,
} from "./knotColouring"
import type { KnotAction, KnotStats } from "./knotColouringDefinition"
import { knotColouringDefinition } from "./knotColouringDefinition"
import "./knot_colouring.css"

const ONBOARD_KEY = "luca:onboarded:knot_colouring"
const COLORS = ["#ef4444", "#3b82f6", "#22c55e"]
const UNCOLORED = "rgba(255,255,255,0.28)"

function renderKC(state: KnotColoringState, ctx: GameRenderContext<KnotColoringState, KnotAction, KnotStats>) {
  return <KCBoard state={state} ctx={ctx} />
}
const kcFull = { ...knotColouringDefinition, render: renderKC }
export default function KnotColouring() { return <GameEngine definition={kcFull} className="knot-colouring" /> }

type Pt = { x: number; y: number }

/** Parametric trefoil, fitted to the viewbox, split into 3 arcs, plus the 3
 *  self-crossing points (for validity markers). Computed once. */
function trefoilGeometry() {
  const N = 240
  const raw: Pt[] = []
  for (let i = 0; i < N; i++) {
    const t = (i / N) * 2 * Math.PI
    raw.push({ x: Math.sin(t) + 2 * Math.sin(2 * t), y: Math.cos(t) - 2 * Math.cos(2 * t) })
  }
  const xs = raw.map(p => p.x), ys = raw.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const W = 250, H = 180, padX = 35, padY = 30
  const s = Math.min(W / (maxX - minX), H / (maxY - minY))
  const ox = padX + (W - (maxX - minX) * s) / 2
  const oy = padY + (H - (maxY - minY) * s) / 2
  const pts = raw.map(p => ({ x: ox + (p.x - minX) * s, y: oy + (p.y - minY) * s }))

  const third = Math.floor(N / 3)
  const arcs: Pt[][] = [
    pts.slice(0, third + 1),
    pts.slice(third, 2 * third + 1),
    pts.slice(2 * third).concat([pts[0]]),
  ]

  // Self-crossings of the closed curve (3 of them).
  const cross: Pt[] = []
  const seg = (a: Pt, b: Pt, c: Pt, d: Pt): Pt | null => {
    const r = { x: b.x - a.x, y: b.y - a.y }, sv = { x: d.x - c.x, y: d.y - c.y }
    const den = r.x * sv.y - r.y * sv.x
    if (Math.abs(den) < 1e-6) return null
    const tt = ((c.x - a.x) * sv.y - (c.y - a.y) * sv.x) / den
    const uu = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den
    if (tt > 0.01 && tt < 0.99 && uu > 0.01 && uu < 0.99) return { x: a.x + tt * r.x, y: a.y + tt * r.y }
    return null
  }
  for (let i = 0; i < N; i++) {
    for (let j = i + 2; j < N; j++) {
      if (i === 0 && j === N - 1) continue
      const p = seg(pts[i], pts[(i + 1) % N], pts[j], pts[(j + 1) % N])
      if (p && !cross.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 10)) cross.push(p)
    }
  }
  return { arcs, crossings: cross }
}

const toPath = (pts: Pt[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")

function KCBoard({ state, ctx }: { state: KnotColoringState; ctx: GameRenderContext<KnotColoringState, KnotAction, KnotStats> }) {
  const { t } = useTranslation()
  const geo = useMemo(trefoilGeometry, [])
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === "undefined") return false
    try { return window.localStorage.getItem(ONBOARD_KEY) !== "1" } catch { return true }
  })
  useEffect(() => { if (state.moves > 0 && showOnboard) { setShowOnboard(false); try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {} } }, [state.moves, showOnboard])

  const interactive = !isSolved(state) && !isLoss(state)
  const cycle = (arc: number) => { if (interactive) ctx.dispatch({ type: "CYCLE", payload: { arc } }) }

  const colorOf = (arc: number) => state.coloring[arc] >= 0 ? COLORS[state.coloring[arc]] : UNCOLORED
  const complete = allColored(state)
  const allValid = complete && state.crossings.every(x => crossingValid(state, x))
  const markerFill = !complete ? "rgba(255,255,255,0.25)" : allValid ? "#22c55e" : "#ef4444"

  return (
    <div className="kc-wrap">
      {showOnboard && (
        <div className="kc-onboard" onClick={() => { setShowOnboard(false); try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {} }}>
          <div className="kc-onboard-inner">
            <strong>{t("games.knot_colouring.name", "Knot Colouring")}</strong>
            <p>{t("games.knot_colouring.onboard", "Click a strand to recolour it. Colour the trefoil so that at every crossing the three strands are either all the same colour or all different — and use at least two colours. (That proves the knot is tricolourable!)")}</p>
            <button>{t("common.got_it", "Got it")}</button>
          </div>
        </div>
      )}

      <div className="kc-info">
        <span className="kc-label">{t("games.knot_colouring.rule", "Each crossing: all same or all different")}</span>
      </div>

      <svg width="320" height="240" viewBox="0 0 320 240" style={{ background: "rgba(255,255,255,0.02)", borderRadius: "var(--r-1)" }}>
        {/* Casing under each strand so crossings read as layered. */}
        {geo.arcs.map((pts, i) => (
          <path key={"case" + i} d={toPath(pts)} fill="none" stroke="rgba(20,18,16,0.9)" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {/* Coloured strands. */}
        {geo.arcs.map((pts, i) => (
          <path key={"arc" + i} d={toPath(pts)} fill="none" stroke={colorOf(i)} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {/* Wide invisible hit areas (drawn last so they capture clicks). */}
        {interactive && geo.arcs.map((pts, i) => (
          <path key={"hit" + i} d={toPath(pts)} fill="none" stroke="transparent" strokeWidth={18} style={{ cursor: "pointer" }} onClick={() => cycle(i)} />
        ))}
        {/* Crossing validity markers. */}
        {geo.crossings.map((c, i) => (
          <circle key={"x" + i} cx={c.x} cy={c.y} r={6} fill="none" stroke={markerFill} strokeWidth={2.5} />
        ))}
      </svg>

      {isSolved(state) && (
        <div className="kc-result won">
          <div className="kc-result-title">{t("games.knot_colouring.won", "Tricoloured!")}</div>
          <div className="kc-result-msg">{t("games.knot_colouring.won_msg", "Every crossing is valid — the trefoil is tricolourable.")}</div>
          <button onClick={ctx.restart}>{t("games.play.restart", "Play again")}</button>
        </div>
      )}
    </div>
  )
}
