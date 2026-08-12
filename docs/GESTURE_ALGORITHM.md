# Gesture-to-Shot Algorithm — the "Secret Sauce"

> **Status:** Design. The math here is the first thing we'll prototype
> in the basketball game (Phase 6.2, Day 1). Until it's in the game
> and we have a "yes, this feels right" from real playtests, this
> doc is provisional.

**The goal:** turn a raw stream of pointer events (touch / mouse /
stylus) into a `ThrowIntent` that produces a shot whose **feel** is:

- a fast flick → hard, accurate shot
- a slow drag → soft, arcing shot
- a curved swipe → spin / side-spin
- a release at the wrong moment → wobbly, low-confidence shot
- a tap (no drag) → no shot

The challenge: pointer events are noisy, sampled irregularly, and
device-dependent. A 60Hz touch screen is 16ms apart; a 144Hz mouse
is 7ms apart. A cheap mouse can drop events. A finger can be jittery
on a low-DPI display. The algorithm must be **stable across all of
this** without ever feeling laggy.

---

## 1. The high-level pipeline

```
pointer events  (touchstart, touchmove, touchend, mousedown, mousemove, mouseup)
  │
  ▼
PointerSampler       — normalizes to a uniform-rate stream
  │                    (1 sample per pointer move event, but
  │                    timestamped; we interpolate if needed)
  ▼
GestureEngine        — detects discrete gestures from the stream
  │                    (a swipe is a sequence of samples with
  │                    nonzero velocity; a tap is start+end within
  │                    200ms with minimal displacement)
  ▼
GestureSmoother     — low-pass filter on the velocity curve
  │                    (1-Euro filter, see §4)
  ▼
ThrowSystem          — at the moment of release, converts the
                       gesture to a `ThrowIntent`
  │
  ▼
ThrowIntent          — the contract consumed by the game

Each layer is independent and testable. The game only sees
`ThrowIntent` (or the result of a single `ThrowSystem.release()` call).
The engine owns the layers above.
```

---

## 2. PointerSampler — the data source

```ts
// One sample per pointer event. We do NOT resample to a fixed rate
// here — interpolation in the smoother handles rate variance.
interface PointerSample {
  /** Wall-clock time in seconds (from performance.now() / 1000). */
  t: number
  /** Position in screen pixels (CSS px, not device px). */
  x: number
  y: number
  /** Optional pressure (0-1). 0.5 on touch screens when not supported. */
  pressure: number
  /** Pointer id (for multi-touch, future). */
  id: number
}
```

The sampler attaches to a DOM element (the canvas). It listens to
`pointerdown` / `pointermove` / `pointerup` / `pointercancel` (with
fallback to `mousedown` / `mousemove` / `mouseup` / `touchstart` etc.
on older browsers). It also captures `pointerleave` so a swipe that
goes off-screen still terminates.

Crucially: the sampler is **stateless**. The smoother does the
temporal work. The sampler just emits raw samples.

### 2.1 Why not a fixed-rate resampler?

Resampling to 60Hz feels laggy on a 144Hz mouse. Resampling to 144Hz
is wasteful. The 1-Euro filter (§4) is rate-agnostic — it works on
whatever samples it gets, in their original order. So we keep the
sampler simple.

---

## 3. GestureEngine — gesture detection

A **gesture** is a sequence of samples from `pointerdown` to
`pointerup`. The engine doesn't need to pre-classify during the
gesture; it just collects samples and decides on `pointerup` whether
this was:

- **Tap** — short duration, low displacement, low velocity. NOT a
  shot. (Could be used for a "select ball" or "menu" action later.
  For basketball MVP, we ignore taps entirely.)
- **Swipe** — duration 50-500ms, total displacement > 30px, peak
  velocity > 200px/s. This is a shot. The rest of the algorithm
  applies.
- **Cancel** — duration > 800ms, OR the pointer left the canvas, OR
  the velocity dropped to zero before release. Discard.

```ts
type GestureType = 'tap' | 'swipe' | 'cancel' | 'in-progress'

interface Gesture {
  type: GestureType
  samples: PointerSample[]   // chronological, includes the start and end
  /** Time of the start sample. */
  startT: number
  /** Time of the end sample (last update). */
  endT: number
  /** Total displacement (straight-line distance from start to end). */
  displacement: number
  /** Duration in seconds. */
  duration: number
}
```

