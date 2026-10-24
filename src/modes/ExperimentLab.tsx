import { useEffect, useId, useMemo, useState } from 'react'
import {
  Activity,
  BadgeInfo,
  ChevronRight,
  CircleAlert,
  Cpu,
  Crosshair,
  Gauge,
  LoaderCircle,
  Play,
  Radio,
  RefreshCcw,
  SlidersHorizontal,
  Sparkles,
  Timer,
  TriangleAlert,
  Waves,
} from 'lucide-react'
import type { SimulationController } from '../hooks/useSimulation'
import { runSweep } from '../lib/sim'
import type { SweepResult } from '../lib/types'
import { RangeControl, SectionIntro, SimulatedBadge, ToggleControl, Tag, cx } from '../components/ui'

interface LineChartProps {
  title: string
  subtitle: string
  data: Array<{ x: number; y: number }>
  color: string
  format: (value: number) => string
  currentX?: number
  log?: boolean
  compact?: boolean
  icon?: typeof Activity
  ySuffix?: string
  threshold?: number
}

function LineChart({
  title,
  subtitle,
  data,
  color,
  format,
  currentX = 24,
  log = false,
  compact = false,
  icon: Icon = Activity,
  threshold,
}: LineChartProps) {
  const gradientId = useId().replace(/:/g, '')
  const width = compact ? 360 : 700
  const height = compact ? 168 : 268
  const padding = compact
    ? { left: 44, right: 14, top: 18, bottom: 26 }
    : { left: 56, right: 22, top: 30, bottom: 38 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom
  const xMin = -10
  const xMax = 30
  const values = data.map((item) => item.y)
  const floor = 0.0001
  const maxValue = Math.max(...values, 0.001)
  const yMin = log ? floor : 0
  const yMax = log ? Math.max(0.5, maxValue * 1.25) : Math.max(1, maxValue * 1.18)

  const mapX = (value: number) =>
    padding.left + ((value - xMin) / (xMax - xMin)) * plotW
  const mapY = (value: number) => {
    const safe = log ? Math.max(floor, value) : Math.max(0, value)
    const ratio = log
      ? (Math.log10(safe) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin))
      : safe / yMax
    return padding.top + plotH - Math.max(0, Math.min(1, ratio)) * plotH
  }

  const path = data
    .map((item, index) => `${index === 0 ? 'M' : 'L'} ${mapX(item.x).toFixed(2)} ${mapY(item.y).toFixed(2)}`)
    .join(' ')
  const area = `${path} L ${mapX(data[data.length - 1]?.x ?? 30)} ${padding.top + plotH} L ${mapX(data[0]?.x ?? -10)} ${padding.top + plotH} Z`
  const yTicks = log
    ? [0.0001, 0.001, 0.01, 0.1, 0.5].filter((tick) => tick <= yMax)
    : [0, 0.25, 0.5, 0.75, 1].map((fraction) => yMax * fraction)
  const xTicks = [-10, 0, 10, 20, 30]

  return (
    <article className={cx('chart-card', compact && 'is-compact')}>
      <div className="chart-head">
        <div className="chart-title-group">
          <span className="chart-icon" style={{ color }}>
            <Icon size={compact ? 13 : 15} />
          </span>
          <div>
            <h3>{title}</h3>
            <span>{subtitle}</span>
          </div>
        </div>
        {!compact && (
          <span className="chart-sim-label">
            <span /> MODEL SWEEP
          </span>
        )}
      </div>
      <div className="chart-canvas">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} chart`}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={mapY(tick)}
                y2={mapY(tick)}
                className="chart-grid-line"
              />
              <text
                x={padding.left - 8}
                y={mapY(tick) + 3}
                textAnchor="end"
                className="chart-axis-label"
              >
                {format(tick)}
              </text>
            </g>
          ))}
          {xTicks.map((tick) => (
            <g key={`x-${tick}`}>
              <line
                x1={mapX(tick)}
                x2={mapX(tick)}
                y1={padding.top}
                y2={padding.top + plotH}
                className="chart-grid-line vertical"
              />
              <text
                x={mapX(tick)}
                y={height - 14}
                textAnchor="middle"
                className="chart-axis-label"
              >
                {tick > 0 ? `+${tick}` : tick}
              </text>
            </g>
          ))}

          {threshold !== undefined && (
            <g>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={mapY(threshold)}
                y2={mapY(threshold)}
                className="chart-threshold"
              />
              <text x={padding.left + 6} y={mapY(threshold) - 5} className="chart-threshold-label">
                NOMINAL THRESHOLD
              </text>
            </g>
          )}

          <line
            x1={mapX(currentX)}
            x2={mapX(currentX)}
            y1={padding.top}
            y2={padding.top + plotH}
            className="chart-current-marker"
          />
          <text
            x={mapX(currentX) + 5}
            y={padding.top + 10}
            className="chart-current-label"
          >
            CURRENT / {currentX > 0 ? '+' : ''}{currentX} dB
          </text>

          <path d={area} fill={`url(#${gradientId})`} />
          <path d={path} fill="none" stroke={color} strokeWidth={compact ? 1.5 : 2} className="chart-line" />
          {data.map((item) => (
            <g key={`${item.x}-${item.y}`}>
              <circle
                cx={mapX(item.x)}
                cy={mapY(item.y)}
                r={compact ? 2.1 : 3}
                fill="#050b11"
                stroke={color}
                strokeWidth={1.4}
              >
                <title>{`SNR ${item.x} dB → ${format(item.y)}`}</title>
              </circle>
            </g>
          ))}
          <text
            x={padding.left + plotW / 2}
            y={height - 1}
            textAnchor="middle"
            className="chart-axis-label chart-axis-title"
          >
            SNR / dB
          </text>
          {log && (
            <text
              x={10}
              y={padding.top + plotH / 2}
              transform={`rotate(-90 10 ${padding.top + plotH / 2})`}
              textAnchor="middle"
              className="chart-axis-label chart-axis-title"
            >
              {title.includes('PER') ? 'PACKET ERROR RATE / %' : 'BIT ERROR RATE / %'}
            </text>
          )}
        </svg>
      </div>
    </article>
  )
}

