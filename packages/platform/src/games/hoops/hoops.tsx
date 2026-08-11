// Hoops — the Game object, assembling the pure logic (hoopsSim) with the r3f
// Scene, the hands Overlay, the HUD, the Controls, and the sound cues. This is
// the original first-person basketball game re-expressed on the engine.

import type { Game } from '@luca-game/engine/action'
import './hoops.css' // reuse the hoops HUD/viewmodel styles
import { HoopsScene } from './scene/HoopsScene'
import { HoopsOverlay } from './HoopsOverlay'
import { HoopsHud } from './HoopsHud'
import { HoopsControls } from './HoopsControls'
import { hoopsSounds } from './sounds'
import {
  initHoops, stepHoops, applyHoops, mapHoops, outcomeHoops,
  type HoopsState, type HoopsIntent, type HoopsEvent,
} from './hoopsSim'

export const hoopsGame: Game<HoopsState, HoopsIntent, HoopsEvent> = {
  meta: {
    id: 'hoops',
    title: 'Hoops',
    description: 'First-person 3D basketball.',
    renderer: 'r3f',
    hint: 'Flick up toward the hoop to shoot — flick harder to throw farther, angle it to aim. Works with mouse or touch.',
  },
  init: initHoops,
  step: stepHoops,
  apply: applyHoops,
  mapGesture: mapHoops,
  outcome: outcomeHoops,
  Scene: HoopsScene,
  Overlay: HoopsOverlay,
  Hud: HoopsHud,
  Controls: HoopsControls,
  sounds: hoopsSounds,
}
