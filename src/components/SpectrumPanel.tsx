import { useEffect, useRef } from 'react'
import { Activity, Crosshair, ScanLine } from 'lucide-react'
import type { SimulationController } from '../hooks/useSimulation'
import { PanelHeader, Tag, cx } from './ui'

interface SpectrumCanvasState {
  freqs: number[]
  db: number[]
  peakFrequency: number
  detectedBit: number
  f0: number
  f1: number
  sampleRate: number
  paused: boolean
  active: boolean
  jammed: boolean
}

function SpectrumCanvas({ state }: { state: SpectrumCanvasState }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef(state)
  const smoothRef = useRef<number[]>([])
  stateRef.current = state

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return undefined
    const context = canvas.getContext('2d')
    if (!context) return undefined
    let width = 580
    let height = 230
    let frame = 0
    let elapsed = 0
    let last = performance.now()

    const resize = () => {
      const rect = parent.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      width = Math.max(300, rect.width)
      height = Math.max(190, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(parent)
    resize()

    const render = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000)
      last = now
      const current = stateRef.current
      if (!current.paused) elapsed += dt
      const src = current.db.length ? current.db : new Array(260).fill(-80)
      if (smoothRef.current.length !== src.length) {
        smoothRef.current = src.slice()
      } else {
        for (let i = 0; i < src.length; i += 1) {
          smoothRef.current[i] += (src[i] - smoothRef.current[i]) * 0.18
        }
      }
      const values = smoothRef.current
      const fromHz = 16000
      const toHz = 24000
      const left = 43
      const right = width - 16
      const top = 26
      const bottom = height - 32
      const plotW = right - left
      const plotH = bottom - top
      const minDb = -82
      const maxDb = 2
      const xForHz = (hz: number) => left + ((hz - fromHz) / (toHz - fromHz)) * plotW
      const yForDb = (db: number) =>
        bottom - ((Math.max(minDb, Math.min(maxDb, db)) - minDb) / (maxDb - minDb)) * plotH

      context.clearRect(0, 0, width, height)
      context.fillStyle = 'rgba(4, 9, 15, 0.72)'
      context.fillRect(left, top, plotW, plotH)

      // Carrier zones.
      for (const [frequency, tone] of [
        [current.f0, 'rgba(143, 124, 255, 0.07)'],
        [current.f1, 'rgba(81, 234, 255, 0.075)'],
      ] as Array<[number, string]>) {
        const x = xForHz(frequency)
        const grad = context.createLinearGradient(x - 34, 0, x + 34, 0)
        grad.addColorStop(0, 'rgba(114, 200, 255, 0)')
        grad.addColorStop(0.5, tone)
        grad.addColorStop(1, 'rgba(114, 200, 255, 0)')
        context.fillStyle = grad
        context.fillRect(x - 34, top, 68, plotH)
      }

      // Grid.
      context.save()
      context.strokeStyle = 'rgba(121, 198, 219, 0.085)'
      context.lineWidth = 1
      context.setLineDash([2, 5])
      for (let f = 16000; f <= 24000; f += 1000) {
        const x = xForHz(f)
        context.beginPath()
        context.moveTo(x, top)
        context.lineTo(x, bottom)
        context.stroke()
      }
      for (let db = 0; db >= -80; db -= 20) {
        const y = yForDb(db)
        context.beginPath()
        context.moveTo(left, y)
        context.lineTo(right, y)
        context.stroke()
      }
      context.restore()

      // Horizontal reference ticks.
      context.save()
      context.font = '7px "JetBrains Mono", monospace'
      context.fillStyle = 'rgba(124, 182, 199, 0.45)'
      context.textAlign = 'right'
      for (let db = 0; db >= -80; db -= 20) {
        context.fillText(`${db}`, left - 6, yForDb(db) + 2)
      }
      context.textAlign = 'center'
      for (let f = 16000; f <= 24000; f += 2000) {
        context.fillText(`${f / 1000}`, xForHz(f), bottom + 14)
      }
      context.fillStyle = 'rgba(123, 178, 194, 0.32)'
      context.fillText('FREQUENCY / kHz', left + plotW / 2, bottom + 27)
      context.save()
      context.translate(12, top + plotH / 2)
      context.rotate(-Math.PI / 2)
      context.fillText('MAGNITUDE / dB', 0, 0)
      context.restore()
      context.restore()

      // Nyquist marker, when it falls in the display region.
      const nyquist = current.sampleRate / 2
      if (nyquist >= fromHz && nyquist <= toHz) {
        const x = xForHz(nyquist)
        context.save()
        context.strokeStyle = 'rgba(255, 188, 96, 0.4)'
        context.setLineDash([4, 4])
        context.beginPath()
        context.moveTo(x, top)
        context.lineTo(x, bottom)
        context.stroke()
        context.fillStyle = 'rgba(255, 193, 107, 0.64)'
        context.font = '7px "JetBrains Mono", monospace'
        context.textAlign = 'center'
        context.fillText(`NYQUIST ${(nyquist / 1000).toFixed(2)}k`, x, top - 8)
        context.restore()
      }

      // Spectrum area.
      const gradient = context.createLinearGradient(0, top, 0, bottom)
      gradient.addColorStop(0, 'rgba(98, 234, 255, 0.25)')
      gradient.addColorStop(0.55, 'rgba(88, 163, 255, 0.08)')
      gradient.addColorStop(1, 'rgba(97, 88, 255, 0)')
      const lineGradient = context.createLinearGradient(left, top, right, top)
      lineGradient.addColorStop(0, 'rgba(143, 128, 255, 0.7)')
      lineGradient.addColorStop(0.4, 'rgba(108, 238, 255, 0.94)')
      lineGradient.addColorStop(0.7, 'rgba(128, 241, 255, 0.94)')
      lineGradient.addColorStop(1, 'rgba(171, 142, 255, 0.75)')

      context.save()
      context.beginPath()
      for (let i = 0; i < values.length; i += 1) {
        const hz = fromHz + ((toHz - fromHz) * i) / Math.max(1, values.length - 1)
        const x = xForHz(hz)
        const shimmer =
          Math.sin(elapsed * 2.4 + i * 0.17) *
          (current.active ? 0.28 : 0.18) *
          (current.jammed ? 2.8 : 0.7)
        const y = yForDb(values[i] + shimmer)
        if (i === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      for (let i = values.length - 1; i >= 0; i -= 1) {
        const hz = fromHz + ((toHz - fromHz) * i) / Math.max(1, values.length - 1)
        context.lineTo(xForHz(hz), bottom)
      }
      context.closePath()
      context.fillStyle = gradient
      context.fill()
      context.restore()

      context.save()
      context.beginPath()
      for (let i = 0; i < values.length; i += 1) {
        const hz = fromHz + ((toHz - fromHz) * i) / Math.max(1, values.length - 1)
        const x = xForHz(hz)
        const y = yForDb(values[i] + Math.sin(elapsed * 2.4 + i * 0.17) * (current.jammed ? 1.8 : 0.4))
        if (i === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      context.strokeStyle = lineGradient
      context.lineWidth = 1.5
      context.shadowColor = 'rgba(93, 233, 255, 0.6)'
      context.shadowBlur = 7
      context.stroke()
      context.restore()

      // Carrier labels.
      context.save()
      context.font = '7px "JetBrains Mono", monospace'
      context.textAlign = 'center'
      const carrierData = [
        { f: current.f0, label: 'F0', color: 'rgba(175, 153, 255, 0.72)' },
        { f: current.f1, label: 'F1', color: 'rgba(126, 241, 255, 0.8)' },
      ]
      for (const carrier of carrierData) {
        const x = xForHz(carrier.f)
        context.fillStyle = carrier.color
        context.fillText(`${carrier.label} ${(carrier.f / 1000).toFixed(1)}k`, x, bottom - 6)
        context.strokeStyle = carrier.color.replace('0.72', '0.3').replace('0.8', '0.3')
        context.beginPath()
        context.moveTo(x, top)
        context.lineTo(x, top + 7)
        context.stroke()
      }
      context.restore()

      // Peak crosshair.
      const peakX = xForHz(current.peakFrequency)
      const peakIndex = Math.round(((current.peakFrequency - fromHz) / (toHz - fromHz)) * (values.length - 1))
      const peakDb = values[Math.max(0, Math.min(values.length - 1, peakIndex))] ?? 0
      const peakY = yForDb(peakDb)
      if (peakX >= left && peakX <= right) {
        context.save()
        const bloom = context.createRadialGradient(peakX, peakY, 1, peakX, peakY, 28)
        bloom.addColorStop(0, 'rgba(114, 247, 255, 0.32)')
        bloom.addColorStop(1, 'rgba(114, 247, 255, 0)')
        context.fillStyle = bloom
        context.fillRect(peakX - 30, peakY - 30, 60, 60)
        context.strokeStyle = 'rgba(115, 244, 255, 0.55)'
        context.setLineDash([2, 3])
        context.beginPath()
        context.moveTo(peakX, top)
        context.lineTo(peakX, bottom)
        context.stroke()
        context.setLineDash([])
        context.fillStyle = '#93f6ff'
        context.beginPath()
        context.arc(peakX, peakY, 2.8, 0, Math.PI * 2)
        context.fill()
        context.strokeStyle = 'rgba(171, 248, 255, 0.6)'
        context.beginPath()
        context.arc(peakX, peakY, 6 + ((elapsed * 14) % 9), 0, Math.PI * 2)
        context.stroke()
        context.fillStyle = 'rgba(163, 247, 255, 0.9)'
        context.font = '600 8px "JetBrains Mono", monospace'
        context.textAlign = 'left'
        context.fillText('PEAK', peakX + 7, peakY - 6)
        context.restore()
      }

      // Analyzer sweep line.
      const sweepX = left + (((elapsed * 0.11) % 1) * plotW)
      const sweepGradient = context.createLinearGradient(sweepX - 18, 0, sweepX + 18, 0)
      sweepGradient.addColorStop(0, 'rgba(102, 238, 255, 0)')
      sweepGradient.addColorStop(0.5, 'rgba(102, 238, 255, 0.055)')
      sweepGradient.addColorStop(1, 'rgba(102, 238, 255, 0)')
      context.fillStyle = sweepGradient
      context.fillRect(sweepX - 18, top, 36, plotH)

      // Central tiny readout.
      context.save()
      context.fillStyle = 'rgba(112, 179, 197, 0.42)'
      context.font = '7px "JetBrains Mono", monospace'
      context.textAlign = 'left'
      context.fillText('WINDOW / HANN · 4096 FFT · ZERO-PADDED', left, top - 9)
      context.fillStyle = 'rgba(111, 214, 235, 0.45)'
      context.textAlign = 'right'
      context.fillText(current.active ? 'ANALYSER / TRACKING' : 'ANALYSER / HOLD', right, top - 9)
      context.restore()

      frame = requestAnimationFrame(render)
    }

    frame = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" />
}

export function SpectrumPanel({ sim, onInfo }: { sim: SimulationController; onInfo: () => void }) {
  const spectrum = sim.currentFrame.spectrum
  const maxEnergy = Math.max(spectrum.energy0, spectrum.energy1, 1e-9)
  const active = sim.phase === 'channel' || sim.phase === 'demodulating'
  const resolution = sim.config.sampleRate / 4096

  return (
    <section className="panel spectrum-panel">
      <PanelHeader
        index="03"
        eyebrow="RECEIVER / FFT SPECTRAL ANALYSIS"
        title="Frequency domain"
        meta={<Tag tone="violet">FFT · 4096 PT</Tag>}
        onInfo={onInfo}
      />

      <div className="spectrum-canvas-wrap">
        <SpectrumCanvas
          state={{
            freqs: spectrum.freqs,
            db: spectrum.db,
            peakFrequency: spectrum.peakFrequency,
            detectedBit: spectrum.detectedBit,
            f0: sim.config.f0,
            f1: sim.config.f1,
            sampleRate: sim.config.sampleRate,
            paused: sim.paused,
            active,
            jammed: sim.config.jammer,
          }}
        />
        <div className="fft-hud">
          <span><ScanLine size={11} /> RX FFT</span>
          <span>{resolution.toFixed(2)} Hz / bin</span>
        </div>
      </div>

      <div className="fft-decision-row">
        <div>
          <span>DETECTED FREQUENCY</span>
          <strong>{(spectrum.peakFrequency / 1000).toFixed(2)} <em>kHz</em></strong>
        </div>
        <div>
          <span>EXPECTED</span>
          <strong>{(spectrum.txFrequency / 1000).toFixed(2)} <em>kHz</em></strong>
        </div>
        <div className="decision-cell">
          <span>DECISION</span>
          <strong className={spectrum.detectedBit === 1 ? 'tone-cyan' : 'tone-violet'}>
            BIT = {spectrum.detectedBit}
          </strong>
        </div>
        <div>
          <span>MARGIN</span>
          <strong>{spectrum.marginDb.toFixed(1)} <em>dB</em></strong>
        </div>
      </div>

      <div className="carrier-energy-grid">
        <div className={cx('carrier-energy', spectrum.detectedBit === 0 && 'is-selected')}>
          <div>
            <span className="legend-dot violet" />
            <span>FREQ 0 · 18.0 kHz</span>
            <strong>{spectrum.detectedBit === 0 ? 'DECODED' : 'LOW'}</strong>
          </div>
          <div className="energy-track">
            <span style={{ width: `${Math.max(3, (spectrum.energy0 / maxEnergy) * 100)}%` }} />
          </div>
          <small>{spectrum.energy0.toFixed(4)} rel. magnitude</small>
        </div>
        <div className={cx('carrier-energy', spectrum.detectedBit === 1 && 'is-selected')}>
          <div>
            <span className="legend-dot cyan" />
            <span>FREQ 1 · 20.0 kHz</span>
            <strong>{spectrum.detectedBit === 1 ? 'DECODED' : 'LOW'}</strong>
          </div>
          <div className="energy-track">
            <span style={{ width: `${Math.max(3, (spectrum.energy1 / maxEnergy) * 100)}%` }} />
          </div>
          <small>{spectrum.energy1.toFixed(4)} rel. magnitude</small>
        </div>
      </div>

      <div className="panel-footnote-row">
        <span><Activity size={11} /> Live values are derived from the current synthetic symbol.</span>
        <span><Crosshair size={11} /> Decision: argmax(E<sub>f0</sub>, E<sub>f1</sub>)</span>
      </div>
    </section>
  )
}
