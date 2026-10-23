// Normal-flow DOM copy for all stations of the descent. Text never moves
// once placed; it resolves into place word by word (CSS, trigger-fired).
// The canvas does everything else behind this layer.
// Screen readers get each line whole via aria-label; the per-word spans
// (visual machinery) are aria-hidden so the text doesn't fragment.

import { Fragment } from 'react'
import { STATIONS } from '../lib/scrollmap'

const BY_ID = Object.fromEntries(STATIONS.map((s) => [s.id, s]))

function Station({ id, className = '', children, hidden = false }) {
  const st = BY_ID[id]
  return (
    <section
      id={`st-${id}`}
      data-station={id}
      className={`station ${className}`}
      style={{ '--h': st.h, '--hm': st.hm ?? st.h }}
      aria-hidden={hidden || undefined}
    >
      {children}
    </section>
  )
}

function Words({ text, start = 0 }) {
  const parts = text.split(' ')
  return parts.map((word, i) => (
    <Fragment key={i}>
      <span className="w" style={{ '--i': start + i }}>
        {word}
      </span>
      {i < parts.length - 1 ? ' ' : ''}
    </Fragment>
  ))
}

export default function Sections() {
  return (
    <>
      <Station id="threshold">
        <div className="sans-label top-label" id="top-label">
          What is Love
        </div>
        <h1
          className="threshold-line"
          id="threshold-line"
          aria-label="There are only four questions of value in life."
        >
          <span aria-hidden="true">
            <Words text="There are only four questions of value in life." />
          </span>
        </h1>
        <button className="cue" id="descend">
          <span className="sans-label">descend</span>
          <span className="cue-line" aria-hidden="true" />
        </button>
      </Station>

      <Station id="band-a" hidden />

      <Station id="ch1-num">
        <div className="numeral" data-reveal>
          I
        </div>
      </Station>
      <Station id="ch1-q">
        <h2 className="q" data-reveal aria-label="What is sacred?">
          <span aria-hidden="true">
            <Words text="What is sacred?" />
          </span>
        </h2>
      </Station>

      <Station id="band-b" hidden />

      <Station id="ch2-num">
        <div className="numeral" data-reveal>
          II
        </div>
      </Station>
      <Station id="ch2-q">
        <h2 className="q" data-reveal="exhale" aria-label="Of what is the spirit made?">
          <span aria-hidden="true">
            <Words text="Of what is the spirit made?" />
          </span>
        </h2>
      </Station>

      <Station id="band-c" hidden />

      <Station id="ch3-num">
        <div className="numeral" data-reveal>
          III
        </div>
      </Station>
      <Station id="ch3-q">
        <h2 className="q" data-reveal aria-label="What is worth living for?">
          <span aria-hidden="true">
            <Words text="What is worth living for?" />
          </span>
        </h2>
        <span className="whisper" id="whisper" aria-hidden="true">
          be still
        </span>
      </Station>

      <Station id="ch4-fade" hidden />

      <Station id="ch4-num">
        <div className="numeral" data-reveal>
          IV
        </div>
      </Station>
      <Station id="ch4-q">
        <h2
          className="q q4"
          id="q4"
          data-reveal
          style={{ '--n': 4 }}
          aria-label="What is worth dying for?"
        >
          <span aria-hidden="true">
            <Words text="What is worth dying" />{' '}
            <span style={{ whiteSpace: 'nowrap' }}>
              <span className="w" style={{ '--i': 4 }}>
                for
              </span>
              <span className="w qm" style={{ '--i': 5 }}>
                ?
              </span>
            </span>
          </span>
        </h2>
      </Station>

      <Station id="ch4-snuff" hidden />
      <Station id="ch4-walk" hidden />

      <Station id="answer-line">
        <p className="answer-line" data-reveal aria-label="The answer to each is the same:">
          <span aria-hidden="true">
            <Words text="The answer to each is the same:" />
          </span>
        </p>
      </Station>

      <Station id="answer-dark" hidden />

      <Station id="only-love">
        <p className="answer-big" id="only-love-text" data-reveal aria-label="only love.">
          <span aria-hidden="true">
            <span className="w" style={{ '--i': 0 }}>
              only
            </span>{' '}
            <span style={{ whiteSpace: 'nowrap' }}>
              <span className="w" style={{ '--i': 1 }}>
                love
              </span>
              <span className="period" id="period">
                .
              </span>
            </span>
          </span>
        </p>
      </Station>

      <Station id="coda" className="coda">
        <div className="coda-fade" data-reveal>
          <p className="coda-quote">
            There are only four questions of value in life. What is sacred? Of what is the spirit
            made? What is worth living for? What is worth dying for? The answer to each is the
            same: only love.
          </p>
          <p className="coda-attr">
            from Don Juan DeMarco (1994) — often given to Lord Byron, who never wrote them.
          </p>
          <button className="return-btn" id="return">
            <span className="return-line" aria-hidden="true" />
            return
          </button>
          <p className="coda-credit">
            Built by <a href="https://www.quentin.software/">Quentin.Code</a>
          </p>
        </div>
      </Station>
    </>
  )
}
