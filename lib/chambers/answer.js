// The answer — arrival.
// The surviving flame walks 100vh of darkness with the visitor and settles
// into the transparent period of "only love." The sentence is finished by
// fire, not type. Then an 8-second dawn at peak alpha 0.07, with ghosts of
// every prior chamber drifting once through the light.

import { TAU, clamp, lerp, kN, easeOutCubic, easeInOutCubic, mulberry32 } from '../flicker'

export function createAnswer(anchor, trace) {
  let pWalk0 = 0,
    pWalk1 = 0,
    pView = 0,
    pReset = 0

  let initialized = false
  let sx = 0,
    sy = 0
  let settled = false
  let settleT = 0
  let survivorFade = false
  let fbAcc = 0
  let parX = 0,
    parY = 0
  let ghosts = []

  function reset(shared) {
    initialized = false
    settled = false
    survivorFade = false
    fbAcc = 0
    ghosts = []
    shared.survivorHandoff = false
  }

  function spawnGhosts(env, atRest) {
    const { w, h, t } = env
    const rnd = mulberry32(0x10e5)
    ghosts = []
    const born = atRest ? t - 20 : t
    for (let i = 0; i < 20; i++) {
      ghosts.push({
        type: 'mote',
        x: rnd() * w,
        y: rnd() * h * 0.7,
        vx: (rnd() - 0.5) * 0.24,
        vy: (rnd() - 0.5) * 0.2 - 0.04,
        born: born + (atRest ? 0 : rnd() * 2),
      })
    }
    for (let i = 0; i < 20; i++) {
      const s = trace.sample(rnd)
      const gx = s
        ? s.ember
          ? w * (0.5 + (rnd() - 0.5) * 0.12)
          : s.x * w + (rnd() - 0.5) * 30
        : rnd() * w
      const gy = s ? h * (0.5 + 0.5 * clamp(s.y, 0, 1)) : h * (0.5 + 0.5 * rnd())
      ghosts.push({
        type: 'breath',
        x: gx,
        y: gy,
        vx: (rnd() - 0.5) * 0.1,
        vy: -0.09 - rnd() * 0.05,
        born: born + (atRest ? 0 : rnd() * 3),
      })
    }
    for (let i = 0; i < 20; i++) {
      ghosts.push({
        type: 'amber',
        x: rnd() * w,
        y: h * (0.45 + 0.55 * Math.pow(rnd(), 0.6)),
        vx: (rnd() - 0.5) * 0.08,
        vy: -(rnd() * 0.04),
        born: born + (atRest ? 0 : rnd() * 4),
      })
    }
  }

  return {
    id: 'answer',
    init() {},
    layout(env) {
      const { m } = env
      const wk = m.sta('ch4-walk')
      const ol = m.sta('only-love')
      if (!wk || !ol) return [2, 3]
      pWalk0 = m.pOf(wk.top)
      pWalk1 = m.pOf(ol.top + ol.h * 0.45)
      pView = m.pOf(ol.top + ol.h / 2)
      pReset = pWalk0 - 0.5 * m.vp
      return [pWalk0 - 0.3 * m.vp, 1.2]
    },
    draw(env) {
      const { ctx, w, h, t, dt, p, vp, pointer, sprites, shared, reduced, emit } = env
      if (p < pReset) {
        if (initialized || settled) reset(shared)
        return
      }

      const walkP = clamp((p - pWalk0) / (pWalk1 - pWalk0 || 1e-6), 0, 1)
      shared.survivorHandoff = walkP > 0.02
      if (!shared.survivorHandoff) return

      const sv = shared.survivor || { x: w * 0.62, y: h * 0.58, sz: 1.8, phi: 1 }
      if (!initialized) {
        sx = sv.x
        sy = sv.y
        initialized = true
        // the walk is 100vh long; refresh the one fragile measurement now,
        // long before the flame needs it
        anchor.remeasure()
      }

      const ok = anchor.state.ok
      let tx = sv.x
      let ty = sv.y
      if (ok) {
        const a = anchor.screen()
        tx = clamp(a.x, 40, w - 40)
        ty = clamp(a.y, 0.12 * h, 0.92 * h)
      }
      const wEase = easeInOutCubic(walkP)
      const bx = lerp(sv.x, tx, wEase)
      const by = lerp(sv.y, ty, wEase)
      if (reduced) {
        sx = bx
        sy = by
      } else {
        const k = kN(0.04, dt)
        sx += (bx - sx) * k
        sy += (by - sy) * k
      }

      // settle: the flame becomes the full stop
      const pNear = Math.abs(p - pView) < 0.3 * vp
      if (!settled) {
        if (reduced) {
          if (p > pView - 0.25 * vp) {
            settled = true
            settleT = t
            if (!ok) {
              survivorFade = true
              emit('anchor-fallback')
            }
            spawnGhosts(env, true)
          }
        } else if (ok && walkP > 0.9 && pNear && Math.hypot(sx - tx, sy - ty) < 0.75) {
          settled = true
          settleT = t
          spawnGhosts(env, false)
          emit('settled')
        } else if (!ok && p > pView - 0.1 * vp) {
          fbAcc += dt
          if (fbAcc > 1.5) {
            settled = true
            settleT = t
            survivorFade = true
            spawnGhosts(env, false)
            emit('anchor-fallback')
          }
        }
      }

      ctx.globalCompositeOperation = 'lighter'

      // the dawn: one radial gradient per frame, 8 seconds, peak alpha 0.07
      let bloomE = 0
      if (settled) {
        bloomE = reduced ? 1 : clamp((t - settleT) / 8, 0, 1)
        const ee = easeOutCubic(bloomE)
        const diag = Math.hypot(w, h)
        const r = Math.max(1, 1.4 * diag * ee)
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r)
        g.addColorStop(0, `rgba(229,179,106,${(0.07 * ee).toFixed(4)})`)
        g.addColorStop(0.5, `rgba(229,179,106,${(0.028 * ee).toFixed(4)})`)
        g.addColorStop(1, 'rgba(229,179,106,0)')
        ctx.globalAlpha = 1
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
      }

      // ghosts of every chamber drift once through the light
      if (ghosts.length) {
        if (pointer.has && !reduced) {
          parX += (((pointer.x - w / 2) / (w / 2)) * 4 - parX) * kN(0.02, dt)
          parY += (((pointer.y - h / 2) / (h / 2)) * 4 - parY) * kN(0.02, dt)
        }
        const dtN = dt * 60
        for (const gh of ghosts) {
          const age = t - gh.born
          if (age < 0) continue
          const vmul = Math.max(0, 1 - age / 14)
          gh.x += gh.vx * vmul * dtN
          gh.y += gh.vy * vmul * dtN
          const fadeIn = reduced ? 1 : Math.min(1, age / 2.5)
          const gx = gh.x + parX
          const gy = gh.y + parY
          if (gh.type === 'mote') {
            ctx.globalAlpha = 0.12 * fadeIn * bloomE
            ctx.drawImage(sprites.mote, gx - 1.5, gy - 1.5, 3, 3)
          } else if (gh.type === 'breath') {
            ctx.globalAlpha = 0.045 * fadeIn * bloomE
            ctx.drawImage(sprites.breath, gx - 10, gy - 10, 20, 20)
          } else {
            ctx.globalAlpha = 0.09 * fadeIn * bloomE
            ctx.drawImage(sprites.halo, gx - 4, gy - 4, 8, 8)
            ctx.globalAlpha = 0.3 * fadeIn * bloomE
            ctx.drawImage(sprites.core, gx - 1, gy - 1, 2, 2)
          }
        }
      }

      // the surviving flame, sized to the glyph it completes
      let flameMul = 1
      if (survivorFade && settled) flameMul = reduced ? 0 : clamp(1 - (t - settleT) / 1.2, 0, 1)
      if (flameMul > 0.01) {
        const fs = ok ? anchor.state.fontSize : 40
        const coreD = Math.max(5, fs * 0.11)
        const haloD = Math.max(12, fs * 0.3)
        const fl = reduced ? 0.92 : 0.9 + 0.05 * Math.sin(TAU * 0.9 * t + sv.phi) * Math.sin(TAU * 0.23 * t + 2.7 * sv.phi)
        ctx.globalAlpha = 0.24 * fl * flameMul
        ctx.drawImage(sprites.halo, sx - haloD / 2, sy - haloD / 2, haloD, haloD)
        ctx.globalAlpha = fl * flameMul
        ctx.drawImage(sprites.core, sx - coreD / 2, sy - coreD / 2, coreD, coreD)
      }
    },
  }
}
