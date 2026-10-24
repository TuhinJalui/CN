import { useState } from 'react'
import {
  Activity,
  AudioLines,
  Cpu,
  Eye,
  EyeOff,
  Gauge,
  Radio,
  ScanLine,
  ShieldAlert,
  SlidersHorizontal,
  TriangleAlert,
  Waves,
} from 'lucide-react'
import type { SimulationController } from '../hooks/useSimulation'
import { FskPanel } from '../components/FskPanel'
import { SpectrumPanel } from '../components/SpectrumPanel'
import { ScopePanel } from '../components/ScopePanel'
import { PacketPanel } from '../components/PacketPanel'
import {
  RangeControl,
  SectionIntro,
  SimulatedBadge,
  ToggleControl,
  Tag,
  cx,
} from '../components/ui'

function FrequencyMap({
  f0,
  f1,
  nyquist,
}: {
  f0: number
  f1: number
  nyquist: number
}) {
  const maxHz = 24000
  const pct = (hz: number) => `${Math.max(0, Math.min(100, (hz / maxHz) * 100))}%`
  return (
    <div className="frequency-map">
      <div className="frequency-map-track">
        <span className="freq-region audible" style={{ left: '0%', width: pct(16000) }} />
        <span className="freq-region near" style={{ left: pct(18000), width: pct(21000 - 18000) }} />
        <span className="freq-region guard" style={{ left: pct(21000), width: pct(22050 - 21000) }} />
        <span className="freq-region alias" style={{ left: pct(22050), width: pct(24000 - 22050) }} />
        <span className="freq-marker current-f0" style={{ left: pct(f0) }}>
          <i /> F0
        </span>
        <span className="freq-marker current-f1" style={{ left: pct(f1) }}>
          <i /> F1
        </span>
        <span className="freq-marker nyquist-marker" style={{ left: pct(nyquist) }}>
          <i /> NYQUIST
        </span>
      </div>
      <div className="frequency-map-labels">
        <span>0</span>
        <span>4k</span>
        <span>8k</span>
        <span>12k</span>
        <span>16k</span>
        <span>20k</span>
        <span>24k</span>
      </div>
      <div className="frequency-map-legend">
        <span><i className="freq-swatch near" /> Operating band 18–21 kHz</span>
        <span><i className="freq-swatch guard" /> Near-Nyquist guard</span>
        <span><i className="freq-swatch alias" /> Above Nyquist</span>
      </div>
    </div>
  )
}

