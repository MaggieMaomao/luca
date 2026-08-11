// Chess - game renderer.

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { GameEngine, type GameRenderContext } from "@luca-game/engine"
import {
  type ChessState, type Piece,
  newGame, applyMove, isSolved, isLoss, pieceMoves,
} from "./chess"
import type { ChessAction, ChessStats } from "./chessDefinition"
import { chessDefinition } from "./chessDefinition"
import "./chess.css"

const ONBOARD_KEY = "luca:onboarded:chess"

function renderChess(
  state: ChessState,
  ctx: GameRenderContext<ChessState, ChessAction, ChessStats>,
) {
  return <ChessBoard state={state} ctx={ctx} />
}

const chessFull = { ...chessDefinition, render: renderChess }

export default function Chess() {
  return <GameEngine definition={chessFull} className="chess" />
}

const PIECE_GLYPHS: Record<string, string> = {
  P: "\u2659", R: "\u2656", N: "\u2658", B: "\u2657", Q: "\u2655", K: "\u2654",
  p: "\u265F", r: "\u265C", n: "\u265E", b: "\u265D", q: "\u265B", k: "\u265A",
}

const PIECE_VALUES: Record<string, number> = {
  P: 1, R: 5, N: 3, B: 3, Q: 9, K: 100,
}

function ChessBoard({
  state, ctx,
}: {
  state: ChessState
  ctx: GameRenderContext<ChessState, ChessAction, ChessStats>
}) {
  const { t } = useTranslation()
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === "undefined") return false
    try { return window.localStorage.getItem(ONBOARD_KEY) !== "1" }
    catch { return true }
  })
  const [selected, setSelected] = useState<[number, number] | null>(null)

  useEffect(() => {
    if (state.moves > 0 && showOnboard) {
      setShowOnboard(false)
      try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {}
    }
  }, [state.moves, showOnboard])

  useEffect(() => {
    if (state.moves === 0) setSelected(null)
  }, [state.moves])

  const interactive = !isSolved(state) && !isLoss(state)

  const handleClick = (r: number, c: number) => {
    if (!interactive) return
    if (selected) {
      const [sr, sc] = selected
      const moves = pieceMoves(state, sr, sc)
      const isLegalTarget = moves.some(([mr, mc]) => mr === r && mc === c)
      if (isLegalTarget) {
        ctx.dispatch({ type: "MOVE", payload: { from: [sr, sc] as [number, number], to: [r, c] as [number, number] } })
        setSelected(null)
      } else {
        setSelected([r, c])
      }
    } else {
      const p = state.board[r][c]
      if (p === ".") {
        setSelected(null)
      } else {
        setSelected([r, c])
      }
    }
  }

  const legalFromSelected = selected ? pieceMoves(state, selected[0], selected[1]) : []

  return (
    <div className="che-wrap">
      {showOnboard && (
        <div className="che-onboard" onClick={() => {
          setShowOnboard(false)
          try { window.localStorage.setItem(ONBOARD_KEY, "1") } catch {}
        }}>
          <div className="che-onboard-inner">
            <strong>{t("games.chess.name", "Chess")}</strong>
            <p>{t("games.chess.onboard", "Click a piece to select it, then click a target square. (Simplified chess - no castling, en passant, or promotion.)")}</p>
            <button>{t("common.got_it", "Got it")}</button>
          </div>
        </div>
      )}

      <div className="che-info">
        <span className="che-label">Moves:</span>
        <span className="che-value">{state.moves}</span>
        <span className="che-spacer" />
        <span className="che-label">Score:</span>
        <span className="che-value">{state.board.reduce((s, row) => s + row.reduce((a, p) => a + (p === "." ? 0 : (p === p.toUpperCase() ? PIECE_VALUES[p] || 0 : -(PIECE_VALUES[p.toUpperCase()] || 0))), 0), 0)}</span>
      </div>

      <div className="che-board">
        <div className="che-files-top">
          {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(f => (
            <span key={f} className="che-file-label">{f}</span>
          ))}
        </div>
        <div className="che-board-inner">
          <div className="che-ranks-left">
            {[8, 7, 6, 5, 4, 3, 2, 1].map(r => (
              <span key={r} className="che-rank-label">{r}</span>
            ))}
          </div>
          <div className="che-grid">
            {state.board.map((row, r) =>
              row.map((sq, c) => {
                const isLight = (r + c) % 2 === 0
                const isSelected = selected && selected[0] === r && selected[1] === c
                const isLegal = legalFromSelected.some(([mr, mc]) => mr === r && mc === c)
                const piece = sq === "." ? null : sq
                return (
                  <button
                    key={r + "," + c}
                    className={"che-cell" + (isLight ? " light" : " dark") + (isSelected ? " selected" : "") + (isLegal ? " legal" : "")}
                    onClick={() => handleClick(r, c)}
                    disabled={!interactive}
                  >
                    {piece && (
                      <span className={"che-piece" + (piece === piece.toUpperCase() ? " white" : " black")}>
                        {PIECE_GLYPHS[piece]}
                      </span>
                    )}
                    {isLegal && !piece && <span className="che-legal-dot" />}
                    {isLegal && piece && <span className="che-legal-capture" />}
                  </button>
                )
              })
            )}
          </div>
          <div className="che-ranks-right">
            {[8, 7, 6, 5, 4, 3, 2, 1].map(r => (
              <span key={r} className="che-rank-label">{r}</span>
            ))}
          </div>
        </div>
        <div className="che-files-bottom">
          {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(f => (
            <span key={f} className="che-file-label">{f}</span>
          ))}
        </div>
      </div>

      {isSolved(state) && (
        <div className="che-result won">
          <div className="che-result-title">Checkmate!</div>
          <button onClick={ctx.restart}>Play again</button>
        </div>
      )}
      {isLoss(state) && (
        <div className="che-result lost">
          <div className="che-result-title">Checkmated</div>
          <button onClick={ctx.restart}>Try again</button>
        </div>
      )}
    </div>
  )
}
