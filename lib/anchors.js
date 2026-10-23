// The one fragile mechanism in the piece: measuring the transparent period
// of "only love." so the surviving flame can settle into it. Measured only
// after document.fonts.ready, re-measured on resize / orientationchange /
// visualViewport changes (debounced 200ms). On any failed measure the real
// glyph is un-hidden instead — the sentence must always end.

export function createAnchor(onFail) {
  const state = { ok: false, x: 0, y: 0, glyphW: 0, fontSize: 32 }
  const scr = { x: 0, y: 0 } // reused: screen() is called every frame
  let debounceTimer = 0
  let alive = true

  function measure() {
    if (!alive) return
    const el = document.getElementById('period')
    if (!el) return fail()
    const rect = el.getBoundingClientRect()
    if (!rect || !rect.width || !rect.height || !isFinite(rect.top)) return fail()
    const scrollY = window.scrollY || 0
    state.x = rect.left + rect.width / 2
    // The period dot paints just above the baseline, low in the line box.
    state.y = rect.top + scrollY + rect.height * 0.82
    state.glyphW = rect.width
    state.fontSize = parseFloat(getComputedStyle(el).fontSize) || 32
    state.ok = true
  }

  function fail() {
    state.ok = false
    if (onFail) onFail()
  }

  function remeasure() {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(measure, 200)
  }

  function onFontsDone() {
    measure()
    setTimeout(measure, 400)
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(onFontsDone)
    // fonts.ready can resolve before the faces even begin loading (notably
    // in dev); loadingdone catches the actual swap and its reflow.
    document.fonts.addEventListener('loadingdone', onFontsDone)
  } else {
    setTimeout(measure, 600)
  }

  window.addEventListener('resize', remeasure)
  window.addEventListener('orientationchange', remeasure)
  if (window.visualViewport) window.visualViewport.addEventListener('resize', remeasure)

  return {
    state,
    remeasure,
    // screen-space position of the anchor right now (mutated in place)
    screen() {
      scr.x = state.x
      scr.y = state.y - (window.scrollY || 0)
      return scr
    },
    destroy() {
      alive = false
      clearTimeout(debounceTimer)
      if (document.fonts) document.fonts.removeEventListener('loadingdone', onFontsDone)
      window.removeEventListener('resize', remeasure)
      window.removeEventListener('orientationchange', remeasure)
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', remeasure)
    },
  }
}
