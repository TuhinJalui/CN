import { Pause, Play, X } from 'lucide-react'
import { PRESENTATION_NOTES } from '../content'
import type { SimulationController } from '../hooks/useSimulation'
import { Tag, cx } from './ui'

const NOTE_ORDER = ['idle', 'framing', 'modulating', 'channel', 'demodulating', 'verifying', 'complete']

export function PresentationChrome({
  sim,
  onExit,
}: {
  sim: SimulationController
  onExit: () => void
}) {
  const noteKey = sim.terminal === 'failed' ? 'failed' : sim.phase
  const note = PRESENTATION_NOTES[noteKey] ?? PRESENTATION_NOTES.idle
  const orderIndex = NOTE_ORDER.indexOf(noteKey === 'failed' ? 'verifying' : noteKey)
  const displayIndex = orderIndex < 0 ? 0 : orderIndex

  return (
    <>
      <div className="presentation-topbar">
        <div className="presentation-brand">
          <span className="presentation-brand-mark">AG</span>
          <div>
            <strong>AETHER//GAP</strong>
            <span>RESEARCH DEMONSTRATION · LIVE SIMULATION</span>
          </div>
        </div>
        <div className="presentation-controls">
          <Tag tone="amber">SIMULATED</Tag>
          <button type="button" className="presentation-btn" onClick={sim.pause} disabled={!sim.running}>
            {sim.paused ? <Play size={13} /> : <Pause size={13} />}
            {sim.paused ? 'RESUME' : 'PAUSE'}
          </button>
          <button type="button" className="presentation-btn exit" onClick={onExit}>
            <X size={14} />
            EXIT
          </button>
        </div>
      </div>

      <div className="presentation-caption">
        <div className="presentation-caption-index">
          <span>{note.act.split(' / ')[0]}</span>
          <div className="presentation-progress-dots">
            {NOTE_ORDER.map((key, index) => (
              <i
                key={key}
                className={cx(index <= displayIndex && 'is-lit', index === displayIndex && 'is-current')}
              />
            ))}
          </div>
        </div>
        <div className="presentation-caption-copy">
          <span className="presentation-act">{note.act}</span>
          <h2>{note.title}</h2>
          <p>{note.body}</p>
        </div>
        <div className="presentation-caption-side">
          <span className="caption-live"><span className={sim.running ? 'is-live' : ''} /> {sim.running ? 'LIVE MODEL' : sim.paused ? 'FROZEN' : 'STANDBY'}</span>
          <span>{sim.config.jammer ? 'JAMMER ACTIVE' : `${sim.snrDb.toFixed(1)} dB SNR`}</span>
          <span>FSK / {(sim.config.f0 / 1000).toFixed(1)}–{(sim.config.f1 / 1000).toFixed(1)} kHz</span>
        </div>
        <div className="presentation-progress-line">
          <span style={{ width: `${sim.progress * 100}%` }} />
        </div>
      </div>
    </>
  )
}
