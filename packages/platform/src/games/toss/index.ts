// @luca-game/platform/games/toss — public exports for this game.
//
// An action-engine game (renderer-agnostic core, canvas2d). The default export
// is the action `Game` object; `Component` is the React component that runs it.

export { tossGame as default } from './tossDefinition'
export { default as Component } from './TossGame'
