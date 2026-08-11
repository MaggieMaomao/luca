// Sokoban - game renderer.
//
// Renders the layered state (walls / targets / boxes / player). Arrow keys are
// wired by the engine's keyboard map; on-screen buttons dispatch the same
// MOVE actions.

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { GameEngine, type GameRenderContext } from "@luca-game/engine"
import {
  type SokobanState,
  isSolved, isLoss, boxesOnTargets, targetCount,
} from "./sokoban"
import type { SokobanAction, SokobanStats } from "./sokobanDefinition"
import { sokobanDefinition } from "./sokobanDefinition"
import "./sokoban.css"

const ONBOARD_KEY = "luca:onboarded:sokoban"
const CELL = 36

function renderSokoban(
  state: SokobanState,
  ctx: GameRenderContext<SokobanState, SokobanAction, SokobanStats>,
) {
  return <SokobanBoard state={state} ctx={ctx} />
}

const sokobanFull = { ...sokobanDefinition, render: renderSokoban }

export default function Sokoban() {
  return <GameEngine definition={sokobanFull} className="sokoban" />
}

function SokobanBoard({
  state, ctx,
}: {
  state: SokobanState
  ctx: GameRenderContext<SokobanState, SokobanAction, SokobanStats>
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
  // Arrow keys are handled by the engine's keyboard map (no extra listener
  // here — having both caused every key press to move twice).
  const handleMove = (dr: number, dc: number) => {
    if (!interactive) return
    ctx.dispatch({ type: "MOVE", payload: { dr, dc } })
  }

  const W = state.width * CELL
  const H = state.height * CELL

  return (
    <div className="sk-wrap">
      {showOnboard && (
        <div className="sk-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {}
        }}>
          <div className="sk-onboard-inner">
            <strong>{t("games.sokoban.name", "Sokoban")}</strong>
            <p>{t("games.sokoban.onboard", "Push every box (●) onto a target (◎). You can only push one box at a time and can't pull. Use the arrow keys or the on-screen buttons.")}</p>
            <button>{t("common.got_it", "Got it")}</button>
          </div>
        </div>
      )}

      <div className="sk-info">
        <span className="sk-label">{t("games.sokoban.on_targets", "On targets")}:</span>
        <span className="sk-value">{boxesOnTargets(state)} / {targetCount(state)}</span>
        <span className="sk-spacer" />
        <span className="sk-label">{t("games.play.moves", "Moves")}:</span>
        <span className="sk-value">{state.moves}</span>
      </div>

      <svg width={W} height={H} style={{ background: "#15120f", borderRadius: "var(--r-1)" }}>
        {Array.from({ length: state.height }, (_, r) =>
          Array.from({ length: state.width }, (_, c) => {
            const x = c * CELL, y = r * CELL
            const wall = state.walls[r][c]
            return (
              <rect key={"f" + r + "," + c} x={x} y={y} width={CELL} height={CELL}
                fill={wall ? "#5b513f" : "rgba(255,255,255,0.04)"}
                stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
            )
          })
        )}
        {/* Targets */}
        {state.targets.map((row, r) =>
          row.map((isT, c) => isT ? (
            <circle key={"t" + r + "," + c} cx={c * CELL + CELL / 2} cy={r * CELL + CELL / 2}
              r={CELL / 5} fill="none" stroke="#22c55e" strokeWidth="2.5" />
          ) : null)
        )}
        {/* Boxes (green when on a target). */}
        {state.boxes.map((row, r) =>
          row.map((isB, c) => isB ? (
            <rect key={"b" + r + "," + c} x={c * CELL + 5} y={r * CELL + 5}
              width={CELL - 10} height={CELL - 10} rx="3"
              fill={state.targets[r][c] ? "#22c55e" : "#c9863f"}
              stroke="#1c1c1c" strokeWidth="1.5" />
          ) : null)
        )}
        {/* Player */}
        <circle cx={state.player[1] * CELL + CELL / 2} cy={state.player[0] * CELL + CELL / 2}
          r={CELL / 3.2} fill="#fbbf24" stroke="#000" strokeWidth="1.5" />
      </svg>

      <div className="sk-controls">
        <button onClick={() => handleMove(-1, 0)} disabled={!interactive} aria-label="Up">{"↑"}</button>
        <div>
          <button onClick={() => handleMove(0, -1)} disabled={!interactive} aria-label="Left">{"←"}</button>
          <button onClick={() => handleMove(1, 0)} disabled={!interactive} aria-label="Down">{"↓"}</button>
          <button onClick={() => handleMove(0, 1)} disabled={!interactive} aria-label="Right">{"→"}</button>
        </div>
      </div>

      {isSolved(state) && (
        <div className="sk-result won">
          <div className="sk-result-title">{t("games.sokoban.won", "Solved!")}</div>
          <button onClick={ctx.restart}>{t("games.play.restart", "Play again")}</button>
        </div>
      )}
    </div>
  )
}
