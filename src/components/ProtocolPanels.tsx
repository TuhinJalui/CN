import {
  ArrowDown,
  AudioWaveform,
  Binary,
  ChartNoAxesColumnIncreasing,
  Check,
  FileText,
  Layers3,
  MonitorCheck,
  Radio,
  ScanLine,
  ShieldCheck,
  Speaker,
  Waves,
} from 'lucide-react'
import type { SimulationController } from '../hooks/useSimulation'
import type { RunPhase } from '../lib/types'
import { PanelHeader, Tag, cx } from './ui'

const LAYERS = [
  {
    id: 'L4',
    name: 'APPLICATION',
    icon: FileText,
    description: 'Payload / message',
    transform: 'TEXT → UTF-8 BYTES',
    active: ['framing'],
  },
  {
    id: 'L3',
    name: 'DATA-LINK',
    icon: Layers3,
    description: 'Packet framing + CRC',
    transform: 'PREAMBLE + LEN + DATA + CRC',
    active: ['framing', 'modulating', 'verifying'],
  },
  {
    id: 'L2',
    name: 'PHYSICAL SIGNAL',
    icon: AudioWaveform,
    description: 'Binary FSK modulation',
    transform: 'BIT 0/1 → CARRIER FREQUENCY',
    active: ['modulating', 'channel', 'demodulating'],
  },
  {
    id: 'L1',
    name: 'HARDWARE / ACOUSTIC I/O',
    icon: Speaker,
    description: 'Speaker → air → microphone',
    transform: 'DAC → AIR → ADC',
    active: ['channel', 'complete', 'failed'],
  },
]

function activeLayer(phase: RunPhase): number {
  if (phase === 'framing') return 1
  if (phase === 'modulating') return 2
  if (phase === 'channel') return 3
  if (phase === 'demodulating') return 2
  if (phase === 'verifying') return 1
  if (phase === 'complete' || phase === 'failed') return 0
  return -1
}

export function ProtocolStack({ sim, onInfo }: { sim: SimulationController; onInfo: () => void }) {
  const activeIndex = activeLayer(sim.phase)
  const transmitting = sim.phase !== 'idle'
  return (
    <section className="panel protocol-panel">
      <PanelHeader
        index="06"
        eyebrow="ARCHITECTURE / FOUR-LAYER STACK"
        title="Message to pressure wave"
        meta={<Tag tone="cyan">LAYERED MODEL</Tag>}
        onInfo={onInfo}
      />

      <div className={cx('protocol-stack', transmitting && 'is-running')}>
        <div className="protocol-spine" aria-hidden="true">
          <div className="spine-flow" />
          <ArrowDown size={13} className="spine-arrow" />
        </div>
        {LAYERS.map((layer, index) => {
          const Icon = layer.icon
          const active = activeIndex === index
          const complete =
            sim.phase === 'complete' ||
            (sim.phase === 'framing' && index < 1) ||
            (sim.phase === 'modulating' && index < 2) ||
            (sim.phase === 'channel' && index < 3) ||
            (sim.phase === 'verifying' && index < 1)
          const failed = sim.phase === 'failed' && index < 2
          return (
            <div
              key={layer.id}
              className={cx(
                'protocol-layer',
                active && 'is-active',
                complete && 'is-complete',
                failed && 'is-error',
              )}
            >
              <div className="layer-id">{layer.id}</div>
              <div className="layer-icon"><Icon size={17} /></div>
              <div className="layer-copy">
                <div className="layer-name">
                  <span>LAYER {4 - index} — {layer.name}</span>
                  <span className={cx('layer-state', active && 'is-active', complete && 'is-complete')}>
                    {active ? 'PROCESSING' : complete ? 'PASSED' : 'STANDBY'}
                  </span>
                </div>
                <div className="layer-description">{layer.description}</div>
                <div className="layer-transform">
                  <span>{layer.transform}</span>
                  <span className="transform-code">
                    {index === 0 && '48 45 4C 4C 4F'}
                    {index === 1 && 'AA AA | LEN | … | CRC'}
                    {index === 2 && '12.5 ms / SYMBOL'}
                    {index === 3 && '18k / 20k · PRESSURE'}
                  </span>
                </div>
              </div>
              <div className="layer-rail" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
          )
        })}
      </div>

      <div className="protocol-foot">
        <span><Waves size={11} /> The layering is a conceptual mapping of the supplied architecture.</span>
        <span><ShieldCheck size={11} /> No network transport is involved.</span>
      </div>
    </section>
  )
}