function MiniChart({
  title,
  data,
  color,
  suffix,
  icon,
  format,
}: {
  title: string
  data: Array<{ x: number; y: number }>
  color: string
  suffix: string
  icon: typeof Activity
  format: (value: number) => string
}) {
  return (
    <LineChart
      title={title}
      subtitle={`vs SNR · ${suffix}`}
      data={data}
      color={color}
      format={format}
      log={false}
      compact
      icon={icon}
      currentX={24}
    />
  )
}

export function ExperimentLab({ sim, onInfo }: { sim: SimulationController; onInfo: () => void }) {
  const [sweep, setSweep] = useState<SweepResult | null>(null)
  const [computing, setComputing] = useState(false)
  const [lastRunAt, setLastRunAt] = useState<number | null>(null)

  const generate = () => {
    setComputing(true)
    window.setTimeout(() => {
      const result = runSweep(sim.config)
      setSweep(result)
      setLastRunAt(result.generatedAt)
      setComputing(false)
    }, 120)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = runSweep(sim.config)
      setSweep(result)
      setLastRunAt(result.generatedAt)
    }, 400)
    return () => window.clearTimeout(timer)
    // Initial sweep only; further sweeps are explicit to keep interaction fast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nyquist = sim.config.sampleRate / 2
  const invalidNyquist = sim.config.f1 >= nyquist
  const f0KHz = sim.config.f0 / 1000
  const f1KHz = sim.config.f1 / 1000
  const currentSnr = Math.round(sim.config.snrDb)

  const chartData = useMemo(() => {
    if (!sweep) return null
    return {
      ber: sweep.points.map((point) => ({ x: point.snr, y: point.ber })),
      per: sweep.points.map((point) => ({ x: point.snr, y: point.per })),
      throughput: sweep.points.map((point) => ({ x: point.snr, y: point.throughput })),
      latency: sweep.points.map((point) => ({ x: point.snr, y: point.latency })),
      margin: sweep.points.map((point) => ({ x: point.snr, y: point.fftMargin })),
      sync: sweep.points.map((point) => ({ x: point.snr, y: point.syncStability * 100 })),
    }
  }, [sweep])

  const lowPoint = sweep?.points[0]
  const highPoint = sweep?.points[sweep.points.length - 1]
  const crossedPoint = sweep?.points.find((point) => point.per >= 0.5)
  const percent = (value: number) => `${(value * 100).toFixed(value === 0 ? 0 : 2)}%`

  return (
    <div className="mode-page experiment-page">
      <SectionIntro
        kicker="03 / EXPERIMENTAL MODEL SWEEP"
        title={<>Experiment lab</>}
        description="Vary the physical and channel parameters, then generate a simulated BER/PER sweep. Every point is produced by synthesising FSK symbols, adding modelled channel effects and decoding with the same FFT path used in the live link."
        right={
          <div className="intro-status-panel">
            <SimulatedBadge label="SIMULATION ONLY" />
            <span>NOT EMPIRICAL PAPER DATA</span>
            <button className="ghost-button" type="button" onClick={onInfo}>
              <BadgeInfo size={13} /> METHOD
            </button>
          </div>
        }
      />

      {invalidNyquist && (
        <div className="lab-warning">
          <TriangleAlert size={15} />
          <div>
            <strong>Negative-frequency / aliasing condition</strong>
            <span>
              FREQ 1 is above the Nyquist limit for {(sim.config.sampleRate / 1000).toFixed(1)} kHz sampling.
              Raise the sample rate or lower the carriers before running the link.
            </span>
          </div>
        </div>
      )}

      <div className="experiment-layout">
        <aside className="experiment-controls">
          <div className="panel controls-panel">
            <div className="panel-head simple">
              <div className="panel-title-group">
                <div className="panel-eyebrow">VARIABLES / LAB CONTROL</div>
                <h2>Model parameters</h2>
              </div>
              <SlidersHorizontal size={15} />
            </div>

            <div className="control-group">
              <div className="subhead-row"><span>CARRIER PAIR</span><Tag tone="cyan">FSK-2</Tag></div>
              <RangeControl
                label="Frequency 0 / logical 0"
                value={f0KHz}
                min={16}
                max={21.5}
                step={0.1}
                format={(value) => `${value.toFixed(1)} kHz`}
                onChange={(value) => sim.updateConfig({ f0: Math.round(value * 1000) })}
                accent="violet"
              />
              <RangeControl
                label="Frequency 1 / logical 1"
                value={f1KHz}
                min={16.5}
                max={22}
                step={0.1}
                format={(value) => `${value.toFixed(1)} kHz`}
                onChange={(value) => sim.updateConfig({ f1: Math.round(value * 1000) })}
                accent="cyan"
              />
              <div className="nyquist-line">
                <span>NYQUIST / {(nyquist / 1000).toFixed(2)} kHz</span>
                <span className={invalidNyquist ? 'tone-red' : 'tone-green'}>
                  {invalidNyquist ? 'CARRIER OUT OF RANGE' : 'CARRIER BELOW LIMIT'}
                </span>
              </div>
            </div>

            <div className="control-group">
              <div className="subhead-row"><span>SAMPLE / TIMING</span></div>
              <div className="segmented-control sample-rate-control">
                {[32000, 44100, 48000].map((rate) => (
                  <button
                    type="button"
                    key={rate}
                    className={sim.config.sampleRate === rate ? 'is-active' : ''}
                    onClick={() => sim.updateConfig({ sampleRate: rate })}
                  >
                    {(rate / 1000).toFixed(1)}k
                  </button>
                ))}
              </div>
              <div className="sample-rate-hint">
                Nyquist = {((sim.config.sampleRate / 2) / 1000).toFixed(2)} kHz
              </div>
              <RangeControl
                label="Symbol duration"
                value={sim.config.symbolMs}
                min={4}
                max={50}
                step={0.5}
                format={(value) => `${value.toFixed(1)} ms`}
                onChange={(value) => sim.updateConfig({ symbolMs: value })}
                accent="cyan"
              />
              <RangeControl
                label="Target SNR"
                value={sim.config.snrDb}
                min={-10}
                max={30}
                format={(value) => `${value > 0 ? '+' : ''}${value.toFixed(0)} dB`}
                onChange={(value) => sim.updateConfig({ snrDb: value })}
                accent="green"
              />
              <RangeControl
                label="Ambient noise"
                value={sim.config.noiseLevel}
                min={0}
                max={100}
                format={(value) => `${value}%`}
                onChange={(value) => sim.updateConfig({ noiseLevel: value })}
                accent="amber"
              />
            </div>

            <div className="control-group">
              <div className="subhead-row"><span>PROPAGATION</span></div>
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
                label="Room reflections"
                value={sim.config.reflections}
                min={0}
                max={100}
                format={(value) => `${value}%`}
                onChange={(value) => sim.updateConfig({ reflections: value, distortion: Math.max(sim.config.distortion, Math.round(value * 0.4)) })}
                accent="violet"
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

            <div className="control-group">
              <div className="subhead-row"><span>JAMMER</span><Tag tone={sim.config.jammer ? 'red' : 'neutral'}>{sim.config.jammer ? 'ACTIVE' : 'OFF'}</Tag></div>
              <ToggleControl
                label="Controlled jamming"
                detail="Permitted laboratory model only"
                checked={sim.config.jammer}
                onChange={(checked) =>
                  sim.updateConfig({
                    jammer: checked,
                    jamStrength: checked && sim.config.jamStrength === 0 ? 70 : sim.config.jamStrength,
                  })
                }
              />
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
            </div>

            <div className="control-group">
              <div className="subhead-row"><span>HARDWARE RESPONSE</span><Cpu size={12} /></div>
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
                detail="Boosts signal and noise together"
                checked={sim.config.agc}
                onChange={(checked) => sim.updateConfig({ agc: checked })}
              />
              <ToggleControl
                label="OS audio processing"
                detail="Modelled compression / nonlinearity"
                checked={sim.config.processing}
                onChange={(checked) => sim.updateConfig({ processing: checked })}
              />
            </div>

            <button className="run-sweep-button" type="button" onClick={generate} disabled={computing || invalidNyquist}>
              {computing ? <LoaderCircle size={16} className="spin" /> : <RefreshCcw size={16} />}
              <span>{computing ? 'COMPUTING MODEL…' : 'RUN MODEL SWEEP'}</span>
              <ChevronRight size={15} />
            </button>
            <p className="controls-note">
              Sweep uses the current model configuration except SNR, which is varied from −10 to +30 dB.
            </p>
          </div>

          <div className="panel experiment-note-panel">
            <div className="panel-eyebrow">SCIENTIFIC BOUNDARY</div>
            <p>
              This is a synthetic experiment. It does not reproduce measured results from the supplied paper.
              The architecture paper describes a plan; this lab reports only what its own model generates.
            </p>
            <div className="note-chip-row">
              <Tag tone="amber">SIMULATED</Tag>
              <Tag tone="amber">USER-CONFIGURED</Tag>
              <Tag tone="neutral">ILLUSTRATIVE</Tag>
            </div>
          </div>
        </aside>

        <div className="experiment-results">
          <div className="results-toolbar">
            <div>
              <span className="rail-kicker">MODEL OUTPUT / MONTE CARLO</span>
              <h2>BER &amp; PER response</h2>
            </div>
            <div className="results-toolbar-stats">
              {lastRunAt && (
                <span>
                  GENERATED {new Date(lastRunAt).toISOString().slice(11, 19)} UTC
                </span>
              )}
              <button type="button" className="ghost-button compact" onClick={onInfo}>
                <BadgeInfo size={12} /> METHOD
              </button>
            </div>
          </div>

          {chartData && sweep ? (
            <>
              <div className="primary-charts">
                <LineChart
                  title="Bit error rate"
                  subtitle="Monte Carlo model · 4 packets per SNR point"
                  data={chartData.ber}
                  color="#64e7ff"
                  format={percent}
                  currentX={currentSnr}
                  log
                  icon={Activity}
                />
                <LineChart
                  title="Packet error rate"
                  subtitle="CRC-gated frame failures · simulated"
                  data={chartData.per}
                  color="#ffbd6b"
                  format={percent}
                  currentX={currentSnr}
                  log
                  threshold={0.5}
                  icon={TriangleAlert}
                />
              </div>

              <div className="chart-summary-row">
                <div className="summary-cell">
                  <span>LOW-SNR EDGE</span>
                  <strong>{lowPoint ? percent(lowPoint.ber) : '—'}</strong>
                  <small>BER at −10 dB</small>
                </div>
                <div className="summary-cell">
                  <span>HIGH-SNR EDGE</span>
                  <strong>{highPoint ? percent(highPoint.ber) : '—'}</strong>
                  <small>BER at +30 dB</small>
                </div>
                <div className="summary-cell">
                  <span>50% PER CROSSING</span>
                  <strong>{crossedPoint ? `${crossedPoint.snr} dB` : 'outside sweep'}</strong>
                  <small>Modeled waterfall point</small>
                </div>
                <div className="summary-cell">
                  <span>FFT RESOLUTION</span>
                  <strong>{(sim.config.sampleRate / 2048).toFixed(2)} Hz</strong>
                  <small>For sweep trials</small>
                </div>
              </div>

              <div className="secondary-chart-grid">
                <MiniChart
                  title="GOODPUT"
                  data={chartData.throughput}
                  color="#58f0a7"
                  suffix="bit/s"
                  icon={Radio}
                  format={(value) => value.toFixed(1)}
                />
                <MiniChart
                  title="DETECTION LATENCY"
                  data={chartData.latency}
                  color="#ad9cff"
                  suffix="ms"
                  icon={Timer}
                  format={(value) => `${value.toFixed(1)}`}
                />
                <MiniChart
                  title="FFT PEAK MARGIN"
                  data={chartData.margin}
                  color="#66e7ff"
                  suffix="dB"
                  icon={Crosshair}
                  format={(value) => `${value.toFixed(1)}`}
                />
                <MiniChart
                  title="SYNC STABILITY"
                  data={chartData.sync}
                  color="#ffc36a"
                  suffix="%"
                  icon={Gauge}
                  format={(value) => `${value.toFixed(0)}`}
                />
              </div>

              <div className="experiment-observation-grid">
                <div className="observation-card">
                  <div className="obs-icon"><Waves size={17} /></div>
                  <div>
                    <span className="rail-kicker">MODEL OBSERVATION</span>
                    <strong>
                      {lowPoint && highPoint && lowPoint.ber > highPoint.ber
                        ? 'Error rate falls as SNR rises'
                        : 'Current configuration is limiting the link'}
                    </strong>
                    <p>
                      At −10 dB the synthetic receiver reports {lowPoint ? percent(lowPoint.ber) : '—'} BER and{' '}
                      {lowPoint ? percent(lowPoint.per) : '—'} PER, versus {highPoint ? percent(highPoint.ber) : '—'} BER at +30 dB.
                      These values are produced only by this simulator.
                    </p>
                  </div>
                </div>
                <div className="observation-card">
                  <div className="obs-icon warning"><CircleAlert size={17} /></div>
                  <div>
                    <span className="rail-kicker">INTERPRETATION CAUTION</span>
                    <strong>Model ≠ real-room performance</strong>
                    <p>
                      Real speaker roll-off, microphone placement, OS filters and reflections are not calibrated here.
                      The 18–21 kHz band is near-ultrasonic/high-frequency audio and is not guaranteed inaudible.
                    </p>
                  </div>
                </div>
              </div>

              <div className="experiment-method-strip">
                <span><Sparkles size={12} /> every point synthesises FSK, adds channel effects, runs a windowed FFT and checks CRC</span>
                <span><Play size={12} /> sweep config: {sweep.f0 / 1000} / {sweep.f1 / 1000} kHz · {(sweep.sampleRate / 1000).toFixed(1)} kS/s</span>
              </div>
            </>
          ) : (
            <div className="loading-sweep">
              <LoaderCircle size={26} className="spin" />
              <strong>Computing modelled sweep…</strong>
              <span>Synthesising symbols and running FFT detection</span>
            </div>
          )}

          <div className="results-disclaimer">
            <TriangleAlert size={13} />
            <span>
              <strong>Simulation, not evidence.</strong> All curves are generated in your browser from the current
              parameter set. The supplied paper contains no experimental results; no values here should be cited as
              measured architecture performance.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
