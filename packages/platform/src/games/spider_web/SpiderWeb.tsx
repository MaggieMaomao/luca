// Spider Web - game renderer.

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { GameEngine, type GameRenderContext } from "@luca-game/engine"
import {
  type SpiderWebState, type NodeId,
  newGame, move, isSolved, isLoss, canMove,
} from "./spiderWeb"
import type { SpiderWebAction, SpiderWebStats } from "./spiderWebDefinition"
import { spiderWebDefinition } from "./spiderWebDefinition"
import "./spider_web.css"

const ONBOARD_KEY = "luca:onboarded:spider_web"

function renderSW(
  state: SpiderWebState,
  ctx: GameRenderContext<SpiderWebState, SpiderWebAction, SpiderWebStats>,
) {
  return <SpiderWebBoard state={state} ctx={ctx} />
}

const swFullDef = { ...spiderWebDefinition, render: renderSW }

export default function SpiderWeb() {
  return <GameEngine definition={swFullDef} className="spider-web" />
}

function nodePos(node: NodeId, rings: number, spokes: number): { x: number; y: number } {
  const ring = Math.floor(node / spokes)
  const spoke = node % spokes
  const r = ((ring + 1) / rings) * 140
  const angle = (spoke / spokes) * Math.PI * 2 - Math.PI / 2
  return { x: 150 + r * Math.cos(angle), y: 150 + r * Math.sin(angle) }
}

function SpiderWebBoard({
  state, ctx,
}: {
  state: SpiderWebState
  ctx: GameRenderContext<SpiderWebState, SpiderWebAction, SpiderWebStats>
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
  const total = state.rings * state.spokes

  const spiderPos = nodePos(state.spider, state.rings, state.spokes)
  const flyPos = nodePos(state.fly, state.rings, state.spokes)

  // Build edges from adjacency list
  const edges: Array<[NodeId, NodeId]> = []
  for (let i = 0; i < total; i++) {
    for (const j of state.adj[i] || []) {
      if (i < j) edges.push([i, j])
    }
  }

  const handleNode = (n: NodeId) => {
    if (!interactive) return
    if (!canMove(state, n)) return
    ctx.dispatch({ type: "MOVE", payload: { to: n } })
  }

  return (
    <div className="sw-wrap">
      {showOnboard && (
        <div className="sw-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {}
        }}>
          <div className="sw-onboard-inner">
            <strong>{t("games.spider_web.name", "Spider Web")}</strong>
            <p>{t("games.spider_web.onboard", "Move the spider to the fly. Click an adjacent node to walk to it. Some threads are blocked.")}</p>
            <button>{t("common.got_it", "Got it")}</button>
          </div>
        </div>
      )}

      <div className="sw-info">
        <span className="sw-label">Moves:</span>
        <span className="sw-value">{state.moves}</span>
        <span className="sw-spacer" />
        <span className="sw-label">Position:</span>
        <span className="sw-value">R{Math.floor(state.spider / state.spokes) + 1}/S{(state.spider % state.spokes) + 1}</span>
      </div>

      <svg className="sw-svg" viewBox="0 0 300 300" width="300" height="300">
        {/* Spokes */}
        {Array.from({ length: state.spokes }, (_, s) => {
          const inner = nodePos(s, state.rings, state.spokes)
          const outer = nodePos((state.rings - 1) * state.spokes + s, state.rings, state.spokes)
          return <line key={"sp" + s} x1={150} y1={150} x2={outer.x} y2={outer.y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        })}
        {/* Rings */}
        {Array.from({ length: state.rings }, (_, r) => {
          const r0 = ((r + 1) / state.rings) * 140
          return <circle key={"r" + r} cx="150" cy="150" r={r0} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        })}
        {/* Edges */}
        {edges.map(([a, b], i) => {
          const pa = nodePos(a, state.rings, state.spokes)
          const pb = nodePos(b, state.rings, state.spokes)
          const isPath = state.path.includes(a) && state.path.includes(b) &&
            Math.abs(state.path.indexOf(a) - state.path.indexOf(b)) === 1
          return (
            <line
              key={i}
              x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              stroke={isPath ? "#4f9eff" : "rgba(255,255,255,0.18)"}
              strokeWidth={isPath ? 2.5 : 1}
            />
          )
        })}
        {/* Stuck markers */}
        {state.stuck.map(n => {
          const p = nodePos(n, state.rings, state.spokes)
          return <circle key={"s" + n} cx={p.x} cy={p.y} r="4" fill="#ef4444" opacity="0.6" />
        })}
        {/* Nodes */}
        {Array.from({ length: total }, (_, n) => {
          const p = nodePos(n, state.rings, state.spokes)
          const isSpider = n === state.spider
          const isFly = n === state.fly
          const isStuck = state.stuck.includes(n)
          const canReach = canMove(state, n) && interactive
          return (
            <g key={n} onClick={() => handleNode(n)} style={{ cursor: canReach ? "pointer" : "default" }}>
              <circle
                cx={p.x} cy={p.y} r="14"
                fill={isStuck ? "rgba(239,68,68,0.2)" : canReach ? "rgba(79,158,255,0.2)" : "rgba(255,255,255,0.06)"}
                stroke={isStuck ? "#ef4444" : canReach ? "#4f9eff" : "rgba(255,255,255,0.2)"}
                strokeWidth="1.5"
              />
              {isSpider && <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="14">{"\u{1F577}"}</text>}
              {isFly && <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="12">{"\u{1F41B}"}</text>}
            </g>
          )
        })}
      </svg>

      {isSolved(state) && (
        <div className="sw-result won">
          <div className="sw-result-title">Caught the fly!</div>
          <div className="sw-result-msg">{state.moves} moves.</div>
          <button onClick={ctx.restart}>Play again</button>
        </div>
      )}
      {isLoss(state) && (
        <div className="sw-result lost">
          <div className="sw-result-title">Stuck!</div>
          <button onClick={ctx.restart}>Try again</button>
        </div>
      )}
    </div>
  )
}
