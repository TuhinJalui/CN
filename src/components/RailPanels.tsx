import { useMemo } from 'react'
import {
  ArrowRight,
  AudioLines,
  CircleAlert,
  Gauge,
  Pause,
  Play,
  RadioTower,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Waves,
  Zap,
} from 'lucide-react'
import type { SimulationController } from '../hooks/useSimulation'
import { buildPacket, crcHex, fmtSignedDb } from '../lib/sim'
import { RangeControl, SimulatedBadge, Tag, ToggleControl, cx } from './ui'

const PRESETS: Array<{
  id: string
  label: string
  caption: string
  patch: Parameters<SimulationController['updateConfig']>[0]
  tone: string
}> = [
  {
    id: 'clean',
    label: 'CLEAN',
    caption: 'High SNR',
    patch: {
      snrDb: 28,
      noiseLevel: 3,
      jammer: false,
      jamStrength: 0,
      distortion: 8,
      distance: 1.2,
    },
    tone: 'green',
  },
  {
    id: 'noisy',
    label: 'NOISY',
    caption: 'Low SNR',
    patch: { snrDb: 2, noiseLevel: 38, jammer: false, jamStrength: 0, distortion: 22 },
    tone: 'amber',
  },
  {
    id: 'jammed',
    label: 'JAMMED',
    caption: 'Hostile',
    patch: { snrDb: -2, noiseLevel: 18, jammer: true, jamStrength: 84, distortion: 30 },
    tone: 'red',
  },
  {
    id: 'marginal',
    label: 'MARGINAL',
    caption: 'Edge link',
    patch: { snrDb: 12, noiseLevel: 16, jammer: false, jamStrength: 0, distortion: 24 },
    tone: 'violet',
  },
]

