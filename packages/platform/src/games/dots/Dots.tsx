// Dots - game renderer.

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { GameEngine, type GameRenderContext } from "@luca-game/engine"
import {
  type DotsState, type DotLine,
  isSolved, isWin, isLoss,
} from "./dots"
import type { DotsAction, DotsStats } from "./dotsDefinition"
import { dotsDefinition } from "./dotsDefinition"
import "./dots.css"

const ONBOARD_KEY = "luca:onboarded:dots"

function renderDots(
  state: DotsState,
  ctx: GameRenderContext<DotsState, DotsAction, DotsStats>,
) {
  return <DotsBoard state={state} ctx={ctx} />
}

const dotsFull = { ...dotsDefinition, render: renderDots }

export default function Dots() {
  return <GameEngine definition={dotsFull} className="dots" />
}

function DotsBoard({
  state, ctx,
}: {
  state: DotsState
  ctx: GameRenderContext<DotsState, DotsAction, DotsStats>
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

  const interactive = !isSolved(state) && state.turn === "player"
  const n = state.size
  const cellSize = 30
  const totalSize = (n - 1) * cellSize
  // Inner margin so edge dots/lines (at coords 0 and totalSize) aren't clipped
  // by the SVG bounds — the content is translated inward by this amount.
  const margin = 10
  const svgSize = totalSize + margin * 2

  const handleLine = (line: DotLine) => {
    if (!interactive) return
    ctx.dispatch({ type: "LINE", payload: line })
  }

  return (
    <div className="dots-wrap">
      {showOnboard && (
        <div className="dots-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {}
        }}>
          <div className="dots-onboard-inner">
            <strong>{t("games.dots.name", "Dots")}</strong>
            <p>{t("games.dots.onboard", "Click between two adjacent dots to draw a line. Complete a box to score a point and get another turn.")}</p>
            <button>{t("common.got_it", "Got it")}</button>
          </div>
        </div>
      )}

      <div className="dots-info">
        <span className="dots-label">{t("games.dots.you", "You")}</span>
        <span className="dots-value dots-you">{state.scores[0]}</span>
        <span className="dots-spacer" />
        <span className="dots-label">{t("games.dots.ai", "AI")}</span>
        <span className="dots-value dots-ai">{state.scores[1]}</span>
        <span className="dots-spacer" />
        <span className="dots-turn">
          {isSolved(state)
            ? ""
            : state.turn === "player"
              ? t("games.dots.your_turn", "Your turn")
              : t("games.dots.ai_turn", "AI thinking…")}
        </span>
      </div>

      <div className="dots-grid" style={{ padding: 6 }}>
        <svg width={svgSize} height={svgSize}>
          <g transform={`translate(${margin}, ${margin})`}>
          {/* Horizontal lines */}
          {Array.from({ length: n }, (_, r) =>
            Array.from({ length: n - 1 }, (_, c) => {
              const drawn = state.hLines[r]?.[c]
              return (
                <line
                  key={"h" + r + "," + c}
                  x1={c * cellSize} y1={r * cellSize}
                  x2={(c + 1) * cellSize} y2={r * cellSize}
                  stroke={drawn ? "#4f9eff" : "rgba(255,255,255,0.15)"}
                  strokeWidth={drawn ? 3 : 8}
                  onClick={() => handleLine({ type: "h", r, c })}
                  style={{ cursor: interactive && !drawn ? "pointer" : "default" }}
                />
              )
            })
          )}
          {/* Vertical lines */}
          {Array.from({ length: n - 1 }, (_, r) =>
            Array.from({ length: n }, (_, c) => {
              const drawn = state.vLines[r]?.[c]
              return (
                <line
                  key={"v" + r + "," + c}
                  x1={c * cellSize} y1={r * cellSize}
                  x2={c * cellSize} y2={(r + 1) * cellSize}
                  stroke={drawn ? "#4f9eff" : "rgba(255,255,255,0.15)"}
                  strokeWidth={drawn ? 3 : 8}
                  onClick={() => handleLine({ type: "v", r, c })}
                  style={{ cursor: interactive && !drawn ? "pointer" : "default" }}
                />
              )
            })
          )}
          {/* Dots */}
          {Array.from({ length: n }, (_, r) =>
            Array.from({ length: n }, (_, c) => (
              <circle
                key={"d" + r + "," + c}
                cx={c * cellSize} cy={r * cellSize} r="4"
                fill="rgba(255,255,255,0.85)"
              />
            ))
          )}
          {/* Box completions — tint the territory by owner. Drawn before the
              lines/dots above them in source so the lines stay crisp. */}
          {state.boxes.map((row, r) =>
            row.map((owner, c) => owner >= 0 ? (
              <rect
                key={"box" + r + "," + c}
                x={c * cellSize + 3} y={r * cellSize + 3}
                width={cellSize - 6} height={cellSize - 6}
                rx={3}
                fill={owner === 0 ? "rgba(79,158,255,0.22)" : "rgba(34,197,94,0.22)"}
              />
            ) : null)
          )}
          </g>
        </svg>
      </div>

      {isSolved(state) && (
        <div className={"dots-result " + (isWin(state) ? "won" : "lost")}>
          <div className="dots-result-title">
            {isWin(state)
              ? t("games.dots.win", "You win!")
              : isLoss(state)
                ? t("games.dots.lose", "You lose")
                : t("games.dots.tie", "It's a tie!")}
          </div>
          <div className="dots-result-msg">
            {t("games.dots.final", "Final")}: {state.scores[0]}–{state.scores[1]}
          </div>
          <button onClick={ctx.restart}>{t("games.play.restart", "Play again")}</button>
        </div>
      )}
    </div>
  )
}