**Detection at `pointerup` time:**

```ts
function classifyGesture(g: Gesture): GestureType {
  if (g.duration < 0.08) return 'tap'                     // 80ms
  if (g.duration > 0.8)  return 'cancel'                  // 800ms
  if (g.displacement < 30) return 'tap'                    // < 30px
  if (peakVelocity(g.samples) < 200) return 'cancel'        // too slow
  return 'swipe'
}
```

The constants (80ms, 800ms, 30px, 200px/s) live in `BasketballConfig`
as `tapDurationMs`, `cancelDurationMs`, `minDisplacementPx`, `minPeakVelocityPxPerS`. **Data-driven knobs**, not magic numbers in code.

---

## 4. GestureSmoother — the 1-Euro filter

Raw pointer velocity is noisy. A 200ms swipe on a low-DPI screen
might have 12 samples, and the velocity computed from successive
samples can vary by 50% sample-to-sample. We need a smooth velocity
estimate that:
- has low latency (the player expects the ball to respond to their
  swipe immediately)
- removes jitter (the ball shouldn't wobble due to finger noise)
- doesn't lag too much on fast flicks (a 100ms flick must feel
  snappy)

The **1-Euro filter** (Casiez et al., 2012) is the right tool. It's a
simple low-pass filter with a **cutoff frequency that adapts** based
on signal velocity: low cutoff (more smoothing) when the signal is
slow, high cutoff (less smoothing) when the signal is fast.

```ts
// 1-Euro filter — adaptive low-pass for real-time signals.
// Reference: Casiez, Roussel, Vogel. "1€ Filter: A Simple Speed-based
// Low-pass Filter for Noisy Input in Interactive Systems." CHI 2012.
class OneEuroFilter {
  // Public config:
  minCutoff: number   // default 1.0 Hz — lower = more smoothing at slow speeds
  beta: number         // default 0.007 — higher = more responsive to fast moves
  dCutoff: number      // default 1.0 Hz — cutoff for the derivative (rate of change)
  
  // For each axis (x, y), maintain a value filter and a derivative filter.
  private xf: LowPassFilter
  private xdf: LowPassFilter
  // (same for y)
  
  filter(x: number, t: number): number {
    const dx = (x - this.xf.lastValue) / (t - this.xf.lastT)
    const edx = this.xdf.filter(dx, t, this.dCutoff)
    const cutoff = this.minCutoff + this.beta * Math.abs(edx)
    return this.xf.filter(x, t, cutoff)
  }
}
```

The math is ~30 lines including the `LowPassFilter` helper. The
reference implementation is widely cited.

### 4.1 Why this and not a Kalman filter or EMA?

- **EMA** (exponential moving average) is simpler but introduces lag
  proportional to the smoothing factor. A 0.1 EMA on a 100ms flick
  looks "behind" the finger.
- **Kalman** is theoretically optimal but requires tuning a process
  noise parameter that varies per device. 1-Euro has 2 intuitive
  parameters (smoothness + responsiveness) that map directly to feel.
- **1-Euro** is the standard in interactive graphics (used in Wacom
  tablets, recent research). It's the right tool.

### 4.2 Recommended defaults

| Param | Default | Why |
|---|---|---|
| `minCutoff` | 1.0 Hz | At zero velocity, the filter is very smooth. Rejects 99% of finger jitter. |
| `beta` | 0.007 | Empirically good for swipe gestures. 0 = always smooth (laggy), 0.1 = never smooth (jittery). |
| `dCutoff` | 1.0 Hz | Standard. |

These live in `BasketballConfig` so they can be tuned in the
debug panel. The user-facing settings panel exposes "Smoothness" and
"Responsiveness" sliders that map to `minCutoff` and `beta`.

---

## 5. ThrowSystem — from gesture to ThrowIntent

This is where the **secret sauce** lives. The smoother gives us a
clean velocity curve; the throw system turns that into a shot.

### 5.1 The conversion

