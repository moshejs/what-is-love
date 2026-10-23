// Chamber I — What is sacred?
// Nothing is drawn but dust. The column of light exists only as the
// statistical brightening of motes around a central axis — light as
// inference, never scenery. The sacred inclines toward the visitor's
// hand, and retreats from haste.

import { TAU, clamp, lerp, kN, smoothstep, mulberry32 } from '../flicker'

const MAX = 260

export function createDust() {
  const x = new Float32Array(MAX)
  const y = new Float32Array(MAX)
  const vx = new Float32Array(MAX)
  const vy = new Float32Array(MAX)
  const seed = new Float32Array(MAX)

  let lean = 0
  let calm = 1
  let nEff = 0
  let prevW = 0
  let prevH = 0
  let pFadeIn0 = 0,
    pFadeIn1 = 0,
    pClose0 = 0,
    pClose1 = 0,
    pOut0 = 0,
    pOut1 = 0

  function scatter(w, h) {
    const rnd = mulberry32(0xd057)
    for (let i = 0; i < MAX; i++) {
      x[i] = rnd() * w
      y[i] = rnd() * h
      vx[i] = 0
      vy[i] = 0
      seed[i] = rnd() * 100
    }
    prevW = w
    prevH = h
  }

  return {
    id: 'dust',
    init(env) {
      scatter(env.w, env.h)
    },
    layout(env) {
      const { m, h, w } = env
      const a = m.sta('band-a')
      const q = m.sta('ch1-q')
      const b = m.sta('band-b')
      if (!a || !q || !b) return [2, 3]
      // fades up across band A's last 30vh
      pFadeIn0 = m.pOf(a.top + a.h - 0.3 * h)
      pFadeIn1 = m.pOf(a.top + a.h + 0.05 * h)
      // the column closes like an eyelid over 30vh past the question
      pClose0 = m.pOf(q.top + q.h)
      pClose1 = pClose0 + 0.3 * m.vp
      // motes fade through band B
      pOut0 = m.pOf(b.top) + 0.1 * m.vp
      pOut1 = m.pOf(b.top) + 0.55 * m.vp
      // a resize must not teleport living dust: rescale positions in place
      // (mobile URL-bar collapses fire this mid-chamber)
      if (prevW > 0 && (prevW !== w || prevH !== h)) {
        const sx = w / prevW
        const sy = h / prevH
        for (let i = 0; i < MAX; i++) {
          x[i] *= sx
          y[i] *= sy
        }
        prevW = w
        prevH = h
      }
      return [m.pOf(a.top), m.pOf(b.top + b.h)]
    },
    draw(env) {
      const { ctx, w, h, t, dt, p, pointer, sprites, qual, mobile, reduced } = env
      const envelope =
        smoothstep(pFadeIn0, pFadeIn1, p) * (1 - smoothstep(pOut0, pOut1, p))
      if (envelope <= 0.004) return

      const sigmaK = 1 - smoothstep(pClose0, pClose1, p)
      const sigma = clamp(0.07 * w, 48, 110) * sigmaK
      if (sigma < 0.5) return

      const dtN = dt * 60
      const damp = Math.pow(0.985, dtN)

      // the sacred inclines (lean) and retreats from haste (calm)
      const leanTarget = pointer.has ? clamp((pointer.x - w / 2) * 0.04, -24, 24) : 0
      lean += (leanTarget - lean) * kN(0.03, dt)
      const calmTarget = clamp(1 - pointer.speed / 1200, 0.35, 1)
      calm += (calmTarget - calm) * kN(0.02, dt)
      const repelR = lerp(140, 90, (calm - 0.35) / 0.65)
      const repelR2 = repelR * repelR

      const axis = w / 2 + lean
      const n = Math.min(MAX, Math.round((mobile ? 140 : 260) * Math.min(1, (w * h) / (1440 * 900)) * qual))
      // quality cuts shrink the pool a few motes per frame, never as a blink
      nEff = reduced ? n : nEff + (n - nEff) * kN(0.05, dt)
      const count = Math.min(MAX, Math.round(nEff))
      const flickStill = reduced ? 0.93 : 0

      ctx.globalCompositeOperation = 'lighter'
      const sprite = sprites.mote
      for (let i = 0; i < count; i++) {
        if (dtN > 0) {
          vx[i] += 0.002 * Math.sin(t * 0.21 + seed[i]) * dtN
          vy[i] += (-0.0035 + 0.002 * Math.sin(t * 0.17 + 1.7 * seed[i])) * dtN
          if (pointer.has) {
            const dx = x[i] - pointer.x
            const dy = y[i] - pointer.y
            const d2 = dx * dx + dy * dy
            if (d2 < repelR2 && d2 > 0.25) {
              const d = Math.sqrt(d2)
              const f = (0.05 * (1 - d / repelR) * (1 - d / repelR) * dtN) / d
              vx[i] += dx * f
              vy[i] += dy * f
            }
          }
          vx[i] *= damp
          vy[i] *= damp
          x[i] += vx[i] * dtN
          y[i] += vy[i] * dtN
          if (y[i] < -12) y[i] = h + 10
          if (y[i] > h + 12) y[i] = -10
          if (x[i] < -12) x[i] = w + 10
          if (x[i] > w + 12) x[i] = -10
        }
        const dx = (x[i] - axis) / sigma
        const f =
          flickStill ||
          0.925 + 0.075 * Math.sin(TAU * 0.9 * t + seed[i]) * Math.sin(TAU * 0.23 * t + 2.7 * seed[i])
        const a = 0.55 * Math.exp(-dx * dx) * f * calm * envelope
        if (a < 0.004) continue
        const s = 2 + (seed[i] % 1.6)
        ctx.globalAlpha = a
        ctx.drawImage(sprite, x[i] - s / 2, y[i] - s / 2, s, s)
      }
    },
  }
}
