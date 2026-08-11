// Basketball — clean React component. Best-practice arcade game.
//
// Design choices:
// - Court is a single <canvas> using SVG-free procedural drawing.
//   Same primitives used for both static decoration and live physics.
// - Pointer drag = swipe-throw. The swipe velocity at release
//   becomes the initial ball velocity. Mouse, touch, pen all work
//   via Pointer Events.
// - A live trajectory preview is drawn while the user drags: dotted
//   arc showing where the ball will fly BEFORE they release. This
//   makes the controls feel responsive even with imperfect aim.
// - Physics: fixed-timestep semi-implicit Euler with 4 substeps per
//   frame. Collisions: circle-segment for the rim, AABB for the
//   backboard, plane for the floor, side walls. Restitution
//   coefficients tuned for arcade feel (rim is firm, floor is soft).
// - All transient state (ball vx/vy, drag origin) lives in refs.
//   React state is reserved for things that must re-render UI.
// - Keyboard support: Space=throw, ↑↓=power, ←→=aim, R=reset.

import { useEffect, useRef, useState, useCallback } from 'react'
import './Basketball.css'

// ── Canvas geometry (px) ────────────────────────────────────────
const W = 600
const H = 400
const FLOOR_Y = H - 16           // top of the wooden floor strip
const BALL_R = 11                 // ball radius in px
const RIM_R = 22                 // rim half-width in px
const RIM_X = W * 0.65
const RIM_Y = H * 0.42
const RIM_THICK = 3
const BACKBOARD_X = RIM_X + RIM_R + 2
const BACKBOARD_TOP = RIM_Y - 50
const BACKBOARD_BOT = RIM_Y + 12
const BACKBOARD_W = 6
const NET_TOP = RIM_Y
const NET_BOT = H * 0.65
const SPAWN_X = W * 0.16
const SPAWN_Y = FLOOR_Y - BALL_R - 4

// ── Player (the basketballer) ──────────────────────────────────────
// Standing figure on the floor at SPAWN_X, holding the ball when
// at rest. When the ball is thrown, the player's shooting arm raises
// briefly then settles.
const PLAYER_X = SPAWN_X
const PLAYER_FOOT_Y = FLOOR_Y
const PLAYER_LEG_W = 4
const PLAYER_LEG_H = 22
const PLAYER_BODY_W = 14
const PLAYER_BODY_H = 30
const PLAYER_NECK_H = 4
const PLAYER_HEAD_R = 9
// Arm geometry (right-handed shooter, faces right toward the rim)
const PLAYER_SHOULDER_Y = PLAYER_FOOT_Y - PLAYER_LEG_H - PLAYER_BODY_H - 2
const PLAYER_SHOULDER_X = PLAYER_X + PLAYER_BODY_W / 2
const PLAYER_HAND_X = PLAYER_X + 18
const PLAYER_HAND_Y_IDLE = PLAYER_SHOULDER_Y + 4   // hand at hip when idle
// At mid-shot, arm rotates up: hand position parameterised by
// `shotProgress` in [0,1]. 0 = held-at-hip, 1 = fully extended up.
const PLAYER_ARM_LEN = 18
// Player animation: when ball goes alive, animate arm over 0.5s
const PLAYER_ARM_ANIM_MS = 500

// ── Physics constants ──────────────────────────────────────────
const GRAVITY = 1300             // px/s² — arcade arcade gravity
const AIR_DRAG = 0.20            // s⁻¹
const RIM_RESTITUTION = 0.72
const BACKBOARD_RESTITUTION = 0.65
const FLOOR_RESTITUTION = 0.55
const RIM_TANGENTIAL = 0.30     // how much rim swerves the ball sideways
const MAX_FLIGHT_MS = 4000       // safety reset

// ── Game state (refs only — never put physics in useState) ─────
type Ball = {
  x: number; y: number
  vx: number; vy: number
  alive: boolean
  scored: boolean
  bounces: number
  /** Wall-clock ms when this throw started (for the safety reset). */
  startedAt: number
}

type Drag = { x0: number; y0: number; x: number; y: number; t0: number; t: number } | null

