// Floodfill - game renderer.

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { GameEngine, type GameRenderContext } from "@luca-game/engine"
import {
  type FloodfillState as FloodState,
  isSolved, isLoss, originRegionSize,
} from "./floodfill"
import type { FloodAction, FloodStats } from "./floodfillDefinition"
import { floodfillDefinition } from "./floodfillDefinition"
import "./floodfill.css"

const ONBOARD_KEY = "luca:onboarded:floodfill"
const PALETTE = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316", "#06b6d4", "#ec4899"]

function renderFlood(
  state: FloodState,
  ctx: GameRenderContext<FloodState, FloodAction, FloodStats>,
) {
  return <FloodBoard state={state} ctx={ctx} />
}

const floodFull = { ...floodfillDefinition, render: renderFlood }

export default function Floodfill() {
  return <GameEngine definition={floodFull} className="floodfill" />
}

function FloodBoard({
  state, ctx,
}: {
  state: FloodState
  ctx: GameRenderContext<FloodState, FloodAction, FloodStats>
}) {
  const { t } = useTranslation()
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === "undefined") return false
    try { return window.localStorage.getItem(ONBOARD_KEY) !== "1" }
    catch { return true }
  })

  useEffect(() => {
    if (state.moves > 0 && showOnboard) {
      setShowOnboard(false)
      try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {}
    }
  }, [state.moves, showOnboard])

  const interactive = !isSolved(state) && !isLoss(state)
  const n = state.size

  const handleColor = (color: number) => {
    if (!interactive) return
    if (color === state.grid[0][0]) return
    ctx.dispatch({ type: "FLOOD", payload: { color } })
  }

  return (
    <div className="ff-wrap">
      {showOnboard && (
        <div className="ff-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {}
        }}>
          <div className="ff-onboard-inner">
            <strong>{t("games.floodfill.name", "Floodfill")}</strong>
            <p>{t("games.floodfill.onboard", "Click a color in the palette to flood the connected region with that color. Fill the whole board in as few moves as possible.")}</p>
            <button>{t("common.got_it", "Got it")}</button>
          </div>
        </div>
      )}

      <div className="ff-info">
        <span className="ff-label">{t("games.play.moves", "Moves")}:</span>
        <span className="ff-value">{state.moves}</span>
        <span style={{ width: "1rem", display: "inline-block" }} />
        <span className="ff-label">{t("games.floodfill.filled", "Filled")}:</span>
        <span className="ff-value">{Math.round((originRegionSize(state) / (n * n)) * 100)}%</span>
      </div>

      <div
        className="ff-grid"
        style={{ gridTemplateColumns: "repeat(" + n + ", 1fr)" }}
      >
        {state.grid.flatMap((row, r) =>
          row.map((color, c) => (
            <div
              key={r + "," + c}
              className="ff-cell"
              style={{ background: PALETTE[color] }}
            />
          ))
        )}
      </div>

      <div className="ff-palette">
        {PALETTE.slice(0, state.colors).map((c, i) => (
          <button
            key={i}
            className={"ff-pal-swatch" + (i === state.grid[0][0] ? " current" : "")}
            style={{ background: c }}
            onClick={() => handleColor(i)}
            disabled={!interactive || i === state.grid[0][0]}
            aria-label={"Color " + (i + 1)}
          />
        ))}
      </div>

      {isSolved(state) && (
        <div className="ff-result won">
          <div className="ff-result-title">Filled!</div>
          <div className="ff-result-msg">Completed in {state.moves} moves.</div>
          <button onClick={ctx.restart}>Play again</button>
        </div>
      )}
    </div>
  )
}
