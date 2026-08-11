// Chess - GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from "@luca-game/engine"
import {
  type ChessState, newGame, applyMove, isSolved, isLoss,
} from "./chess"
import { getGame } from "../../registry"

export type ChessAction =
  | { type: "MOVE"; payload: { from: [number, number]; to: [number, number] } }
  | { type: "RESTART" }

export interface ChessStats extends GameStats {
  moves: number
}

export function initialChess(): ChessState {
  return newGame()
}

export function applyChessAction(
  state: ChessState,
  action: ChessAction,
): GameTransition<ChessState, ChessStats> {
  switch (action.type) {
    case "MOVE":
      return { state: applyMove(state, action.payload.from, action.payload.to), stats: { moves: 1 } }
    case "RESTART":
      return { state: newGame(), consumed: true }
  }
}

export const chessDefinition: GameDefinition<ChessState, ChessAction, ChessStats> = {
  meta: getGame("chess")!,
  initialState: initialChess,
  applyAction: applyChessAction,
  isWin: isSolved,
  isLoss,
  controls: { keyboard: { r: { type: "RESTART" }, R: { type: "RESTART" } }, touch: "tap" },
  help: {
    description: "Classic chess. Click a piece to see its moves, then click a target square. (Simplified - no castling, en passant, or promotion.)",
    controls: [
      { action: "Click piece, then target" },
      { keys: "R", action: "restart" },
    ],
    goal: "Checkmate the opponent's king.",
  },
  stat: { label: "games.chess.moves", compute: (state) => state.moves },
  render: () => null as any,
}
