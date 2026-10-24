import {
  AudioLines,
  Binary,
  Cpu,
  Fingerprint,
  Mic,
  Monitor,
  Orbit,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Speaker,
  Usb,
  Waves,
  WifiOff,
} from 'lucide-react'
import type { SimulationController } from '../hooks/useSimulation'
import type { RunPhase } from '../lib/types'
import { crcHex, displayPayload, formatBit } from '../lib/sim'
import { AirGapCanvas } from './AirGapCanvas'
import { PanelHeader, SimulatedBadge, Tag, cx } from './ui'

const PHASE_LABEL: Record<RunPhase, string> = {
  idle: 'AWAITING TRANSMISSION',
  framing: 'PACKET FRAMING',
  modulating: 'FSK MODULATION',
  channel: 'ACOUSTIC TRANSFER',
  demodulating: 'FFT / SYMBOL DECISION',
  verifying: 'CRC VERIFICATION',
  complete: 'TRANSFER COMPLETE',
  failed: 'INTEGRITY FAILURE',
}

function phaseTone(phase: RunPhase): 'cyan' | 'violet' | 'green' | 'amber' | 'red' | 'neutral' {
  if (phase === 'complete') return 'green'
  if (phase === 'failed') return 'red'
  if (phase === 'channel' || phase === 'demodulating') return 'cyan'
  if (phase === 'verifying') return 'violet'
  if (phase === 'framing' || phase === 'modulating') return 'amber'
  return 'neutral'
}

function liveBits(sim: SimulationController, count = 18): Array<{ bit: number; index: number; state: string }> {
  const bits = sim.packet?.bits ?? [1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1]
  const active = sim.activeBit
  const start = active >= 0 ? Math.max(0, Math.min(bits.length - count, active - 5)) : 0
  return bits.slice(start, start + count).map((bit, offset) => {
    const index = start + offset
    const received = sim.recoveredBits[index]
    return {
      bit,
      index,
      state:
        index === active
          ? 'active'
          : received !== undefined
            ? received === bit
              ? 'decoded'
              : 'error'
            : 'pending',
    }
  })
}

function MiniBars({ active }: { active: boolean }) {
  const heights = [4, 9, 6, 15, 10, 19, 13, 8, 16, 11, 6, 13, 7, 4]
  return (
    <div className={cx('mini-bars', active && 'is-active')}>
      {heights.map((height, index) => (
        <span
          key={`${height}-${index}`}
          style={{ height: `${Math.max(3, height)}px`, animationDelay: `${index * 70}ms` }}
        />
      ))}
    </div>
  )
}

function TxNode({ sim }: { sim: SimulationController }) {
  const { phase } = sim
  const transmitting = phase === 'channel' || phase === 'modulating'
  const sealed = phase === 'idle'
  const bits = liveBits(sim, 15)
  const packetBits = sim.packet?.bits.length ?? 88
  const status =
    phase === 'framing'
      ? 'ENCAPSULATING'
      : phase === 'modulating'
        ? 'MODULATING'
        : phase === 'channel'
          ? 'RADIATING'
          : phase === 'idle'
            ? 'ISOLATED / READY'
            : phase === 'complete'
              ? 'TRANSMISSION SENT'
              : phase === 'failed'
                ? 'TRANSMISSION SENT'
                : 'AWAITING RECEIVER'

  return (
    <article className={cx('device-node', transmitting && 'is-transmitting')}>
      <div className="device-topline">
        <span className="device-id">TX / 01</span>
        <span className="device-isolation">
          <WifiOff size={11} />
          NO NETWORK
        </span>
      </div>
      <div className="device-name">AIR-GAPPED TRANSMITTER</div>

      <div className="device-frame">
        <div className="device-screen tx-screen">
          <div className="screen-scan" />
          <div className="screen-bar">
            <span>OUTBOUND</span>
            <span className={cx('screen-led', transmitting && 'is-on')} />
          </div>
          <div className="tx-payload">
            <span className="micro-label">PAYLOAD / UTF-8</span>
            <strong>{displayPayload(sim.config.payload || '—')}</strong>
          </div>
          <div className="tx-bit-stream">
            {bits.map((entry) => (
              <span
                key={entry.index}
                className={cx(
                  'micro-bit',
                  entry.state === 'active' && 'is-active',
                  entry.state === 'decoded' && 'is-read',
                )}
              >
                {formatBit(entry.bit)}
              </span>
            ))}
          </div>
          <div className="tx-screen-steps">
            <div className={cx('screen-step', phase !== 'idle' && 'is-live')}>
              <span>FRAME</span>
              <span>{sim.packet ? `${packetBits} bit` : '—'}</span>
            </div>
            <div className={cx('screen-step', (phase === 'modulating' || phase === 'channel') && 'is-live')}>
              <span>2-FSK</span>
              <span>{sim.config.f0 / 1000} / {sim.config.f1 / 1000} k</span>
            </div>
          </div>
          <div className="tx-wave">
            <span className="tx-wave-label">TX MOD</span>
            <MiniBars active={transmitting} />
          </div>
          <div className="device-screen-footer">
            <span>CRC {crcHex(sim.packet?.crcValue ?? 0)}</span>
            <span>{status}</span>
          </div>
        </div>

        <div className={cx('speaker-assembly', transmitting && 'is-firing')}>
          <div className="speaker-rings" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="speaker-body">
            <Speaker size={18} strokeWidth={1.5} />
          </div>
          <div className="speaker-caption">ACOUSTIC OUT</div>
        </div>

        <div className="device-grille" aria-hidden="true" />
        <div className="device-foot">
          <span><Cpu size={11} /> ISOLATED CORE</span>
          <span><Usb size={11} /> NO MEDIA</span>
        </div>
      </div>

      <div className="device-status-row">
        <span className={cx('status-dot', transmitting && 'is-pulsing')} />
        <span>{sealed ? 'READY / AIR-GAPPED' : status}</span>
        <Tag tone={phase === 'framing' ? 'amber' : phase === 'channel' ? 'cyan' : 'neutral'}>
          {phase === 'channel' ? `${sim.activeBit + 1}/${packetBits}` : 'TX'}
        </Tag>
      </div>
    </article>
  )
}