function OperatingRegionPanel({
  sim,
  onInfo,
}: {
  sim: SimulationController
  onInfo: () => void
}) {
  const center = Math.round((sim.config.f0 + sim.config.f1) / 2)
  const nyquist = sim.config.sampleRate / 2
  const invalid = sim.config.f1 >= nyquist
  const regionPresets = [
    { label: '18–20 kHz', f0: 18000, f1: 20000 },
    { label: '19–21 kHz', f0: 19000, f1: 21000 },
    { label: '18.5–20.5', f0: 18500, f1: 20500 },
  ]
  return (
    <section className="panel operating-panel">
      <div className="panel-head simple">
        <div className="panel-title-group">
          <div className="panel-eyebrow">FREQUENCY / OPERATING REGION</div>
          <h2>Near-ultrasonic band</h2>
        </div>
        <button className="explain-btn" type="button" onClick={onInfo}>
          <TriangleAlert size={13} />
          <span>Why not “inaudible”?</span>
        </button>
      </div>
      <div className="operating-band-header">
        <span className="band-value">18–21 <em>kHz</em></span>
        <span className={cx('band-state', invalid ? 'is-invalid' : '')}>
          {invalid ? 'ABOVE NYQUIST' : 'WITHIN NYQUIST'}
        </span>
      </div>
      <FrequencyMap f0={sim.config.f0} f1={sim.config.f1} nyquist={nyquist} />
      <div className="region-presets">
        {regionPresets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className={cx(sim.config.f0 === preset.f0 && sim.config.f1 === preset.f1 && 'is-active')}
            onClick={() => sim.updateConfig({ f0: preset.f0, f1: preset.f1 })}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <RangeControl
        label="Shift carrier pair"
        value={center}
        min={18500}
        max={20500}
        step={100}
        format={(value) => `${(value / 1000).toFixed(1)} kHz center`}
        onChange={(value) =>
          sim.updateConfig({
            f0: value - 1000,
            f1: value + 1000,
          })
        }
        accent="cyan"
      />
      <div className="region-warning">
        <ShieldAlert size={14} />
        <span>
          This range is <strong>near-ultrasonic / high-frequency audio</strong>. It is not guaranteed to be inaudible;
          perception varies by listener, level and device.
        </span>
      </div>
      <div className="nyquist-row">
        <span>NYQUIST LIMIT</span>
        <strong>{(nyquist / 1000).toFixed(2)} kHz</strong>
        <span>@ {(sim.config.sampleRate / 1000).toFixed(1)} kHz sampling</span>
      </div>
      <p className="micro-copy">
        A 20 kHz carrier is below the ideal 22.05 kHz Nyquist frequency for 44.1 kHz sampling, but real
        speaker/microphone response, anti-alias filters, AGC and OS audio processing can still attenuate it.
      </p>
    </section>
  )
}

function HardwareModelPanel({ sim }: { sim: SimulationController }) {
  const hfGain = Math.round(sim.config.speakerResponse * 0.6 + sim.config.micResponse * 0.4)
  const reflectionRisk = Math.round(sim.config.reflections * 0.55 + sim.config.distortion * 0.45)
  const pathLoss = (sim.config.distance * 1.4 + (100 - hfGain) * 0.035).toFixed(1)
  return (
    <section className="panel hardware-panel">
      <div className="panel-head simple">
        <div className="panel-title-group">
          <div className="panel-eyebrow">HARDWARE / CHANNEL</div>
          <h2>Acoustic response</h2>
        </div>
        <Cpu size={15} />
      </div>
      <div className="hardware-mini-stats">
        <div><span>HF RESPONSE</span><strong>{hfGain}%</strong></div>
        <div><span>REFLECTION RISK</span><strong>{reflectionRisk}%</strong></div>
        <div><span>EST. PATH LOSS</span><strong>{pathLoss} dB</strong></div>
      </div>
      <div className="hardware-controls">
        <RangeControl
          label="Distance"
          value={sim.config.distance}
          min={0.25}
          max={10}
          step={0.05}
          format={(value) => `${value.toFixed(2)} m`}
          onChange={(value) => sim.updateConfig({ distance: value })}
          accent="cyan"
        />
        <RangeControl
          label="Room reflection"
          value={sim.config.reflections}
          min={0}
          max={100}
          format={(value) => `${value}%`}
          onChange={(value) => sim.updateConfig({ reflections: value })}
          accent="violet"
        />
        <RangeControl
          label="Speaker response"
          value={sim.config.speakerResponse}
          min={0}
          max={100}
          format={(value) => `${value}%`}
          onChange={(value) => sim.updateConfig({ speakerResponse: value })}
          accent="cyan"
        />
        <RangeControl
          label="Microphone response"
          value={sim.config.micResponse}
          min={0}
          max={100}
          format={(value) => `${value}%`}
          onChange={(value) => sim.updateConfig({ micResponse: value })}
          accent="cyan"
        />
        <ToggleControl
          label="Automatic gain control"
          detail="Lifts signal and noise"
          checked={sim.config.agc}
          onChange={(checked) => sim.updateConfig({ agc: checked })}
        />
        <ToggleControl
          label="OS audio processing"
          detail="Compression / nonlinearity"
          checked={sim.config.processing}
          onChange={(checked) => sim.updateConfig({ processing: checked })}
        />
      </div>
      <div className="hardware-effects">
        <span><Waves size={11} /> distance ↓ signal strength</span>
        <span><Gauge size={11} /> reflections ↓ FFT clarity</span>
        <span><Radio size={11} /> filtering ↓ HF response</span>
      </div>
    </section>
  )
}

export function SignalLab({ sim, onInfo }: { sim: SimulationController; onInfo: (key: string) => void }) {
  const [showFft, setShowFft] = useState(true)
  const [showWave, setShowWave] = useState(true)
  return (
    <div className="mode-page signal-lab-page">
      <SectionIntro
        kicker="02 / SIGNAL ANALYSIS & HARDWARE CHARACTERISATION"
        title={<>Signal lab</>}
        description="Inspect the modulation, the receiver's spectral decision and the captured time-domain signal at instrument scale. Every trace below is driven by the live model state."
        right={
          <div className="intro-status-panel">
            <SimulatedBadge />
            <div className="intro-toggle-row">
              <button
                type="button"
                className={cx('analysis-toggle', showFft && 'is-on')}
                onClick={() => setShowFft((value) => !value)}
              >
                {showFft ? <Eye size={12} /> : <EyeOff size={12} />} FFT
              </button>
              <button
                type="button"
                className={cx('analysis-toggle', showWave && 'is-on')}
                onClick={() => setShowWave((value) => !value)}
              >
                {showWave ? <ScanLine size={12} /> : <EyeOff size={12} />} WAVEFORM
              </button>
            </div>
          </div>
        }
      />

      <div className="signal-top-grid">
        <FskPanel sim={sim} onInfo={() => onInfo('fsk')} />
        <div className="signal-control-stack">
          <OperatingRegionPanel sim={sim} onInfo={() => onInfo('nyquist')} />
          <HardwareModelPanel sim={sim} />
        </div>
      </div>

      <div className={cx('signal-analysis-grid', !showFft && 'no-fft', !showWave && 'no-wave')}>
        {showFft ? (
          <SpectrumPanel sim={sim} onInfo={() => onInfo('fft')} />
        ) : (
          <section className="panel panel-placeholder">
            <div className="placeholder-icon"><AudioLines size={24} /></div>
            <strong>FFT analysis hidden</strong>
            <span>Frequency-domain view toggled off.</span>
            <button type="button" className="ghost-button compact" onClick={() => setShowFft(true)}>Enable FFT</button>
          </section>
        )}
        {showWave ? (
          <ScopePanel sim={sim} onInfo={() => onInfo('scope')} />
        ) : (
          <section className="panel panel-placeholder">
            <div className="placeholder-icon"><Activity size={24} /></div>
            <strong>Waveform hidden</strong>
            <span>Time-domain view toggled off.</span>
            <button type="button" className="ghost-button compact" onClick={() => setShowWave(true)}>Enable waveform</button>
          </section>
        )}
      </div>

      <PacketPanel sim={sim} onInfo={() => onInfo('crc')} />

      <div className="signal-lab-footer">
        <div>
          <SlidersHorizontal size={13} />
          <span>Hardware sliders affect the same deterministic symbol frames used for FFT decisions and CRC.</span>
        </div>
        <div>
          <Tag tone="amber">MODEL RESPONSE NOT CALIBRATED</Tag>
          <Tag tone="neutral">NEAR-ULTRASONIC ≠ INAUDIBLE</Tag>
        </div>
      </div>
    </div>
  )
}
