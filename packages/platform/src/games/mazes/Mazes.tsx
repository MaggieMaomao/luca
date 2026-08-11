// Mazes - game renderer.

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { GameEngine, type GameRenderContext } from "@luca-game/engine"
import {
  type MazeState,
  newGame, move, isSolved, isLoss,
} from "./mazes"
import type { MazeAction, MazeStats } from "./mazesDefinition"
import { mazesDefinition } from "./mazesDefinition"
import "./mazes.css"

const ONBOARD_KEY = "luca:onboarded:mazes"

function renderMaze(
  state: MazeState,
  ctx: GameRenderContext<MazeState, MazeAction, MazeStats>,
) {
  return <MazeBoard state={state} ctx={ctx} />
}

const mazeFull = { ...mazesDefinition, render: renderMaze }

export default function Mazes() {
  return <GameEngine definition={mazeFull} className="mazes" />
}

function MazeBoard({
  state, ctx,
}: {
  state: MazeState
  ctx: GameRenderContext<MazeState, MazeAction, MazeStats>
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
  const cellSize = 24

  const isInPath = (r: number, c: number) =>
    state.path.some(([pr, pc]) => pr === r && pc === c)

  const handleMove = (d: number) => {
    if (!interactive) return
    ctx.dispatch({ type: "MOVE", payload: { d } })
  }

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!interactive) return
      if (e.key === "ArrowUp" || e.key === "w") { e.preventDefault(); handleMove(0) }
      else if (e.key === "ArrowRight" || e.key === "d") { e.preventDefault(); handleMove(1) }
      else if (e.key === "ArrowDown" || e.key === "s") { e.preventDefault(); handleMove(2) }
      else if (e.key === "ArrowLeft" || e.key === "a") { e.preventDefault(); handleMove(3) }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [interactive, state])

  return (
    <div className="mz-wrap">
      {showOnboard && (
        <div className="mz-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {}
        }}>
          <div className="mz-onboard-inner">
            <strong>{t("games.mazes.name", "Mazes")}</strong>
            <p>{t("games.mazes.onboard", "Navigate from start (green) to end (red). Use arrow keys or on-screen buttons. Can only pass through open walls.")}</p>
            <button>{t("common.got_it", "Got it")}</button>
          </div>
        </div>
      )}

      <div className="mz-info">
        <span className="mz-label">Moves:</span>
        <span className="mz-value">{state.moves}</span>
      </div>

      <div
        className="mz-grid"
        style={{
          width: state.width * cellSize + 4,
          height: state.height * cellSize + 4,
        }}
      >
        <svg width={state.width * cellSize + 2} height={state.height * cellSize + 2}>
          {/* Draw cells with walls */}
          {state.grid.map((row, r) =>
            row.map((cell, c) => {
              const inPath = isInPath(r, c)
              const isStart = r === state.start[0] && c === state.start[1]
              const isEnd = r === state.end[0] && c === state.end[1]
              const x = c * cellSize
              const y = r * cellSize
              return (
                <g key={r + "," + c}>
                  <rect x={x + 1} y={y + 1} width={cellSize - 2} height={cellSize - 2}
                    fill={inPath ? "rgba(79,158,255,0.3)" : "rgba(255,255,255,0.04)"}
                  />
                  {/* Walls: cell.walls = [N, E, S, W] */}
                  {cell.walls[0] && <line x1={x + 1} y1={y + 1} x2={x + cellSize - 1} y2={y + 1} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />}
                  {cell.walls[1] && <line x1={x + cellSize - 1} y1={y + 1} x2={x + cellSize - 1} y2={y + cellSize - 1} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />}
                  {cell.walls[2] && <line x1={x + 1} y1={y + cellSize - 1} x2={x + cellSize - 1} y2={y + cellSize - 1} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />}
                  {cell.walls[3] && <line x1={x + 1} y1={y + 1} x2={x + 1} y2={y + cellSize - 1} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />}
                  {isStart && <text x={x + cellSize / 2} y={y + cellSize / 2 + 3} textAnchor="middle" fontSize="11" fill="#22c55e">S</text>}
                  {isEnd && <text x={x + cellSize / 2} y={y + cellSize / 2 + 3} textAnchor="middle" fontSize="11" fill="#ef4444">E</text>}
                </g>
              )
            })
          )}
          {/* Current position marker */}
          {state.path.length > 0 && (() => {
            const [pr, pc] = state.path[state.path.length - 1]
            return (
              <circle
                cx={pc * cellSize + cellSize / 2}
                cy={pr * cellSize + cellSize / 2}
                r={cellSize / 4}
                fill="#4f9eff"
              />
            )
          })()}
        </svg>
      </div>

      <div className="mz-controls">
        <button onClick={() => handleMove(0)} disabled={!interactive}>{'\u2191'}</button>
        <div>
          <button onClick={() => handleMove(3)} disabled={!interactive}>{'\u2190'}</button>
          <button onClick={() => handleMove(2)} disabled={!interactive}>{'\u2193'}</button>
          <button onClick={() => handleMove(1)} disabled={!interactive}>{'\u2192'}</button>
        </div>
      </div>

      {isSolved(state) && (
        <div className="mz-result won">
          <div className="mz-result-title">Maze solved!</div>
          <div className="mz-result-msg">{state.moves} moves.</div>
          <button onClick={ctx.restart}>Play again</button>
        </div>
      )}
    </div>
  )
}
