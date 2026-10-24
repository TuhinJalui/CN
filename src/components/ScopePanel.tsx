import { useEffect, useRef } from 'react'
import { Activity, Crosshair, SlidersHorizontal } from 'lucide-react'
import type { SimulationController } from '../hooks/useSimulation'
import { PanelHeader, Tag, cx } from './ui'

interface ScopeState {
  samples: number[]
  clean: number[]
  paused: boolean
  active: boolean
  jammed: boolean
  jamStrength: number
  symbolMs: number
  frequency: number
}

function ScopeCanvas({ state }: { state: ScopeState }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return undefined
    const context = canvas.getContext('2d')
    if (!context) return undefined
    let width = 400
    let height = 210
    let frame = 0
    let elapsed = 0
    let lastTime = performance.now()

    const resize = () => {
      const rect = parent.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      width = Math.max(300, rect.width)
      height = Math.max(165, rect.height)
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
      const dt = Math.min(0.04, (now - lastTime) / 1000)
      lastTime = now
      const current = stateRef.current
      if (!current.paused) elapsed += dt
      const left = 29
      const right = width - 10
      const top = 14
      const bottom = height - 23
      const plotW = right - left
      const plotH = bottom - top
      const center = top + plotH / 2
      const samples = current.samples.length ? current.samples : [0]
      const clean = current.clean.length ? current.clean : samples

      context.clearRect(0, 0, width, height)
      context.fillStyle = 'rgba(3, 8, 13, 0.75)'
      context.fillRect(left, top, plotW, plotH)

      // Graticule.
      context.save()
      context.strokeStyle = 'rgba(139, 205, 222, 0.075)'
      context.lineWidth = 1
      for (let i = 0; i <= 10; i += 1) {
        const x = left + (plotW * i) / 10
        context.beginPath()
        context.moveTo(x, top)
        context.lineTo(x, bottom)
        context.stroke()
      }
      for (let i = 0; i <= 6; i += 1) {
        const y = top + (plotH * i) / 6
        context.beginPath()
        context.moveTo(left, y)
        context.lineTo(right, y)
        context.stroke()
      }
      context.setLineDash([3, 6])
      context.strokeStyle = 'rgba(108, 209, 232, 0.2)'
      context.beginPath()
      context.moveTo(left, center)
      context.lineTo(right, center)
      context.stroke()
      context.restore()

      // Axis labels.
      context.save()
      context.fillStyle = 'rgba(119, 181, 197, 0.4)'
      context.font = '7px "JetBrains Mono", monospace'
      context.textAlign = 'right'
      context.fillText('+1', left - 5, top + 5)
      context.fillText('0', left - 5, center + 2)
      context.fillText('−1', left - 5, bottom - 1)
      context.fillStyle = 'rgba(119, 181, 197, 0.34)'
      context.textAlign = 'right'
      context.fillText('A / NORM', left - 4, top - 5)
      context.textAlign = 'left'
      context.fillText(`T / ${current.symbolMs.toFixed(1)} ms`, left, bottom + 14)
      context.textAlign = 'right'
      context.fillText('RX / CH1', right, bottom + 14)
      context.restore()

      // Jamming haze.
      if (current.jammed) {
        const haze = context.createLinearGradient(0, top, 0, bottom)
        haze.addColorStop(0, 'rgba(255, 96, 109, 0.02)')
        haze.addColorStop(0.5, `rgba(255, 96, 109, ${0.03 + current.jamStrength * 0.0004})`)
        haze.addColorStop(1, 'rgba(255, 96, 109, 0.02)')
        context.fillStyle = haze
        context.fillRect(left, top, plotW, plotH)
      }

      // Clean modem reference trace.
      context.save()
      context.beginPath()
      for (let i = 0; i < clean.length; i += 1) {
        const x = left + (i / Math.max(1, clean.length - 1)) * plotW
        const y = center - Math.max(-1, Math.min(1, clean[i])) * plotH * 0.32
        if (i === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      context.strokeStyle = 'rgba(150, 129, 255, 0.36)'
      context.lineWidth = 0.9
      context.setLineDash([3, 3])
      context.stroke()
      context.restore()

      // Received waveform.
      context.save()
      context.beginPath()
      for (let i = 0; i < samples.length; i += 1) {
        const x = left + (i / Math.max(1, samples.length - 1)) * plotW
        const y = center - Math.max(-1.3, Math.min(1.3, samples[i])) * plotH * 0.36
        if (i === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      const traceColor = current.jammed ? 'rgba(255, 172, 126, 0.92)' : 'rgba(100, 239, 255, 0.95)'
      context.strokeStyle = traceColor
      context.lineWidth = 1.25
      context.shadowColor = current.jammed ? 'rgba(255, 115, 110, 0.55)' : 'rgba(85, 234, 255, 0.55)'
      context.shadowBlur = 5
      context.stroke()
      context.restore()

      // Trigger marker.
      const triggerX = left + plotW * 0.18
      context.save()
      context.strokeStyle = 'rgba(255, 189, 101, 0.5)'
      context.beginPath()
      context.moveTo(triggerX, bottom)
      context.lineTo(triggerX, center - plotH * 0.36)
      context.stroke()
      context.fillStyle = 'rgba(255, 189, 101, 0.7)'
      context.beginPath()
      context.moveTo(triggerX, center - plotH * 0.4)
      context.lineTo(triggerX - 4, center - plotH * 0.46)
      context.lineTo(triggerX + 4, center - plotH * 0.46)
      context.closePath()
      context.fill()
      context.font = '7px "JetBrains Mono", monospace'
      context.fillText('TRIG', triggerX + 4, center - plotH * 0.42)
      context.restore()

      // Moving sweep line.
      const scan = left + (((elapsed * 0.18) % 1) * plotW)
      const scanGradient = context.createLinearGradient(scan - 16, 0, scan + 16, 0)
      scanGradient.addColorStop(0, 'rgba(100, 238, 255, 0)')
      scanGradient.addColorStop(0.5, 'rgba(100, 238, 255, 0.06)')
      scanGradient.addColorStop(1, 'rgba(100, 238, 255, 0)')
      context.fillStyle = scanGradient
      context.fillRect(scan - 16, top, 32, plotH)

      context.save()
      context.fillStyle = 'rgba(129, 198, 214, 0.4)'
      context.font = '7px "JetBrains Mono", monospace'
      context.fillText(current.frequency ? `CARRIER / ${(current.frequency / 1000).toFixed(2)} kHz` : 'CARRIER / —', left, top - 5)
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

export function ScopePanel({ sim, onInfo }: { sim: SimulationController; onInfo: () => void }) {
  const frame = sim.currentFrame
  const vpp = Math.max(...frame.samples) - Math.min(...frame.samples)
  const rms = Math.sqrt(
    frame.samples.reduce((sum, value) => sum + value * value, 0) / Math.max(1, frame.samples.length),
  )
  const active = sim.phase === 'channel' || sim.phase === 'demodulating'
  const noiseLevel = Math.max(0, Math.min(100, 100 - Math.max(0, frame.spectrum.snrDb) * 3))

  return (
    <section className="panel scope-panel">
      <PanelHeader
        index="04"
        eyebrow="RECEIVER / TIME-DOMAIN CAPTURE"
        title="Oscilloscope"
        meta={
          <div className="head-meta-stack">
            <Tag tone={sim.config.jammer ? 'red' : 'green'}>
              {sim.config.jammer ? 'JAMMER ACTIVE' : 'CH1 / RX'}
            </Tag>
          </div>
        }
        onInfo={onInfo}
      />
      <div className="scope-canvas-wrap">
        <ScopeCanvas
          state={{
            samples: frame.samples,
            clean: frame.txSamples,
            paused: sim.paused,
            active,
            jammed: sim.config.jammer,
            jamStrength: sim.config.jamStrength,
            symbolMs: sim.config.symbolMs,
            frequency: frame.spectrum.txFrequency,
          }}
        />
        <div className="scope-hud">
          <span><Activity size={11} /> {sim.paused ? 'HOLD' : 'TRIGGERED'}</span>
          <span>CH1 500 mV/div</span>
          <span>{(1 / sim.config.symbolMs).toFixed(1)} ms/div</span>
        </div>
      </div>

      <div className="scope-readouts">
        <div>
          <span>AMPLITUDE / Vpp</span>
          <strong>{vpp.toFixed(3)} <em>a.u.</em></strong>
        </div>
        <div>
          <span>RMS LEVEL</span>
          <strong>{rms.toFixed(3)}</strong>
        </div>
        <div>
          <span>NOISE EST.</span>
          <strong className={noiseLevel > 65 ? 'tone-red' : noiseLevel > 40 ? 'tone-amber' : ''}>{Math.round(noiseLevel)}%</strong>
        </div>
        <div>
          <span>SIGNAL STRENGTH</span>
          <strong>{Math.max(0, Math.min(100, 100 + frame.spectrum.snrDb * 2)).toFixed(0)}%</strong>
        </div>
      </div>

      <div className={cx('panel-footnote-row', sim.config.jammer && 'is-warning')}>
        <span><Crosshair size={11} /> Solid: received · dashed: clean transmitted reference.</span>
        <span><SlidersHorizontal size={11} /> Distortion is visible in the time domain.</span>
      </div>
    </section>
  )
}
