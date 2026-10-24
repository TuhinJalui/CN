import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_CONFIG,
  buildPacket,
  crcHex,
  finalizeRun,
  previewSymbol,
  synthSymbol,
} from '../lib/sim'
import type {
  AcousticPacket,
  RunPhase,
  SimConfig,
  SymbolFrame,
  TransmissionRun,
} from '../lib/types'

const FRAMING_MS = 920
const MODULATING_MS = 820
const BIT_MS = 48
const DEMOD_MS = 540
const VERIFY_MS = 920

interface Timeline {
  phase: RunPhase
  activeBit: number
  progress: number
  totalMs: number
}

function deriveTimeline(elapsed: number, packet: AcousticPacket | null): Timeline {
  if (!packet) {
    return { phase: 'idle', activeBit: -1, progress: 0, totalMs: 0 }
  }
  const dataMs = packet.bits.length * BIT_MS
  const totalMs = FRAMING_MS + MODULATING_MS + dataMs + DEMOD_MS + VERIFY_MS
  const bounded = Math.min(elapsed, totalMs)
  if (bounded < FRAMING_MS) {
    return { phase: 'framing', activeBit: -1, progress: bounded / totalMs, totalMs }
  }
  if (bounded < FRAMING_MS + MODULATING_MS) {
    return {
      phase: 'modulating',
      activeBit: -1,
      progress: bounded / totalMs,
      totalMs,
    }
  }
  if (bounded < FRAMING_MS + MODULATING_MS + dataMs) {
    const index = Math.floor((bounded - FRAMING_MS - MODULATING_MS) / BIT_MS)
    return {
      phase: 'channel',
      activeBit: Math.min(packet.bits.length - 1, index),
      progress: bounded / totalMs,
      totalMs,
    }
  }
  if (bounded < FRAMING_MS + MODULATING_MS + dataMs + DEMOD_MS) {
    return {
      phase: 'demodulating',
      activeBit: packet.bits.length - 1,
      progress: bounded / totalMs,
      totalMs,
    }
  }
  if (bounded < totalMs) {
    return {
      phase: 'verifying',
      activeBit: packet.bits.length - 1,
      progress: bounded / totalMs,
      totalMs,
    }
  }
  return {
    phase: 'verifying',
    activeBit: packet.bits.length - 1,
    progress: 1,
    totalMs,
  }
}

