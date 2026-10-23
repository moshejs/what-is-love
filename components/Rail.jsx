// The wax-and-ember scrollbar: 2px of unburnt wax down the right margin,
// burnt wax above the ember, the ember itself flickering by the house law.
// Its flicker is baked into CSS keyframes (a 20s seamless loop sampled from
// the incommensurate-sine product) so the only per-frame DOM writes are the
// two rail transforms.

import { houseFlicker } from '../lib/flicker'

function buildEmberKeyframes() {
  let css = '@keyframes emberFlick{'
  const steps = 200
  const loop = 20 // seconds; 0.9Hz completes 18 cycles, seam lands on sin=0
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * loop
    const a = houseFlicker(t) / 0.9 // normalize into ~[0.78, 1]
    css += `${((i / steps) * 100).toFixed(1)}%{opacity:${a.toFixed(3)}}`
  }
  css += '}'
  return css
}

const EMBER_KEYFRAMES = buildEmberKeyframes()

export default function Rail() {
  return (
    <div className="rail" id="rail" aria-hidden="true">
      <style dangerouslySetInnerHTML={{ __html: EMBER_KEYFRAMES }} />
      <div className="rail-wax" />
      <div className="rail-burnt" id="rail-burnt" />
      <div className="rail-ember" id="rail-ember">
        <div className="ember-halo" style={{ animation: 'emberFlick 20s linear infinite' }} />
        <div className="ember-core" />
        <div className="ember-line" />
      </div>
    </div>
  )
}
