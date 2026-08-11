// @luca-game/platform/games — barrel for all bundled games.
// Only games with real playable React UIs are exported here.
// Coming-soon games still have logic in their directories, but their
// UIs are placeholders — they'll be added as we build them.

export { default as games2048 } from './games2048'
export { default as lights } from './lights'
export { default as sudoku } from './sudoku'
export { default as towers_of_hanoi } from './towers_of_hanoi'
export { default as sliding_blocks } from './sliding_blocks'
export { default as tangram } from './tangram'
export { default as bomb_defuser } from './bomb_defuser'
export { default as nim } from './nim'
export { default as induction } from './induction'
export { default as magic_square } from './magic_square'
export { default as turtle_walk } from './turtle_walk'
export { default as ichomp } from './ichomp'
export { default as mastermind } from './mastermind'
export { default as skyscrapers } from './skyscrapers'
export { default as fruit_salad } from './fruit_salad'
export { default as spider_web } from './spider_web'
export { default as floodfill } from './floodfill'
export { default as dots } from './dots'
export { default as geometree } from './geometree'
export { default as mazes } from './mazes'
export { default as sokoban } from './sokoban'
export { default as hackenbush } from './hackenbush'
export { default as knot_colouring } from './knot_colouring'
export { default as unknotting } from './unknotting'
export { default as chess } from './chess'
export { default as chomp } from './chomp'
export { default as calcrostic } from './calcrostic'
export { default as packing } from './packing'

// Phase 6 — Real-time games (basketball is the MVP vertical slice)
export { default as basketball } from './basketball'

// Action engine — renderer-agnostic games (2D canvas + optional 3D r3f)
export { default as toss } from './toss'
export { default as hoops } from './hoops'