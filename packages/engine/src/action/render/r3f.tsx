// Engine render — react-three-fiber (3D) adapter.
//
// Hosts the game's <Scene> inside a <Canvas>. A Ticker drives the sim via
// useFrame (r3f's own rAF). The game's Scene owns its camera/lights/content and
// reads live state via getState() each frame — the adapter stays game-agnostic.

import { Canvas, useFrame } from '@react-three/fiber'
import type { StageProps } from './types'

function Ticker({ tick }: { tick: (dt: number) => void }) {
  useFrame((_, dt) => tick(dt))
  return null
}

export function R3FStage<S>({ game, getState, bus, tick }: StageProps<S>) {
  const Scene = game.Scene
  if (!Scene) return null
  return (
    <Canvas camera={{ fov: 55, near: 0.1, far: 100, position: [0, 1.6, 3] }} dpr={[1, 2]}>
      <color attach="background" args={['#0e1017']} />
      <Ticker tick={tick} />
      <Scene getState={getState} bus={bus} />
    </Canvas>
  )
}