At the moment of release (`pointerup` time `t_release`), we have a
window of recent smoothed samples (the last 80-150ms of the swipe).
We extract:

```ts
interface VelocityProfile {
  samples: { t: number; x: number; y: number; vx: number; vy: number }[]
  /** Total time window. */
  duration: number
  /** Peak speed over the window. */
  peakSpeed: number
  /** Direction at peak (unit vector in screen space). */
  peakDirection: { x: number; y: number }
  /** Average speed (weighted toward end of window). */
  effectiveSpeed: number
  /** Curvature: how much the direction changed over the window. */
  curvature: number  // 0 = straight line, 1 = sharp curve
  /** Total displacement during window. */
  displacement: number
}
```

From the profile, we compute `ThrowIntent`:

```ts
function velocityProfileToThrow(p: VelocityProfile, cfg: BasketballConfig): ThrowIntent {
  // 1. Direction: use the AVERAGE direction over the last 50% of
  //    the window. This is the player's "intent" — the early samples
  //    of the swipe are noise (initial direction-finding).
  //    Normalized to a unit vector.
  const direction = averageDirection(p.samples.slice(p.samples.length / 2))
  
  // 2. Power: map effectiveSpeed (px/s) to a power range.
  //    The relationship is non-linear — the player expects
  //    small finger movements → soft shot, big fast swipe → hard shot.
  //    We use a piecewise function:
  //      [0, minThrowSpeed]      → no shot
  //      [minThrowSpeed, hard]   → linear ramp from 0 to cfg.maxPower
  //      [hard, infinity]        → clamped at cfg.maxPower
  const power = clamp(
    (p.effectiveSpeed - cfg.minThrowSpeed) / (cfg.hardThrowSpeed - cfg.minThrowSpeed),
    0, 1
  ) * cfg.maxPower
  
  // 3. Spin: how much did the swipe curve?
  //    0 curvature = backspin / topspin (ball goes up, then down)
  //    High curvature = sidespin (ball curves sideways)
  //    We map curvature to spin magnitude and direction from the
  //    curvature sign (left vs right).
  const spin = p.curvature * cfg.maxSpin * Math.sign(p.peakDirection.x)
  
  // 4. Release quality: how clean was the release?
  //    1.0 = perfect (swipe ended at peak velocity)
  //    0.0 = poor (swipe was still accelerating or already decelerating)
  const releaseQuality = computeReleaseQuality(p)
  
  // 5. Confidence: how confident is this is a real shot, not a tap?
  //    1.0 = high confidence (long swipe, high velocity)
  //    0.0 = low (short, slow swipe)
  const confidence = clamp(
    (p.duration / cfg.confidentDuration) * (p.effectiveSpeed / cfg.hardThrowSpeed),
    0, 1
  )
  
  return { direction, power, spin, releaseQuality, confidence }
}
```

### 5.2 The "secret sauce" detail: window selection

The window from which we extract the velocity profile is critical.
A 100ms window gives a snappy feel but is jittery. A 200ms window is
smooth but laggy. We use an **adaptive window** based on the gesture
duration:

- If the swipe is short (< 150ms), use the FULL swipe as the
  window. There's no other choice — the player flicked fast, we
  use what we have.
- If the swipe is medium (150-400ms), use the last 100-150ms. The
  early part of the swipe is the player "winding up" and the late
  part is the actual release.
- If the swipe is long (> 400ms), use the last 120ms. Long swipes
  often have a "search" phase at the start (the player is figuring
  out where to throw) and a "commit" phase at the end.

This is the **secret sauce**. The exact thresholds and window sizes
are tunable. The basketball game will prototype a few values, and
the one that "feels best" wins.

### 5.3 The "secret sauce" detail: peak direction

A swipe isn't a single direction. It has a curve. The peak velocity
is the most-intentional moment. We use the direction at the **peak
velocity sample**, not the average over the whole window. This
captures the player's "aim" better.

But: if the player has a strong curve (a hook shot), the peak
direction is mid-curve, not the start or end direction. We blend:

```ts
direction = 0.7 * directionAtPeak + 0.3 * directionAtEnd
```

This gives the straight-shot feel for straight swipes, and respects
the curve for curved swipes.

