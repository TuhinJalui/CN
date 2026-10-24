import { useEffect, useRef, useState } from 'react'
import {
  AudioLines,
  Eye,
  EyeOff,
  Headphones,
  Music2,
  Radio,
  ScanLine,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  Waves,
} from 'lucide-react'
import type { SimulationController } from '../hooks/useSimulation'
import {
  RangeControl,
  SectionIntro,
  SimulatedBadge,
  Tag,
  ToggleControl,
  cx,
} from '../components/ui'

interface StegoCanvasProps {
  coverGain: number
  hiddenGain: number
  reveal: boolean
  paused: boolean
}

function StegoCanvas({ coverGain, hiddenGain, reveal, paused }: StegoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef({ coverGain, hiddenGain, reveal, paused })
  stateRef.current = { coverGain, hiddenGain, reveal, paused }

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return undefined
    const context = canvas.getContext('2d')
    if (!context) return undefined
    let width = 700
    let height = 240
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

    const drawWave = (
      kind: 'cover' | 'hidden' | 'mixed',
      center: number,
      amplitude: number,
      offset: number,
      time: number,
    ) => {
      const left = 42
      const right = width - 14
      const plotW = right - left
      context.beginPath()
      for (let x = left; x <= right; x += 2) {
        const normalized = (x - left) / plotW
        const cover =
          Math.sin(normalized * 24 + time * 1.1 + offset) * 0.55 +
          Math.sin(normalized * 47 + time * 1.8 + offset * 0.7) * 0.28 +
          Math.sin(normalized * 83 + time * 3.1) * 0.12
        const envelope = 0.62 + Math.sin(normalized * 8.3 + time * 0.7) * 0.2
        const hidden =
          Math.sin(normalized * 610 + time * 7.4) * 0.45 +
          Math.sin(normalized * 834 + time * 5.3) * 0.25
        const hiddenMix = (stateRef.current.hiddenGain / 100) * (stateRef.current.reveal ? 1.8 : 1)
        const value =
          kind === 'cover'
            ? cover * envelope
            : kind === 'hidden'
              ? hidden * hiddenMix
              : cover * envelope * (stateRef.current.coverGain / 100) + hidden * hiddenMix
        const y = center + value * amplitude
        if (x === left) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      context.stroke()
    }

    const render = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000)
      last = now
      const state = stateRef.current
      if (!state.paused) elapsed += dt
      const time = elapsed
      context.clearRect(0, 0, width, height)

      const bg = context.createLinearGradient(0, 0, 0, height)
      bg.addColorStop(0, 'rgba(8, 14, 24, 0.95)')
      bg.addColorStop(1, 'rgba(3, 7, 12, 0.95)')
      context.fillStyle = bg
      context.fillRect(0, 0, width, height)

      context.save()
      context.strokeStyle = 'rgba(131, 201, 219, 0.07)'
      for (let x = 42; x < width; x += 46) {
        context.beginPath()
        context.moveTo(x, 34)
        context.lineTo(x, height - 44)
        context.stroke()
      }
      for (let y = 34; y < height - 36; y += 38) {
        context.beginPath()
        context.moveTo(42, y)
        context.lineTo(width - 14, y)
        context.stroke()
      }
      context.restore()

      context.save()
      context.strokeStyle = 'rgba(91, 197, 255, 0.08)'
      context.beginPath()
      context.moveTo(42, height * 0.5)
      context.lineTo(width - 14, height * 0.5)
      context.stroke()
      context.restore()

      // Cover wave in muted blue.
      context.save()
      context.strokeStyle = 'rgba(91, 151, 194, 0.78)'
      context.lineWidth = 1.1
      context.shadowColor = 'rgba(91, 151, 194, 0.24)'
      context.shadowBlur = 4
      drawWave('cover', height * 0.43, 58, 0, time)
      context.restore()

      // Hidden high-frequency component.
      context.save()
      context.strokeStyle = state.reveal ? 'rgba(255, 196, 98, 0.9)' : 'rgba(157, 134, 255, 0.4)'
      context.lineWidth = state.reveal ? 0.9 : 0.6
      context.setLineDash(state.reveal ? [2, 2] : [])
      context.shadowColor = state.reveal ? 'rgba(255, 196, 98, 0.42)' : 'rgba(157, 134, 255, 0.25)'
      context.shadowBlur = state.reveal ? 5 : 2
      drawWave('hidden', height * 0.7, 28, 1.4, time)
      context.restore()

      // Composite masked signal.
      context.save()
      const gradient = context.createLinearGradient(42, 0, width - 14, 0)
      gradient.addColorStop(0, 'rgba(111, 231, 255, 0.6)')
      gradient.addColorStop(0.5, 'rgba(104, 239, 255, 0.95)')
      gradient.addColorStop(1, 'rgba(158, 132, 255, 0.7)')
      context.strokeStyle = gradient
      context.lineWidth = 1.35
      context.shadowColor = 'rgba(102, 233, 255, 0.5)'
      context.shadowBlur = 5
      drawWave('mixed', height * 0.55, 44, 0, time)
      context.restore()

      // Hidden symbol ticking.
      if (state.reveal) {
        context.save()
        const symbolTime = 0.12
        const symbols = ['1', '0', '1', '1', '0', '0', '1']
        for (let i = 0; i < 28; i += 1) {
          const phase = ((time / symbolTime + i) % 7) | 0
          const x = 48 + ((time * 95 + i * 22) % (width - 88))
          context.fillStyle = 'rgba(255, 193, 104, 0.55)'
          context.font = '7px "JetBrains Mono", monospace'
          context.fillText(symbols[phase], x, height - 26)
        }
        context.restore()
      }

      // Annotations.
      context.save()
      context.font = '8px "JetBrains Mono", monospace'
      context.fillStyle = 'rgba(139, 206, 224, 0.55)'
      context.fillText('COMPOSITE / ACOUSTIC OUT', 44, 22)
      context.textAlign = 'right'
      context.fillText('SCHEMATIC / NOT TO SCALE', width - 16, 22)
      context.textAlign = 'left'
      context.fillStyle = 'rgba(113, 166, 193, 0.55)'
      context.fillText('COVER / LOW-FREQUENCY ENERGY', 44, height * 0.43 - 73)
      context.fillStyle = state.reveal ? 'rgba(255, 195, 103, 0.8)' : 'rgba(156, 139, 255, 0.48)'
      context.fillText('HIDDEN / HIGH-FREQUENCY SYMBOLS', 44, height * 0.7 + 55)
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

export function StegoMode({ sim, onInfo }: { sim: SimulationController; onInfo: (key: string) => void }) {
  const [coverGain, setCoverGain] = useState(65)
  const [hiddenGain, setHiddenGain] = useState(26)
  const [reveal, setReveal] = useState(true)
  const [masked, setMasked] = useState(true)

  return (
    <div className="mode-page stego-page">
      <SectionIntro
        kicker="04 / ACOUSTIC STEGANOGRAPHY · RESEARCH VISUALIZATION"
        title={<>Hidden tones</>}
        description="A conceptual view of a cover acoustic waveform carrying a high-frequency symbol layer. This is a visual research model — not an encoder, audio export tool, or deployable covert channel."
        right={
          <div className="intro-status-panel">
            <SimulatedBadge label="CONCEPTUAL" />
            <span>NO AUDIO EXPORT / NO ENCODER</span>
            <button className="ghost-button" type="button" onClick={() => onInfo('stego')}>
              <ShieldAlert size={13} /> BOUNDARIES
            </button>
          </div>
        }
      />

      <div className="stego-layout">
        <div className="stego-main">
          <div className="panel stego-visual-panel">
            <div className="panel-head">
              <div className="panel-head-copy">
                <span className="panel-index">08</span>
                <div className="panel-title-group">
                  <div className="panel-eyebrow">MASKING / ACOUSTIC COMPOSITION</div>
                  <h2>Cover + hidden symbols</h2>
                </div>
              </div>
              <div className="panel-head-actions">
                <Tag tone="violet">RESEARCH VISUAL</Tag>
                <button className="explain-btn" type="button" onClick={() => onInfo('stego')}>
                  <Eye size={13} /> <span>What is happening?</span>
                </button>
              </div>
            </div>

            <div className="stego-flow">
              <div className="stego-flow-node cover">
                <div className="flow-node-icon"><Music2 size={17} /></div>
                <span>NATURAL AUDIO</span>
                <strong>Cover waveform</strong>
                <small>broadband energy</small>
              </div>
              <span className="stego-plus">+</span>
              <div className="stego-flow-node hidden">
                <div className="flow-node-icon"><Radio size={17} /></div>
                <span>HIDDEN SYMBOLS</span>
                <strong>18 / 20 kHz FSK</strong>
                <small>low relative amplitude</small>
              </div>
              <span className="stego-arrow">→</span>
              <div className="stego-flow-node masked">
                <div className="flow-node-icon"><AudioLines size={17} /></div>
                <span>MASKED SIGNAL</span>
                <strong>{masked ? 'Composite acoustic output' : 'Composition preview'}</strong>
                <small>user-configured visual</small>
              </div>
            </div>

            <div className={cx('stego-canvas-wrap', reveal && 'is-revealed')}>
              <StegoCanvas coverGain={coverGain} hiddenGain={hiddenGain} reveal={reveal} paused={sim.paused} />
              <div className="stego-canvas-hud">
                <span><Waves size={11} /> COMPOSITE WAVEFORM</span>
                <span>{reveal ? 'HIDDEN LAYER HIGHLIGHTED' : 'CONCEALED LAYER'}</span>
              </div>
            </div>

            <div className="stego-spectrum-strip">
              <div className="stego-spectrum-head">
                <span>CONCEPTUAL SPECTRAL OCCUPANCY</span>
                <span>0–24 kHz</span>
              </div>
              <div className="stego-spectrum-bars" aria-hidden="true">
                {Array.from({ length: 64 }).map((_, index) => {
                  const freq = (index / 63) * 24000
                  const cover = freq < 9000 ? Math.exp(-((freq - 900) ** 2) / 28000000) : 0
                  const hidden = Math.abs(freq - 18000) < 380 || Math.abs(freq - 20000) < 380 ? 0.85 : 0
                  const value = Math.max(4, Math.max(cover * 55, hidden * hiddenGain * 2.1))
                  return <span key={index} style={{ height: `${Math.min(75, value)}%` }} className={hidden > 0.2 ? 'is-hidden' : ''} />
                })}
                <i className="stego-freq-marker f0">18k</i>
                <i className="stego-freq-marker f1">20k</i>
                <i className="stego-nyquist-marker">22.05k</i>
              </div>
            </div>

            <div className="stego-data-row">
              <div><span>HIDDEN CARRIERS</span><strong>{(sim.config.f0 / 1000).toFixed(1)} / {(sim.config.f1 / 1000).toFixed(1)} kHz</strong></div>
              <div><span>RELATIVE HIDDEN LEVEL</span><strong>−{hiddenGain} dB</strong></div>
              <div><span>COVER LEVEL</span><strong>{coverGain}%</strong></div>
              <div><span>DETECTABILITY</span><strong className={hiddenGain > 35 ? 'tone-amber' : 'tone-green'}>{hiddenGain > 35 ? 'ELEVATED' : 'LOW / MODELLED'}</strong></div>
            </div>

            <div className="stego-warning">
              <TriangleAlert size={14} />
              <span>
                This is a deliberately visible illustration. A real covert channel would face unknowable room, hardware
                and perceptual constraints — and may be unlawful outside authorised research.
              </span>
            </div>
          </div>

          <div className="stego-note-grid">
            <div className="stego-note-card">
              <span className="rail-kicker">WHY HIDE IN SOUND?</span>
              <strong>A transducer can be an unintended data path.</strong>
              <p>
                Speakers and microphones are often assumed benign, but they extend a machine's interface into the
                physical room. Acoustic bridging is one reason to treat audio peripherals as part of the attack surface.
              </p>
            </div>
            <div className="stego-note-card">
              <span className="rail-kicker">WHAT THIS DEMO DOES NOT SHOW</span>
              <strong>No working mask, no audio output.</strong>
              <p>
                No perceptual masking algorithm is implemented. The high-frequency layer is drawn separately so the
                idea is inspectable; no actual hidden transmission is generated or exported.
              </p>
            </div>
          </div>
        </div>

        <aside className="stego-controls">
          <section className="panel">
            <div className="panel-head simple">
              <div className="panel-title-group">
                <div className="panel-eyebrow">VISUAL CONTROLS</div>
                <h2>Layer mix</h2>
              </div>
              <ScanLine size={15} />
            </div>
            <RangeControl
              label="Cover amplitude"
              value={coverGain}
              min={0}
              max={100}
              format={(value) => `${value}%`}
              onChange={setCoverGain}
              accent="cyan"
            />
            <RangeControl
              label="Hidden layer level"
              value={hiddenGain}
              min={5}
              max={50}
              format={(value) => `−${value} dB`}
              onChange={setHiddenGain}
              accent="amber"
            />
            <ToggleControl
              label="Reveal hidden layer"
              detail="Highlight the high-frequency component"
              checked={reveal}
              onChange={setReveal}
            />
            <ToggleControl
              label="Show composite"
              detail="Conceptual masked acoustic signal"
              checked={masked}
              onChange={setMasked}
            />
            <div className="stego-control-note">
              <Sparkles size={12} />
              Controls affect the illustration only. Carrier values are shared with the lab model.
            </div>
          </section>

          <section className="panel stego-guardrail">
            <div className="guardrail-icon"><ShieldAlert size={20} /></div>
            <div className="rail-kicker">LAB BOUNDARY</div>
            <h3>Authorised research only</h3>
            <p>
              Never use acoustic covert channels against systems or spaces you do not own or have explicit permission
              to test. This page implements no transmission capability.
            </p>
            <div className="guardrail-tags">
              <Tag tone="amber">ILLUSTRATIVE</Tag>
              <Tag tone="red">NO DEPLOYMENT</Tag>
            </div>
          </section>

          <section className="panel stego-fact-panel">
            <div className="panel-eyebrow">LISTENING CONTEXT</div>
            <div className="stego-fact">
              <Headphones size={16} />
              <div>
                <strong>Not a guarantee of inaudibility</strong>
                <span>18–21 kHz is near-ultrasonic/high-frequency audio, not a universal silent band.</span>
              </div>
            </div>
            <div className="stego-fact">
              <EyeOff size={16} />
              <div>
                <strong>Cover is not camouflage</strong>
                <span>Natural sound makes high-frequency structure harder to spot visually, not physically absent.</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