export function useSimulation() {
  const [config, setConfigState] = useState<SimConfig>(DEFAULT_CONFIG)
  const [packet, setPacket] = useState<AcousticPacket | null>(null)
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [terminal, setTerminal] = useState<'idle' | 'complete' | 'failed'>('idle')
  const [currentFrame, setCurrentFrame] = useState<SymbolFrame>(() =>
    previewSymbol(1, DEFAULT_CONFIG),
  )
  const [recoveredBits, setRecoveredBits] = useState<number[]>([])
  const [run, setRun] = useState<TransmissionRun | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [crcFailures, setCrcFailures] = useState(0)
  const [lifetimeBits, setLifetimeBits] = useState(0)
  const [lifetimeErrors, setLifetimeErrors] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)

  const processedRef = useRef(-1)
  const demodRef = useRef<number[]>([])
  const snrRef = useRef<number[]>([])
  const marginRef = useRef<number[]>([])
  const seedRef = useRef(0)
  const completedRef = useRef(false)

  const timeline = deriveTimeline(elapsed, packet)
  const totalMs = timeline.totalMs

  useEffect(() => {
    if (!running || paused || completedRef.current) return undefined
    const timer = window.setInterval(() => setElapsed((value) => value + 60), 60)
    return () => window.clearInterval(timer)
  }, [running, paused])

  // Process each symbol as the transmission cursor reaches it. This makes the
  // FFT, bit decisions and CRC genuinely dependent on the current channel
  // settings at the moment each symbol arrives.
  useEffect(() => {
    if (!packet || timeline.activeBit < 0 || !running) return
    const limit = Math.min(timeline.activeBit, packet.bits.length - 1)
    if (limit <= processedRef.current) return

    let latest: SymbolFrame | null = null
    let index = processedRef.current
    while (index < limit) {
      index += 1
      latest = synthSymbol(packet.bits[index], config, seedRef.current, index)
      demodRef.current[index] = latest.detectedBit
      snrRef.current[index] = latest.spectrum.snrDb
      marginRef.current[index] = latest.spectrum.marginDb
    }
    processedRef.current = limit
    if (latest) {
      setCurrentFrame(latest)
      setRecoveredBits(demodRef.current.slice(0, limit + 1))
    }
  }, [timeline.activeBit, packet, running, config])

  // Keep the idle analysis frame tied to hardware/noise settings.
  useEffect(() => {
    if (running) return undefined
    if (terminal !== 'idle') return undefined
    const timer = window.setTimeout(() => {
      setCurrentFrame(previewSymbol(1, config, Date.now() / 900))
    }, 110)
    return () => window.clearTimeout(timer)
  }, [config, running, terminal])

  useEffect(() => {
    if (!running || paused || !packet || completedRef.current) return
    if (elapsed < totalMs || totalMs === 0) return

    // Ensure the final symbol has been processed before integrity checking.
    let index = processedRef.current
    let latest: SymbolFrame | null = null
    while (index < packet.bits.length - 1) {
      index += 1
      latest = synthSymbol(packet.bits[index], config, seedRef.current, index)
      demodRef.current[index] = latest.detectedBit
      snrRef.current[index] = latest.spectrum.snrDb
      marginRef.current[index] = latest.spectrum.marginDb
    }
    processedRef.current = packet.bits.length - 1
    if (latest) setCurrentFrame(latest)
    setRecoveredBits(demodRef.current.slice())

    const result = finalizeRun(
      packet,
      demodRef.current.slice(),
      config,
      seedRef.current,
      snrRef.current.slice(),
      marginRef.current.slice(),
    )
    completedRef.current = true
    setRun(result)
    setRunning(false)
    setPaused(false)
    setTerminal(result.crcValid && result.syncLocked ? 'complete' : 'failed')
    setAttempts((value) => value + 1)
    setLifetimeBits((value) => value + result.packet.bits.length)
    setLifetimeErrors((value) => value + result.bitErrors)
    if (!result.crcValid) setCrcFailures((value) => value + 1)
  }, [elapsed, running, paused, packet, config, totalMs])

  const nyquistValid = config.f1 < config.sampleRate / 2

  const start = useCallback(() => {
    if (config.f1 >= config.sampleRate / 2) return
    const nextPacket = buildPacket(config.payload)
    const seed = (Date.now() ^ Math.imul(attempts + 1, 0x9e3779b9)) >>> 0
    seedRef.current = seed
    processedRef.current = -1
    demodRef.current = []
    snrRef.current = []
    marginRef.current = []
    completedRef.current = false

    setPacket(nextPacket)
    setRunning(true)
    setPaused(false)
    setElapsed(0)
    setTerminal('idle')
    setRun(null)
    setRecoveredBits([])
    setCurrentFrame(previewSymbol(nextPacket.bits[0] ?? 1, config, 0))
    setStartedAt(Date.now())
  }, [config, attempts])

  const pause = useCallback(() => {
    if (!running) return
    setPaused((value) => !value)
  }, [running])

  const reset = useCallback(() => {
    setRunning(false)
    setPaused(false)
    setElapsed(0)
    setPacket(null)
    setRun(null)
    setTerminal('idle')
    setRecoveredBits([])
    setAttempts(0)
    setCrcFailures(0)
    setLifetimeBits(0)
    setLifetimeErrors(0)
    setStartedAt(null)
    processedRef.current = -1
    demodRef.current = []
    snrRef.current = []
    marginRef.current = []
    completedRef.current = false
    setCurrentFrame(previewSymbol(1, config))
  }, [config])

  const updateConfig = useCallback((patch: Partial<SimConfig>) => {
    setConfigState((current) => ({ ...current, ...patch }))
  }, [])

  const setPayload = useCallback((payload: string) => {
    setConfigState((current) => ({ ...current, payload }))
  }, [])

  const phase: RunPhase = terminal !== 'idle' ? terminal : timeline.phase
  const activeBit = packet ? timeline.activeBit : -1
  const recoveredCount = recoveredBits.length
  const liveErrors = packet
    ? recoveredBits.reduce(
        (count, bit, index) => count + (bit === packet.bits[index] ? 0 : 1),
        0,
      )
    : 0
  const ber = recoveredCount > 0 ? liveErrors / recoveredCount : 0
  const crcStatus =
    terminal === 'complete'
      ? 'VALID'
      : terminal === 'failed' || run
        ? 'FAILED'
        : phase === 'verifying'
          ? 'CHECKING'
          : 'PENDING'
  const preambleBits = packet?.preambleBits.length ?? 16
  const preambleErrors = packet
    ? recoveredBits
        .slice(0, preambleBits)
        .reduce((count, bit, index) => count + (bit === packet.bits[index] ? 0 : 1), 0)
    : 0
  const syncStatus =
    terminal === 'complete'
      ? 'LOCKED'
      : phase === 'idle'
        ? 'STANDBY'
        : phase === 'framing' || phase === 'modulating'
          ? 'ARMED'
          : recoveredCount >= preambleBits
            ? preambleErrors > 2
              ? 'UNSTABLE'
              : 'LOCKED'
            : 'ACQUIRING'
  const packetDurationMs = packet ? packet.bits.length * config.symbolMs : 0
  const projectedThroughput =
    packet && packetDurationMs > 0
      ? (packet.payloadBytes.length * 8 * 1000) / packetDurationMs
      : 0
  const throughput =
    run?.throughputBps ?? (phase === 'idle' ? projectedThroughput : projectedThroughput)
  const snrDb = currentFrame.spectrum.snrDb
  const lifetimeBer = lifetimeBits > 0 ? lifetimeErrors / lifetimeBits : 0
  const activeTxBit =
    packet && activeBit >= 0 ? packet.bits[Math.min(activeBit, packet.bits.length - 1)] : null
  const currentFrequency = activeTxBit === null ? currentFrame.spectrum.txFrequency : activeTxBit ? config.f1 : config.f0
  const crcLabel = crcHex(run?.crcReceived ?? packet?.crcValue ?? 0)
  const expectedCrcLabel = crcHex(packet?.crcValue ?? 0)
  const elapsedSeconds = startedAt ? Math.max(0, (Date.now() - startedAt) / 1000) : 0

  return {
    config,
    updateConfig,
    setPayload,
    packet,
    running,
    paused,
    phase,
    terminal,
    elapsed,
    totalMs,
    progress: timeline.progress,
    activeBit,
    activeTxBit,
    currentFrequency,
    currentFrame,
    recoveredBits,
    recoveredCount,
    liveErrors,
    ber,
    crcStatus,
    crcLabel,
    expectedCrcLabel,
    syncStatus,
    nyquistValid,
    snrDb,
    throughput,
    projectedThroughput,
    attempts,
    crcFailures,
    lifetimeBits,
    lifetimeErrors,
    lifetimeBer,
    run,
    startedAt,
    elapsedSeconds,
    start,
    pause,
    reset,
  }
}

export type SimulationController = ReturnType<typeof useSimulation>
