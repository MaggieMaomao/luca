// Spider Web - GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from "@luca-game/engine"
import {
  type SpiderWebState, type NodeId,
  newGame, move, isSolved, isLoss,
} from "./spiderWeb"
import { getGame } from "../../registry"

export type SpiderWebAction =
  | { type: "MOVE"; payload: { to: NodeId } }
  | { type: "RESTART" }

export interface SpiderWebStats extends GameStats {
  moves: number
}

export function initialSW(): SpiderWebState {
  return newGame()
}

export function applySWAction(
  state: SpiderWebState,
  action: SpiderWebAction,
): GameTransition<SpiderWebState, SpiderWebStats> {
  switch (action.type) {
    case "MOVE":
      return { state: move(state, action.payload.to), stats: { moves: 1 } }
    case "RESTART":
      return { state: newGame(), consumed: true }
  }
}

export const spiderWebDefinition: GameDefinition<SpiderWebState, SpiderWebAction, SpiderWebStats> = {
  meta: getGame("spider_web")!,
  initialState: initialSW,
  applyAction: applySWAction,
  isWin: isSolved,
  isLoss,
  controls: { keyboard: { r: { type: "RESTART" }, R: { type: "RESTART" } }, touch: "tap" },
  help: {
    description: "Move the spider to the fly. Click an adjacent node to walk to it. Stuck threads (red) block movement.",
    controls: [{ action: "Click an adjacent node" }],
    goal: "Reach the fly.",
  },
  stat: { label: "games.spider_web.moves", compute: (state) => state.moves },
  render: () => null as any,
}