export function ControlConsole({
  sim,
  onAutoDemo,
  onHandshake,
  onOpenMetricsInfo,
}: {
  sim: SimulationController
  onAutoDemo: () => void
  onHandshake: () => void
  onOpenMetricsInfo: () => void
}) {
  const expectedCrc = useMemo(
    () => buildPacket(sim.config.payload).crcValue,
    [sim.config.payload],
  )

  return (
    <section className="rail-card control-console">
      <div className="rail-head">
        <div>
          <span className="rail-kicker">COMMAND / TX</span>
          <h2>Transmission control</h2>
        </div>
        <span className={cx('rail-state', sim.running && 'is-active')}>
          <span />
          {sim.paused ? 'PAUSED' : sim.running ? 'ARMED' : sim.terminal === 'complete' ? 'DONE' : 'READY'}
        </span>
      </div>

      <div className="payload-field">
        <div className="field-label-row">
          <label htmlFor="payload-input">PAYLOAD / UTF-8</label>
          <span>{sim.config.payload.length}/48</span>
        </div>
        <div className={cx('payload-input-wrap', sim.running && 'is-locked')}>
          <span className="prompt-mark">&gt;</span>
          <input
            id="payload-input"
            type="text"
            value={sim.config.payload}
            maxLength={48}
            spellCheck={false}
            disabled={sim.running}
            onChange={(event) => sim.setPayload(event.target.value)}
          />
          <span className="input-cursor" />
        </div>
        <div className="packet-preview-row">
          <span>FRAME <strong>{sim.packet?.bits.length ?? buildPacket(sim.config.payload).bits.length} bit</strong></span>
          <span>CRC <strong>{crcHex(expectedCrc)}</strong></span>
          <span>UTF-8</span>
        </div>
      </div>

      <div className="primary-action-row">
        <button
          type="button"
          className={cx('transmit-button', sim.running && 'is-transmitting')}
          onClick={sim.start}
          disabled={sim.running || !sim.nyquistValid}
          title={!sim.nyquistValid ? 'FREQ 1 is above Nyquist for the selected sample rate.' : undefined}
        >
          <span className="transmit-icon-wrap">
            {sim.running ? <Waves size={20} /> : <RadioTower size={20} />}
          </span>
          <span>
            <strong>{sim.running ? (sim.paused ? 'TRANSMISSION PAUSED' : 'TRANSMITTING') : 'TRANSMIT PAYLOAD'}</strong>
            <small>{sim.running ? 'ACOUSTIC LINK ACTIVE' : 'BEGIN FSK SEQUENCE'}</small>
          </span>
          {!sim.running && <ArrowRight size={17} className="transmit-arrow" />}
          {sim.running && <span className="transmit-ripple" />}
        </button>
        <div className="small-action-stack">
          <button
            type="button"
            className="square-action"
            onClick={sim.pause}
            disabled={!sim.running}
            aria-label={sim.paused ? 'Resume transmission' : 'Pause transmission'}
            title={sim.paused ? 'Resume' : 'Pause'}
          >
            {sim.paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button
            type="button"
            className="square-action"
            onClick={sim.reset}
            aria-label="Reset simulation"
            title="Reset"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {!sim.nyquistValid && (
        <div className="inline-warning">
          <TriangleAlert size={12} />
          Carrier above Nyquist for the selected sample rate. Raise the sample rate in Signal Lab.
        </div>
      )}

      <div className="mode-action-row">
        <button type="button" className="secondary-action" onClick={onAutoDemo}>
          <Sparkles size={14} />
          AUTO DEMO
        </button>
        <button type="button" className="secondary-action" onClick={onHandshake}>
          <AudioLines size={14} />
          HANDSHAKE
        </button>
      </div>

      <div className="preset-block">
        <div className="subhead-row">
          <span>SCENARIO PRESETS</span>
          <Tag tone="amber">SIMULATED</Tag>
        </div>
        <div className="preset-grid">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={cx('preset-button', `tone-${preset.tone}`)}
              disabled={sim.running}
              onClick={() => sim.updateConfig(preset.patch)}
            >
              <span className="preset-dot" />
              <span>
                <strong>{preset.label}</strong>
                <small>{preset.caption}</small>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="channel-controls">
        <div className="subhead-row">
          <span>CHANNEL INJECTION</span>
          <button type="button" className="inline-info" onClick={onOpenMetricsInfo}>
            SIMULATED VALUES
          </button>
        </div>
        <RangeControl
          label="Noise floor"
          value={sim.config.noiseLevel}
          min={0}
          max={100}
          format={(value) => `${value}%`}
          onChange={(value) => sim.updateConfig({ noiseLevel: value })}
          accent="amber"
        />
        <RangeControl
          label="Target SNR"
          value={sim.config.snrDb}
          min={-10}
          max={30}
          format={(value) => fmtSignedDb(value)}
          onChange={(value) => sim.updateConfig({ snrDb: value })}
          accent="cyan"
        />
        <div className="jammer-control-row">
          <ToggleControl
            label="Controlled jammer"
            detail="Laboratory only"
            checked={sim.config.jammer}
            onChange={(checked) =>
              sim.updateConfig({
                jammer: checked,
                jamStrength: checked && sim.config.jamStrength === 0 ? 70 : sim.config.jamStrength,
              })
            }
          />
        </div>
        <RangeControl
          label="Jammer strength"
          value={sim.config.jamStrength}
          min={0}
          max={100}
          disabled={!sim.config.jammer}
          format={(value) => `${value}%`}
          onChange={(value) => sim.updateConfig({ jamStrength: value })}
          accent="red"
        />
        <RangeControl
          label="Channel distortion"
          value={sim.config.distortion}
          min={0}
          max={100}
          format={(value) => `${value}%`}
          onChange={(value) => sim.updateConfig({ distortion: value })}
          accent="violet"
        />
      </div>

      <div className="rail-footnote">
        <CircleAlert size={12} />
        <span>Telemetry is generated by the simulator, never measured results from the paper.</span>
      </div>
    </section>
  )
}

function MiniMeter({
  label,
  value,
  fill,
  tone = 'cyan',
}: {
  label: string
  value: string
  fill: number
  tone?: 'cyan' | 'green' | 'red' | 'amber' | 'violet'
}) {
  return (
    <div className={cx('mini-meter', `tone-${tone}`)}>
      <div className="mini-meter-head">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="mini-meter-track">
        <span style={{ width: `${Math.max(2, Math.min(100, fill))}%` }} />
      </div>
    </div>
  )
}

export function TelemetryPanel({
  sim,
  onInfo,
}: {
  sim: SimulationController
  onInfo: () => void
}) {
  const activeStatus =
    sim.terminal === 'complete'
      ? 'VALIDATED'
      : sim.terminal === 'failed'
        ? 'REJECTED'
        : sim.paused
          ? 'PAUSED'
          : sim.running
            ? 'ACTIVE'
            : 'STANDBY'
  const per = sim.attempts ? (sim.crcFailures / sim.attempts) * 100 : 0
  const latency = sim.run?.detectionLatencyMs
  const quality = Math.max(0, Math.min(100, ((sim.snrDb + 15) / 50) * 100))
  const signalTone =
    sim.terminal === 'failed'
      ? 'red'
      : sim.terminal === 'complete'
        ? 'green'
        : sim.config.jammer
          ? 'amber'
          : 'cyan'

  return (
    <section className="rail-card telemetry-panel">
      <div className="rail-head">
        <div>
          <span className="rail-kicker">LIVE TELEMETRY</span>
          <h2>Link instrumentation</h2>
        </div>
        <SimulatedBadge />
      </div>

      <div className={cx('telemetry-status', `tone-${signalTone}`)}>
        <div className="telemetry-status-left">
          <span className={cx('large-status-dot', sim.running && 'is-live', sim.terminal === 'failed' && 'is-error')} />
          <div>
            <span>SIGNAL STATUS</span>
            <strong>{activeStatus}</strong>
          </div>
        </div>
        <div className="signal-glyph" aria-hidden="true">
          {[7, 13, 19, 11, 23, 15, 8, 17, 12].map((height, index) => (
            <span
              key={`${height}-${index}`}
              style={{
                height: `${sim.running ? height : Math.max(4, height * 0.35)}px`,
                animationDelay: `${index * 90}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="telemetry-list">
        <div><span>FREQUENCY 0</span><strong>{(sim.config.f0 / 1000).toFixed(2)} kHz</strong></div>
        <div><span>FREQUENCY 1</span><strong>{(sim.config.f1 / 1000).toFixed(2)} kHz</strong></div>
        <div><span>SAMPLE RATE</span><strong>{(sim.config.sampleRate / 1000).toFixed(1)} kHz</strong></div>
        <div><span>SNR / MODELLED</span><strong className={sim.snrDb < 6 ? 'tone-amber' : 'tone-green'}>{sim.snrDb.toFixed(1)} dB</strong></div>
        <div><span>BIT ERROR RATE</span><strong className={sim.ber > 0 ? 'tone-red' : ''}>{(sim.ber * 100).toFixed(2)}%</strong></div>
        <div><span>PACKET ERROR RATE</span><strong>{sim.attempts ? `${per.toFixed(1)}%` : '—'}</strong></div>
        <div><span>CRC STATUS</span><strong className={sim.crcStatus === 'VALID' ? 'tone-green' : sim.crcStatus === 'FAILED' ? 'tone-red' : ''}>{sim.crcStatus}</strong></div>
        <div><span>SYNC STATUS</span><strong className={sim.syncStatus === 'LOCKED' ? 'tone-green' : sim.syncStatus === 'UNSTABLE' ? 'tone-red' : ''}>{sim.syncStatus}</strong></div>
        <div><span>THROUGHPUT</span><strong>{sim.throughput.toFixed(1)} bit/s</strong></div>
        <div><span>CRC FAILURES</span><strong>{sim.crcFailures}</strong></div>
      </div>

      <div className="telemetry-meters">
        <MiniMeter label="SIGNAL QUALITY" value={`${Math.round(quality)}%`} fill={quality} tone={signalTone} />
        <MiniMeter label="SYMBOL CONFIDENCE" value={`${Math.round(Math.min(100, sim.currentFrame.spectrum.marginDb * 4.5))}%`} fill={sim.currentFrame.spectrum.marginDb * 4.5} tone="violet" />
      </div>

      <div className="telemetry-session">
        <div>
          <span>SESSION ATTEMPTS</span>
          <strong>{String(sim.attempts).padStart(2, '0')}</strong>
        </div>
        <div>
          <span>LIFETIME BER</span>
          <strong>{(sim.lifetimeBer * 100).toFixed(2)}%</strong>
        </div>
        <div>
          <span>LATENCY</span>
          <strong>{latency ? `${latency.toFixed(1)} ms` : '—'}</strong>
        </div>
      </div>

      <button type="button" className="metrics-info-link" onClick={onInfo}>
        <Gauge size={12} />
        Why are these values simulated?
        <ArrowRight size={12} />
      </button>

      <div className="rail-footnote">
        <TriangleAlert size={12} />
        <span>No empirical measurements are shown. Model outputs only.</span>
      </div>
    </section>
  )
}

export function LinkHealthCard({ sim, onNoise, onJam }: {
  sim: SimulationController
  onNoise: () => void
  onJam: () => void
}) {
  const status = sim.config.jammer
    ? 'HOSTILE'
    : sim.config.snrDb < 12
      ? 'DEGRADED'
      : 'NOMINAL'
  return (
    <section className="rail-card health-card">
      <div className="health-row">
        <span className="health-icon"><ShieldCheck size={16} /></span>
        <div>
          <span className="rail-kicker">CHANNEL HEALTH</span>
          <strong>{status}</strong>
        </div>
        <Tag tone={status === 'NOMINAL' ? 'green' : status === 'HOSTILE' ? 'red' : 'amber'}>
          {sim.config.jammer ? 'JAM ON' : fmtSignedDb(sim.config.snrDb)}
        </Tag>
      </div>
      <div className="health-actions">
        <button type="button" className="health-action" onClick={onNoise}>
          <Zap size={13} />
          Inject noise
        </button>
        <button type="button" className={cx('health-action', sim.config.jammer && 'is-danger')} onClick={onJam}>
          <TriangleAlert size={13} />
          {sim.config.jammer ? 'Disable jammer' : 'Enable jammer'}
        </button>
      </div>
    </section>
  )
}
