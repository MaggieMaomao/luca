// Hoops on the engine — the r3f Scene. Reads LIVE state via getState() each
// frame and reacts to effect events on the engine bus. Ports the visuals from
// basketball3d/scene, reusing the static Court + court constants. The engine's
// R3FStage drives the sim tick; this only reads + draws.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  CanvasTexture, SRGBColorSpace, RepeatWrapping,
  type Group, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial, type MeshPhysicalMaterial, type Sprite, type Texture,
} from 'three'
import type { EventBus } from '@luca-game/engine/action'
import { Court } from './Court'
import {
  BALL_RADIUS, RIM_HEIGHT, RIM_RADIUS, RIM_Z,
  BACKBOARD_BOTTOM, BACKBOARD_CENTER_Y, BACKBOARD_H, BACKBOARD_W, BACKBOARD_Z,
} from '../sim/court'

// Bundled ball texture (content-hashed by the consumer's bundler).
const BALL_URL = new URL('../assets/ball.png', import.meta.url).href
import { getBallPos, type HoopsState } from '../hoopsSim'

const EYE_H = 1.62
const CAM_BACK = 1.25
const AIM_Y = RIM_HEIGHT - 0.6

interface SceneProps { getState: () => HoopsState; bus: EventBus<string> }

export function HoopsScene({ getState, bus }: SceneProps) {
  return (
    <>
      <FirstPersonCam getState={getState} />
      <hemisphereLight args={['#dfe7ff', '#3a3320', 0.7]} />
      <directionalLight position={[3, 8, 2]} intensity={1.1} />
      <ambientLight intensity={0.4} />
      <Court />
      <Hoop bus={bus} />
      <Ball getState={getState} />
    </>
  )
}

function FirstPersonCam({ getState }: { getState: () => HoopsState }) {
  const { camera } = useThree()
  const lastSpot = useRef('')
  useFrame(() => {
    const spot = getState().spot
    if (spot.id === lastSpot.current) return
    lastSpot.current = spot.id
    const l = spot.launch
    const ax = l.x, az = l.z - RIM_Z
    const len = Math.hypot(ax, az) || 1
    camera.position.set(l.x + (ax / len) * CAM_BACK, EYE_H, l.z + (az / len) * CAM_BACK)
    camera.lookAt(0, AIM_Y, RIM_Z)
    camera.updateProjectionMatrix()
  })
  return null
}

// ── Ball (real photo billboard sprite, state-driven) ─────────────────────────
const TRAIL = 8, STRIDE = 2, D = BALL_RADIUS * 2.1

function useBallTexture(): Texture | null {
  const [tex, setTex] = useState<Texture | null>(null)
  useEffect(() => {
    if (typeof document === 'undefined') return
    let alive = true
    const img = new Image()
    img.src = BALL_URL
    img.onload = () => {
      if (!alive) return
      const size = 512
      const c = document.createElement('canvas'); c.width = c.height = size
      const ctx = c.getContext('2d'); if (!ctx) return
      const R = 258
      ctx.save(); ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2 * 0.98, 0, Math.PI * 2); ctx.clip()
      ctx.drawImage(img, 510 - R, 280 - R, 2 * R, 2 * R, 0, 0, size, size); ctx.restore()
      const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = RepeatWrapping
      setTex(t)
    }
    return () => { alive = false }
  }, [])
  return tex
}

