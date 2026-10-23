// One fixed full-viewport canvas behind normal-flow DOM. Chambers are
// objects {id, init, layout, draw}; the manager fully skips any system
// beyond ±0.5 viewport of its range. All narrative state is a pure function
// of smoothed progress + seed, so crossing the whole piece in a second
// cannot corrupt anything. The hot path allocates nothing: env, breath,
// and color strings are reused across frames.

import { clamp, kN, lerp, hexToRgb, easeInOutCubic } from './flicker'
import { buildSprites } from './sprites'
import { BANDS } from './scrollmap'

const VOID = '#050507'
const LIFT = '#0c1018'

export function createHub() {
  const listeners = {}
  return {
    frame: new Set(),
    on(evt, fn) {
      ;(listeners[evt] = listeners[evt] || new Set()).add(fn)
      return () => listeners[evt] && listeners[evt].delete(fn)
    },
    emit(evt, data) {
      if (listeners[evt]) for (const fn of listeners[evt]) fn(data)
    },
  }
}

export function createEngine({ canvas, hub, reduced }) {
  const ctx = canvas.getContext('2d')
  const chambers = []
  const stations = {}
  const shared = {}

  let w = 1,
    h = 1,
    docH = 2,
    dpr = 1
  let running = false
  let rafId = 0
  let t = 0,
    last = 0
  const t0 = performance.now()

  let p = 0
  let qual = 1
  let fpsEma = 60
  let slowAcc = 0

  const pointer = {
    x: -9999,
    y: -9999,
    has: false,
    touch: false,
    down: false,
    speed: 0, // px/s, EMA
    vx: 0, // px/frame @60fps
    vy: 0,
    still: 0, // seconds held still (< 4 px/s)
    lastEvent: -9999,
  }
  let pPrevX = -9999
  let pPrevY = -9999

  let lastScrollY = -1
  let lastScrollT = 0
  let currentBand = null
  let bandHintFired = false

  const m = {
    vp: 0.001,
    version: 0,
    sta: (id) => stations[id],
    pOf: (docY) => clamp((docY - h / 2) / Math.max(1, docH - h), 0, 1.2),
  }

  const breath = { phase: 0, v: 0.5, eased: 0.5 }

  // single env object, mutated each frame — chambers must not retain it
  // across frames (they don't; they read synchronously inside draw).
  const env = {
    ctx,
    w: 1,
    h: 1,
    t: 0,
    dt: 0,
    p: 0,
    vp: 0.001,
    m,
    pointer,
    breath,
    qual: 1,
    reduced,
    mobile: false,
    shared,
    sprites: null,
    emit: hub.emit,
    scrollY: 0,
  }

  let bgStops = [[0, hexToRgb(VOID)]]
  let bgCacheKey = -1
  let bgCacheStyle = VOID

  function buildBgStops() {
    const s = (id) => stations[id]
    if (!s('ch1-q')) return
    const center = (id) => s(id).top + s(id).h / 2
    bgStops = [
      [0, hexToRgb(VOID)],
      [m.pOf(s('ch1-num').top), hexToRgb(VOID)],
      [m.pOf(center('ch1-q')), hexToRgb(LIFT)],
      [m.pOf(center('band-b')), hexToRgb(VOID)],
      [m.pOf(s('ch3-num').top), hexToRgb(VOID)],
      [m.pOf(center('ch3-q')), hexToRgb(LIFT)],
      [m.pOf(s('ch4-num').top), hexToRgb(VOID)],
      [1.01, hexToRgb(VOID)],
    ]
    bgCacheKey = -1
  }

  function bgColorAt(pp) {
    const key = Math.round(pp * 4000)
    if (key === bgCacheKey) return bgCacheStyle
    bgCacheKey = key
    let prev = bgStops[0]
    let style = null
    for (let i = 1; i < bgStops.length; i++) {
      const cur = bgStops[i]
      if (pp <= cur[0]) {
        const span = cur[0] - prev[0] || 1e-6
        const tt = clamp((pp - prev[0]) / span, 0, 1)
        const r = Math.round(lerp(prev[1][0], cur[1][0], tt))
        const g = Math.round(lerp(prev[1][1], cur[1][1], tt))
        const b = Math.round(lerp(prev[1][2], cur[1][2], tt))
        style = `rgb(${r},${g},${b})`
        break
      }
      prev = cur
    }
    if (!style) {
      const c = prev[1]
      style = `rgb(${c[0]},${c[1]},${c[2]})`
    }
    bgCacheStyle = style
    return style
  }

  function sizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    w = window.innerWidth
    h = window.innerHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function measure() {
    sizeCanvas()
    document.querySelectorAll('[data-station]').forEach((el) => {
      stations[el.dataset.station] = { top: el.offsetTop, h: el.offsetHeight }
    })
    docH = document.documentElement.scrollHeight
    m.vp = h / Math.max(1, docH - h)
    m.version++
    buildBgStops()
    updateEnv(0)
    for (const c of chambers) {
      if (c.layout) c.range = c.layout(env)
    }
    requestRender()
  }

  function updateBreath() {
    if (reduced) return
    const phase = t % 9
    let v
    if (phase < 4) v = phase / 4
    else if (phase < 5) v = 1
    else v = 1 - (phase - 5) / 4
    breath.phase = phase
    breath.v = v
    breath.eased = easeInOutCubic(v)
  }

  function timeToNextExhale() {
    if (reduced) return 0
    const phase = t % 9
    return phase < 5 ? 5 - phase : 14 - phase
  }

  function updateEnv(dt) {
    env.w = w
    env.h = h
    env.t = reduced ? 7.3 : t
    env.dt = dt
    env.p = p
    env.vp = m.vp
    env.qual = qual
    env.mobile = w <= 768
    env.scrollY = window.scrollY || 0
  }

  function updatePointerKinetics(dt) {
    if (!pointer.has) return
    const dtN = Math.max(dt * 60, 1e-3)
    const dx = pointer.x - pPrevX
    const dy = pointer.y - pPrevY
    pPrevX = pointer.x
    pPrevY = pointer.y
    const inst = Math.hypot(dx, dy) / Math.max(dt, 1e-3) // px/s
    pointer.speed += (inst - pointer.speed) * kN(0.1, dt)
    pointer.vx = dx / dtN
    pointer.vy = dy / dtN
    if (pointer.speed < 4) pointer.still += dt
    else pointer.still = 0
  }

  function updateHint(dt) {
    const scrollY = window.scrollY || 0
    if (Math.abs(scrollY - lastScrollY) > 2) {
      lastScrollY = scrollY
      lastScrollT = t
    }
    const y = scrollY + h / 2
    let band = null
    for (const id of BANDS) {
      const s = stations[id]
      if (s && y >= s.top && y <= s.top + s.h) {
        band = id
        break
      }
    }
    if (band !== currentBand) {
      currentBand = band
      bandHintFired = false
    }
    if (band && !bandHintFired && t - lastScrollT > 12) {
      bandHintFired = true
      hub.emit('hint', band)
    }
  }

  function drawBase() {
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.fillStyle = bgColorAt(p)
    ctx.fillRect(0, 0, w, h)
    // The mercy floor: the piece can dim but never reaches total black.
    const diag = Math.hypot(w, h)
    const g = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, diag * 1.4)
    const a = reduced ? 0.02 : 0.015 + 0.01 * breath.eased
    g.addColorStop(0, `rgba(220,228,239,${a.toFixed(4)})`)
    g.addColorStop(1, 'rgba(220,228,239,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }

  function drawChambers() {
    const margin = m.vp * 0.5
    for (const c of chambers) {
      if (!c.range) continue
      if (p > c.range[0] - margin && p < c.range[1] + margin) {
        c.draw(env)
      }
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  }

  function frame(now) {
    if (!running) return
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    t = (now - t0) / 1000

    const pTarget = clamp((window.scrollY || 0) / Math.max(1, docH - h), 0, 1)
    p += (pTarget - p) * kN(0.06, dt)
    if (Math.abs(pTarget - p) < 0.00005) p = pTarget

    updatePointerKinetics(dt)
    updateHint(dt)
    updateBreath()

    // auto-degrade ladder: 3 consecutive seconds under 50fps cuts every
    // pool 20%, repeatable to a 50% floor, never re-promoting.
    if (dt > 0) {
      fpsEma += (1 / dt - fpsEma) * 0.05
      if (fpsEma < 50) slowAcc += dt
      else slowAcc = 0
      if (slowAcc > 3 && qual > 0.5) {
        qual = Math.max(0.5, qual * 0.8)
        slowAcc = 0
        hub.emit('quality', qual)
      }
    }

    updateEnv(dt)
    drawBase()
    drawChambers()
    for (const fn of hub.frame) fn(env)

    rafId = requestAnimationFrame(frame)
  }

  // Reduced motion: render a still frame only when the view actually changes.
  let renderQueued = false
  function requestRender() {
    if (!reduced || !running || renderQueued) return
    renderQueued = true
    requestAnimationFrame(() => {
      renderQueued = false
      if (!running) return
      const pTarget = clamp((window.scrollY || 0) / Math.max(1, docH - h), 0, 1)
      p = pTarget
      updateEnv(0)
      drawBase()
      drawChambers()
      for (const fn of hub.frame) fn(env)
    })
  }

  let resizeTimer = 0
  function onResize() {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(measure, 200)
  }
  function onScrollReduced() {
    requestRender()
  }
  function onPointer(e) {
    pointer.x = e.clientX
    pointer.y = e.clientY
    pointer.touch = e.pointerType === 'touch'
    if (e.type === 'pointerdown') pointer.down = true
    if (!pointer.has) {
      pPrevX = e.clientX
      pPrevY = e.clientY
      pointer.has = true
    }
    pointer.lastEvent = t
  }
  function onPointerUp() {
    pointer.down = false
  }

  return {
    m,
    pointer,
    shared,
    hub,
    timeToNextExhale,
    measure,
    requestRender,
    get p() {
      return p
    },
    add(chamber) {
      chambers.push(chamber)
    },
    start() {
      if (running) return
      running = true
      env.sprites = buildSprites()
      measure()
      updateEnv(0)
      for (const c of chambers) {
        if (c.init) c.init(env)
        if (c.layout) c.range = c.layout(env)
      }
      window.addEventListener('resize', onResize)
      window.addEventListener('orientationchange', onResize)
      if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize)
      window.addEventListener('pointermove', onPointer, { passive: true })
      window.addEventListener('pointerdown', onPointer, { passive: true })
      window.addEventListener('pointerup', onPointerUp, { passive: true })
      window.addEventListener('pointercancel', onPointerUp, { passive: true })
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize)
      if (reduced) {
        window.addEventListener('scroll', onScrollReduced, { passive: true })
        requestRender()
      } else {
        last = performance.now()
        rafId = requestAnimationFrame(frame)
      }
    },
    destroy() {
      running = false
      cancelAnimationFrame(rafId)
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('scroll', onScrollReduced)
    },
  }
}
