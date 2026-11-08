# 001 — Weighty walking: acceleration, speed-driven stride, turn squash

- **Status**: DONE
- **Commit**: cc2c781 (plus uncommitted replay-QoL changes in the working tree — edit the current working tree, do not reset)
- **Severity**: HIGH
- **Category**: Physicality & interruptibility (game-feel)
- **Estimated scope**: 1 file (`index.html`), ~60 lines changed

## Problem

Elena's walk is velocity-stepped, not physical. In `index.html`, `update()` case `'walk'` (~line 885 after recent edits):

```js
const run=keys['Shift']?1.75:1;
if(dir!==0){p.x=clamp(p.x+dir*150*run*dt,64,G.walk.len-40);p.moving=true;p.facingRight=dir>0;
  const old=p.phase;p.phase+=dt*9*run;if(Math.floor(old/Math.PI)!==Math.floor(p.phase/Math.PI)){SFX.step();
    for(let k=0;k<2;k++)parts.push({...dust...});}}
else p.moving=false;
```

Consequences (all feel-breaking on screen):

1. **Instant start/stop** — horizontal velocity jumps 0↔150/262 px/s in one frame. No acceleration, no settle. The single most flopping aspect of the walk.
2. **Cadence decoupled from feet** — stride phase advances at a fixed `dt*9*run` whether or not `p.x` actually moved (e.g. pressed against the clamp at `x=64` or `len-40`, legs keep cycling while the body is frozen — "moonwalk against the wall").
3. **Constant amplitude** — bob/sway amplitude is identical walking vs running (`Shift`), so running reads as fast sliding, not faster legs.
4. **Fixed lean** — `drawChars` passes `lean:p.moving&&mode==='walk'?.05:0`; Elena leans the same 0.05 rad the instant she moves and uprights instantly on stop.
5. **Instant facing flip** — `if(!p.facingRight...)c.scale(-1,1)`; a 180° turn is a one-frame mirror pop.

## Target

Physical, speed-driven walk. All numbers exact:

- **Velocity model**: `p.vx` accelerates toward target `dir*topSpeed` with `accel=900` px/s² while input held, and decays toward 0 with `fric=1400` px/s² when released. `topSpeed = keys['Shift'] ? 262 : 150`. Clamp `p.x` as before; when clamped, zero `p.vx` in that direction.
- **Stride from motion**: `p.phase += Math.abs(p.vx)*dt*0.062` (150 px/s → 9.3 rad/s ≈ current cadence; run scales up naturally). Phase only advances when the body actually moves — fixes the wall moonwalk.
- **Pose gate**: `p.moving = Math.abs(p.vx) > 8` (hysteresis so the idle pose doesn't flicker at the tail of the decel).
- **Speed ratio**: `p.stride = clamp(Math.abs(p.vx)/262, 0, 1)` recomputed each frame.
- **Lean from velocity** (replaces fixed .05): `lean = (p.vx/262) * 0.11 * (p.facingRight?1:-1)` in world terms — pass `opt.lean` already consumed by `drawElena`; for the mirrored draw the sign must be applied where `drawChars` currently computes it (after the `scale(-1,1)` mirror, negate so lean is always "into" the direction of travel).
- **Amplitude scaling**: bob and limb sway scale with stride —
  - procedural `drawElena`: `bob = Math.abs(Math.sin(phase)) * (1.6 + 1.4*stride)` when moving (was 2.6), `sw` swing multiplier `9 * (0.75 + 0.4*stride)` (was 9), idle sway unchanged.
  - spritesheet path `drawCharSheet`: bob translate `-Math.abs(Math.sin(phase))*(1.6+1.4*stride)` and horizontal `Math.sin(phase*2)*(0.6+0.5*stride)` — read stride from `opt.stride` (default 1 so other callers are unaffected).
- **Turn squash**: on facing change set `p.turnT=0.14`; while `turnT>0` decay by dt and in `drawChars` apply `c.scale(sx,1)` before the mirror where `sx = 1 - 0.18*Math.sin(Math.PI*(1 - p.turnT/0.14))` (a symmetric 0.82→1 squash, ~140ms, reads as a weight shift).
- **Start/stop dust**: when transitioning from `|vx|<10` to accelerating with input, spawn 1 dust puff (reuse the existing footstep particle object literal); when `|vx|` crosses below 10 from above 140 (hard stop finished), spawn 3 puffs with slight forward spread.
- **Footstep SFX**: keep the existing π-crossing trigger — with stride now velocity-driven it automatically syncs to actual footplants and speeds up when running.

## Repo conventions to follow

- All game code lives in the single `index.html` `<script>` block; plain functions, no classes, dense style, Indonesian comments for game-content remarks. Match that.
- Particles are plain objects pushed to `parts` (see the existing footstep dust at the same location) — reuse that literal shape: `{x,y,vx,vy,grav,l:0,ml,r,col,shrink:1}`.
- `dt` is already clamped to 50ms; frame-rate independence via exponential/linear integration as above is the established pattern (`G.cam=lerp(...)`).

## Steps

1. In `G.player` initialization (the `const G={...}` declaration) add fields: `vx:0, stride:0, turnT:0`. Also reset them in `startWalk` where `G.player.x=90` is set (add `G.player.vx=0;G.player.stride=0;G.player.turnT=0;`).
2. Replace the movement block in `update()` case `'walk'` with the velocity model, stride integration, pose gate, and start/stop dust exactly as specified in Target. Keep the existing step-SFX π-crossing code but driven by the new phase accumulation.
3. In `drawChars` (mode `'walk'`): replace `lean:p.moving&&mode==='walk'?.05:0` with the velocity lean (sign-corrected for the mirror), pass `stride:p.stride` in the same `opt` object, and apply the turn squash scale immediately before the existing `if(!p.facingRight...)c.scale(-1,1)`.
4. In `drawCharSheet`: read `opt.stride` (default 1 when undefined) and scale the two translate values in the `moving` branch as specified.
5. In `drawElena` (procedural path): accept `opt.stride` (default 1) and scale `bob` and `sw` as specified. Leave idle values untouched.
6. Do not touch `drawArthur`, vortex/glitch/endcard states, or the prologue rendering path (prologue passes `moving=false` — unaffected).

## Boundaries

- Do NOT touch dialog, save/settings, audio, or any state other than `'walk'` rendering inputs.
- Do NOT change walk segment length, trigger distance (`arX-175`), or camera math.
- Do NOT add libraries, files, or new globals beyond the three `G.player` fields.
- If line contents have drifted from the excerpts above (e.g. variable names differ), STOP and report instead of improvising.

## Verification

- **Mechanical**: extract the `<script>` body and run `node --check` (expected: no syntax errors). Serve the repo (`python3 -m http.server 8777`) and run `NODE_PATH=/opt/homebrew/lib/node_modules node qa/route.cjs golden walkqa` — expected `route done. errors: none`.
- **Feel check** (Playwright, headless): load the page, drive to the walk state, then:
  - Tap ArrowRight for 150ms and release: Elena should creep forward a few px and settle — not snap to full speed then dead-stop.
  - Hold Shift+ArrowRight: cadence and bob visibly increase vs plain walk; no foot sliding (feet plant on the ground each cycle).
  - Walk into the left clamp at x=64 while holding left: legs must stop cycling (phase frozen) — no moonwalk.
  - Reverse direction while running: a ~140ms horizontal squash plays; no one-frame mirror pop.
  - Capture 6 frames 80ms apart during a run (screenshot loop) and confirm stride amplitude varies between frames and is larger than the same strip captured walking.
- **Done when**: all mechanical checks pass and every feel check observes the listed behavior.
