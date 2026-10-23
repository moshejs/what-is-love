# only love.

*a descent in four questions*

A scroll-driven web art piece. Four darkened chambers, one question each:

> There are only four questions of value in life.
> What is sacred? Of what is the spirit made?
> What is worth living for? What is worth dying for?
> The answer to each is the same: only love.

— *Don Juan DeMarco* (1994), often given to Lord Byron, who never wrote them.

## The descent

- **Threshold** — darkness, then the opening sentence resolves word by word. A wax-and-ember scrollbar burns down the right margin for the whole piece.
- **Chamber I — the dust** (*What is sacred?*) — a column of light that is never drawn, only inferred: dust motes brighten as they pass a central axis. The column inclines toward your hand and retreats from haste.
- **Chamber II — the breath** (*Of what is the spirit made?*) — smoke seeded from a ring buffer recording everywhere you have been on the page. The column's silhouette is your own path. The whole field breathes on a 9-second cycle.
- **Chamber III — the standing lights** (*What is worth living for?*) — six hundred small flames, kindled one by one by your descent. Hold still, and the lights nearest your stillness gather toward it.
- **Chamber IV — the snuffing** (*What is worth dying for?*) — the same lights extinguished in accelerating, seeded order; every death a 400 ms fade with a sub-300 ms garnet flash of last heat — the only red in the piece. All interaction is revoked. The question's own words fade in reverse until only the question mark remains. One light survives.
- **The answer** — the survivor walks 100vh of darkness with you and settles into the transparent period of "only love." The sentence is finished by fire, not punctuation. An 8-second dawn follows, with ghosts of every chamber drifting once through the light.
- **Coda** — the full quote, finally ordinary: selectable, copyable. *return* relights the candle.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # static production build
```

## How it's made

Next.js (app router) + plain JavaScript, CSS, and a single Canvas 2D surface. No
animation libraries, no WebGL. Notable mechanics:

- **One fixed canvas** behind normal-flow DOM; chambers are `{range, init, layout, draw}`
  objects skipped entirely beyond ±0.5 viewport of their range.
- **Pure-progress state**: kindle counts, snuff order, and fades derive from smoothed
  scroll progress + seeded PRNG (`mulberry32`), so crossing the whole piece in a second
  corrupts nothing.
- **The house law of flame**: every flicker is a product of two incommensurate sines
  (0.9 Hz × 0.23 Hz) — never per-frame randomness. Flames breathe instead of buzz.
- **The trace**: a 1024-slot ring buffer samples your pointer (or the ember's place on
  the rail) every 120 ms. Chamber II's smoke and part of the finale's ghosts spawn from it.
- **The anchor**: the period of "only love." is rendered transparent and measured after
  fonts load; the surviving flame glides into its bounding box. If measurement ever
  fails, the real glyph is un-hidden — the sentence always ends.
- **prefers-reduced-motion**: every chamber renders a still, seeded painting instead of
  animating; text fades by opacity only.
- All glow comes from pre-rendered radial sprites drawn with `globalAlpha` + `'lighter'`;
  `shadowBlur` and canvas filters are banned. DPR is capped at 1.5 and an auto-degrade
  ladder cuts particle pools 20% (to a 50% floor) after 3 consecutive seconds under 50 fps.
