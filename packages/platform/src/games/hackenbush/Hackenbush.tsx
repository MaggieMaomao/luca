// Hackenbush - game renderer.
//
// You are BLUE: click a blue edge to cut it. Disconnected pieces fall; the AI
// (Red) replies automatically. Strand all of Red's edges to win.

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { GameEngine, type GameRenderContext } from "@luca-game/engine"
import {
  type HackenbushState,
  isLegal, isWin, isLoss,
} from "./hackenbush"
import type { HackenbushAction, HackenbushStats } from "./hackenbushDefinition"
import { hackenbushDefinition } from "./hackenbushDefinition"
import "./hackenbush.css"

const ONBOARD_KEY = "luca:onboarded:hackenbush"
const GROUND_Y = 240

function renderHB(
  state: HackenbushState,
  ctx: GameRenderContext<HackenbushState, HackenbushAction, HackenbushStats>,
) {
  return <HBBoard state={state} ctx={ctx} />
}

const hbFull = { ...hackenbushDefinition, render: renderHB }

export default function Hackenbush() {
  return <GameEngine definition={hbFull} className="hackenbush" />
}

function HBBoard({
  state, ctx,
}: {
  state: HackenbushState
  ctx: GameRenderContext<HackenbushState, HackenbushAction, HackenbushStats>
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

  const won = isWin(state)
  const lost = isLoss(state)
  const decided = won || lost
  const interactive = !decided && state.turn === "blue"

  const blueCount = state.edges.filter(e => e.color === "blue").length
  const redCount = state.edges.filter(e => e.color === "red").length

  const handleEdge = (idx: number) => {
    if (!interactive) return
    if (!isLegal(state, idx)) return // only blue (player) edges
    ctx.dispatch({ type: "CUT", payload: { edge: idx } })
  }

  return (
    <div className="hb-wrap">
      {showOnboard && (
        <div className="hb-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {}
        }}>
          <div className="hb-onboard-inner">
            <strong>{t("games.hackenbush.name", "Hackenbush")}</strong>
            <p>{t("games.hackenbush.onboard", "You are Blue. Click a blue edge to cut it — anything no longer attached to the ground falls away. The AI (Red) replies. Leave Red with no edge to cut and you win.")}</p>
            <button>{t("common.got_it", "Got it")}</button>
          </div>
        </div>
      )}

      <div className="hb-info">
        <span className="hb-label">{t("games.hackenbush.you", "You")}</span>
        <span className="hb-value" style={{ color: "#3b82f6" }}>{blueCount}</span>
        <span className="hb-spacer" />
        <span className="hb-label">{t("games.hackenbush.ai", "AI")}</span>
        <span className="hb-value" style={{ color: "#ef4444" }}>{redCount}</span>
        <span className="hb-spacer" />
        <span className="hb-turn">{interactive ? t("games.hackenbush.cut_blue", "Cut a blue edge") : ""}</span>
      </div>

      <svg width="320" height="280" style={{ background: "rgba(255,255,255,0.02)", borderRadius: "var(--r-1)" }}>
        {/* Ground line */}
        <line x1="14" y1={GROUND_Y} x2="306" y2={GROUND_Y} stroke="rgba(255,255,255,0.35)" strokeWidth="3" strokeLinecap="round" />

        {/* Edges */}
        {state.edges.map((e, i) => {
          const from = state.nodes[e.from]
          const to = state.nodes[e.to]
          if (!from || !to) return null
          const canCut = interactive && e.color === "blue"
          return (
            <g key={i} onClick={() => handleEdge(i)} style={{ cursor: canCut ? "pointer" : "default" }}>
              {/* wide invisible hit area for easy clicking */}
              {canCut && (
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="transparent" strokeWidth="14" />
              )}
              <line
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={e.color === "red" ? "#ef4444" : "#3b82f6"}
                strokeWidth="4"
                strokeLinecap="round"
                className={canCut ? "hb-edge-cut" : undefined}
              />
            </g>
          )
        })}

        {/* Nodes */}
        {state.nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.ground ? 4 : 5} fill={n.ground ? "rgba(255,255,255,0.5)" : "white"} />
        ))}
      </svg>

      {decided && (
        <div className={"hb-result " + (won ? "won" : "lost")}>
          <div className="hb-result-title">
            {won ? t("games.hackenbush.win", "You win!") : t("games.hackenbush.lose", "You lose")}
          </div>
          <button onClick={ctx.restart}>{t("games.play.restart", "Play again")}</button>
        </div>
      )}
    </div>
  )
}
