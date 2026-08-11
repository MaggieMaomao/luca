// Fruit Salad - game renderer.
//
// A contingency-table deduction puzzle: fill each bowl×fruit cell so every
// bowl total (row clue) and every fruit total (column clue) is satisfied.

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { GameEngine, type GameRenderContext } from "@luca-game/engine"
import {
  type FruitSaladState, type Fruit, FRUITS,
  rowSums, colSums, MAX_COUNT, isSolved, isLoss,
} from "./fruitSalad"
import type { FruitSaladAction, FruitSaladStats } from "./fruitSaladDefinition"
import { fruitSaladDefinition } from "./fruitSaladDefinition"
import "./fruit_salad.css"

const ONBOARD_KEY = "luca:onboarded:fruit_salad"

const FRUIT_EMOJI: Record<Fruit, string> = {
  apple: "\u{1F34E}",
  banana: "\u{1F34C}",
  cherry: "\u{1F352}",
  date: "\u{1F330}",
  elderberry: "\u{1FAD0}",
}

function renderFruitSalad(
  state: FruitSaladState,
  ctx: GameRenderContext<FruitSaladState, FruitSaladAction, FruitSaladStats>,
) {
  return <FruitSaladBoard state={state} ctx={ctx} />
}

const fsFullDef = { ...fruitSaladDefinition, render: renderFruitSalad }

export default function FruitSalad() {
  return <GameEngine definition={fsFullDef} className="fruit-salad" />
}

function FruitSaladBoard({
  state, ctx,
}: {
  state: FruitSaladState
  ctx: GameRenderContext<FruitSaladState, FruitSaladAction, FruitSaladStats>
}) {
  const { t } = useTranslation()
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === "undefined") return false
    try { return window.localStorage.getItem(ONBOARD_KEY) !== "1" }
    catch { return true }
  })
  const [selectedBowl, setSelectedBowl] = useState<number | null>(null)
  const [selectedFruit, setSelectedFruit] = useState<number | null>(null)

  useEffect(() => {
    if (state.moves > 0 && showOnboard) {
      setShowOnboard(false)
      try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {}
    }
  }, [state.moves, showOnboard])

  useEffect(() => {
    if (state.moves === 0) {
      setSelectedBowl(null)
      setSelectedFruit(null)
    }
  }, [state.moves])

  const interactive = !isSolved(state) && !isLoss(state)
  const numBowls = state.guess.length
  const numFruits = state.guess[0]?.length ?? FRUITS.length
  const rs = rowSums(state.guess)
  const cs = colSums(state.guess)

  const handleSetCount = (count: number) => {
    if (selectedBowl === null || selectedFruit === null) return
    ctx.dispatch({ type: "SET", payload: { bowl: selectedBowl, fruit: selectedFruit, count } })
  }

  return (
    <div className="fs-wrap">
      {showOnboard && (
        <div className="fs-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {}
        }}>
          <div className="fs-onboard-inner">
            <strong>{t("games.fruit_salad.name", "Fruit Salad")}</strong>
            <p>{t("games.fruit_salad.onboard", "Each bowl shows how many pieces of fruit it needs (right edge), and each fruit shows how many there are in total (bottom row). Tap a cell and set its count so every bowl total and every fruit total turns green.")}</p>
            <button>{t("common.got_it", "Got it")}</button>
          </div>
        </div>
      )}

      <div className="fs-grid" style={{ ['--num-fruits' as string]: numFruits }}>
        {/* Header row: corner, fruit icons, "Total" */}
        <div className="fs-corner" />
        {Array.from({ length: numFruits }, (_, f) => (
          <button
            key={"h" + f}
            className={"fs-fruit-header" + (selectedFruit === f ? " selected" : "")}
            onClick={() => interactive && setSelectedFruit(f)}
            disabled={!interactive}
            title={FRUITS[f]}
          >
            <span className="fs-emoji">{FRUIT_EMOJI[FRUITS[f]]}</span>
          </button>
        ))}
        <div className="fs-corner fs-total-h">{t("games.play.score", "Total")}</div>

        {/* Bowl rows */}
        {Array.from({ length: numBowls }, (_, b) => {
          const rowOk = rs[b] === state.rowTotals[b]
          return (
            <div key={"b" + b} className="fs-bowl">
              <button
                className={"fs-bowl-label" + (selectedBowl === b ? " selected" : "")}
                onClick={() => interactive && setSelectedBowl(b)}
                disabled={!interactive}
              >
                {t("games.fruit_salad.bowl", { defaultValue: "Bowl {{n}}", n: b + 1 })}
              </button>
              {Array.from({ length: numFruits }, (_, f) => {
                const v = state.guess[b][f]
                const isTarget = selectedBowl === b && selectedFruit === f
                return (
                  <button
                    key={"c" + b + "_" + f}
                    className={"fs-cell" + (isTarget ? " target" : "") + (v > 0 ? " filled" : "")}
                    onClick={() => { if (interactive) { setSelectedBowl(b); setSelectedFruit(f) } }}
                    disabled={!interactive}
                  >
                    {v > 0 ? v : ""}
                  </button>
                )
              })}
              <div className={"fs-bowl-sum" + (rowOk ? " ok" : "")}>{rs[b]} / {state.rowTotals[b]}</div>
            </div>
          )
        })}

        {/* Footer row: fruit (column) totals */}
        <div className="fs-coltot-label">{t("games.fruit_salad.need", { defaultValue: "Need" })}</div>
        {Array.from({ length: numFruits }, (_, f) => {
          const colOk = cs[f] === state.colTotals[f]
          return (
            <div key={"ct" + f} className={"fs-bowl-sum fs-coltot" + (colOk ? " ok" : "")}>
              {cs[f]} / {state.colTotals[f]}
            </div>
          )
        })}
        <div className="fs-corner" />
      </div>

      {selectedBowl !== null && selectedFruit !== null && interactive && (
        <div className="fs-palette">
          <div className="fs-palette-label">
            {FRUIT_EMOJI[FRUITS[selectedFruit]]} {t("games.fruit_salad.in_bowl", { defaultValue: "in bowl {{n}}", n: selectedBowl + 1 })}
          </div>
          <div className="fs-palette-buttons">
            {Array.from({ length: MAX_COUNT + 1 }, (_, n) => n).map(n => (
              <button
                key={n}
                className={"fs-pal-btn" + (state.guess[selectedBowl][selectedFruit] === n ? " selected" : "")}
                onClick={() => handleSetCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {isSolved(state) && (
        <div className="fs-result won">
          <div className="fs-result-title">{t("games.fruit_salad.won", "You got it!")}</div>
          <div className="fs-result-msg">{t("games.fruit_salad.won_msg", "Every total matches.")}</div>
          <button onClick={ctx.restart}>{t("games.play.restart", "Play again")}</button>
        </div>
      )}
    </div>
  )
}