function RxNode({ sim }: { sim: SimulationController }) {
  const { phase, terminal } = sim
  const receiving = phase === 'channel' || phase === 'demodulating' || phase === 'verifying'
  const complete = terminal === 'complete'
  const failed = terminal === 'failed'
  const decoded = sim.run?.decodedText
  const rxBits = liveBits(sim, 15)
  const progress = sim.packet ? Math.min(100, (sim.recoveredCount / sim.packet.bits.length) * 100) : 0
  const status =
    phase === 'idle'
      ? 'LISTENING / QUIET'
      : phase === 'framing' || phase === 'modulating'
        ? 'SEARCHING SYNC'
        : phase === 'channel'
          ? 'FFT / DEMOD'
          : phase === 'demodulating'
            ? 'DEINTERLEAVING'
            : phase === 'verifying'
              ? 'CHECKING CRC'
              : complete
                ? 'PAYLOAD RECOVERED'
                : 'PACKET REJECTED'

  return (
    <article className={cx('device-node', receiving && 'is-receiving', failed && 'is-corrupt')}>
      <div className="device-topline">
        <span className="device-id">RX / 02</span>
        <span className="device-isolation">
          <WifiOff size={11} />
          NO NETWORK
        </span>
      </div>
      <div className="device-name">AIR-GAPPED RECEIVER</div>

      <div className="device-frame">
        <div className="mic-assembly">
          <div className="mic-rings" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="mic-body">
            <Mic size={18} strokeWidth={1.5} />
          </div>
          <div className="mic-caption">ACOUSTIC IN</div>
        </div>

        <div className="device-screen rx-screen">
          <div className="screen-scan" />
          <div className="screen-bar">
            <span>INBOUND</span>
            <span className={cx('screen-led', receiving && 'is-on', failed && 'is-error')} />
          </div>
          <div className={cx('rx-payload', complete && 'is-complete', failed && 'is-corrupt')}>
            <span className="micro-label">
              {complete ? 'RECOVERED PAYLOAD' : failed ? 'PAYLOAD REJECTED' : 'ACQUIRING FRAME'}
            </span>
            {complete ? (
              <strong>{displayPayload(decoded || sim.packet?.payload || '') || '∅'}</strong>
            ) : failed ? (
              <strong className="corrupt-text">CHECKSUM MISMATCH</strong>
            ) : (
              <div className="rx-acquire">
                <span className="acquire-line" />
                <span className="acquire-line short" />
                <span className="acquire-line micro" />
              </div>
            )}
          </div>
          <div className="rx-bit-stream">
            {rxBits.map((entry, index) => (
              <span
                key={`${entry.index}-${index}`}
                className={cx(
                  'micro-bit',
                  entry.state === 'active' && 'is-active',
                  entry.state === 'decoded' && 'is-read',
                  entry.state === 'error' && 'is-error',
                  entry.state === 'pending' && 'is-pending',
                )}
              >
                {entry.state === 'pending' || entry.state === 'active' ? '·' : formatBit(entry.bit)}
              </span>
            ))}
          </div>
          <div className="rx-progress">
            <div className="rx-progress-head">
              <span>FRAME CAPTURE</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="micro-progress">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="rx-signal-row">
            <MiniBars active={receiving} />
            <div>
              <span>SNR</span>
              <strong>{sim.snrDb.toFixed(1)} dB</strong>
            </div>
            <div>
              <span>FFT</span>
              <strong>4096 pt</strong>
            </div>
          </div>
          <div className="device-screen-footer">
            <span>RX CRC {crcHex(sim.run?.crcReceived ?? 0)}</span>
            <span>{status}</span>
          </div>
        </div>
        <div className="device-grille right" aria-hidden="true" />
        <div className="device-foot">
          <span><Cpu size={11} /> ISOLATED CORE</span>
          <span><Fingerprint size={11} /> CRC WATCH</span>
        </div>
      </div>

      <div className="device-status-row">
        <span
          className={cx(
            'status-dot',
            receiving && 'is-pulsing',
            failed && 'is-error',
            complete && 'is-valid',
          )}
        />
        <span>{complete ? 'VERIFIED / DELIVERED' : failed ? 'REJECTED / CORRUPT' : status}</span>
        <Tag tone={complete ? 'green' : failed ? 'red' : receiving ? 'cyan' : 'neutral'}>
          {complete ? 'OK' : failed ? 'ERR' : 'RX'}
        </Tag>
      </div>
    </article>
  )
}

