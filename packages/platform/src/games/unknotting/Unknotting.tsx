// Unknotting - game renderer.
//
// Renders the closed loop as a rope through draggable points. Segments that
// currently cross are highlighted; the player drags points until no segment
// crosses any other (crossings = 0), i.e. the loop is the unknot.

import { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { GameEngine, type GameRenderContext } from "@luca-game/engine"
import { type UnknottingState, type Pt, crossingCount, crossingEdges, isSolved, isLoss } from "./unknotting"
import type { UnknottingAction, UnknottingStats } from "./unknottingDefinition"
import { unknottingDefinition } from "./unknottingDefinition"
import "./unknotting.css"

const ONBOARD_KEY = "luca:onboarded:unknotting"
const VB = 100 // viewBox size; normalised coords (0..1) map to 0..VB

function renderUK(state: UnknottingState, ctx: GameRenderContext<UnknottingState, UnknottingAction, UnknottingStats>) {
  return <UKBoard state={state} ctx={ctx} />
}

const ukFull = { ...unknottingDefinition, render: renderUK }
export default function Unknotting() {
  return <GameEngine definition={ukFull} className="unknotting" />
}

const clamp01 = (v: number) => Math.max(0.05, Math.min(0.95, v))

function UKBoard({ state, ctx }: { state: UnknottingState; ctx: GameRenderContext<UnknottingState, UnknottingAction, UnknottingStats> }) {
  const { t } = useTranslation()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [drag, setDrag] = useState<{ id: number; pt: Pt } | null>(null)
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === "undefined") return false
    try { return window.localStorage.getItem(ONBOARD_KEY) !== "1" } catch { return true }
  })

  const dismissOnboard = () => {
    setShowOnboard(false)
    try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {}
  }
  useEffect(() => {
    if (state.moves > 0 && showOnboard) dismissOnboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.moves])

  const solved = isSolved(state) || isLoss(state)
  const n = state.n

  // While dragging, render the dragged node at its live position so the rope
  // (and the crossing highlight) update smoothly before the move is committed.
  const renderPts = drag ? state.points.map((p, i) => (i === drag.id ? drag.pt : p)) : state.points
  const liveCrossings = crossingCount(renderPts)
  const hot = crossingEdges(renderPts)

  const toNorm = (e: React.PointerEvent): Pt => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }

  const onDown = (id: number) => (e: React.PointerEvent) => {
    if (solved) return
    e.preventDefault()
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId) } catch {}
    setDrag({ id, pt: state.points[id] })
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return
    const p = toNorm(e)
    setDrag({ id: drag.id, pt: { x: clamp01(p.x), y: clamp01(p.y) } })
  }
  const onUp = () => {
    if (!drag) return
    const orig = state.points[drag.id]
    if (Math.hypot(drag.pt.x - orig.x, drag.pt.y - orig.y) > 0.003) {
      ctx.dispatch({ type: "MOVE", payload: { id: drag.id, x: drag.pt.x, y: drag.pt.y } })
    }
    setDrag(null)
  }

  return (
    <div className="uk-wrap">
      {showOnboard && (
        <div className="uk-onboard" onClick={dismissOnboard}>
          <div className="uk-onboard-inner">
            <strong>{t("games.unknotting.name", "Unknotting")}</strong>
            <p>{t("games.unknotting.onboard", "Drag the dots so the loop never crosses itself. The orange segments are the ones still tangled — pull them apart until no crossings remain.")}</p>
            <button>{t("common.got_it", "Got it")}</button>
          </div>
        </div>
      )}

      <div className="uk-info">
        <span className="uk-label">{t("games.unknotting.crossings", "Crossings")}:</span>
        <span className={"uk-value" + (liveCrossings === 0 ? " ok" : "")}>{liveCrossings}</span>
        <span className="uk-spacer" />
        <span className="uk-label">{t("games.play.moves", "Moves")}:</span>
        <span className="uk-value">{state.moves}</span>
      </div>

      <svg
        ref={svgRef}
        className="uk-svg"
        viewBox={`0 0 ${VB} ${VB}`}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        role="application"
        aria-label="Unknotting board"
      >
        {/* Loop segments — edge i connects point i to point (i+1)%n. */}
        {Array.from({ length: n }).map((_, i) => {
          const a = renderPts[i]
          const b = renderPts[(i + 1) % n]
          return (
            <line
              key={"e" + i}
              x1={a.x * VB} y1={a.y * VB} x2={b.x * VB} y2={b.y * VB}
              className={"uk-seg" + (hot.has(i) ? " hot" : "")}
            />
          )
        })}
        {/* Draggable points. */}
        {renderPts.map((p, i) => (
          <circle
            key={"n" + i}
            cx={p.x * VB} cy={p.y * VB} r={3.2}
            className={"uk-node" + (drag && drag.id === i ? " dragging" : "")}
            onPointerDown={onDown(i)}
          />
        ))}
      </svg>

      <div className="uk-hint">
        {liveCrossings === 0
          ? t("games.unknotting.clear", "No crossings — release to win!")
          : t("games.unknotting.hint", "Drag the dots to remove every crossing")}
      </div>

      {isSolved(state) && (
        <div className="uk-result won">
          <div className="uk-result-title">{t("games.unknotting.won", "Unknotted!")}</div>
          <button onClick={ctx.restart}>{t("games.play.restart", "Play again")}</button>
        </div>
      )}
    </div>
  )
}
