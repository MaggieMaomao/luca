// Hoops — the playable React component. First-person 3D basketball on the action
// engine (r3f renderer; three.js is lazy-loaded by GameHost). hoops.css comes in
// via the assembly (hoops.tsx).

import { GameHost } from '@luca-game/engine/action'
import { hoopsGame } from './hoops'

export default function HoopsGame() {
  return (
    <div className="hoops-page">
      <GameHost game={hoopsGame} />
    </div>
  )
}
