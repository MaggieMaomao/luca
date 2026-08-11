// Packing - game renderer.
//
// Pick a piece from the tray, then click a container cell to drop its
// top-left corner there. Click a placed piece to return it. Fill the
// container exactly to win.

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { GameEngine, type GameRenderContext } from "@luca-game/engine"
import { type PackingState, occupancy, isSolved, isLoss, placedCount } from "./packing"
import type { PackingAction, PackingStats } from "./packingDefinition"
import { packingDefinition } from "./packingDefinition"
import "./packing.css"

const ONBOARD_KEY = "luca:onboarded:packing"
const CELL = 40
const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316", "#06b6d4", "#ec4899", "#84cc16", "#f43f5e"]
const colorOf = (id: number) => COLORS[id % COLORS.length]

function renderPK(state: PackingState, ctx: GameRenderContext<PackingState, PackingAction, PackingStats>) {
  return <PKBoard state={state} ctx={ctx} />
}
const pkFull = { ...packingDefinition, render: renderPK }
export default function Packing() { return <GameEngine definition={pkFull} className="packing" /> }

function PKBoard({ state, ctx }: { state: PackingState; ctx: GameRenderContext<PackingState, PackingAction, PackingStats> }) {
  const { t } = useTranslation()
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === "undefined") return false
    try { return window.localStorage.getItem(ONBOARD_KEY) !== "1" } catch { return true }
  })
  const [sel, setSel] = useState<number | null>(null)

  useEffect(() => { if (state.moves > 0 && showOnboard) { setShowOnboard(false); try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {} } }, [state.moves, showOnboard])
  useEffect(() => { if (state.moves === 0) setSel(null) }, [state.moves])

  const interactive = !isSolved(state) && !isLoss(state)
  const grid = occupancy(state)
  const tray = state.pieces.filter(p => p.x === null)

  const cellClick = (r: number, c: number) => {
    if (!interactive) return
    const occ = grid[r][c]
    if (occ !== -1) {
      ctx.dispatch({ type: "UNPLACE", payload: { id: occ } })
      return
    }
    if (sel !== null) {
      ctx.dispatch({ type: "PLACE", payload: { id: sel, x: c, y: r } })
      setSel(null)
    }
  }

  return (
    <div className="pk-wrap">
      {showOnboard && (
        <div className="pk-onboard" onClick={() => { setShowOnboard(false); try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {} }}>
          <div className="pk-onboard-inner">
            <strong>{t("games.packing.name", "Packing")}</strong>
            <p>{t("games.packing.onboard", "Fit every rectangle into the square with no gaps. Pick a piece from the tray, then click a cell to drop its top-left corner there. Click a placed piece to take it back.")}</p>
            <button>{t("common.got_it", "Got it")}</button>
          </div>
        </div>
      )}

      <div className="pk-info">
        <span className="pk-label">{t("games.packing.placed", "Placed")}:</span>
        <span className="pk-value">{placedCount(state)} / {state.pieces.length}</span>
        <span className="pk-spacer" />
        <span className="pk-label">{t("games.play.moves", "Moves")}:</span>
        <span className="pk-value">{state.moves}</span>
      </div>

      <div
        className="pk-container"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${state.width}, ${CELL}px)`,
          gridTemplateRows: `repeat(${state.height}, ${CELL}px)`,
        }}
      >
        {grid.map((row, r) =>
          row.map((occ, c) => (
            <button
              key={r + "," + c}
              className={"pk-cell" + (occ !== -1 ? " filled" : "")}
              style={occ !== -1 ? { background: colorOf(occ) } : undefined}
              onClick={() => cellClick(r, c)}
              disabled={!interactive}
              aria-label={occ !== -1 ? `Filled by piece ${occ}` : `Empty cell ${r + 1},${c + 1}`}
            />
          ))
        )}
      </div>

      <div className="pk-tray">
        <div className="pk-tray-label">{t("games.packing.tray", "Pieces")}:</div>
        <div className="pk-tray-pieces">
          {tray.length === 0 ? (
            <span className="pk-tray-empty">—</span>
          ) : tray.map(p => (
            <button
              key={p.id}
              className={"pk-piece" + (sel === p.id ? " selected" : "")}
              onClick={() => setSel(sel === p.id ? null : p.id)}
              disabled={!interactive}
              aria-label={`Piece ${p.w} by ${p.h}`}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${p.w}, 14px)`,
                gridTemplateRows: `repeat(${p.h}, 14px)`,
              }}
            >
              {Array.from({ length: p.w * p.h }, (_, i) => (
                <span key={i} className="pk-piece-cell" style={{ background: colorOf(p.id) }} />
              ))}
            </button>
          ))}
        </div>
      </div>

      {isSolved(state) && (
        <div className="pk-result won">
          <div className="pk-result-title">{t("games.packing.won", "Packed!")}</div>
          <div className="pk-result-msg">{t("games.packing.won_msg", "Every piece fits perfectly.")}</div>
          <button onClick={ctx.restart}>{t("games.play.restart", "Play again")}</button>
        </div>
      )}
    </div>
  )
}