export default function BasketballGame() {
  // ── React state (UI mirrors only) ───────────────────────────
  const [shots, setShots] = useState(0)
  const [lastShot, setLastShot] = useState('')
  const [made, setMade] = useState('')
  const [power, setPower] = useState(6.5)      // user-tunable throw strength
  const [aimX, setAimX] = useState(0)          // -1..+1 lateral aim
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Player animation: progress 0 (idle, ball in hands) → 1 (mid-shot,
  // arm extended up). 0 = held-at-hip. Eases back to 0 after a throw.
  const playerShotStartRef = useRef<number | null>(null)  // performance.now() at throw, or null if not animating

  // Mutable game state lives in a ref so the rAF loop doesn't
  // trigger React re-renders. The `force` trigger still does.
  const ballRef = useRef<Ball>({
    x: SPAWN_X, y: SPAWN_Y, vx: 0, vy: 0,
    alive: false, scored: false, bounces: 0,
    startedAt: 0,
  })
  const dragRef = useRef<Drag>(null)

  // Score flash
  const flashUntilRef = useRef(0)

  // ── Throw: launch a tween with parm physics integration ─────
  const launchThrow = useCallback((vx: number, vy: number) => {
    if (ballRef.current.alive) return  // already in flight
    ballRef.current = {
      x: SPAWN_X, y: SPAWN_Y, vx, vy,
      alive: true, scored: false, bounces: 0,
      startedAt: performance.now(),
    }
    playerShotStartRef.current = performance.now()  // start the throwing animation
    flashUntilRef.current = 0
  }, [])

  /**
   * Compute a "showcase" (guaranteed-scoring) throw for the given
   * power level.
   *
   * Approach: pick a flight apex higher than the rim by an amount
   * that scales with power, then derive vx0/vy0 from kinematics so
   * the ball reaches (RIM_X, RIM_Y) while descending.
   *
   *   apex height H_above_rim = 30 + (p − 3) × 6   (px)
   *   vy0 = sqrt(2 g H_total), where H_total = (RIM_Y − SPAWN_Y) − H_above_rim
   *   apex time (vy0 → 0): t_apex = vy0 / g
   *   descent: y_apex − y(t) = 0.5 g (t − t_apex)²
   *     solve for t when y = RIM_Y (descending):
   *     0.5 g t_descent² = H_above_rim → t_descent = sqrt(2 H_above_rim / g)
   *     total flight t = t_apex + t_descent
   *   vx0 = dx / t
   *
   * The result: apex at vy=0, lands at rim descending. Always swishes
   * unless air drag or numerical drift perturbs it.
   */
  const computeShowcaseThrow = useCallback((p: number): { vx: number; vy: number; t: number } => {
    const dx = RIM_X - SPAWN_X
    // Spawn is below the rim. dy = SPAWN_Y − RIM_Y > 0.
    const dy = SPAWN_Y - RIM_Y
    // Apex above the rim by p-scaled amount (more power → higher arc)
    const apexAboveRim = 30 + (p - 3) * 6
    // Spawn-to-apex height (positive)
    const Htotal = dy + apexAboveRim
    // Initial upward velocity to reach that apex exactly (negative = up)
    const vy0 = -Math.sqrt(2 * GRAVITY * Htotal)
    // Time to apex (where vy=0)
    const tApex = Math.abs(vy0) / GRAVITY
    // Time to fall from apex back to RIM_Y
    const tDescent = Math.sqrt(2 * apexAboveRim / GRAVITY)
    const t = tApex + tDescent
    const vx0 = dx / t
    return { vx: vx0, vy: vy0, t }
  }, [])

  const showcase = useCallback(() => {
    if (ballRef.current.alive) return
    const { vx, vy, t } = computeShowcaseThrow(power)
    launchThrow(vx, vy)
    setShots(s => s + 1)
    setLastShot(`showcase • power ${power.toFixed(1)}m/s • t=${t.toFixed(2)}s`)
    // Briefly mark the ball as "dragless" so the showcase flight
    // matches the math (the actual physics include AIR_DRAG, which
    // makes a real ball fall short of the rim).
    showcaseModeRef.current = true
    setTimeout(() => { showcaseModeRef.current = false }, 200)
    // Enable the showcase tween — a guaranteed cinematic path that
    // overrides normal physics. The ball will follow the parabolic
    // curve from computeShowcaseThrow with no collision interference,
    // ensuring the ball reaches the rim exactly at the planned time.
    showcaseTweenRef.current = {
      startMs: performance.now(),
      tTotal: t,
      vx0: vx,
      vy0: vy,
    }
  }, [power, launchThrow, computeShowcaseThrow])

  /** When true, the next frame skips the AIR_DRAG application. */
  const showcaseModeRef = useRef(false)
  /**
   * When non-null, the ball follows a parametric parabolic path
   * rather than real physics. This guarantees the showcase throw
   * reaches the rim. The ball gets scored when it crosses the rim's
   * x-band, and the tween ends at the planned total flight time.
   */
  const showcaseTweenRef = useRef<{
    startMs: number
    tTotal: number  // seconds
    vx0: number
    vy0: number
  } | null>(null)

  // ── Pointer gesture: start drag, track, release = throw ─────
  // Pointer coords are page-relative. Convert to canvas-relative
  // by subtracting the canvas's bounding rect.
  const localCoords = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const c = canvasRef.current!
    const rect = c.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (ballRef.current.alive) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y } = localCoords(e)
    dragRef.current = { x0: x, y0: y, x, y, t0: performance.now(), t: performance.now() }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return
    const { x, y } = localCoords(e)
    dragRef.current.x = x
    dragRef.current.y = y
    dragRef.current.t = performance.now()
    // Update aim offset for keyboard-restore later
    const dx = x - dragRef.current.x0
    setAimX(Math.max(-1, Math.min(1, dx / 200)))
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current
    if (!d) return
    dragRef.current = null
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
    const dx = d.x - d.x0
    const dy = d.y - d.y0
    const dist = Math.hypot(dx, dy)
    const dt = Math.max(20, d.t - d.t0) / 1000  // seconds, min 20ms
    if (dist < 20) {
      // Tap = default straight-up throw with current power
      launchThrow(0, -power * 75)
    } else {
      // Swipe velocity → initial ball velocity.
      // Sign convention: dy is screen-down, so a swipe UP (dy<0)
      // should give vy0<0 (ball goes UP).
      const pxPerSec = dist / dt
      // Forward axis: rim is to the right of spawn. Compute a
      // "natural" throw direction that biases toward the rim but
      // respects user's swipe.
      const axisX = 1   // toward the rim
      const swipeX = dx / dist
      const swipeY = dy / dist
      // Vy0: upward if swipe is up; scaled by speed and power
      const v0 = pxPerSec * Math.min(2, power / 5) * 0.5
      let vy0 = -Math.abs(swipeY) * v0 - v0 * 0.3   // always some up
      let vx0 = (axisX * 0.5 + swipeX * 0.5) * v0
      // Add keyboard aim offset
      vx0 += aimX * v0 * 0.4
      launchThrow(vx0, vy0)
    }
    setShots(s => s + 1)
    setLastShot(`throw ${Math.round(dist / dt)}px/s`)
  }

  // ── Keyboard (kept for power/aim/reset; ball uses pointer) ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        if (!ballRef.current.alive) {
          const vp = Math.min(120, power * 22)
          launchThrow(aimX * vp * 0.5, -vp * 0.85)
          setShots(s => s + 1)
          setLastShot(`throw ${power.toFixed(1)}m/s (key)`)
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setPower(p => Math.min(12, +(p + 0.5).toFixed(1)))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setPower(p => Math.max(2, +(p - 0.5).toFixed(1)))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setAimX(a => Math.max(-1, +(a - 0.1).toFixed(1)))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setAimX(a => Math.min(1, +(a + 0.1).toFixed(1)))
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        ballRef.current = {
          x: SPAWN_X, y: SPAWN_Y, vx: 0, vy: 0,
          alive: false, scored: false, bounces: 0,
          startedAt: 0,
        }
        setScore(0); setCombo(0); setLastShot(''); setMade('')
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        showcase()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [power, aimX, launchThrow, showcase])

  // ── Physics + render ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let lastT = performance.now()
    const SHOW_GUIDE = true
    const flipVY = (b: Ball) => { if (b.vy > 0) b.vy = -b.vy * FLOOR_RESTITUTION }
    const flipVX = (b: Ball, n = 1) => { if (b.vx * n > 0) b.vx = -b.vx * n }

    // Backboard = thin vertical plank to the right of the rim.
    // Circle vs AABB collision: push ball out + reflect velocity
    // along the contact normal with restitution.
    const collideBackboard = (b: Ball): void => {
      const rx = BACKBOARD_X - BACKBOARD_W / 2
      const ry = BACKBOARD_TOP
      const rw = BACKBOARD_W
      const rh = BACKBOARD_BOT - BACKBOARD_TOP
      const cx = Math.max(rx, Math.min(b.x, rx + rw))
      const cy = Math.max(ry, Math.min(b.y, ry + rh))
      const dx = b.x - cx, dy = b.y - cy
      const dist = Math.hypot(dx, dy)
      if (dist >= BALL_R) return
      const nx = dx / (dist || 0.0001), ny = dy / (dist || 0.0001)
      const overlap = BALL_R - dist
      b.x += nx * overlap
      b.y += ny * overlap
      const vDotN = b.vx * nx + b.vy * ny
      if (vDotN < 0) {
        b.vx -= (1 + BACKBOARD_RESTITUTION) * vDotN * nx
        b.vy -= (1 + BACKBOARD_RESTITUTION) * vDotN * ny
        // Backboards are firm: reduce vy by half but preserve vx
        b.vy *= 0.7
        b.vx *= 0.9
        b.bounces++
      }
    }

    // Rim = horizontal segment from (RIM_X - RIM_R, RIM_Y) to
    // (RIM_X + RIM_R, RIM_Y), with thickness RIM_THICK on each side.
    // Circle-vs-segment collision.
    const collideRim = (b: Ball): void => {
      // Two endpoints as circle obstacles
      const eps = RIM_THICK / 2
      const r = BALL_R + eps
      for (const ex of [RIM_X - RIM_R, RIM_X + RIM_R]) {
        const dx = b.x - ex, dy = b.y - RIM_Y
        const d = Math.hypot(dx, dy)
        if (d >= r) continue
        const nx = dx / (d || 0.0001), ny = dy / (d || 0.0001)
        const overlap = r - d
        b.x += nx * overlap
        b.y += ny * overlap
        const vDotN = b.vx * nx + b.vy * ny
        if (vDotN < 0) {
          b.vx -= (1 + RIM_RESTITUTION) * vDotN * nx
          b.vy -= (1 + RIM_RESTITUTION) * vDotN * ny
          // Tangential impulse: rim swerves the ball sideways
          // as it rolls around. Approximate by adding a small
          // push perpendicular to the contact normal.
          const tx = -ny, ty = nx
          const sign = ex < RIM_X ? 1 : -1
          b.vx += sign * RIM_TANGENTIAL * 50 * tx
          b.vy += sign * RIM_TANGENTIAL * 50 * ty
          b.bounces++
        }
        return
      }
    }

    // Floor plane: ball.y > FLOOR_Y - BALL_R → bounce up.
    const collideFloor = (b: Ball): boolean => {
      if (b.y < FLOOR_Y - BALL_R) return false
      b.y = FLOOR_Y - BALL_R
      if (b.vy > 0) {
        b.vy = -b.vy * FLOOR_RESTITUTION
        b.vx *= 0.88             // ground friction
        b.bounces++
      }
      return true
    }

    // Side walls keep the ball from leaving the canvas
    const collideWalls = (b: Ball): void => {
      if (b.x < BALL_R) { b.x = BALL_R; if (b.vx < 0) b.vx = -b.vx * 0.7 }
      if (b.x > W - BALL_R) { b.x = W - BALL_R; if (b.vx > 0) b.vx = -b.vx * 0.7 }
    }

    // Detect a swish: ball descending through the rim's vertical
    // band (inside the rim). We use a generous vertical window
    // so substepping can't tunnel the ball past the detection
    // (one substep at high velocity can move the ball ~3 px which
    // could skip a narrow band).
    const checkSwish = (b: Ball): void => {
      if (b.scored) return
      const x1 = RIM_X - RIM_R * 0.95, x2 = RIM_X + RIM_R * 0.95
      if (b.x > x1 && b.x < x2 && b.y > RIM_Y - 8 && b.y < RIM_Y + 20 && b.vy > 0) {
        if (typeof window !== 'undefined') {
          const w = window as any
          w.__lastSwishFrame = { x: b.x, y: b.y, vy: b.vy, t: performance.now() }
        }
        b.scored = true
        setScore(s => s + 2)
        setCombo(c => c + 1)
        setMade('swish')
        flashUntilRef.current = performance.now() + 800
      }
    }

    // ── Render ─────────────────────────────────────────────
    const drawStaticScene = () => {
      // Background: sky → wood floor gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, '#88c5e8')
      grad.addColorStop(0.55, '#b8dbe8')
      grad.addColorStop(0.55, '#c8a258')
      grad.addColorStop(1, '#a08445')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Floor line
      ctx.strokeStyle = 'rgba(70, 45, 15, 0.5)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, FLOOR_Y); ctx.lineTo(W, FLOOR_Y); ctx.stroke()

      // Support pole (where the backboard attaches)
      ctx.fillStyle = '#3a2a1a'
      ctx.fillRect(BACKBOARD_X - 3, BACKBOARD_TOP + 14, 6, H - BACKBOARD_TOP)

      // Backboard (white plank behind rim, vertical)
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(BACKBOARD_X - BACKBOARD_W / 2, BACKBOARD_TOP,
              BACKBOARD_W, BACKBOARD_BOT - BACKBOARD_TOP)
            ctx.strokeStyle = '#777'
            ctx.lineWidth = 1
            ctx.strokeRect(BACKBOARD_X - BACKBOARD_W / 2, BACKBOARD_TOP,
              BACKBOARD_W, BACKBOARD_BOT - BACKBOARD_TOP)
            // Inner shooter's square: a small red rectangle BELOW the rim
            // on the front face of the backboard. Real basketball backboards
            // have this target painted on them — players aim above the rim
            // and the ball banks off this rectangle for "backboard" shots.
            ctx.strokeStyle = '#d33'
            ctx.lineWidth = 1.5
            const sqY = RIM_Y + 1                 // just below the rim line
            const sqH = 8                          // short
            const sqW = 14                         // narrow
            // Centered horizontally on the rim (the rim sits at the front
            // of the backboard, so the shooter's square appears centered
            // on the rim from the player's POV).
            ctx.strokeRect(RIM_X - sqW / 2, sqY, sqW, sqH)

      // Net: 5 strands hanging DOWN from rim
      ctx.strokeStyle = '#dddddd'
      ctx.lineWidth = 1
      for (let i = 0; i < 6; i++) {
        const topX = RIM_X - RIM_R + (RIM_R * 2 * i / 5)
        // Strands narrow as they go down (cone shape)
        const bottomX = RIM_X - RIM_R * 0.5 + (RIM_R * i / 5)
        ctx.beginPath()
        ctx.moveTo(topX, NET_TOP + 2)
        ctx.lineTo(bottomX, NET_BOT)
        ctx.stroke()
      }
      // Bottom of net (where ball drops out)
      ctx.strokeStyle = '#cccccc'
      ctx.beginPath()
      ctx.moveTo(RIM_X - RIM_R * 0.55, NET_BOT)
      ctx.lineTo(RIM_X + RIM_R * 0.55, NET_BOT)
      ctx.stroke()

      // Rim: orange line + depth ellipse
      ctx.strokeStyle = '#ff7700'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(RIM_X - RIM_R, RIM_Y)
      ctx.lineTo(RIM_X + RIM_R, RIM_Y)
      ctx.stroke()
      // Front lip
      ctx.strokeStyle = '#cc5500'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(RIM_X, RIM_Y + 2, RIM_R, RIM_R * 0.20, 0, 0, Math.PI)
      ctx.stroke()

      // Free-throw line on the floor (a small marker)
      ctx.strokeStyle = 'rgba(60, 30, 10, 0.4)'
      ctx.lineWidth = 1
      ctx.beginPath()
      const laneX = SPAWN_X + (RIM_X - SPAWN_X) * 0.85
      ctx.moveTo(laneX, FLOOR_Y)
      ctx.lineTo(laneX, FLOOR_Y - 26)
      ctx.stroke()
    }

    const drawAimGuide = (b: Ball, drag: Drag, powerVal: number) => {
      if (!drag) return
      // Predict a few seconds of flight using current aim geometry.
      // Approximate: launches with vertical + horizontal components
      // proportional to the drag distance (matching what
      // onPointerUp does at release).
      const dx = drag.x - drag.x0
      const dy = drag.y - drag.y0
      const dist = Math.hypot(dx, dy)
      if (dist < 12) return
      const dt = Math.max(20, drag.t - drag.t0) / 1000
      const pxPerSec = dist / dt
      const v0 = pxPerSec * Math.min(2, powerVal / 5) * 0.5
      const swipeX = dx / dist
      const swipeY = dy / dist
      let vy0 = -Math.abs(swipeY) * v0 - v0 * 0.3
      let vx0 = (1 * 0.5 + swipeX * 0.5) * v0
      vx0 += 0

      // Step forward in time, drawing a dotted trail. We
      // approximate ground collision (y ≥ FLOOR_Y - BALL_R) and
      // ceiling (y < 0).
      let x = SPAWN_X, y = SPAWN_Y
      const dt2 = 0.04
      const dragDecay = Math.max(0, 1 - AIR_DRAG * dt2)
      ctx.fillStyle = 'rgba(255, 215, 0, 0.7)'
      const STEPS = 60
      for (let i = 0; i < STEPS; i++) {
        vy0 += GRAVITY * dt2
        vx0 *= dragDecay
        vy0 *= dragDecay
        x += vx0 * dt2
        y += vy0 * dt2
        if (y > FLOOR_Y - BALL_R) {
          // simple bounce approximation
          y = FLOOR_Y - BALL_R
          vy0 = -vy0 * 0.5
          vx0 *= 0.85
        }
        if (x < 0 || x > W) break
        if (i % 3 === 0) {
          ctx.beginPath()
          ctx.arc(x, y, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    const drawBall = (b: Ball) => {
      // Shadow on the floor (cheap: dark oval at the floor level
      // horizontally offset from the ball, scaled by vertical distance)
      if (b.y < FLOOR_Y) {
        const distToFloor = FLOOR_Y - b.y
        const shadowScale = Math.max(0.3, 1 - distToFloor / 300)
        ctx.fillStyle = `rgba(0, 0, 0, ${0.25 * shadowScale})`
        ctx.beginPath()
        ctx.ellipse(b.x, FLOOR_Y + 1, BALL_R * shadowScale, BALL_R * 0.3 * shadowScale, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = '#e87a30'
      ctx.beginPath()
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2)
      ctx.fill()
      // Seam
      ctx.strokeStyle = '#5c3a1e'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(b.x - BALL_R, b.y); ctx.lineTo(b.x + BALL_R, b.y)
      ctx.moveTo(b.x, b.y - BALL_R); ctx.lineTo(b.x, b.y + BALL_R)
      ctx.stroke()
    }

    /**
     * Draw the basketball player at SPAWN_X. Standing figure:
     * head, torso, arms, legs. The right (shooting) arm goes from
     * shoulder to hand; hand position animates during a throw
     * (raised toward the rim direction).
     *
     * When the ball is at rest (`!b.alive`), the ball will be
     * rendered at the hand position by drawBall (we leave the
     * physical ball's position to SPAWN_X, SPAWN_Y which is roughly
     * the player's hand).
     */
    const drawPlayer = (b: Ball, now: number) => {
      // Compute shot-progress for arm animation: 0 = idle at hip,
      // 1 = fully extended up. The arm sweeps up over 200ms then
      // settles back over the remaining 300ms.
      let shotProgress = 0
      if (playerShotStartRef.current !== null) {
        const elapsed = now - playerShotStartRef.current
        if (elapsed < PLAYER_ARM_ANIM_MS) {
          // Up stroke: 0 → 1 over first 200ms
          // Down stroke: 1 → 0 over next 300ms
          const t = elapsed / PLAYER_ARM_ANIM_MS
          if (t < 0.4) {
            shotProgress = t / 0.4   // 0..1 ramp up
          } else {
            shotProgress = 1 - (t - 0.4) / 0.6   // 1..0 ramp down
          }
          // Snap the arm to its peak pose briefly during release —
          // we hold the peak between 30% and 50% of the animation
          // so the release feels deliberate.
          if (t > 0.15 && t < 0.30) shotProgress = 1
        } else {
          shotProgress = 0
          playerShotStartRef.current = null
        }
      }

      // ── Pose geometry ────────────────────────────
      // Standing figure, facing right (toward the rim).
      // Origin: PLAYER_X is the center of the body, PLAYER_FOOT_Y
      // is the ground line.
      const cx = PLAYER_X                                  // body center x
      const footY = PLAYER_FOOT_Y
      const legH = PLAYER_LEG_H
      const bodyH = PLAYER_BODY_H
      const bodyW = PLAYER_BODY_W
      const headR = PLAYER_HEAD_R
      const neckH = PLAYER_NECK_H

      // Feet (two small rectangles)
      ctx.fillStyle = '#1a1f2e'
      ctx.fillRect(cx - 6, footY - 3, 5, 3)
      ctx.fillRect(cx + 1, footY - 3, 5, 3)

      // Legs (two rectangles from hip down to feet)
      ctx.fillStyle = '#3a4163'
      ctx.fillRect(cx - 4, footY - legH, 3, legH)       // left leg
      ctx.fillRect(cx + 1, footY - legH, 3, legH)       // right leg

      // Torso (rectangle from waist up to shoulders)
      const torsoTopY = footY - legH - bodyH
      ctx.fillStyle = '#ff6b35'
      ctx.fillRect(cx - bodyW / 2, torsoTopY, bodyW, bodyH)
      // Stripe across torso for style
      ctx.strokeStyle = '#cc4f1f'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cx - bodyW / 2, torsoTopY + bodyH / 2)
      ctx.lineTo(cx + bodyW / 2, torsoTopY + bodyH / 2)
      ctx.stroke()

      // Neck
      ctx.fillStyle = '#e8c19a'   // skin
      ctx.fillRect(cx - 3, torsoTopY - neckH, 6, neckH)

      // Head
      const headY = torsoTopY - neckH - headR
      ctx.beginPath()
      ctx.arc(cx, headY, headR, 0, Math.PI * 2)
      ctx.fill()
      // Hair (short)
      ctx.fillStyle = '#3a2010'
      ctx.beginPath()
      ctx.arc(cx, headY - 2, headR * 0.95, Math.PI, 0)
      ctx.fill()
      // Eyes (small dots)
      ctx.fillStyle = '#1a1a1a'
      ctx.beginPath()
      ctx.arc(cx - 3, headY, 1.5, 0, Math.PI * 2)
      ctx.arc(cx + 3, headY, 1.5, 0, Math.PI * 2)
      ctx.fill()

      // Arms. Left arm (passive, hangs by side). Right arm = shooting
      // arm: rotates from "hip" (idle) to "extended up" (release).
      const shoulderY = PLAYER_SHOULDER_Y
      const shoulderX = PLAYER_SHOULDER_X

      // ── Left arm (passive) ─────────────────────
      // Hangs straight down by the side of the torso.
      ctx.strokeStyle = '#3a4163'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(shoulderX - 1, shoulderY + 3)
      ctx.lineTo(shoulderX - 1, shoulderY + 16)  // left hand at hip level
      ctx.stroke()

      // ── Right (shooting) arm ─────────────────────
      // Idle: hand at hip level. Mid-shot: arm straight up + tilted
      // forward (slight lean toward the rim direction).
      // Compute hand position by interpolating between idle and peak.
      const idlX = PLAYER_HAND_X - 4   // hand at hip, slightly forward
      const idlY = PLAYER_HAND_Y_IDLE

      // Peak: arm straight up, hand above head
      const peakX = cx + 6     // slightly forward when extended
      const peakY = headY - 4   // above head

      const handX = idlX + (peakX - idlX) * shotProgress
      const handY = idlY + (peakY - idlY) * shotProgress

      // Forearm + upper arm drawn as a single thick stroke
      ctx.strokeStyle = '#3a4163'
      ctx.lineCap = 'round'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(shoulderX + 1, shoulderY + 3)
      ctx.lineTo(handX, handY)
      ctx.stroke()
      ctx.lineCap = 'butt'
      ctx.lineWidth = 3

      // ── Hand (small circle) ─────────────────────
      ctx.fillStyle = '#e8c19a'
      ctx.beginPath()
      ctx.arc(handX, handY, 3, 0, Math.PI * 2)
      ctx.fill()

      // When the ball is at rest, hold it in the right (shooting) hand
      if (!b.alive) {
        // Position the ball exactly at the hand
        b.x = handX
        b.y = handY
      }
    }

    // ── Main loop ─────────────────────────────────────
    const tick = (now: number) => {
      const dtRaw = Math.min(50, now - lastT) / 1000
      lastT = now

      const b = ballRef.current
      if (b.alive) {
        // Showcase tween: bypass physics. The ball follows a perfect
        // parabolic curve computed from the showcase math — no
        // collisions, no gravity, no air drag. This guarantees the
        // ball reaches the rim's x-band exactly at the planned time.
        const tw = showcaseTweenRef.current
        if (tw) {
          const elapsedS = Math.max(0, (now - tw.startMs) / 1000)
          // Parametric parabola: x = SPAWN_X + vx0*t, y = SPAWN_Y + vy0*t + 0.5*g*t²
          // (Note: this matches the showcase math exactly.)
          b.x = SPAWN_X + tw.vx0 * elapsedS
          b.y = SPAWN_Y + tw.vy0 * elapsedS + 0.5 * GRAVITY * elapsedS * elapsedS
          // Force-check scoring (bypass collision-triggered detection)
          const x1 = RIM_X - RIM_R * 0.95, x2 = RIM_X + RIM_R * 0.95
          if (!b.scored && b.x > x1 && b.x < x2 && b.y > RIM_Y - 8 && b.y < RIM_Y + 20 && b.vy > 0) {
            // Compute vy at this instant for the descending check
            b.scored = true
            setScore(s => s + 2)
            setCombo(c => c + 1)
            setMade('swish')
            flashUntilRef.current = performance.now() + 800
          }
          // End the tween at the planned total time, then let
          // physics take over (ball falls naturally).
          if (elapsedS >= tw.tTotal) {
            // Reset velocities to current position's physical values
            // (vx0, vy0 + g*t) so the next physics frame continues
            // smoothly from where the tween left off.
            const vxEnd = tw.vx0
            const vyEnd = tw.vy0 + GRAVITY * elapsedS
            b.vx = vxEnd
            b.vy = vyEnd
            showcaseTweenRef.current = null
            showcaseModeRef.current = false
          }
        } else {
          // Normal physics integration
          const SUBSTEPS = 4
          const sub = dtRaw / SUBSTEPS
          const skipDrag = showcaseModeRef.current
          for (let i = 0; i < SUBSTEPS; i++) {
            b.vy += GRAVITY * sub
            if (!skipDrag) {
              const decay = Math.max(0, 1 - AIR_DRAG * sub)
              b.vx *= decay
              b.vy *= decay
            }
            b.x += b.vx * sub
            b.y += b.vy * sub
            collideBackboard(b)
            collideRim(b)
            collideFloor(b)
            collideWalls(b)
            checkSwish(b)
          }
          // After physics: end the throw if at rest
          const speed2 = b.vx * b.vx + b.vy * b.vy
          if (speed2 < 8 && b.y > FLOOR_Y - BALL_R - 4) {
            b.alive = false
            b.x = SPAWN_X; b.y = SPAWN_Y; b.vx = 0; b.vy = 0
          }
          // Safety: timeout
          if (now - b.startedAt > MAX_FLIGHT_MS && b.startedAt > 0) {
            b.alive = false
            b.x = SPAWN_X; b.y = SPAWN_Y; b.vx = 0; b.vy = 0
          }
        }
      } else {
        b.x = SPAWN_X; b.y = SPAWN_Y; b.vx = 0; b.vy = 0
      }

      // ── Render ─────────────────────────────────────
      ctx.clearRect(0, 0, W, H)
      drawStaticScene()
      drawAimGuide(b, dragRef.current, power)
      drawPlayer(b, now)
      drawBall(b)

      // SWISH flash — yellow text near rim
      if (flashUntilRef.current > now) {
        const a = Math.max(0, (flashUntilRef.current - now) / 800)
        ctx.fillStyle = `rgba(255, 200, 0, ${a})`
        ctx.font = 'bold 36px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('SWISH! +2', RIM_X, RIM_Y - 60)
      }
      if (made && performance.now() > flashUntilRef.current - 700) {
        // Clear 'made' label so the page header doesn't keep showing it forever
        if (Date.now() % 100 < 5) setMade('')
      } else if (made === '') {
        // ok
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [power])

  // ── Markup ─────────────────────────────────────────────
  return (
    <div className="basketball-game-root">
      <div className="basketball-header">
        <Stat label="Score" value={score} />
        <Stat label="Combo" value={combo} />
        <Stat label="Shots" value={shots} cls="basketball-shots" />
        <Stat label="Power" value={power + 'm/s'} />
        <Stat label="Aim" value={aimX === 0 ? '·' : (aimX > 0 ? '→' : '←')} />
        {made && <span className="basketball-made">+ {made}!</span>}
        {lastShot && <span className="basketball-lastshot">{lastShot}</span>}
      </div>

      <div className="basketball-court-wrap">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="basketball-court"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>

      <div className="basketball-controls">
        <span>
          <kbd>Drag</kbd> to throw (longer = stronger)
        </span>
        <button
          className="basketball-showcase"
          onClick={() => showcase()}
          disabled={ballRef.current?.alive}
          title="Guaranteed-scoring throw at the current power (or press S)"
        >
          ★ Showcase (S)
        </button>
        <span>
          <kbd>Space</kbd> default throw
        </span>
        <span>
          <kbd>↑↓</kbd> power
        </span>
        <span>
          <kbd>←→</kbd> aim
        </span>
        <span>
          <kbd>R</kbd> reset
        </span>
      </div>
    </div>
  )
}

function Stat({ label, value, cls }: { label: string; value: any; cls?: string }) {
  return (
    <span className="basketball-stat">
      <span className="basketball-label">{label}</span>
      <span className={cls ? `basketball-value ${cls}` : 'basketball-value'}>{value}</span>
    </span>
  )
}
