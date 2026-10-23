// Chamber II — Of what is the spirit made?
// The smoke is seeded from the trace ring buffer: every pointer drift,
// touch, and scroll the visitor has made since load. The silhouette of the
// column is the visitor's own path. The whole field breathes on the master
// 9-second cycle whether or not the visitor moves.

import { clamp, lerp, kN, smoothstep, mulberry32 } from '../flicker'

const MAX = 500
const WISPS = 8

export function createBreath(trace) {
  const x = new Float32Array(MAX)
  const y = new Float32Array(MAX)
  const vx = new Float32Array(MAX)
  const vy = new Float32Array(MAX)
  const y0 = new Float32Array(MAX)
  const baseA = new Float32Array(MAX)
  const alive = new Uint8Array(MAX)
  const rnd = mulberry32(0xbea7)
  let nEff = 0

  let pIn0 = 0,
    pIn1 = 0,
    pOut0 = 0,
    pOut1 = 0,
    pWisp0 = 0,
    pWisp1 = 0

  function spawn(i, env) {
    const { w, h } = env
    const s = trace.sample(rnd)
    if (s) {
      if (s.ember) {
        // ember-rail samples are mirrored into the center column
        x[i] = w * (0.5 + (rnd() - 0.5) * 0.12)
      } else {
        x[i] = s.x * w + (rnd() - 0.5) * 36
      }
      y[i] = h * (0.55 + 0.45 * clamp(s.y, 0, 1)) + (rnd() - 0.5) * 36
    } else {
      x[i] = w * (0.5 + (rnd() - 0.5) * 0.1)
      y[i] = h * (0.6 + 0.4 * rnd())
    }
    y0[i] = y[i]
    vx[i] = 0
    vy[i] = 0
    baseA[i] = 0.05 + 0.04 * rnd()
    alive[i] = 1
  }

  function curl(px, py, t) {
    return (
      1.8 * Math.sin(0.0016 * py + 0.4 * t) +
      1.2 * Math.sin(0.0021 * px - 0.27 * t) +
      0.6 * Math.sin(0.004 * (px + py) + 0.13 * t)
    )
  }

  return {
    id: 'breath',
    init() {
      alive.fill(0)
    },
    layout(env) {
      const { m, h } = env
      const b = m.sta('band-b')
      const c = m.sta('band-c')
      if (!b || !c) return [2, 3]
      pIn0 = m.pOf(b.top + b.h - 0.25 * h)
      pIn1 = m.pOf(b.top + b.h + 0.15 * h)
      pOut0 = m.pOf(c.top + 0.1 * h)
      pOut1 = m.pOf(c.top + 0.5 * h)
      // the breath already moving ahead: wisps in band B's last stretch
      pWisp0 = m.pOf(b.top + b.h - 0.45 * h)
      pWisp1 = m.pOf(b.top + b.h + 0.05 * h)
      return [m.pOf(b.top), m.pOf(c.top + 0.6 * h)]
    },
    draw(env) {
      if (env.reduced) return drawStatic(env)
      const { ctx, w, h, t, dt, p, pointer, breath, sprites, qual, mobile } = env
      const dtN = dt * 60
      const sprite = sprites.breath
      ctx.globalCompositeOperation = 'lighter'

      // pre-roll wisps curling up through where the column of light was
      const wenv = smoothstep(pWisp0, (pWisp0 + pWisp1) / 2, p) * (1 - smoothstep((pWisp0 + pWisp1) / 2, pWisp1, p))
      if (wenv > 0.01) {
        for (let i = 0; i < WISPS; i++) {
          const yFrac = 1 - ((t * 0.05 + i * 0.131) % 1)
          const wy = yFrac * h
          const wx = w / 2 + 34 * Math.sin(t * 0.5 + i * 2.1) + (i - (WISPS - 1) / 2) * 16
          const a = 0.055 * wenv * Math.sin(Math.PI * (1 - yFrac))
          if (a < 0.004) continue
          ctx.globalAlpha = a
          ctx.drawImage(sprite, wx - 9, wy - 9, 18, 18)
        }
      }

      const ein = smoothstep(pIn0, pIn1, p)
      const exitK = 1 - smoothstep(pOut0, pOut1, p)
      if (ein <= 0.004 || exitK <= 0.004) {
        if (ein <= 0.004) alive.fill(0)
        return
      }

      const breathMul = 0.35 + 0.4 * breath.eased
      const n = Math.min(MAX, Math.round((mobile ? 260 : 500) * Math.min(1, (w * h) / (1440 * 900)) * qual))
      // quality cuts shrink the pool gradually, never as a blink
      nEff = nEff + (n - nEff) * kN(0.05, dt)
      const count = Math.min(MAX, Math.round(nEff))
      const target = Math.floor(n * ein * exitK)
      const damp = Math.pow(0.96, dtN)

      let aliveCount = 0
      for (let i = 0; i < count; i++) if (alive[i]) aliveCount++

      // spawn rate rides the breath: the room inhales new smoke
      let budget = Math.ceil(3 * dtN * (0.25 + 0.75 * breath.v))
      for (let i = 0; i < count && aliveCount < target && budget > 0; i++) {
        if (!alive[i]) {
          spawn(i, env)
          aliveCount++
          budget--
        }
      }

      const pvx = pointer.vx
      const pvy = pointer.vy
      for (let i = 0; i < count; i++) {
        if (!alive[i]) continue
        const th = curl(x[i], y[i], t)
        vx[i] += 0.05 * Math.cos(th) * dtN
        vy[i] += (0.05 * Math.sin(th) - 0.012) * dtN
        // the hand stirs the smoke; the field reasserts within seconds
        if (pointer.has) {
          const dx = x[i] - pointer.x
          const dy = y[i] - pointer.y
          const d2 = dx * dx + dy * dy
          if (d2 < 140 * 140) {
            const f = 0.12 * Math.min(1, 60 / Math.max(Math.sqrt(d2), 1)) * dtN
            vx[i] += pvx * f
            vy[i] += pvy * f
          }
        }
        vx[i] *= damp
        vy[i] *= damp
        const cap = 1.5
        const sp2 = vx[i] * vx[i] + vy[i] * vy[i]
        if (sp2 > cap * cap) {
          const sp = Math.sqrt(sp2)
          vx[i] = (vx[i] / sp) * cap
          vy[i] = (vy[i] / sp) * cap
        }
        x[i] += vx[i] * dtN
        y[i] += vy[i] * dtN

        if (y[i] < y0[i] - 0.8 * h || y[i] < -40 || x[i] < -60 || x[i] > w + 60) {
          alive[i] = 0
          continue
        }
        // on exit the column dissolves top-first
        const exitShape = lerp(clamp(y[i] / h, 0, 1), 1, exitK)
        const a = baseA[i] * breathMul * ein * exitShape
        if (a < 0.004) continue
        ctx.globalAlpha = a
        ctx.drawImage(sprite, x[i] - 12, y[i] - 12, 24, 24)
      }
    },
  }

  function drawStatic(env) {
    // reduced motion: the visitor's trace stamped once as a still column
    const { ctx, w, h, p, sprites } = env
    const ein = smoothstep(pIn0, pIn1, p) * (1 - smoothstep(pOut0, pOut1, p))
    if (ein <= 0.01) return
    ctx.globalCompositeOperation = 'lighter'
    const srnd = mulberry32(7)
    if (trace.count >= 10) {
      for (let i = 0; i < 400; i++) {
        const s = trace.sample(srnd)
        if (!s) break
        const sx = s.ember ? w * (0.5 + (srnd() - 0.5) * 0.12) : s.x * w + (srnd() - 0.5) * 36
        const sy = h * (0.55 + 0.45 * clamp(s.y, 0, 1)) - h * 0.45 * srnd()
        ctx.globalAlpha = 0.06 * ein
        ctx.drawImage(sprites.breath, sx - 12, sy - 12, 24, 24)
      }
    } else {
      for (let i = 0; i < 300; i++) {
        const sx = w * (0.5 + (srnd() - 0.5) * 0.16)
        const sy = h * srnd()
        ctx.globalAlpha = 0.06 * ein
        ctx.drawImage(sprites.breath, sx - 12, sy - 12, 24, 24)
      }
    }
  }
}
