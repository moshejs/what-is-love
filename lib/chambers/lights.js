// Chambers III + IV on one shared pool — What is worth living for? /
// What is worth dying for?
// Descent kindles 600 lights one by one; stillness gathers them. Then a
// deterministic shuffle snuffs them in accelerating order, each death a
// 400ms fade with a sub-300ms garnet flash of last heat — the only red in
// the piece. All interaction is revoked in Chamber IV. One pre-chosen
// light survives, and burns steadier as it becomes alone.

import { TAU, clamp, lerp, kN, easeInQuad, mulberry32 } from '../flicker'

const N = 600
const MOBILE_N = 320

export function createLights() {
  const ux = new Float32Array(N)
  const uy = new Float32Array(N)
  const sz = new Float32Array(N)
  const phi = new Float32Array(N)
  const rank = new Int32Array(N)
  const dispA = new Float32Array(N)
  const offX = new Float32Array(N)
  const offY = new Float32Array(N)
  const velX = new Float32Array(N)
  const velY = new Float32Array(N)
  const snuffedFlag = new Uint8Array(N)
  const flashStart = new Float32Array(N).fill(-1)
  const wisps = [] // transient {x, y, born}

  // The survivor is swapped into index 0 at init, so no quality cut or
  // mobile pool reduction can ever drop it from the drawn set.
  const SURVIVOR = 0

  let pK0 = 0,
    pK1 = 0,
    pS0 = 0,
    pS1 = 0,
    pRevoke = 0,
    pHandoff = 0

  let whispered = false
  let everGathered = false
  let fastAcc = 0

  function swapLights(a, b) {
    if (a === b) return
    const arrs = [ux, uy, sz, phi, rank]
    for (const arr of arrs) {
      const tmp = arr[a]
      arr[a] = arr[b]
      arr[b] = tmp
    }
  }

  return {
    id: 'lights',
    init(env) {
      const rnd = mulberry32(0x9e3779b9)
      for (let i = 0; i < N; i++) {
        ux[i] = rnd()
        uy[i] = 0.45 + 0.55 * Math.pow(rnd(), 0.6) // crowding a low horizon
        sz[i] = 1 + 1.5 * Math.pow(rnd(), 2) // weighted small
        phi[i] = rnd() * TAU
        rank[i] = i
      }
      // deterministic snuff order
      for (let i = N - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1))
        const tmp = rank[i]
        rank[i] = rank[j]
        rank[j] = tmp
      }
      // the survivor: nearest (0.62, 0.58), chosen within the mobile subset
      // so it exists on every device — then moved to index 0 and granted
      // the final rank
      let chosen = 0
      let best = Infinity
      for (let i = 0; i < MOBILE_N; i++) {
        const d = (ux[i] - 0.62) ** 2 + (uy[i] - 0.58) ** 2
        if (d < best) {
          best = d
          chosen = i
        }
      }
      swapLights(chosen, SURVIVOR)
      for (let i = 0; i < N; i++) {
        if (rank[i] === N - 1) {
          rank[i] = rank[SURVIVOR]
          break
        }
      }
      rank[SURVIVOR] = N - 1
      this.publishSurvivor(env)
    },
    layout(env) {
      const { m } = env
      const k = m.sta('ch3-num')
      const f = m.sta('ch4-fade')
      const s = m.sta('ch4-snuff')
      const wk = m.sta('ch4-walk')
      if (!k || !f || !s || !wk) return [2, 3]
      pK0 = m.pOf(k.top)
      pK1 = pK0 + 1.2 * m.vp // descent kindles across 120vh
      pS0 = m.pOf(f.top)
      pS1 = m.pOf(s.top + s.h) - 0.2 * m.vp
      pRevoke = pS0
      pHandoff = m.pOf(wk.top) + 0.15 * m.vp
      this.publishSurvivor(env)
      return [pK0 - 0.3 * m.vp, m.pOf(wk.top) + 0.4 * m.vp]
    },
    publishSurvivor(env) {
      const sv = env.shared.survivor || (env.shared.survivor = { x: 0, y: 0, sz: 1, phi: 0 })
      sv.x = ux[SURVIVOR] * env.w + offX[SURVIVOR]
      sv.y = uy[SURVIVOR] * env.h + offY[SURVIVOR]
      sv.sz = sz[SURVIVOR]
      sv.phi = phi[SURVIVOR]
    },
    draw(env) {
      const { ctx, w, h, t, dt, p, pointer, sprites, qual, mobile, reduced, shared, emit } = env
      const dtN = dt * 60
      const baseN = mobile ? MOBILE_N : N
      const n = Math.min(N, Math.round(baseN * qual))

      const kp = clamp((p - pK0) / (pK1 - pK0 || 1e-6), 0, 1)
      const sp = clamp((p - pS0) / (pS1 - pS0 || 1e-6), 0, 1)
      const snuffedCount = Math.floor(easeInQuad(sp) * (N - 1))
      const remaining = N - snuffedCount
      const q40 = clamp((40 - remaining) / 40, 0, 1) // the survivor steadies
      const kRise = kN(0.069, dt) // ~700ms ease-out kindle
      const kFall = kN(0.117, dt) // ~400ms snuff fade
      const damp = Math.pow(0.92, dtN)

      // attention as gesture: stillness gathers light (revoked in Chamber IV;
      // on touch the finger must still be down)
      const gathering =
        !reduced &&
        p < pRevoke &&
        pointer.has &&
        pointer.still > 1.6 &&
        (!pointer.touch || pointer.down)
      const gx = pointer.x
      const gy = pointer.y - (pointer.touch ? 36 : 0)
      if (gathering) everGathered = true

      // the conditional whisper, once per page-load
      if (!reduced && !whispered && !everGathered && p > pK0 && p < pRevoke) {
        if (pointer.has && pointer.speed > 4) fastAcc += dt
        else fastAcc = 0
        if (fastAcc > 10) {
          whispered = true
          emit('whisper')
        }
      }

      ctx.globalCompositeOperation = 'lighter'
      const halo = sprites.halo
      const core = sprites.core
      const garnet = sprites.garnet

      for (let i = 0; i < baseN; i++) {
        const isSurvivor = i === SURVIVOR
        // quality cuts fade through the normal snuff easing instead of
        // blinking: culled lights get target 0 and skip physics
        const culled = i >= n && !isSurvivor
        const snuffed = rank[i] < snuffedCount

        let target
        if (culled || (snuffed && !isSurvivor)) target = 0
        else if (reduced) target = p >= pK0 ? 1 : 0
        else target = clamp(kp * N - i * (N / n), 0, 1)

        // mark the moment of death: garnet flash + wisp (bidirectional).
        // Quiet removal for quality culls — only a real snuff flashes.
        if (!reduced && !isSurvivor) {
          if (snuffed && !snuffedFlag[i]) {
            snuffedFlag[i] = 1
            if (dispA[i] > 0.1) {
              flashStart[i] = t
              if (wisps.length < 160) {
                const lx = ux[i] * w + offX[i]
                const ly = uy[i] * h + offY[i]
                for (let k2 = 0; k2 < 3; k2++)
                  wisps.push({ x: lx + (k2 - 1) * 3, y: ly, born: t + k2 * 0.012 })
              }
            }
          } else if (!snuffed && snuffedFlag[i]) {
            snuffedFlag[i] = 0
            flashStart[i] = -1
          }
        }

        if (reduced) dispA[i] = target
        else dispA[i] += (target - dispA[i]) * (target < dispA[i] ? kFall : kRise)

        if (culled) {
          // no physics, no flash — just finish fading out, then cost ~nothing
          if (dispA[i] >= 0.01) {
            const lx = ux[i] * w + offX[i]
            const ly = uy[i] * h + offY[i]
            const haloD = 16 + sz[i] * 4
            const coreD = 2 + sz[i] * 1.6
            ctx.globalAlpha = 0.18 * 0.8 * dispA[i]
            ctx.drawImage(halo, lx - haloD / 2, ly - haloD / 2, haloD, haloD)
            ctx.globalAlpha = 0.9 * 0.8 * dispA[i]
            ctx.drawImage(core, lx - coreD / 2, ly - coreD / 2, coreD, coreD)
          }
          continue
        }

        // gathering drift + spring home
        if (!reduced && dtN > 0) {
          let inGather = false
          if (gathering) {
            const dx = gx - (ux[i] * w + offX[i])
            const dy = gy - (uy[i] * h + offY[i])
            const d2 = dx * dx + dy * dy
            if (d2 < 160 * 160 && d2 > 1) {
              inGather = true
              const d = Math.sqrt(d2)
              const a = (5 / Math.max(d, 40) ** 2) * dtN
              velX[i] += dx * a
              velY[i] += dy * a
            }
          }
          if (!inGather) {
            velX[i] += -offX[i] * 0.01 * dtN
            velY[i] += -offY[i] * 0.01 * dtN
          }
          velX[i] *= damp
          velY[i] *= damp
          const vcap = 0.25
          const vsp2 = velX[i] * velX[i] + velY[i] * velY[i]
          if (vsp2 > vcap * vcap) {
            const vsp = Math.sqrt(vsp2)
            velX[i] = (velX[i] / vsp) * vcap
            velY[i] = (velY[i] / vsp) * vcap
          }
          offX[i] += velX[i] * dtN
          offY[i] += velY[i] * dtN
        }

        const lx = ux[i] * w + offX[i]
        const ly = uy[i] * h + offY[i]

        // garnet flash: the red of last heat, sub-300ms by law
        if (flashStart[i] >= 0) {
          const age = t - flashStart[i]
          if (age < 0.28) {
            const fa = 0.5 * (1 - age / 0.28)
            const fs = 8 + sz[i] * 3
            ctx.globalAlpha = fa
            ctx.drawImage(garnet, lx - fs / 2, ly - fs / 2, fs, fs)
          } else {
            flashStart[i] = -1
          }
        }

        if (dispA[i] < 0.01) continue
        if (isSurvivor && shared.survivorHandoff) {
          this.publishSurvivor(env)
          continue
        }

        let ampScale = 1
        let coreA = 0.9
        let haloD = 16 + sz[i] * 4
        if (isSurvivor) {
          ampScale = 1 - 0.5 * q40
          coreA = lerp(0.9, 1, q40)
          haloD = lerp(haloD, haloD * 1.6, q40)
          this.publishSurvivor(env)
        }
        const fl = reduced
          ? 0.86
          : 0.72 +
            0.18 * ampScale * Math.sin(TAU * 0.9 * t + phi[i]) * Math.sin(TAU * 0.23 * t + 2.7 * phi[i])

        const coreD = 2 + sz[i] * 1.6
        ctx.globalAlpha = 0.18 * fl * dispA[i]
        ctx.drawImage(halo, lx - haloD / 2, ly - haloD / 2, haloD, haloD)
        ctx.globalAlpha = coreA * fl * dispA[i]
        ctx.drawImage(core, lx - coreD / 2, ly - coreD / 2, coreD, coreD)
      }

      // wisps: an 80ms breath of grey rising 12px — a candle pinched, not switched off
      if (!reduced && wisps.length) {
        const wisp = sprites.wisp
        for (let i = wisps.length - 1; i >= 0; i--) {
          const ws = wisps[i]
          const age = t - ws.born
          if (age > 0.08) {
            wisps.splice(i, 1)
            continue
          }
          if (age < 0) continue
          const fr = age / 0.08
          ctx.globalAlpha = 0.1 * (1 - fr)
          ctx.drawImage(wisp, ws.x - 5, ws.y - 12 * fr - 5, 10, 10)
        }
      }
    },
  }
}