function Ball({ getState }: { getState: () => HoopsState }) {
  const ref = useRef<Sprite>(null)
  const tex = useBallTexture()
  const trailRefs = useRef<(Sprite | null)[]>([])
  const history = useRef<{ x: number; y: number; z: number }[]>([])
  const dots = useMemo(() => Array.from({ length: TRAIL }, (_, i) => i), [])

  useFrame((_, delta) => {
    const s = getState()
    const p = getBallPos(s)
    const inFlight = s.status === 'flight'
    if (ref.current) {
      ref.current.visible = inFlight
      ref.current.position.set(p.x, p.y, p.z)
      if (inFlight) ref.current.material.rotation -= 6 * delta
    }
    if (inFlight) history.current.unshift(p); else history.current.length = 0
    if (history.current.length > TRAIL * STRIDE) history.current.length = TRAIL * STRIDE
    for (let i = 0; i < TRAIL; i++) {
      const m = trailRefs.current[i]; if (!m) continue
      const h = history.current[i * STRIDE]
      if (h) { m.visible = true; m.position.set(h.x, h.y, h.z) } else m.visible = false
    }
  })

  return (
    <group>
      <sprite ref={ref} scale={[D, D, 1]} visible={false}>
        <spriteMaterial map={tex ?? undefined} transparent alphaTest={0.02} depthWrite={false} color={tex ? '#ffffff' : '#d9622a'} />
      </sprite>
      {dots.map(i => {
        const sc = D * (1 - i * 0.05)
        return (
          <sprite key={i} ref={m => { trailRefs.current[i] = m }} scale={[sc, sc, 1]} visible={false}>
            <spriteMaterial map={tex ?? undefined} transparent opacity={0.16 * (1 - i / TRAIL)} depthWrite={false} />
          </sprite>
        )
      })}
    </group>
  )
}

// ── Hoop (glass board + rim + net, effects via the bus) ──────────────────────
const NET_Y = RIM_HEIGHT - 0.2, SQ_W = 0.59, SQ_H = 0.45, BAR = 0.022
const BOARD_FRONT = BACKBOARD_Z + 0.021, SQ_CY = RIM_HEIGHT + SQ_H / 2 + 0.02, BLACK = '#141619'

