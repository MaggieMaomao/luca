// GeomeTree - game renderer.

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { GameEngine, type GameRenderContext } from "@luca-game/engine"
import {
  type GeomeTreeState,
  isSolved, isLoss,
} from "./geometree"
import type { GeomeAction, GeomeStats } from "./geometreeDefinition"
import { geometreeDefinition } from "./geometreeDefinition"
import "./geometree.css"

const ONBOARD_KEY = "luca:onboarded:geometree"

function renderGeome(
  state: GeomeTreeState,
  ctx: GameRenderContext<GeomeTreeState, GeomeAction, GeomeStats>,
) {
  return <GeomeBoard state={state} ctx={ctx} />
}

const geomeFull = { ...geometreeDefinition, render: renderGeome }

export default function GeomeTree() {
  return <GameEngine definition={geomeFull} className="geometree" />
}

function GeomeBoard({
  state, ctx,
}: {
  state: GeomeTreeState
  ctx: GameRenderContext<GeomeTreeState, GeomeAction, GeomeStats>
}) {
  const { t } = useTranslation()
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === "undefined") return false
    try { return window.localStorage.getItem(ONBOARD_KEY) !== "1" }
    catch { return true }
  })
  const [selected, setSelected] = useState<number | null>(null)
  const [draft, setDraft] = useState("")

  useEffect(() => {
    if (state.moves > 0 && showOnboard) {
      setShowOnboard(false)
      try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {}
    }
  }, [state.moves, showOnboard])

  useEffect(() => {
    if (state.moves === 0) setSelected(null)
  }, [state.moves])

  // Seed the input with the node's current value when selection changes.
  useEffect(() => {
    const v = selected !== null ? state.nodes[selected]?.value : null
    setDraft(v != null ? String(v) : "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const interactive = !isSolved(state) && !isLoss(state)

  const handleNode = (idx: number) => {
    if (!interactive) return
    if (state.nodes[idx].prefilled) return // leaves are given — not editable
    setSelected(selected === idx ? null : idx)
  }

  const submit = () => {
    if (selected === null) return
    const v = parseInt(draft, 10)
    if (!Number.isFinite(v) || v < 0) return
    ctx.dispatch({ type: "SET", payload: { idx: selected, value: v } })
  }

  // Compute layout: a balanced tree of depth 3 has up to 15 nodes
  const layout = () => {
    const positions: { x: number; y: number }[] = []
    for (let i = 0; i < state.nodes.length; i++) {
      const depth = Math.floor(Math.log2(i + 1))
      const posInLevel = i - (Math.pow(2, depth) - 1)
      const totalInLevel = Math.pow(2, depth)
      const x = 40 + (320 - 80) * (posInLevel + 0.5) / totalInLevel
      const y = 32 + depth * 56
      positions.push({ x, y })
    }
    return positions
  }

  const positions = layout()
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  for (let i = 0; i < state.nodes.length; i++) {
    for (const c of state.nodes[i].children) {
      lines.push({ x1: positions[i].x, y1: positions[i].y,
                   x2: positions[c].x, y2: positions[c].y })
    }
  }

  return (
    <div className="gt-wrap">
      {showOnboard && (
        <div className="gt-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {}
        }}>
          <div className="gt-onboard-inner">
            <strong>{t("games.geometree.name", "GeomeTree")}</strong>
            <p>{t("games.geometree.onboard", "Each parent equals the sum (or product) of its children. Click a node to select it, then click a number to fill it in.")}</p>
            <button>{t("common.got_it", "Got it")}</button>
          </div>
        </div>
      )}

      <div className="gt-info">
        <span className="gt-label">Relation:</span>
        <span className="gt-value">{state.relation}</span>
        <span className="gt-spacer" />
        <span className="gt-label">Hint:</span>
        <span className="gt-value">parents = {state.relation} of children</span>
      </div>

      <svg className="gt-svg" width="320" height="240" viewBox="0 0 320 240">
        {lines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        ))}
        {state.nodes.map((n, i) => {
          const v = n.value
          const isSelected = selected === i
          const isLeaf = n.children.length === 0
          return (
            <g key={i} onClick={() => handleNode(i)} style={{ cursor: interactive ? "pointer" : "default" }}>
              <circle
                cx={positions[i].x} cy={positions[i].y} r={isLeaf ? 14 : 16}
                fill={v !== null ? "rgba(79,158,255,0.2)" : isSelected ? "rgba(79,158,255,0.4)" : "rgba(255,255,255,0.06)"}
                stroke={isSelected ? "#4f9eff" : "rgba(255,255,255,0.4)"}
                strokeWidth="1.5"
              />
              <text
                x={positions[i].x} y={positions[i].y + 4}
                textAnchor="middle" fontSize="13" fontWeight="600"
                fill="white"
              >
                {v !== null ? v : "?"}
              </text>
            </g>
          )
        })}
      </svg>

      {selected !== null && !state.nodes[selected].prefilled && (
        <div className="gt-palette">
          <div className="gt-palette-label">
            {t("games.geometree.enter", "Enter this node's value")}
          </div>
          <div className="gt-input-row">
            <input
              type="number"
              min={0}
              className="gt-input"
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit() }}
            />
            <button className="gt-set-btn" onClick={submit} disabled={draft.trim() === ""}>
              {t("games.geometree.set", "Set")}
            </button>
          </div>
        </div>
      )}

      {isSolved(state) && (
        <div className="gt-result won">
          <div className="gt-result-title">{t("games.geometree.won", "All consistent!")}</div>
          <button onClick={ctx.restart}>{t("games.play.restart", "Play again")}</button>
        </div>
      )}
    </div>
  )
}
