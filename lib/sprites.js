// All glow in the piece comes from pre-rendered offscreen radial sprites
// drawn with globalAlpha + 'lighter'. shadowBlur and canvas filters are banned.

function makeRadialSprite(size, stops) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  for (const [at, color] of stops) g.addColorStop(at, color)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return c
}

export function buildSprites() {
  return {
    // Chamber I — cold dust-light
    mote: makeRadialSprite(32, [
      [0, 'rgba(220,228,239,1)'],
      [0.35, 'rgba(220,228,239,0.55)'],
      [0.7, 'rgba(220,228,239,0.12)'],
      [1, 'rgba(220,228,239,0)'],
    ]),
    // Chamber II — breath grey, very soft
    breath: makeRadialSprite(64, [
      [0, 'rgba(154,160,171,0.9)'],
      [0.4, 'rgba(154,160,171,0.35)'],
      [0.75, 'rgba(154,160,171,0.08)'],
      [1, 'rgba(154,160,171,0)'],
    ]),
    // Chambers III/IV — ember amber halo
    halo: makeRadialSprite(48, [
      [0, 'rgba(229,179,106,1)'],
      [0.3, 'rgba(229,179,106,0.45)'],
      [0.7, 'rgba(229,179,106,0.1)'],
      [1, 'rgba(229,179,106,0)'],
    ]),
    // flame core, warm bone
    core: makeRadialSprite(16, [
      [0, 'rgba(243,231,205,1)'],
      [0.5, 'rgba(243,231,205,0.85)'],
      [1, 'rgba(243,231,205,0)'],
    ]),
    // the red of last heat — Chamber IV snuff flashes only
    garnet: makeRadialSprite(32, [
      [0, 'rgba(125,42,51,1)'],
      [0.45, 'rgba(125,42,51,0.5)'],
      [1, 'rgba(125,42,51,0)'],
    ]),
    // snuff wisp, tiny grey puff
    wisp: makeRadialSprite(24, [
      [0, 'rgba(154,160,171,0.8)'],
      [0.5, 'rgba(154,160,171,0.25)'],
      [1, 'rgba(154,160,171,0)'],
    ]),
  }
}
