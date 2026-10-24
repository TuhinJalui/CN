import { useEffect, useRef } from 'react'
import type { RunPhase } from '../lib/types'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: 'cyan' | 'violet' | 'red'
}

export interface AirGapCanvasState {
  phase: RunPhase
  paused: boolean
  noiseLevel: number
  jammed: boolean
  jamStrength: number
  currentBit: number | null
  activeBitFraction: number
}

export function AirGapCanvas({ state }: { state: AirGapCanvasState }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef(state)
  const particlesRef = useRef<Particle[]>([])
  stateRef.current = state

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const context = canvas.getContext('2d')
    if (!context) return undefined
    const parent = canvas.parentElement
    if (!parent) return undefined

    let width = 600
    let height = 300
    let frame = 0
    let lastTime = performance.now()
    let elapsed = 0
    let spawnAccumulator = 0

    const resize = () => {
      const rect = parent.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      width = Math.max(320, rect.width)
      height = Math.max(220, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(parent)
    resize()

    const drawRoundedRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      radius: number,
    ): void => {
      context.beginPath()
      context.roundRect(x, y, w, h, radius)
    }

    const render = (now: number) => {
      const dt = Math.min(0.04, (now - lastTime) / 1000)
      lastTime = now
      const current = stateRef.current
      const active =
        current.phase === 'channel' ||
        current.phase === 'demodulating' ||
        current.phase === 'verifying' ||
        current.phase === 'complete' ||
        current.phase === 'failed'
      const paused = current.paused
      if (!paused) elapsed += dt
      const time = elapsed
      const centerY = height * 0.5

      context.clearRect(0, 0, width, height)

      const bg = context.createLinearGradient(0, 0, width, 0)
      bg.addColorStop(0, 'rgba(11, 23, 31, 0.86)')
      bg.addColorStop(0.45, 'rgba(6, 12, 19, 0.94)')
      bg.addColorStop(1, 'rgba(12, 22, 34, 0.88)')
      context.fillStyle = bg
      context.fillRect(0, 0, width, height)

      // Measurement grid.
      context.save()
      context.strokeStyle = 'rgba(126, 200, 224, 0.065)'
      context.lineWidth = 1
      const grid = 42
      for (let x = ((time * 3) % grid) - grid; x < width; x += grid) {
        context.beginPath()
        context.moveTo(x, 0)
        context.lineTo(x, height)
        context.stroke()
      }
      for (let y = 0; y < height; y += grid) {
        context.beginPath()
        context.moveTo(0, y)
        context.lineTo(width, y)
        context.stroke()
      }
      context.restore()

      // Gap framing and baseline.
      context.save()
      context.strokeStyle = 'rgba(130, 207, 229, 0.16)'
      context.setLineDash([2, 8])
      context.beginPath()
      context.moveTo(0, centerY)
      context.lineTo(width, centerY)
      context.stroke()
      context.restore()

      const edgeGradient = context.createLinearGradient(0, 0, width, 0)
      edgeGradient.addColorStop(0, 'rgba(94, 232, 255, 0.13)')
      edgeGradient.addColorStop(0.08, 'rgba(94, 232, 255, 0.02)')
      edgeGradient.addColorStop(0.92, 'rgba(140, 125, 255, 0.02)')
      edgeGradient.addColorStop(1, 'rgba(140, 125, 255, 0.13)')
      context.fillStyle = edgeGradient
      context.fillRect(0, centerY - 40, width, 80)

      // Acoustic wavefronts emanate from the speaker.
      const emission = active ? 1 : 0.13
      const rings = 9
      for (let i = 0; i < rings; i += 1) {
        const phase = ((time * 0.2 + i / rings) % 1 + 1) % 1
        const radius = 16 + phase * (width - 22)
        const alpha = Math.sin(phase * Math.PI) * (active ? 0.3 : 0.07)
        const wobble = Math.sin(time * 1.8 + i * 1.7) * 2
        context.beginPath()
        context.ellipse(0, centerY, radius + wobble, radius * 0.42, 0, -1.25, 1.25)
        context.strokeStyle =
          current.jammed && i % 3 === 0
            ? `rgba(255, 115, 125, ${alpha * 0.9})`
            : `rgba(87, 225, 255, ${alpha * emission})`
        context.lineWidth = i % 3 === 0 ? 1.2 : 0.65
        context.stroke()
      }

      // Central time-domain suggestion travels with the carrier.
      context.save()
      context.beginPath()
      const yScale = active ? 5.5 : 1.5
      for (let x = 0; x <= width; x += 2) {
        const envelope = Math.sin((x / width) * Math.PI)
        const frequency = current.currentBit === 1 ? 0.085 : 0.062
        const y =
          centerY +
          Math.sin(x * frequency - time * 10.5) *
            yScale *
            envelope *
            (0.7 + (current.currentBit === null ? 0 : 0.3))
        if (x === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      context.strokeStyle = active ? 'rgba(100, 235, 255, 0.24)' : 'rgba(100, 235, 255, 0.06)'
      context.lineWidth = 1
      context.stroke()
      context.restore()

      // Angle ticks and centreline markers.
      context.save()
      for (let marker = 1; marker < 4; marker += 1) {
        const x = (width * marker) / 4
        context.strokeStyle = 'rgba(103, 238, 255, 0.17)'
        context.setLineDash([2, 7])
        context.beginPath()
        context.moveTo(x, centerY - 20)
        context.lineTo(x, centerY + 20)
        context.stroke()
        context.fillStyle = 'rgba(126, 198, 218, 0.45)'
        context.font = '8px "JetBrains Mono", monospace'
        context.fillText(`0${marker}`, x + 4, centerY + 31)
      }
      context.restore()

      // Particles sample the simulated pressure field.
      if (!paused) {
        if (active) {
          spawnAccumulator += dt * (44 + current.noiseLevel * 0.35)
          while (spawnAccumulator >= 1) {
            spawnAccumulator -= 1
            const jamScatter = current.jammed ? current.jamStrength / 100 : 0
            particlesRef.current.push({
              x: 2 + Math.random() * 10,
              y: centerY + (Math.random() - 0.5) * 38 * (1 + jamScatter * 2.2),
              vx: 46 + Math.random() * 95,
              vy: (Math.random() - 0.5) * (8 + jamScatter * 30),
              life: 0,
              maxLife: (width / (105 + Math.random() * 60)) * (0.7 + Math.random() * 0.45),
              size: 0.8 + Math.random() * 2.1,
              color:
                Math.random() < 0.07 + jamScatter * 0.2
                  ? 'red'
                  : current.currentBit === 1
                    ? 'cyan'
                    : 'violet',
            })
          }
        } else {
          spawnAccumulator += dt * 3
          while (spawnAccumulator >= 1) {
            spawnAccumulator -= 1
            particlesRef.current.push({
              x: Math.random() * width,
              y: centerY + (Math.random() - 0.5) * height * 0.45,
              vx: 4 + Math.random() * 8,
              vy: (Math.random() - 0.5) * 3,
              life: 0,
              maxLife: 4 + Math.random() * 5,
              size: 0.5 + Math.random() * 0.9,
              color: Math.random() < 0.22 ? 'violet' : 'cyan',
            })
          }
        }

        particlesRef.current = particlesRef.current
          .map((particle) => ({
            ...particle,
            x: particle.x + particle.vx * dt,
            y:
              particle.y +
              particle.vy * dt +
              Math.sin(time * 3 + particle.life * 5) * (active ? 0.22 : 0.05),
            life: particle.life + dt,
          }))
          .filter(
            (particle) =>
              particle.life < particle.maxLife &&
              particle.x < width + 16 &&
              particlesRef.current.length < 340,
          )
      }

      context.save()
      context.globalCompositeOperation = 'lighter'
      for (const particle of particlesRef.current) {
        const alpha = Math.min(1, particle.life * 4) * (1 - particle.life / particle.maxLife)
        const color =
          particle.color === 'red'
            ? `rgba(255, 104, 117, ${alpha * 0.72})`
            : particle.color === 'violet'
              ? `rgba(148, 131, 255, ${alpha * 0.72})`
              : `rgba(113, 243, 255, ${alpha * 0.82})`
        context.beginPath()
        context.fillStyle = color
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        context.fill()
        if (particle.size > 1.6) {
          context.strokeStyle = color.replace(/[\d.]+\)$/, `${alpha * 0.28})`)
          context.lineWidth = 0.7
          context.beginPath()
          context.moveTo(particle.x - particle.vx * 0.08, particle.y)
          context.lineTo(particle.x, particle.y)
          context.stroke()
        }
      }
      context.restore()

      // Discrete bit pulses provide a readable information-flow cue.
      if (active) {
        const pulseCount = 3
        for (let i = 0; i < pulseCount; i += 1) {
          const progress = ((time * 0.42 + i / pulseCount) % 1 + 1) % 1
          const x = 22 + progress * (width - 44)
          const fade = Math.sin(progress * Math.PI) * 0.8
          const bit = current.currentBit
          context.save()
          context.globalAlpha = fade
          context.translate(x, centerY - 30 + Math.sin(time * 1.4 + i) * 3)
          context.fillStyle = 'rgba(7, 16, 25, 0.9)'
          context.strokeStyle = bit === 1 ? 'rgba(111, 237, 255, 0.8)' : 'rgba(145, 127, 255, 0.8)'
          context.lineWidth = 0.8
          drawRoundedRect(-11, -7, 22, 14, 4)
          context.fill()
          context.stroke()
          context.fillStyle = bit === 1 ? '#7defff' : '#ad9dff'
          context.font = '600 8px "JetBrains Mono", monospace'
          context.textAlign = 'center'
          context.textBaseline = 'middle'
          context.fillText(bit === null ? '·' : String(bit), 0, 0.5)
          context.restore()
        }
      }

      if (current.jammed) {
        context.save()
        const jam = current.jamStrength / 100
        const noiseAlpha = 0.02 + jam * 0.06
        context.fillStyle = `rgba(255, 91, 111, ${noiseAlpha})`
        context.fillRect(0, 0, width, height)
        for (let i = 0; i < 16; i += 1) {
          const x = (Math.sin(time * 0.9 + i * 4.2) * 0.5 + 0.5) * width
          const y = (Math.sin(time * 1.7 + i * 2.1) * 0.5 + 0.5) * height
          context.strokeStyle = `rgba(255, 100, 112, ${0.05 + jam * 0.07})`
          context.beginPath()
          context.moveTo(x - 10, y)
          context.lineTo(x + 10, y)
          context.stroke()
        }
        context.restore()
      }

      // Traveling scan pass.
      const scanX = ((time * 0.14) % 1) * width
      const scanGradient = context.createLinearGradient(scanX - 24, 0, scanX + 24, 0)
      scanGradient.addColorStop(0, 'rgba(128, 232, 255, 0)')
      scanGradient.addColorStop(0.5, active ? 'rgba(128, 232, 255, 0.09)' : 'rgba(128, 232, 255, 0.028)')
      scanGradient.addColorStop(1, 'rgba(128, 232, 255, 0)')
      context.fillStyle = scanGradient
      context.fillRect(scanX - 24, 0, 48, height)

      // Corner micro-ticks like a measurement instrument.
      context.save()
      context.strokeStyle = 'rgba(120, 230, 255, 0.26)'
      context.lineWidth = 1
      const tick = 12
      context.beginPath()
      context.moveTo(12, 16)
      context.lineTo(12 + tick, 16)
      context.moveTo(12, 16)
      context.lineTo(12, 16 + tick)
      context.moveTo(width - 12, height - 16)
      context.lineTo(width - 12 - tick, height - 16)
      context.moveTo(width - 12, height - 16)
      context.lineTo(width - 12, height - 16 - tick)
      context.stroke()
      context.restore()

      if (!active) {
        context.save()
        context.fillStyle = 'rgba(119, 192, 214, 0.35)'
        context.font = '500 8px "JetBrains Mono", monospace'
        context.textAlign = 'center'
        context.fillText('CHANNEL QUIET · AWAITING CARRIER', width / 2, height - 24)
        context.restore()
      }

      frame = requestAnimationFrame(render)
    }

    frame = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="airgap-canvas" aria-hidden="true" />
}
