import { useEffect, useState } from 'react'
import {
  AudioWaveform,
  ChartNoAxesCombined,
  Crosshair,
  EyeOff,
  MonitorPlay,
  RadioTower,
  ShieldCheck,
} from 'lucide-react'
import type { LabMode } from '../lib/types'
import { cx } from './ui'

const MODES: Array<{
  id: LabMode
  label: string
  shortLabel: string
  icon: typeof Crosshair
}> = [
  { id: 'overview', label: 'Operations', shortLabel: 'OPS', icon: Crosshair },
  { id: 'signal', label: 'Signal Lab', shortLabel: 'SIG', icon: AudioWaveform },
  { id: 'experiment', label: 'Experiment', shortLabel: 'EXP', icon: ChartNoAxesCombined },
  { id: 'stego', label: 'Steganography', shortLabel: 'STG', icon: EyeOff },
  { id: 'defense', label: 'Defense', shortLabel: 'DEF', icon: ShieldCheck },
]

function useUtcClock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return time.toISOString().slice(11, 19)
}

export function Header({
  mode,
  onModeChange,
  onPresent,
}: {
  mode: LabMode
  onModeChange: (mode: LabMode) => void
  onPresent: () => void
}) {
  const utc = useUtcClock()
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-glyph" aria-hidden="true">
          <span className="brand-glyph-core" />
          <svg viewBox="0 0 44 44">
            <path d="M4 23h4l3-9 4 20 4-25 4 30 4-27 4 20 4-12 4 3h3" />
          </svg>
        </div>
        <div className="brand-copy">
          <div className="brand-title">
            AETHER<span>//</span>GAP
          </div>
          <div className="brand-subtitle">Acoustic air-gap laboratory</div>
        </div>
      </div>

      <nav className="mode-nav" aria-label="Laboratory modes">
        {MODES.map((entry) => {
          const Icon = entry.icon
          return (
            <button
              key={entry.id}
              type="button"
              className={cx('mode-tab', mode === entry.id && 'is-active')}
              onClick={() => onModeChange(entry.id)}
            >
              <Icon size={14} />
              <span className="mode-tab-label">{entry.label}</span>
              <span className="mode-tab-short">{entry.shortLabel}</span>
            </button>
          )
        })}
      </nav>

      <div className="header-telemetry">
        <div className="header-status">
          <span className="status-dot" />
          <span>SIMULATION ONLINE</span>
        </div>
        <div className="header-clock">
          <span>UTC</span>
          <strong>{utc}</strong>
        </div>
        <div className="header-rule" />
        <button type="button" className="present-button" onClick={onPresent}>
          <MonitorPlay size={14} />
          <span>Present</span>
        </button>
        <RadioTower size={15} className="header-radio" aria-hidden="true" />
      </div>
    </header>
  )
}