const FLOW_STAGES = [
  { id: 'payload', label: 'PAYLOAD', detail: 'ASCII', icon: FileText },
  { id: 'binary', label: 'BINARY', detail: 'UTF-8', icon: Binary },
  { id: 'frame', label: 'FRAME', detail: 'PKT', icon: Layers3 },
  { id: 'crc', label: 'CRC', detail: '0x1021', icon: ShieldCheck },
  { id: 'fsk', label: 'FSK', detail: '2-TONE', icon: AudioWaveform },
  { id: 'acoustic', label: 'ACOUSTIC', detail: 'AIR', icon: Radio },
  { id: 'fft', label: 'FFT', detail: 'SPECTRUM', icon: ChartNoAxesColumnIncreasing },
  { id: 'demod', label: 'DEMOD', detail: 'BITS', icon: ScanLine },
  { id: 'verify', label: 'VERIFY', detail: 'CRC-16', icon: ShieldCheck },
  { id: 'recovered', label: 'RECOVERED', detail: 'DATA', icon: MonitorCheck },
]

function flowProgress(sim: SimulationController): number {
  if (sim.phase === 'idle') return -1
  if (sim.phase === 'framing') return 2.2
  if (sim.phase === 'modulating') return 4.2
  if (sim.phase === 'channel') {
    const fraction = sim.packet ? (sim.activeBit + 1) / Math.max(1, sim.packet.bits.length) : 0
    return 4.5 + fraction * 3.5
  }
  if (sim.phase === 'demodulating') return 7.8
  if (sim.phase === 'verifying') return 8.7
  if (sim.phase === 'complete') return 9
  if (sim.phase === 'failed') return 8
  return -1
}

export function DataFlowPanel({ sim, onInfo }: { sim: SimulationController; onInfo: () => void }) {
  const progress = flowProgress(sim)
  const failed = sim.phase === 'failed'
  return (
    <section className="panel dataflow-panel">
      <PanelHeader
        index="07"
        eyebrow="END-TO-END / INFORMATION TRANSFORMATIONS"
        title="Data flow"
        meta={
          <Tag tone={failed ? 'red' : sim.phase === 'complete' ? 'green' : 'neutral'}>
            {failed ? 'REJECTED' : sim.phase === 'complete' ? 'RECOVERED' : sim.phase === 'idle' ? 'STANDBY' : 'IN TRANSIT'}
          </Tag>
        }
        onInfo={onInfo}
      />

      <div className={cx('dataflow-track', sim.running && 'is-running', failed && 'is-failed')}>
        <div className="dataflow-line" aria-hidden="true">
          <span
            className="dataflow-fill"
            style={{ width: `${Math.max(0, Math.min(100, (progress / (FLOW_STAGES.length - 1)) * 100))}%` }}
          />
          <span
            className="dataflow-pulse"
            style={{ left: `${Math.max(0, Math.min(100, (progress / (FLOW_STAGES.length - 1)) * 100))}%` }}
          />
        </div>
        <div className="dataflow-stages">
          {FLOW_STAGES.map((stage, index) => {
            const Icon = stage.icon
            const active = progress >= index - 0.55 && progress <= index + 0.55
            const done = progress >= index + 0.55 || sim.phase === 'complete'
            return (
              <div
                key={stage.id}
                className={cx(
                  'flow-stage',
                  active && 'is-active',
                  done && 'is-done',
                  failed && index === 8 && 'is-error',
                )}
              >
                <div className="flow-node">
                  {done && !(failed && index === 8) ? <Check size={12} className="flow-check" /> : <Icon size={15} />}
                </div>
                <span className="flow-label">{stage.label}</span>
                <span className="flow-detail">{failed && index === 8 ? 'MISMATCH' : stage.detail}</span>
                <span className="flow-index">0{index + 1}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="dataflow-legend">
        <span><span className="legend-dot cyan" /> active stage</span>
        <span><span className="legend-dot green" /> complete</span>
        <span className="dataflow-caption">
          {sim.phase === 'channel'
            ? `symbol ${sim.activeBit + 1} / ${sim.packet?.bits.length ?? 0} · receiver reconstructing in real time`
            : failed
              ? 'CRC mismatch: integrity gate rejected the recovered frame'
              : 'each stage transforms the same information without a network path'}
        </span>
      </div>
    </section>
  )
}
