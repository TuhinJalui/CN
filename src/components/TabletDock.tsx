import { Pause, Play, RotateCcw, SlidersHorizontal } from 'lucide-react'
import type { SimulationController } from '../hooks/useSimulation'
import { cx } from './ui'

export function TabletDock({ sim }: { sim: SimulationController }) {
  const terminal = sim.terminal === 'complete' || sim.terminal === 'failed'
  const state = sim.paused
    ? 'LINK PAUSED'
    : sim.terminal === 'complete'
      ? 'PAYLOAD VERIFIED'
      : sim.terminal === 'failed'
        ? 'INTEGRITY FAILED'
        : sim.running
          ? `TRANSMITTING ${Math.round(sim.progress * 100)}%`
          : 'LABORATORY READY'
  const tone = sim.terminal === 'complete' ? 'green' : sim.terminal === 'failed' ? 'red' : 'cyan'

  const scrollToConsole = () => {
    document.querySelector('.rail-column')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="tablet-dock" role="toolbar" aria-label="Quick transmission controls">
      <div className="dock-status">
        <span className={cx('dock-dot', sim.running && 'is-live', `tone-${tone}`)} />
        <div>
          <span>{state}</span>
          <strong>{sim.config.payload || '∅'}</strong>
        </div>
      </div>
      <div className="dock-actions">
        <button type="button" className="dock-settings" onClick={scrollToConsole}>
          <SlidersHorizontal size={13} />
          <span>Settings</span>
        </button>
        {(sim.running || terminal) && (
          <button type="button" className="dock-icon" onClick={sim.reset} aria-label="Reset simulation">
            <RotateCcw size={14} />
          </button>
        )}
        <button
          type="button"
          className="dock-primary"
          disabled={!sim.nyquistValid}
          onClick={() => {
            if (sim.running) sim.pause()
            else sim.start()
          }}
        >
          {sim.paused ? <Play size={13} /> : sim.running ? <Pause size={13} /> : <Play size={13} />}
          {sim.paused ? 'RESUME' : sim.running ? 'PAUSE' : terminal ? 'RETRANSMIT' : 'TRANSMIT'}
        </button>
      </div>
    </div>
  )
}
