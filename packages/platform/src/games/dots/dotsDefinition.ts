// Dots - GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from "@luca-game/engine"
import {
  type DotsState, type DotLine, newGame, applyMove, isSolved, isWin, isLoss,
  opponentMove,
} from "./dots"
import { getGame } from "../../registry"

export type DotsAction =
  | { type: "LINE"; payload: DotLine }
  | { type: "RESTART" }

export interface DotsStats extends GameStats {
  moves: number
}

export function initialDots(): DotsState {
  return newGame()
}

export function applyDotsAction(
  state: DotsState,
  action: DotsAction,
): GameTransition<DotsState, DotsStats> {
  switch (action.type) {
    case "LINE": {
      let s = applyMove(state, action.payload)
      if (s === state) return { state, consumed: false }
      // The player keeps the turn after completing a box (applyMove leaves
      // turn === 'player'), so only run the AI once control has actually
      // passed to it — and let the AI keep going while IT completes boxes.
      let guard = 0
      while (s.turn === "opponent" && !isSolved(s) && guard++ < 1000) {
        const aiLine = opponentMove(s)
        if (!aiLine) break
        s = applyMove(s, aiLine)
      }
      return { state: s, stats: { moves: s.moves } }
    }
    case "RESTART":
      return { state: newGame(), consumed: true }
  }
}

export const dotsDefinition: GameDefinition<DotsState, DotsAction, DotsStats> = {
  meta: getGame("dots")!,
  initialState: initialDots,
  applyAction: applyDotsAction,
  isWin,
  isLoss,
  controls: { keyboard: { r: { type: "RESTART" }, R: { type: "RESTART" } }, touch: "tap" },
  help: {
    description: "Draw lines between adjacent dots. Complete a box to score a point and take another turn. Win by owning the most boxes.",
    controls: [{ action: "Click the gap between two adjacent dots" }],
    goal: "Score more boxes than your opponent.",
  },
  stat: { label: "games.dots.score", compute: (state) => `${state.scores[0]}–${state.scores[1]}` },
  render: () => null as any,
}
