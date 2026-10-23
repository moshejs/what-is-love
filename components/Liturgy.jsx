'use client'

// The sole client owner of the piece: boots the canvas engine, wires the
// pointer/trace/anchor machinery, fires text reveals, and performs the few
// event-driven DOM writes (rail transforms, chamber IV's un-reveal).

import { useEffect, useRef } from 'react'
import { createEngine, createHub } from '../lib/engine'
import { createTrace } from '../lib/trace'
import { createAnchor } from '../lib/anchors'
import { createDust } from '../lib/chambers/dust'
import { createBreath } from '../lib/chambers/breath'
import { createLights } from '../lib/chambers/lights'
import { createAnswer } from '../lib/chambers/answer'
import { clamp, easeInOutCubic } from '../lib/flicker'
import Sections from './Sections'
import Rail from './Rail'

export default function Liturgy() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)

    const timers = []
    const hub = createHub()
    const engine = createEngine({ canvas: canvasRef.current, hub, reduced })
    const trace = createTrace()
    const anchor = createAnchor(() => hub.emit('anchor-fallback'))

    engine.add(createDust())
    engine.add(createBreath(trace))
    engine.add(createLights())
    engine.add(createAnswer(anchor, trace))

    // the spirit's raw material: where the visitor has been
    trace.start(() => {
      const pt = engine.pointer
      if (pt.has) {
        return {
          x: clamp(pt.x / window.innerWidth, 0, 1),
          y: clamp(pt.y / window.innerHeight, 0, 1),
        }
      }
      // no hand present: record the ember's place on the rail (flagged +2)
      return { x: 2.5, y: clamp(engine.p, 0, 1) }
    })

    engine.start()

    // --- text reveals: trigger-fired, never scroll-scrubbed ---
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const el = e.target
          io.unobserve(el)
          if (el.dataset.reveal === 'exhale' && !reduced) {
            // the question lands on the start of the next exhale
            timers.push(setTimeout(() => el.classList.add('in'), engine.timeToNextExhale() * 1000))
          } else {
            el.classList.add('in')
          }
        }
      },
      { threshold: 0.35 }
    )
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el))

    // "only love." tightens its tracking as it resolves, which moves the
    // period; the flame's anchor must be re-measured once the text is placed
    const onlyLoveText = document.getElementById('only-love-text')
    const onOnlyLoveSettle = (e) => {
      if (e.propertyName === 'letter-spacing') anchor.remeasure()
    }
    onlyLoveText.addEventListener('transitionend', onOnlyLoveSettle)

    // --- the threshold: 1.2s of darkness, then the sentence resolves ---
    const thresholdLine = document.getElementById('threshold-line')
    const topLabel = document.getElementById('top-label')
    const cue = document.getElementById('descend')
    timers.push(
      setTimeout(() => {
        thresholdLine.classList.add('in')
        topLabel.classList.add('in')
      }, 1200)
    )
    const nWords = thresholdLine.querySelectorAll('.w').length
    timers.push(setTimeout(() => cue.classList.add('in'), 1200 + (nWords - 1) * 350 + 1000))

    // the first scroll input retires the title, permanently
    const onFirstScroll = () => {
      if ((window.scrollY || 0) > 4) {
        topLabel.classList.add('gone')
        window.removeEventListener('scroll', onFirstScroll)
      }
    }
    window.addEventListener('scroll', onFirstScroll, { passive: true })

    // --- slow ceremonial scrolls (descend / return), cancellable by hand ---
    let scrollAnim = 0
    const cancelScroll = () => cancelAnimationFrame(scrollAnim)
    function animateScrollTo(target, dur) {
      cancelAnimationFrame(scrollAnim)
      const from = window.scrollY || 0
      const start = performance.now()
      const step = (now) => {
        const e = clamp((now - start) / dur, 0, 1)
        window.scrollTo(0, from + (target - from) * easeInOutCubic(e))
        if (e < 1) scrollAnim = requestAnimationFrame(step)
      }
      scrollAnim = requestAnimationFrame(step)
    }
    window.addEventListener('wheel', cancelScroll, { passive: true })
    window.addEventListener('touchstart', cancelScroll, { passive: true })
    window.addEventListener('keydown', cancelScroll, { passive: true })

    const onDescend = () => {
      const el = document.getElementById('st-ch1-num')
      const target = el.offsetTop - window.innerHeight * 0.2
      if (reduced) window.scrollTo(0, target)
      else animateScrollTo(target, 2400)
    }
    cue.addEventListener('click', onDescend)

    const returnBtn = document.getElementById('return')
    const onReturn = () => {
      if (reduced) window.scrollTo(0, 0)
      else animateScrollTo(0, 3500)
    }
    returnBtn.addEventListener('click', onReturn)

    // --- engine events ---
    const offs = []
    offs.push(
      hub.on('whisper', () => {
        const wEl = document.getElementById('whisper')
        wEl.classList.add('show')
        timers.push(setTimeout(() => wEl.classList.remove('show'), 6000))
      })
    )
    const railEl = document.getElementById('rail')
    offs.push(
      hub.on('hint', () => {
        railEl.classList.add('hint')
        timers.push(setTimeout(() => railEl.classList.remove('hint'), 1900))
      })
    )
    offs.push(
      hub.on('anchor-fallback', () => {
        // the sentence must always end: un-hide the real period
        document.getElementById('only-love-text').classList.add('show-period')
      })
    )

    // --- per-frame DOM: rail transforms + threshold-crossing class flips ---
    const emberEl = document.getElementById('rail-ember')
    const burntEl = document.getElementById('rail-burnt')
    const q4El = document.getElementById('q4')
    let q4Out = false
    let qmOut = false
    let down = false
    const onFrame = (env) => {
      emberEl.style.transform = `translate3d(0, ${(env.p * (env.h - 4)).toFixed(2)}px, 0)`
      burntEl.style.transform = `scaleY(${env.p.toFixed(5)})`
      if (!reduced) {
        // chamber IV's un-reveal: the question outlives its words
        const sta = env.m.sta('ch4-q')
        if (sta) {
          const pUn = env.m.pOf(sta.top + sta.h) + 0.5 * env.vp
          const pQm = pUn + 0.35 * env.vp
          if (env.p > pUn !== q4Out) {
            q4Out = env.p > pUn
            q4El.classList.toggle('out', q4Out)
          }
          if (env.p > pQm !== qmOut) {
            qmOut = env.p > pQm
            q4El.classList.toggle('qm-out', qmOut)
          }
        }
      }
      if (env.p > 0.975 !== down) {
        down = env.p > 0.975
        railEl.classList.toggle('down', down)
      }
    }
    hub.frame.add(onFrame)

    return () => {
      engine.destroy()
      trace.stop()
      anchor.destroy()
      io.disconnect()
      onlyLoveText.removeEventListener('transitionend', onOnlyLoveSettle)
      timers.forEach(clearTimeout)
      cancelAnimationFrame(scrollAnim)
      window.removeEventListener('scroll', onFirstScroll)
      window.removeEventListener('wheel', cancelScroll)
      window.removeEventListener('touchstart', cancelScroll)
      window.removeEventListener('keydown', cancelScroll)
      cue.removeEventListener('click', onDescend)
      returnBtn.removeEventListener('click', onReturn)
      offs.forEach((off) => off())
      hub.frame.delete(onFrame)
    }
  }, [])

  return (
    <>
      <canvas id="liturgy-canvas" ref={canvasRef} aria-hidden="true" />
      <main>
        <Sections />
      </main>
      <Rail />
    </>
  )
}