function StageReadout({ sim }: { sim: SimulationController }) {
  const label =
    sim.phase === 'channel'
      ? 'CARRIER TRACK'
      : sim.phase === 'modulating'
        ? 'MODULATOR'
        : sim.phase === 'verifying' || sim.terminal !== 'idle'
          ? 'INTEGRITY'
          : 'LINK STATE'
  const value =
    sim.phase === 'channel'
      ? `${(sim.currentFrequency / 1000).toFixed(2)} kHz`
      : sim.phase === 'modulating'
        ? '2-FSK'
        : sim.terminal === 'complete'
          ? 'CRC VALID'
          : sim.terminal === 'failed'
            ? 'CRC FAILED'
            : 'ARMED'
  const tone = sim.terminal === 'complete' ? 'green' : sim.terminal === 'failed' ? 'red' : 'cyan'
  const payloadBytes = sim.packet?.payloadBytes.length ?? new TextEncoder().encode(sim.config.payload).length

  return (
    <div className="stage-readout">
      <div>
        <span>PAYLOAD</span>
        <strong>{payloadBytes} B</strong>
      </div>
      <div>
        <span>FRAME</span>
        <strong>{sim.packet?.bits.length ?? payloadBytes * 8 + 40} bit</strong>
      </div>
      <div>
        <span>MODULATION</span>
        <strong>2-FSK</strong>
      </div>
      <div>
        <span>SYMBOL</span>
        <strong>{sim.config.symbolMs.toFixed(1)} ms</strong>
      </div>
      <div className="stage-readout-emphasis">
        <span>{label}</span>
        <strong className={`tone-${tone}`}>{value}</strong>
      </div>
    </div>
  )
}

