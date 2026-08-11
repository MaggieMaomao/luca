// Calcrostic - game renderer.

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { GameEngine, type GameRenderContext } from "@luca-game/engine"
import {
  type CalcrosticState,
  newGame, setCell, isSolved, isLoss,
} from "./calcrostic"
import type { CalcrosticAction, CalcrosticStats } from "./calcrosticDefinition"
import { calcrosticDefinition } from "./calcrosticDefinition"
import "./calcrostic.css"

const ONBOARD_KEY = "luca:onboarded:calcrostic"

function renderCalcrostic(
  state: CalcrosticState,
  ctx: GameRenderContext<CalcrosticState, CalcrosticAction, CalcrosticStats>,
) {
  return <CalcrosticBoard state={state} ctx={ctx} />
}

const calcrosticFull = { ...calcrosticDefinition, render: renderCalcrostic }

export default function Calcrostic() {
  return <GameEngine definition={calcrosticFull} className="calcrostic" />
}

function CalcrosticBoard({
  state, ctx,
}: {
  state: CalcrosticState
  ctx: GameRenderContext<CalcrosticState, CalcrosticAction, CalcrosticStats>
}) {
  const { t } = useTranslation()
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === "undefined") return false
    try { return window.localStorage.getItem(ONBOARD_KEY) !== "1" }
    catch { return true }
  })
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null)

  useEffect(() => {
    if (state.moves > 0 && showOnboard) {
      setShowOnboard(false)
      try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {}
    }
  }, [state.moves, showOnboard])

  useEffect(() => {
    if (state.moves === 0) setSelected(null)
  }, [state.moves])

  const n = state.size
  const interactive = !isSolved(state) && !isLoss(state)

  const handleCell = (r: number, c: number) => {
    if (!interactive || state.given[r][c]) return // clue cells are locked
    setSelected({ r, c })
  }

  const handleValue = (v: number) => {
    if (!selected) return
    ctx.dispatch({ type: "SET", payload: { r: selected.r, c: selected.c, value: v } })
  }

  const getRowSum = (r: number) => state.grid[r].reduce((a, b) => a + b, 0)
  const getColSum = (c: number) => state.grid.reduce((s, row) => s + row[c], 0)

  return (
    <div className="cal-wrap">
      {showOnboard && (
        <div className="cal-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {}
        }}>
          <div className="cal-onboard-inner">
            <strong>{t("games.calcrostic.name", "Calcrostic")}</strong>
            <p>{t("games.calcrostic.onboard", "Fill every blank cell with a number from 1 to N so each row matches its clue (left) and each column matches its clue (top). Given numbers are locked.")}</p>
            <button>{t("common.got_it", "Got it")}</button>
          </div>
        </div>
      )}

      <div className="cal-info">
        <span className="cal-label">Moves:</span>
        <span className="cal-value">{state.moves}</span>
      </div>

      <div
        className="cal-grid"
        style={{ gridTemplateColumns: "36px repeat(" + n + ", 36px) 36px" }}
      >
        <div className="cal-corner" />
        {Array.from({ length: n }, (_, c) => (
          <div key={"th" + c} className="cal-clue cal-col-clue">{state.colClues[c]}</div>
        ))}
        <div className="cal-corner" />

        {Array.from({ length: n }, (_, r) => {
          const rowSum = getRowSum(r)
          return (
            <div key={"r" + r} style={{ display: "contents" }}>
              <div className="cal-clue cal-row-clue">{state.rowClues[r]}</div>
              {Array.from({ length: n }, (_, c) => {
                const v = state.grid[r][c]
                const isSelected = selected && selected.r === r && selected.c === c
                return (
                  <button
                    key={r + "," + c}
                    className={"cal-cell" + (state.given[r][c] ? " given" : "") + (v !== 0 ? " filled" : "") + (isSelected ? " selected" : "")}
                    onClick={() => handleCell(r, c)}
                    disabled={!interactive || state.given[r][c]}
                  >
                    {v !== 0 ? v : ""}
                  </button>
                )
              })}
              <div className={"cal-sum" + (rowSum === state.rowClues[r] ? " correct" : "")}>{rowSum}</div>
            </div>
          )
        })}

        <div className="cal-corner" />
        {Array.from({ length: n }, (_, c) => {
          const colSum = getColSum(c)
          return (
            <div key={"cs" + c} className={"cal-sum cal-col-sum" + (colSum === state.colClues[c] ? " correct" : "")}>{colSum}</div>
          )
        })}
        <div className="cal-corner" />
      </div>

      {/* Number pad — always shown below the board. Buttons act on the
          selected blank cell; disabled until one is picked. */}
      <div className="cal-palette">
        <div className="cal-palette-label">
          {selected
            ? t("games.calcrostic.value_for", { defaultValue: "Value for row {{r}}, col {{c}}", r: selected.r + 1, c: selected.c + 1 })
            : t("games.calcrostic.pick_cell", { defaultValue: "Pick a blank cell, then a number" })}
        </div>
        <div className="cal-palette-buttons">
          {Array.from({ length: n }, (_, i) => i + 1).map(v => (
            <button key={v} className="cal-pal-btn" disabled={!selected} onClick={() => handleValue(v)}>
              {v}
            </button>
          ))}
          <button
            className="cal-pal-btn cal-pal-clear"
            disabled={!selected}
            onClick={() => handleValue(0)}
            aria-label={t("games.calcrostic.clear", { defaultValue: "Clear" })}
          >
            ×
          </button>
        </div>
      </div>

      {isSolved(state) && (
        <div className="cal-result won">
          <div className="cal-result-title">All sums match!</div>
          <button onClick={ctx.restart}>Play again</button>
        </div>
      )}
    </div>
  )
}
