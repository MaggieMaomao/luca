// FPS Hoops — the court: floor, painted lane, free-throw line, back wall.
// Uses the shared court constants so geometry lines up with the physics.

import { RIM_Z, BACKBOARD_Z } from '../sim/court'

const WOOD = '#c8a15a'
const WOOD_DARK = '#b8914a'
const LINE = '#f4ecd8'

export function Court() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]}>
        <planeGeometry args={[14, 16]} />
        <meshStandardMaterial color={WOOD} roughness={0.85} />
      </mesh>

      {/* Painted lane (key) from the line to under the basket */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, RIM_Z / 2]}>
        <planeGeometry args={[3.6, Math.abs(RIM_Z) + 0.4]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
      </mesh>

      {/* Free-throw line (thin strip under the shooter) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0.1]}>
        <planeGeometry args={[3.6, 0.06]} />
        <meshStandardMaterial color={LINE} roughness={0.6} />
      </mesh>

      {/* Back void behind the hoop — unlit so no light/shadow gradient lands on
          it (which made the board look pasted onto a wall). Pushed further back. */}
      <mesh position={[0, 3, BACKBOARD_Z - 3]}>
        <planeGeometry args={[16, 9]} />
        <meshBasicMaterial color="#0b0d12" />
      </mesh>
    </group>
  )
}
