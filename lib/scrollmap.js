// The single source of truth for the descent: every station in order, with
// heights in vh (hm = mobile override). Sections renders these; the engine
// measures the rendered DOM to derive chamber ranges, so layout and canvas
// can never disagree.

export const STATIONS = [
  { id: 'threshold', h: 100 },
  { id: 'band-a', h: 70, hm: 55 },
  { id: 'ch1-num', h: 60 },
  { id: 'ch1-q', h: 95 },
  { id: 'band-b', h: 70, hm: 55 },
  { id: 'ch2-num', h: 60 },
  { id: 'ch2-q', h: 95 },
  { id: 'band-c', h: 70, hm: 55 },
  { id: 'ch3-num', h: 60 },
  { id: 'ch3-q', h: 120 },
  { id: 'ch4-fade', h: 50 },
  { id: 'ch4-num', h: 60 },
  { id: 'ch4-q', h: 90 },
  { id: 'ch4-snuff', h: 105 },
  { id: 'ch4-walk', h: 100 },
  { id: 'answer-line', h: 70 },
  { id: 'answer-dark', h: 85 },
  { id: 'only-love', h: 115 },
  { id: 'coda', h: 105 },
]

// The dark threshold bands kept alive by the mercy floor and hint pulse.
export const BANDS = ['band-a', 'band-b', 'band-c', 'ch4-walk', 'answer-dark']