### 5.4 The "secret sauce" detail: release timing

`releaseQuality` matters because it affects the rim physics. A
player who releases at the peak velocity gets a clean shot. A player
who "rests" their finger on the screen (slowing down) before
releasing gets a "wobbly" shot (we add random noise to the
trajectory in the physics adapter, proportional to `1 - releaseQuality`).

This is what creates the "feel" of "I should release at the right
moment" — a real basketball shot has a release point, and getting
it right matters.

### 5.5 Edge cases

- **Swipe then pause then release**: the player might do a slow
  swipe and then rest. We treat this as a low-quality shot (low
  releaseQuality) but still fire a shot with the velocity at the
  end. Better than dropping the shot entirely.
- **Two fingers**: we currently use `pointerid === 0` (or the first
  active pointer). Multi-finger is a future feature.
- **Swipe out of canvas**: `pointerleave` / `pointercancel`
  terminates the gesture. We classify it as 'cancel' if velocity
  was low, or 'swipe' with low confidence if velocity was high (the
  player is probably releasing soon anyway).

---

## 6. The full ThrowSystem API

```ts
export interface ThrowSystemConfig {
  /** Window for velocity profile extraction (seconds). */
  windowShort: number       // default 0.10 — used when gesture < 0.15s
  windowMedium: number      // default 0.12 — used when 0.15 ≤ gesture ≤ 0.4s
  windowLong: number        // default 0.12 — used when gesture > 0.4s

  /** Velocity thresholds (px/s). */
  minThrowSpeed: number     // default 200 — below this is a tap
  hardThrowSpeed: number    // default 1500 — at this speed we get max power
  confidentDuration: number // default 0.10 — short enough that fast swipes are confident

  /** Power curve (non-linear). */
  powerCurveExp: number     // default 1.5 — power ramps faster at the top

  /** Direction blend: weight on peak direction vs end direction. */
  peakDirectionWeight: number   // default 0.7

  /** Spin sensitivity. */
  maxSpin: number           // default 8.0 (rad/s)
  curvatureSensitivity: number // default 5.0

  /** Release quality curve. */
  releaseQualityPeakAt: number  // default 0.6 — peak velocity at 60% of gesture

  /** Output limits. */
  maxPower: number          // default 25.0 (m/s)
  minPower: number          // default 5.0 (m/s, below this is a no-op)
}

export class ThrowSystem {
  constructor(
    private gestureEngine: GestureEngine,
    private smoother: GestureSmoother,
    private config: ThrowSystemConfig
  ) {}
  
  /**
   * Called on `pointerup`. Returns a ThrowIntent or null if the
   * gesture was a tap or cancel.
   */
  release(gesture: Gesture): ThrowIntent | null {
    const gestureType = this.gestureEngine.classify(gesture)
    if (gestureType !== 'swipe') return null
    
    // Extract the velocity profile from the relevant window
    const profile = this.extractProfile(gesture, this.config)
    
    // Convert to ThrowIntent
    return this.profileToThrow(profile, this.config)
  }
}
```

---

## 7. The gesture → world-space transform

`ThrowIntent` has `direction: Vector3` in world space (not screen
space). The throw system produces screen-space direction; the engine
transforms it to world space via the **camera** at release time.

The basketball game's camera is fixed (free-throw setup: looking at
the hoop from the free-throw line). The transform is straightforward:

```ts
function screenToWorldDirection(
  screenDir: { x: number; y: number },  // screen pixels, y is screen-down
  camera: CameraState
): Vector3 {
  // 1. Project the screen direction into camera-local 3D
  // 2. Apply camera rotation to get world-space direction
  // 3. Normalize
  
  // The camera looks down -Z in world space.
  // Screen +x is camera +X. Screen +y is camera +Y.
  // So screen direction maps directly to camera +X / +Y in 3D.
  
  return new Vector3(
    screenDir.x,
    -screenDir.y,  // screen Y is down, world Y is up
    0               // throw is in the X-Y plane; physics will give it +Z velocity
  )
}
```

