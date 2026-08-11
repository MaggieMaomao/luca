// Toss — the playable React component. A 2D flick-into-the-bin game running on
// the action engine (canvas2d renderer). Mirrors how a game is mounted: wrap the
// action `Game` object in the engine's <GameHost>. No three.js is loaded (2D).

import { GameHost } from '@luca-game/engine/action'
import { tossGame } from './tossDefinition'

export default function TossGame() {
  return <GameHost game={tossGame} />
}
