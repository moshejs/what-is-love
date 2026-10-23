// The spirit's raw material: a 1024-slot ring buffer recording where the
// visitor has been — pointer/touch positions, and when the hand is absent,
// the ember's position on the rail. Chamber II's smoke is seeded from this,
// so its silhouette is the visitor's own path.
//
// Samples are viewport-normalized pairs. Ember samples are stored with
// x offset by +2 so readers can remap them into the center column.

const SLOTS = 1024
const SAMPLE_MS = 120

export function createTrace() {
  const buf = new Float32Array(SLOTS * 2)
  let head = 0
  let count = 0
  let timer = 0

  function push(x, y) {
    buf[head * 2] = x
    buf[head * 2 + 1] = y
    head = (head + 1) % SLOTS
    if (count < SLOTS) count++
  }

  return {
    get count() {
      return count
    },
    start(getSample) {
      timer = setInterval(() => {
        const s = getSample()
        if (s) push(s.x, s.y)
      }, SAMPLE_MS)
    },
    stop() {
      clearInterval(timer)
    },
    // rnd: a PRNG function. Returns viewport-normalized {x, y, ember}.
    sample(rnd) {
      if (count === 0) return null
      const i = Math.floor(rnd() * count)
      let x = buf[i * 2]
      const y = buf[i * 2 + 1]
      const ember = x > 1.5
      if (ember) x -= 2
      return { x, y, ember }
    },
  }
}
