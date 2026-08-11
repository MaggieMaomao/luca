// FPS Hoops — shooting spots. Each spot is where the shooter (and camera)
// stands; the hoop is fixed. Launch height is hand height everywhere.

import type { Vec3 } from './types.ts'
import { RIM_Z } from './court.ts'

const HAND_Y = 2.05   // release height (overhead), matches court.LAUNCH_POS.y

export interface Spot {
  id: string
  label: string
  launch: Vec3
}

// z is measured from the shooter's baseline; more negative = closer to the
// hoop (rim is at RIM_Z). Distances are approximate real-world feet.
export const SPOTS: Spot[] = [
  { id: 'close', label: 'Close', launch: { x: 0, y: HAND_Y, z: RIM_Z + 3.0 } },
  { id: 'ft', label: 'Free throw', launch: { x: 0, y: HAND_Y, z: -0.15 } },
  { id: 'three', label: 'Top 3', launch: { x: 0, y: HAND_Y, z: RIM_Z + 6.75 } },
  { id: 'left', label: 'Left wing', launch: { x: -3.2, y: HAND_Y, z: RIM_Z + 5.2 } },
  { id: 'right', label: 'Right wing', launch: { x: 3.2, y: HAND_Y, z: RIM_Z + 5.2 } },
]

export const defaultSpot: Spot = SPOTS[1] // free throw
