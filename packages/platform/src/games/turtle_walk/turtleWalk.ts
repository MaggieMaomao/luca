// Turtle Walk — pure game logic.
//
// A series of commands ("forward", "left", "right") are given; the
// player must predict where the turtle ends up. Like a simple LOGO
// turtle that moves on a grid.
//
// All exports are PURE FUNCTIONS. No React, no DOM.

export type Command = 'F' | 'L' | 'R'  // Forward, Left, Right
export type Direction = 0 | 1 | 2 | 3  // 0=N, 1=E, 2=S, 3=W
export type Position = { x: number; y: number; dir: Direction }

export type TurtleState = {
  start: Position
  commands: Command[]
  /** Player's predicted final position. */
  prediction: Position | null
  moves: number
}

export const COMMANDS: Record<Command, (p: Position) => Position> = {
  F: (p) => {
    if (p.dir === 0) return { ...p, y: p.y - 1 }  // N
    if (p.dir === 1) return { ...p, x: p.x + 1 }  // E
    if (p.dir === 2) return { ...p, y: p.y + 1 }  // S
    return { ...p, x: p.x - 1 }                    // W
  },
  L: (p) => ({ ...p, dir: ((p.dir + 3) % 4) as Direction }),  // turn left (CCW)
  R: (p) => ({ ...p, dir: ((p.dir + 1) % 4) as Direction }),  // turn right (CW)
}

export function executeCommands(start: Position, commands: Command[]): Position {
  return commands.reduce((p, cmd) => COMMANDS[cmd](p), start)
}

export function newPuzzle(seed: number = 0, length: number = 8): TurtleState {
  let rng = (seed || 1) | 0
  const rand = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    return rng / 0x7fffffff
  }
  const cmds: Command[] = []
  for (let i = 0; i < length; i++) {
    const r = rand()
    if (r < 0.4) cmds.push('F')
    else if (r < 0.7) cmds.push('L')
    else cmds.push('R')
  }
  return {
    start: { x: 0, y: 0, dir: 0 },  // facing North
    commands: cmds,
    prediction: null,
    moves: 0,
  }
}

export function predict(state: TurtleState, prediction: Position): TurtleState {
  return { ...state, prediction, moves: state.moves + 1 }
}

export function isSolved(state: TurtleState): boolean {
  if (!state.prediction) return false
  const actual = executeCommands(state.start, state.commands)
  return actual.x === state.prediction.x
    && actual.y === state.prediction.y
    && actual.dir === state.prediction.dir
}

export function isLoss(_state: TurtleState): boolean {
  return false
}

export function newState(): TurtleState {
  return newPuzzle()
}