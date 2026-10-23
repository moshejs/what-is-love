// The house law of flame: every flicker in the piece is a product of two
// incommensurate sines (0.9 Hz x 0.23 Hz) — never per-frame randomness.
// Flames breathe instead of buzz.

export const TAU = Math.PI * 2

export function houseFlicker(t, phi = 0, base = 0.8, amp = 0.1) {
  return base + amp * Math.sin(TAU * 0.9 * t + phi) * Math.sin(TAU * 0.23 * t + 2.7 * phi)
}

// Deterministic PRNG — chamber layouts must be identical on every visit.
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
export const lerp = (a, b, t) => a + (b - a) * t

export const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3)
export const easeInQuad = (x) => x * x
export const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

// Framerate-normalized exponential smoothing factor: k is the per-frame
// blend at 60fps, dt in seconds.
export function kN(k, dt) {
  return 1 - Math.pow(1 - k, dt * 60)
}

export function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a || 1e-6), 0, 1)
  return t * t * (3 - 2 * t)
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
