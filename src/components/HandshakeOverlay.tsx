import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  AudioLines,
  Check,
  Clock3,
  Mic,
  Radio,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react'
import type { SimConfig } from '../lib/types'
import { Tag, cx } from './ui'

const STEPS = [
  { label: 'SYNC TONE EMITTED', detail: 'TX / dual-tone acquisition marker' },
  { label: 'RECEIVER DETECTS', detail: 'energy above adaptive floor' },
  { label: 'TIMING REFERENCE', detail: 'symbol clock phase estimated' },
  { label: 'ACK RETURNED', detail: 'acoustic acknowledgement' },
  { label: 'READY', detail: 'payload window opens' },
]

export function HandshakeOverlay({
  open,
  config,
  onClose,
  onBeginPayload,
}: {
  open: boolean
  config: SimConfig
  onClose: () => void
  onBeginPayload: () => void
}) {
  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(true)

  useEffect(() => {
    if (!open) return undefined
    setStep(0)
    setRunning(true)
    return undefined
  }, [open])

  useEffect(() => {
    if (!open || !running) return undefined
    if (step >= STEPS.length) {
      setRunning(false)
      return undefined
    }
    const timer = window.setTimeout(() => setStep((value) => value + 1), step === 0 ? 700 : 620)
    return () => window.clearTimeout(timer)
  }, [open, running, step])

  useEffect(() => {
    if (!open) return undefined
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const metrics = useMemo(() => {
    const noisePenalty = config.noiseLevel * 0.08
    const jamPenalty = config.jammer ? config.jamStrength * 0.11 : 0
    const distortionPenalty = config.distortion * 0.055
    const detectionLatency = config.symbolMs * 1.35 + 4.2 + noisePenalty + jamPenalty
    const stability = Math.max(58, Math.min(99.9, 99.7 - noisePenalty * 1.4 - jamPenalty * 1.8 - distortionPenalty))
    const missed = config.jammer && config.jamStrength > 70 ? 1 : config.snrDb < -2 ? 1 : 0
    const falseDetections = config.noiseLevel > 70 || (config.jammer && config.jamStrength > 90) ? 1 : 0
    return { detectionLatency, stability, missed, falseDetections }
  }, [config])

  if (!open) return null
  const complete = step >= STEPS.length

  return (
    <div className="modal-backdrop handshake-backdrop" role="dialog" aria-modal="true" aria-label="Sonic handshake">
      <div className="handshake-modal">
        <div className="modal-head">
          <div>
            <span className="panel-eyebrow">SYNCHRONISATION / PRE-FLIGHT</span>
            <h2>Sonic handshake</h2>
          </div>
          <div className="modal-head-actions">
            <Tag tone="amber">SIMULATED</Tag>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close handshake">
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="handshake-stage">
          <div className="handshake-grid-bg" aria-hidden="true" />
          <div className="handshake-endpoint left">
            <div className="handshake-endpoint-ring"><Radio size={22} /></div>
            <span>TX / SYNC</span>
            <strong>TRANSMITTER</strong>
          </div>

          <div className="handshake-link">
            <div className={cx('sync-pulse-stream', running && 'is-running')}>
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="handshake-link-label">
              <AudioLines size={13} />
              <span>{complete ? 'TIMING LOCKED' : 'ACQUIRING TIMING'}</span>
            </div>
            <div className="handshake-ack-path">
              <span className={cx(complete && 'is-returned')} />
              <small>{complete ? 'ACK RECEIVED' : 'ACK PATH'}</small>
            </div>
            <div className="handshake-link-meta">
              <span>SYNC TONE 19.0 kHz</span>
              <span>PREAMBLE 16 bit</span>
            </div>
          </div>

          <div className="handshake-endpoint right">
            <div className="handshake-endpoint-ring"><Mic size={22} /></div>
            <span>RX / LOCK</span>
            <strong>RECEIVER</strong>
          </div>

          <div className="handshake-state-overlay">
            <span className={cx('handshake-state-dot', complete ? 'is-ready' : 'is-live')} />
            <strong>{complete ? 'RECEIVER READY' : running ? 'SYNC DETECTED' : 'STANDBY'}</strong>
            <small>{complete ? 'timing reference shared' : 'calibrating symbol clock'}</small>
          </div>
        </div>

        <div className="handshake-body">
          <div className="handshake-sequence">
            <div className="sequence-head">
              <span>SEQUENCE</span>
              <span>{Math.min(step, STEPS.length)} / {STEPS.length}</span>
            </div>
            {STEPS.map((entry, index) => {
              const done = index < step
              const active = index === step
              return (
                <div
                  key={entry.label}
                  className={cx('sequence-step', done && 'is-done', active && 'is-active')}
                >
                  <span className="sequence-marker">
                    {done ? <Check size={11} /> : active ? <span className="sequence-pulse" /> : index + 1}
                  </span>
                  <div>
                    <strong>{entry.label}</strong>
                    <span>{entry.detail}</span>
                  </div>
                  {index > 0 && <ArrowDown size={11} className="sequence-connector" />}
                </div>
              )
            })}
          </div>

          <div className="handshake-metrics">
            <div className="handshake-metric-grid">
              <div>
                <span>DETECTION LATENCY</span>
                <strong>{metrics.detectionLatency.toFixed(1)} <em>ms</em></strong>
              </div>
              <div>
                <span>MISSED DETECTIONS</span>
                <strong>{metrics.missed}</strong>
              </div>
              <div>
                <span>FALSE DETECTIONS</span>
                <strong>{metrics.falseDetections}</strong>
              </div>
              <div>
                <span>SYNC STABILITY</span>
                <strong>{metrics.stability.toFixed(1)}%</strong>
              </div>
            </div>
            <div className="stability-meter">
              <div className="stability-head"><span>Synchronisation stability</span><span>{metrics.stability.toFixed(1)}%</span></div>
              <div className="stability-track"><span style={{ width: `${metrics.stability}%` }} /></div>
            </div>
            <div className="handshake-model-note">
              <TriangleAlert size={12} />
              Values are model outputs influenced by your current channel settings — not experimental measurements.
            </div>
          </div>
        </div>

        <div className="modal-foot handshake-foot">
          <span><Clock3 size={12} /> Timing lock happens before the first payload bit.</span>
          <div className="modal-action-row">
            <button type="button" className="ghost-button" onClick={onClose}>Cancel</button>
            <button type="button" className="primary-small" onClick={onBeginPayload}>
              {complete ? <Sparkles size={14} /> : <Radio size={14} />}
              {complete ? 'BEGIN PAYLOAD TRANSMISSION' : 'SKIP TO PAYLOAD'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