(For Phase 6.2 we'll get this right; the math is placeholder here.)

---

## 8. Testing the algorithm

The algorithm is unit-testable without a browser. Tests:

```ts
describe('ThrowSystem', () => {
  it('rejects taps (no displacement)', () => {
    const samples = [
      { t: 0, x: 100, y: 100, pressure: 0.5, id: 0 },
      { t: 0.05, x: 102, y: 100, pressure: 0.5, id: 0 },
      { t: 0.08, x: 105, y: 100, pressure: 0.5, id: 0 },
    ]
    const result = throwSystem.release(buildGesture(samples))
    expect(result).toBeNull()
  })
  
  it('produces a hard shot for a fast flick', () => {
    const samples = generateFlick(duration: 0.10, distance: 200)
    const result = throwSystem.release(buildGesture(samples))
    expect(result!.power).toBeCloseTo(25.0, 0)  // max power
  })
  
  it('produces a soft shot for a slow drag', () => {
    const samples = generateFlick(duration: 0.40, distance: 80)
    const result = throwSystem.release(buildGesture(samples))
    expect(result!.power).toBeLessThan(10.0)
  })
  
  it('adds spin to curved swipes', () => {
    const samples = generateCurve(start: [0, 0], end: [100, 100], curve: 0.5)
    const result = throwSystem.release(buildGesture(samples))
    expect(Math.abs(result!.spin)).toBeGreaterThan(0)
  })
  
  it('low release quality for swipes that pause before release', () => {
    const samples = generateFlick(
      duration: 0.30,
      distance: 100,
      // Slow down to ~0 velocity in the last 50ms
      profile: (t: number) => Math.max(0, 1 - t * 5) * linearProfile(t)
    )
    const result = throwSystem.release(buildGesture(samples))
    expect(result!.releaseQuality).toBeLessThan(0.5)
  })
})
```

The algorithm is **fully deterministic** given the input samples. No
RNG involved. The randomness comes later, in the physics layer
(proportional to `1 - releaseQuality`).

---

## 9. Why this is the "secret sauce" and what makes it good

The reason swipe-to-throw games FEEL different isn't the physics
(physics is the same). It's the **gesture-to-velocity curve**. The
exact mapping from "how hard the player swiped" to "how hard the ball
goes" determines the entire feel of the game.

Three things make this implementation good:

1. **1-Euro filter** — adaptive smoothing gives low latency for
   fast flicks and high smoothing for slow drags. A pure EMA feels
   laggy; pure passthrough feels jittery. 1-Euro is the right
   middle ground.

2. **Adaptive window selection** — short swipes use the full gesture
   (no choice), long swipes use the last 120ms (the "commit" phase).
   This means a slow arc and a fast flick both feel "right".

3. **Release quality** — the player's "release timing" affects the
   shot. A clean release at peak velocity gets a clean shot; a
   "resting" release gets a wobbly one. This is the gameplay
   mechanic that gives the player something to learn and master.

The algorithm is the secret sauce. The physics is the visible
thing. The gesture math is what makes the physics feel right.

---

## 10. Tuning the algorithm — empirical process

The defaults in §5 are starting points. We'll tune them with real
playtests:

1. Build a "throw lab" — a basketball game with NO scoring, NO
   scoring feedback, NO ball physics. Just swipe-to-shoot and see
   the ball fly. Track `ThrowIntent` in real-time on screen.

2. Play with it. Adjust `minThrowSpeed`, `hardThrowSpeed`, the window
   sizes, the spin sensitivity. Watch how the throw curve responds.

3. Capture recordings of "good" swipes (player says "yes, that felt
   right") and "bad" swipes (player says "no, that was off"). Use
   these to derive better defaults.

4. Once the basketball game has the right feel, the algorithm is
   locked. The engine's `ThrowSystem` is the canonical
   implementation.

This is the **vertical slice loop** for the secret sauce specifically:
build → validate → extract. The secret sauce lives in the basketball
game for a week before graduating to the engine.

---

## 11. Where this lives in the engine

The canonical implementation of this algorithm is the real-time engine's
`ThrowSystem` (`packages/engine/src/realtime/`). The API is written from a real
game's perspective: every knob exists to satisfy a need that emerged from actual
gameplay, not from speculation. Once a game has the right feel, the algorithm is
locked and the engine's `ThrowSystem` is the source of truth.
