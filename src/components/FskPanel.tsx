import { useEffect, useRef, useState } from 'react'
import { AudioWaveform, Clock3, Radio, Waves } from 'lucide-react'
import type { SimulationController } from '../hooks/useSimulation'
import { PanelHeader, Tag, cx } from './ui'

const DEMO_BITS = [1, 0, 1, 1, 0, 0, 1, 0]

interface FskCanvasState {
  bits: number[]
  activeIndex: number
  f0: number
  f1: number
  paused: boolean
  active: boolean
}

function FskCanvas({ state }: { state: FskCanvasState }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return undefined
    const context = canvas.getContext('2d')
    if (!context) return undefined
    let width = 600
    let height = 230
    let frame = 0
    let elapsed = 0
    let lastTime = performance.now()

    const resize = () => {
      const rect = parent.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      width = Math.max(320, rect.width)
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
      const dt = Math.min(0.04, (now - lastTime) / 1000)
      lastTime = now
      const current = stateRef.current
      if (!current.paused) elapsed += dt
      const time = elapsed
      const bits = current.bits.length ? current.bits : DEMO_BITS
      const left = 42
      const right = width - 14
      const top = 42
      const bottom = height - 34
      const plotW = right - left
      const plotH = bottom - top
      const center = top + plotH / 2
      const segW = plotW / bits.length
      const active = current.activeIndex

      context.clearRect(0, 0, width, height)

      const bg = context.createLinearGradient(0, top, 0, bottom)
      bg.addColorStop(0, 'rgba(10, 18, 27, 0.92)')
      bg.addColorStop(0.5, 'rgba(5, 12, 19, 0.85)')
      bg.addColorStop(1, 'rgba(8, 15, 23, 0.94)')
      context.fillStyle = bg
      context.fillRect(0, top, width, plotH)

      // Frequency rails.
      context.save()
      context.strokeStyle = 'rgba(138, 201, 220, 0.07)'
      context.lineWidth = 1
      for (let y = top; y <= bottom; y += 32) {
        context.beginPath()
        context.moveTo(left, y)
        context.lineTo(right, y)
        context.stroke()
      }
      context.setLineDash([3, 7])
      context.strokeStyle = 'rgba(116, 213, 239, 0.18)'
      context.beginPath()
      context.moveTo(left, center)
      context.lineTo(right, center)
      context.stroke()
      context.restore()

      // Symbol cells and waveform segments.
      for (let i = 0; i < bits.length; i += 1) {
        const x0 = left + segW * i
        const isActive = i === active
        const isPast = active >= 0 && i < active
        const bit = bits[i]
        if (isActive) {
          const glow = context.createLinearGradient(x0, top, x0 + segW, top)
          glow.addColorStop(0, 'rgba(92, 235, 255, 0.03)')
          glow.addColorStop(0.5, 'rgba(92, 235, 255, 0.13)')
          glow.addColorStop(1, 'rgba(92, 235, 255, 0.02)')
          context.fillStyle = glow
          context.fillRect(x0, top, segW, plotH)
        } else if (isPast) {
          context.fillStyle = 'rgba(135, 226, 244, 0.022)'
          context.fillRect(x0, top, segW, plotH)
        }

        context.strokeStyle = 'rgba(111, 194, 217, 0.11)'
        context.setLineDash([2, 6])
        context.beginPath()
        context.moveTo(x0, top)
        context.lineTo(x0, bottom)
        context.stroke()
        context.setLineDash([])

        context.fillStyle = isActive ? 'rgba(115, 241, 255, 0.92)' : isPast ? 'rgba(112, 201, 220, 0.62)' : 'rgba(100, 163, 182, 0.4)'
        context.font = '500 9px "JetBrains Mono", monospace'
        context.textAlign = 'center'
        context.fillText(String(bit), x0 + segW / 2, top - 16)
        context.fillStyle = isActive ? 'rgba(119, 240, 255, 0.7)' : 'rgba(111, 175, 193, 0.3)'
        context.font = '8px "JetBrains Mono", monospace'
        context.fillText(
          `${((bit ? current.f1 : current.f0) / 1000).toFixed(1)}k`,
          x0 + segW / 2,
          bottom + 16,
        )

        const cycles = bit ? 8.4 : 6.1
        const samples = Math.max(80, Math.floor(segW))
        const amplitude = plotH * 0.27
        context.save()
        context.beginPath()
        for (let s = 0; s <= samples; s += 1) {
          const progress = s / samples
          const x = x0 + progress * segW
          const eased = 0.82 + Math.sin(progress * Math.PI) * 0.18
          const shimmer =
            Math.sin(progress * 17 + time * 4.2 + i) *
            (current.active ? 0.8 : 0.3)
          const y =
            center +
            Math.sin(progress * cycles * Math.PI * 2 + i * 0.3) * amplitude * eased +
            shimmer
          if (s === 0) context.moveTo(x, y)
          else context.lineTo(x, y)
        }
        const color = isActive ? 'rgba(107, 244, 255, 0.98)' : isPast ? 'rgba(102, 221, 240, 0.44)' : 'rgba(88, 183, 210, 0.29)'
        context.strokeStyle = color
        context.lineWidth = isActive ? 1.65 : 0.9
        context.shadowColor = isActive ? 'rgba(88, 235, 255, 0.8)' : 'transparent'
        context.shadowBlur = isActive ? 8 : 0
        context.stroke()
        context.restore()

        // Frequency tag on active symbol.
        if (isActive) {
          context.save()
          context.font = '500 8px "JetBrains Mono", monospace'
          context.textAlign = 'left'
          context.fillStyle = 'rgba(143, 245, 255, 0.75)'
          context.fillText(bit ? 'FREQ 1 / HIGH' : 'FREQ 0 / LOW', x0 + 7, top + 17)
          context.restore()
        }
      }

      // Sweep cursor inside the active symbol.
      if (active >= 0) {
        const activeX0 = left + active * segW
        const progress = current.paused ? 0.56 : (time * 0.95) % 1
        const cursorX = activeX0 + progress * segW
        context.save()
        context.strokeStyle = 'rgba(136, 247, 255, 0.7)'
        context.shadowColor = 'rgba(100, 238, 255, 0.8)'
        context.shadowBlur = 10
        context.beginPath()
        context.moveTo(cursorX, top + 4)
        context.lineTo(cursorX, bottom - 4)
        context.stroke()
        context.fillStyle = 'rgba(131, 246, 255, 0.85)'
        context.beginPath()
        context.moveTo(cursorX, top + 3)
        context.lineTo(cursorX - 3.5, top - 2)
        context.lineTo(cursorX + 3.5, top - 2)
        context.closePath()
        context.fill()
        context.restore()
      }

      // Bottom timing ruler.
      context.save()
      context.strokeStyle = 'rgba(108, 176, 195, 0.14)'
      context.beginPath()
      context.moveTo(left, bottom + 28)
      context.lineTo(right, bottom + 28)
      context.stroke()
      for (let i = 0; i <= bits.length; i += 1) {
        const x = left + i * segW
        context.beginPath()
        context.moveTo(x, bottom + 24)
        context.lineTo(x, bottom + 30)
        context.stroke()
      }
      context.fillStyle = 'rgba(117, 179, 197, 0.4)'
      context.font = '7px "JetBrains Mono", monospace'
      context.textAlign = 'right'
      context.fillText('SCHEMATIC TIME COMPRESSED / CARRIER VALUES ARE LIVE', right, top - 27)
      context.restore()

      // Y axis labels.
      context.save()
      context.textAlign = 'right'
      context.font = '7px "JetBrains Mono", monospace'
      context.fillStyle = 'rgba(121, 178, 196, 0.38)'
      context.fillText('+A', left - 8, top + 12)
      context.fillText('0', left - 8, center + 3)
      context.fillText('−A', left - 8, bottom - 3)
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

export function FskPanel({ sim, onInfo }: { sim: SimulationController; onInfo: () => void }) {
  const [demoIndex, setDemoIndex] = useState(0)
  const bitTapeRef = useRef<HTMLDivElement | null>(null)
  const activeBitRef = useRef<HTMLSpanElement | null>(null)
  const liveMode = Boolean(sim.packet) && (sim.running || sim.terminal !== 'idle')
  const bits = liveMode && sim.packet ? sim.packet.bits : DEMO_BITS
  const effectiveIndex =
    liveMode && sim.activeBit >= 0 ? Math.min(sim.activeBit, bits.length - 1) : demoIndex % bits.length
  const currentBit = bits[effectiveIndex] ?? 1
  const carrier = currentBit ? sim.config.f1 : sim.config.f0
  const windowSize = Math.min(10, bits.length)
  const windowStart = Math.max(0, Math.min(bits.length - windowSize, effectiveIndex - 4))
  const windowBits = bits.slice(windowStart, windowStart + windowSize)
  const localActive = effectiveIndex - windowStart

  useEffect(() => {
    if (sim.running || sim.paused) return undefined
    const timer = window.setInterval(() => {
      setDemoIndex((value) => (value + 1) % DEMO_BITS.length)
    }, 900)
    return () => window.clearInterval(timer)
  }, [sim.running, sim.paused])

  useEffect(() => {
    if (!activeBitRef.current || !bitTapeRef.current) return
    const parent = bitTapeRef.current
    const child = activeBitRef.current
    const left = child.offsetLeft
    const right = left + child.offsetWidth
    if (left < parent.scrollLeft + 24 || right > parent.scrollLeft + parent.clientWidth - 24) {
      parent.scrollTo({ left: Math.max(0, left - parent.clientWidth / 2), behavior: 'smooth' })
    }
  }, [effectiveIndex, liveMode])

  const dataRate = 1000 / sim.config.symbolMs

  return (
    <section className="panel fsk-panel">
      <PanelHeader
        index="02"
        eyebrow="PHYSICAL LAYER / FREQUENCY-SHIFT KEYING"
        title="FSK modulator"
        meta={<Tag tone="cyan">2-FSK · SYMBOL STREAM</Tag>}
        onInfo={onInfo}
      />

      <div className="bit-sequence-block">
        <div className="bit-strip-head">
          <span>BINARY SEQUENCE</span>
          <span className="bit-strip-legend">
            <span className="legend-dot cyan" /> FREQ 1
            <span className="legend-dot violet" /> FREQ 0
          </span>
        </div>
        <div className="bit-tape" ref={bitTapeRef}>
          {bits.map((bit, index) => (
            <span
              key={`${bit}-${index}`}
              ref={index === effectiveIndex ? activeBitRef : undefined}
              className={cx(
                'bit-cell',
                bit === 1 ? 'is-one' : 'is-zero',
                index === effectiveIndex && 'is-active',
                index < effectiveIndex && 'is-past',
              )}
            >
              {bit}
            </span>
          ))}
        </div>
      </div>

      <div className="fsk-canvas-wrap">
        <div className="canvas-corner-label">TX / BASEBAND → CARRIER</div>
        <FskCanvas
          state={{
            bits: windowBits,
            activeIndex: localActive,
            f0: sim.config.f0,
            f1: sim.config.f1,
            paused: sim.paused || sim.phase === 'idle',
            active: sim.phase === 'channel' || sim.phase === 'modulating',
          }}
        />
        <div className="canvas-bottom-note">
          <span className="live-cursor-label"><span /> CURRENT SYMBOL</span>
          <span>SCALE: SCHEMATIC / f∝DENSITY</span>
        </div>
      </div>

      <div className="fsk-readout-grid">
        <div className="fsk-readout">
          <span><Radio size={12} /> CURRENT SYMBOL</span>
          <strong className={currentBit === 1 ? 'tone-cyan' : 'tone-violet'}>{currentBit}</strong>
          <small>{currentBit === 1 ? 'HIGH CARRIER' : 'LOW CARRIER'}</small>
        </div>
        <div className="fsk-readout">
          <span><Waves size={12} /> CARRIER</span>
          <strong>{(carrier / 1000).toFixed(2)} <em>kHz</em></strong>
          <small>INSTANTANEOUS TONE</small>
        </div>
        <div className="fsk-readout">
          <span><Clock3 size={12} /> SYMBOL TIME</span>
          <strong>{sim.config.symbolMs.toFixed(1)} <em>ms</em></strong>
          <small>{dataRate.toFixed(1)} baud nominal</small>
        </div>
        <div className="fsk-readout">
          <span><AudioWaveform size={12} /> MAPPING</span>
          <strong className="fsk-pair"><i>0</i> {(sim.config.f0 / 1000).toFixed(1)}k <i>1</i> {(sim.config.f1 / 1000).toFixed(1)}k</strong>
          <small>FSK-2 / AMPLITUDE FLAT</small>
        </div>
      </div>
    </section>
  )
}