function Hoop({ bus }: { bus: EventBus<string> }) {
  const net = useRef<Mesh>(null)
  const rim = useRef<Group>(null)
  const boardMat = useRef<MeshPhysicalMaterial>(null)
  const ring = useRef<Mesh>(null)
  const ringMat = useRef<MeshBasicMaterial>(null)
  const swish = useRef(0), shake = useRef(0), boardFlash = useRef(0), ringFlash = useRef(0)

  useEffect(() => bus.on(e => {
    if (e === 'swish' || e === 'make') swish.current = 0.6
    else if (e === 'hit-rim') { shake.current = 0.4; ringFlash.current = 0.35; swish.current = Math.max(swish.current, 0.35) }
    else if (e === 'hit-backboard') { boardFlash.current = 0.4; ringFlash.current = 0.3 }
  }), [bus])

  useFrame((_, dt) => {
    if (net.current) {
      if (swish.current > 0) {
        swish.current = Math.max(0, swish.current - dt); const t = swish.current / 0.6; const st = 1 + 0.8 * t
        net.current.scale.set(1 + 0.15 * t, st, 1 + 0.15 * t); net.current.position.y = NET_Y - 0.2 * (st - 1)
      } else { net.current.scale.set(1, 1, 1); net.current.position.y = NET_Y }
    }
    if (rim.current) {
      if (shake.current > 0) {
        shake.current = Math.max(0, shake.current - dt); const t = shake.current / 0.4
        rim.current.position.set(Math.sin(t * 60) * 0.02 * t, RIM_HEIGHT + Math.sin(t * 48) * 0.022 * t, RIM_Z)
      } else rim.current.position.set(0, RIM_HEIGHT, RIM_Z)
    }
    if (boardMat.current) boardMat.current.emissive.setScalar(boardFlash.current > 0 ? 1.3 * ((boardFlash.current = Math.max(0, boardFlash.current - dt)) / 0.4) : 0)
    if (ring.current && ringMat.current) {
      if (ringFlash.current > 0) {
        ringFlash.current = Math.max(0, ringFlash.current - dt); const t = ringFlash.current / 0.35; const sc = 1 + (1 - t) * 1.7
        ring.current.visible = true; ring.current.scale.set(sc, sc, sc); ringMat.current.opacity = t * 0.85
      } else ring.current.visible = false
    }
  })

  return (
    <group>
      <mesh position={[0, BACKBOARD_BOTTOM / 2, BACKBOARD_Z - 0.5]}><cylinderGeometry args={[0.06, 0.06, BACKBOARD_BOTTOM, 12]} /><meshStandardMaterial color="#23272e" metalness={0.5} roughness={0.5} /></mesh>
      <mesh position={[0, BACKBOARD_CENTER_Y, BACKBOARD_Z - 0.27]}><boxGeometry args={[0.08, 0.08, 0.5]} /><meshStandardMaterial color="#23272e" metalness={0.5} roughness={0.5} /></mesh>
      <mesh position={[0, BACKBOARD_CENTER_Y, BACKBOARD_Z - 0.015]}><boxGeometry args={[BACKBOARD_W + 0.07, BACKBOARD_H + 0.07, 0.03]} /><meshStandardMaterial color="#33383f" metalness={0.75} roughness={0.35} /></mesh>
      <mesh position={[0, BACKBOARD_CENTER_Y, BACKBOARD_Z]}>
        <boxGeometry args={[BACKBOARD_W, BACKBOARD_H, 0.035]} />
        <meshPhysicalMaterial ref={boardMat} color="#cadfec" transparent opacity={0.36} roughness={0.04} metalness={0} clearcoat={1} clearcoatRoughness={0.05} ior={1.5} reflectivity={0.6} emissive="#bfe0ff" emissiveIntensity={1} />
      </mesh>
      <pointLight position={[1.5, 3.9, RIM_Z + 1.4]} intensity={5} distance={6} decay={2} color="#ffffff" />
      <mesh position={[0, BACKBOARD_BOTTOM + 0.05, BOARD_FRONT]}><boxGeometry args={[BACKBOARD_W, 0.1, 0.05]} /><meshStandardMaterial color="#1f2a44" roughness={0.8} /></mesh>
      <group position={[0, 0, BOARD_FRONT]}>
        <mesh position={[0, SQ_CY + SQ_H / 2, 0]}><boxGeometry args={[SQ_W, BAR, 0.01]} /><meshStandardMaterial color={BLACK} /></mesh>
        <mesh position={[0, SQ_CY - SQ_H / 2, 0]}><boxGeometry args={[SQ_W, BAR, 0.01]} /><meshStandardMaterial color={BLACK} /></mesh>
        <mesh position={[-SQ_W / 2, SQ_CY, 0]}><boxGeometry args={[BAR, SQ_H, 0.01]} /><meshStandardMaterial color={BLACK} /></mesh>
        <mesh position={[SQ_W / 2, SQ_CY, 0]}><boxGeometry args={[BAR, SQ_H, 0.01]} /><meshStandardMaterial color={BLACK} /></mesh>
      </group>
      <group ref={rim} position={[0, RIM_HEIGHT, RIM_Z]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[RIM_RADIUS, 0.016, 14, 40]} /><meshStandardMaterial color="#e8641c" metalness={0.5} roughness={0.4} /></mesh>
        <mesh position={[0, 0, -(RIM_RADIUS + 0.08)]}><boxGeometry args={[0.06, 0.03, 0.16]} /><meshStandardMaterial color="#e8641c" metalness={0.5} roughness={0.4} /></mesh>
      </group>
      <mesh ref={ring} position={[0, RIM_HEIGHT, RIM_Z]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[RIM_RADIUS * 0.9, RIM_RADIUS * 1.35, 32]} />
        <meshBasicMaterial ref={ringMat} color="#ffdf8a" transparent opacity={0} side={2} depthWrite={false} />
      </mesh>
      <mesh ref={net} position={[0, NET_Y, RIM_Z]}>
        <cylinderGeometry args={[RIM_RADIUS * 0.98, RIM_RADIUS * 0.5, 0.4, 24, 1, true]} />
        <meshStandardMaterial color="#f4f4f4" transparent opacity={0.5} wireframe side={2} />
      </mesh>
    </group>
  )
}