export function AirGapStage({
  sim,
  onExplain,
  onOpen3D,
  onHandshake,
}: {
  sim: SimulationController
  onExplain: () => void
  onOpen3D: () => void
  onHandshake: () => void
}) {
  const tone = phaseTone(sim.phase)
  const transmitActive = sim.phase === 'channel' || sim.phase === 'modulating'
  const bitFraction =
    sim.packet && sim.activeBit >= 0
      ? (sim.activeBit + 0.5) / Math.max(1, sim.packet.bits.length)
      : 0

  return (
    <section className="hero-panel">
      <PanelHeader
        index="01"
        eyebrow="AIR-GAP TOPOLOGY / FSK ACOUSTIC LINK"
        title="Sound as the only bridge"
        meta={
          <div className="head-meta-stack">
            <SimulatedBadge />
            <span className="meta-separator" />
            <span className="mono-meta">LINK / {sim.config.f0 / 1000}–{sim.config.f1 / 1000} kHz</span>
          </div>
        }
        onInfo={onExplain}
        actions={
          <div className="hero-actions">
            <button type="button" className="ghost-button compact" onClick={onOpen3D}>
              <Orbit size={13} />
              ORBIT 3D
            </button>
            <button type="button" className="ghost-button compact" onClick={onHandshake}>
              <Radio size={13} />
              HANDSHAKE
            </button>
          </div>
        }
      />

      <div className={cx('airgap-stage', transmitActive && 'is-live')}>
        <div className="stage-topline">
          <span><span className="coordinate">X:00.00</span> AIR-GAP BOUNDARY</span>
          <span className="channel-label">
            <Waves size={12} /> ACOUSTIC CHANNEL
          </span>
          <span>NO CONDUCTIVE PATH <span className="coordinate">X:INF</span></span>
        </div>

        <div className="stage-grid">
          <TxNode sim={sim} />

          <div className="airgap-channel-zone">
            <div className="airgap-center-label">
              <span className="gap-line" />
              <span className="gap-word">PHYSICAL AIR GAP</span>
              <span className="gap-line" />
            </div>
            <AirGapCanvas
              state={{
                phase: sim.phase,
                paused: sim.paused,
                noiseLevel: sim.config.noiseLevel,
                jammed: sim.config.jammer,
                jamStrength: sim.config.jamStrength,
                currentBit: sim.activeTxBit,
                activeBitFraction: bitFraction,
              }}
            />
            <div className="channel-float-top">
              <span className="channel-chip">
                <span className={cx('pulse-dot', transmitActive && 'is-on')} />
                {PHASE_LABEL[sim.phase]}
              </span>
              <span className="channel-coord">44.1 kS/s · FSK-2</span>
            </div>
            <div className="channel-float-bottom">
              <div className="channel-readout">
                <span><Speaker size={11} /> SPEAKER</span>
                <div className="channel-arrow">
                  <span className={cx('arrow-dash', transmitActive && 'is-flowing')} />
                  <AudioLines size={14} />
                </div>
                <span><Mic size={11} /> MICROPHONE</span>
              </div>
              <div className="channel-conditions">
                <span className={cx(sim.config.jammer && 'is-warning')}>
                  <ShieldAlert size={11} />
                  {sim.config.jammer ? `JAM ${sim.config.jamStrength}%` : 'CHANNEL CLEAR'}
                </span>
                <span>{sim.config.distance.toFixed(1)} m</span>
              </div>
            </div>
            <div className="airgap-scanline" aria-hidden="true" />
          </div>

          <RxNode sim={sim} />
        </div>

        <div className="stage-bottom">
          <StageReadout sim={sim} />
          <div className={cx('stage-status-cluster', `tone-${tone}`)}>
            <div className="stage-status-top">
              <span className="stage-status-kicker">PIPELINE STATE</span>
              <Tag tone={tone}>
                {sim.paused ? 'PAUSED' : sim.phase === 'idle' ? 'STANDBY' : PHASE_LABEL[sim.phase]}
              </Tag>
            </div>
            <div className="stage-status-main">
              <span className={cx('status-emblem', sim.phase === 'complete' && 'is-valid', sim.phase === 'failed' && 'is-error')}>
                {sim.phase === 'complete' ? (
                  <ShieldCheck size={19} />
                ) : sim.phase === 'failed' ? (
                  <ShieldAlert size={19} />
                ) : (
                  <Binary size={19} />
                )}
              </span>
              <div>
                <strong>
                  {sim.terminal === 'complete'
                    ? 'PAYLOAD RECOVERED'
                    : sim.terminal === 'failed'
                      ? 'PACKET REJECTED'
                      : sim.paused
                        ? 'SIMULATION FROZEN'
                        : 'NO NETWORK TRAFFIC'}
                </strong>
                <span>
                  {sim.terminal === 'complete'
                    ? `${sim.packet?.payloadBytes.length ?? 0} bytes · CRC ${crcHex(sim.run?.crcReceived ?? 0)}`
                    : sim.terminal === 'failed'
                      ? 'CRC mismatch — inspect corrupted symbols'
                      : `Link integrity ${sim.packet ? '94.2' : '100.0'}% · isolated by design`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-footnote">
        <span><Monitor size={11} /> Both endpoints are modelled as network-isolated.</span>
        <span>Visualization time scale is exaggerated for observation.</span>
        <span><ShieldCheck size={11} /> Authorised research only.</span>
      </div>
    </section>
  )
}
