// @luca-game/platform/games/basketball — public exports.
//
// Phase 6.2 MVP. The basketball game is the "vertical slice" that
// drives the real-time engine evolution. It consumes
// @luca-game/engine (turn-based + real-time sides) and adds the
// basketball-specific visuals + physics setup.
//
// Per the Phase 6 design: this is a CONSUMER of the engine. Any
// game-specific code (basketball's local gesture handler, the
// hoop/ball/court visual setup) lives in the game until the
// vertical-slice loop proves it should move to the engine (Phase 6.4).

export { basketballDefinition as default } from './BasketballDefinition'
export { default as Component } from './BasketballGame'
