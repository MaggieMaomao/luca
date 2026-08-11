// Chomp - game renderer.

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { GameEngine, type GameRenderContext } from "@luca-game/engine"
import {
  type ChompState,
  newGame, isLegal, isSolved, isLoss, isGameOver,
} from "./chomp"
import type { ChompAction, ChompStats } from "./chompDefinition"
import { chompDefinition } from "./chompDefinition"
import "./chomp.css"

const ONBOARD_KEY = "luca:onboarded:chomp"

function renderChomp(
  state: ChompState,
  ctx: GameRenderContext<ChompState, ChompAction, ChompStats>,
) {
  return <ChompBoard state={state} ctx={ctx} />
}

const chompFull = { ...chompDefinition, render: renderChomp }

export default function Chomp() {
  return <GameEngine definition={chompFull} className="chomp" />
}

function ChompBoard({
  state, ctx,
}: {
  state: ChompState
  ctx: GameRenderContext<ChompState, ChompAction, ChompStats>
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

  const isOver = isGameOver(state)
  const interactive = !isOver

  const handleClick = (r: number, c: number) => {
    if (!interactive) return
    if (!isLegal(state, r, c)) return
    ctx.dispatch({ type: "CHOMP", payload: { r, c } })
  }

  return (
    <div className="ch-wrap">
      {showOnboard && (
        <div className="ch-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {}
        }}>
          <div className="ch-onboard-inner">
            <strong>{t("games.chomp.name", "Chomp")}</strong>
            <p>{t("games.chomp.onboard", "Pick a cell to eat it and all cells above/right. The bottom-left (red) is poison - whoever eats it loses.")}</p>
            <button>{t("common.got_it", "Got it")}</button>
          </div>
        </div>
      )}

      <div className="ch-info">
        <span className="ch-label">Cells remaining:</span>
        <span className="ch-value">{state.grid.flat().filter(c => c).length}</span>
      </div>

      <div
        className="ch-grid"
        style={{ gridTemplateColumns: "repeat(" + state.cols + ", 1fr)" }}
      >
        {state.grid.map((row, r) =>
          row.map((present, c) => {
            const isPoison = r === state.rows - 1 && c === 0
            return (
              <button
                key={r + "," + c}
                className={"ch-cell" + (present ? " present" : " eaten") + (isPoison ? " poison" : "")}
                onClick={() => handleClick(r, c)}
                disabled={!interactive || !present || isPoison}
              >
                {isPoison ? "\u2620" : present ? "" : ""}
              </button>
            )
          })
        )}
      </div>

      {isOver && (
        <div className={"ch-result " + (isSolved(state) ? "won" : "lost")}>
          <div className="ch-result-title">
            {isSolved(state) ? "You won!" : "Ate the poison!"}
          </div>
          <button onClick={ctx.restart}>Play again</button>
        </div>
      )}
    </div>
  )
}
