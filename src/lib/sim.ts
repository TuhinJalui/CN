import {
  clamp,
  computeSpectrum,
  interpolatePeak,
  meanBandDb,
  spectrumToDisplay,
} from './dsp'
import type {
  AcousticPacket,
  SimConfig,
  SpectrumFrame,
  SweepPoint,
  SweepResult,
  SymbolFrame,
  TransmissionRun,
} from './types'

export const PREAMBLE = [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0]

export const DEFAULT_CONFIG: SimConfig = {
  payload: 'AIRGAP',
  sampleRate: 44100,
  f0: 18000,
  f1: 20000,
  symbolMs: 12.5,
  snrDb: 24,
  noiseLevel: 4,
  jammer: false,
  jamStrength: 0,
  distortion: 12,
  distance: 1.8,
  reflections: 18,
  speakerResponse: 88,
  micResponse: 92,
  agc: false,
  processing: false,
  handshake: true,
}

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export function formatBit(value: number): string {
  return value > 0 ? '1' : '0'
}

export function bytesToBits(bytes: ArrayLike<number>): number[] {
  const bits: number[] = []
  for (let i = 0; i < bytes.length; i += 1) {
    for (let b = 7; b >= 0; b -= 1) bits.push((bytes[i] >> b) & 1)
  }
  return bits
}

export function bitsToInt(bits: number[]): number {
  return bits.reduce((acc, bit) => (acc << 1) | (bit & 1), 0)
}

export function bitsToBytes(bits: number[]): number[] {
  const bytes: number[] = []
  for (let i = 0; i + 7 < bits.length; i += 8) {
    bytes.push(bitsToInt(bits.slice(i, i + 8)))
  }
  return bytes
}

export function crc16(bytes: ArrayLike<number>): number {
  let crc = 0xffff
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= (bytes[i] & 0xff) << 8
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc & 0xffff
}

export function crcHex(value: number): string {
  return `0x${(value & 0xffff).toString(16).toUpperCase().padStart(4, '0')}`
}

/** Builds the frame shown in the data-link layer. */
export function buildPacket(payload: string): AcousticPacket {
  const clipped = payload.slice(0, 48)
  const payloadBytes = new TextEncoder().encode(clipped || ' ')
  const length = Math.min(255, payloadBytes.length)
  const lengthBits = bytesToBits([length])
  const payloadBits = bytesToBits(payloadBytes)
  const crcBytes = [length, ...Array.from(payloadBytes)]
  const crcValue = crc16(crcBytes)
  const crcBits = bytesToBits([(crcValue >> 8) & 0xff, crcValue & 0xff])
  return {
    payload: clipped,
    payloadBytes,
    preambleBits: PREAMBLE.slice(),
    lengthBits,
    payloadBits,
    crcBits,
    bits: [...PREAMBLE, ...lengthBits, ...payloadBits, ...crcBits],
    crcValue,
    preambleLength: PREAMBLE.length,
    lengthLength: lengthBits.length,
    payloadLength: payloadBits.length,
    crcLength: crcBits.length,
  }
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gaussian(rand: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = rand()
  while (v === 0) v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function hashSeed(seed: number, index: number, salt = 0x9e3779b9): number {
  let x = (seed ^ Math.imul(index + 1, salt)) >>> 0
  x ^= x >>> 16
  x = Math.imul(x, 0x7feb352d)
  x ^= x >>> 15
  x = Math.imul(x, 0x846ca68b)
  x ^= x >>> 16
  return x >>> 0
}

export function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = values.slice().sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

export interface SynthSettings {
  fftSize?: number
  idle?: boolean
}

/**
 * Synthesises one received FSK symbol. Noise, jamming, multipath and hardware
 * filtering are deterministic for a given (seed, bit index), which keeps the
 * live FFT display consistent with the symbol decision used for CRC.
 */
export function synthSymbol(
  expectedBit: number,
  config: SimConfig,
  seed: number,
  bitIndex: number,
  settings: SynthSettings = {},
): SymbolFrame {
  const rand = mulberry32(hashSeed(seed, bitIndex))
  const sampleCount = Math.max(
    128,
    Math.round((config.sampleRate * Math.max(2, config.symbolMs)) / 1000),
  )
  const frequency = expectedBit ? config.f1 : config.f0
  const distanceGain = 0.78 / (1 + Math.max(0, config.distance) * 0.16)
  const speakerGain = 0.52 + (clamp(config.speakerResponse, 0, 100) / 100) * 0.48
  const micGain = 0.58 + (clamp(config.micResponse, 0, 100) / 100) * 0.42
  const highFrequencyPenalty =
    frequency > 17000 ? 0.8 + 0.2 * (clamp(config.micResponse, 0, 100) / 100) : 1
  const baseAmplitude = clamp(distanceGain * speakerGain * micGain * highFrequencyPenalty, 0.03, 0.92)
  const distortion = clamp(config.distortion / 100, 0, 1)
  const echo = clamp(config.reflections / 100, 0, 1) * (0.08 + distortion * 0.27)
  const delaySamples = Math.max(3, Math.round(config.sampleRate * (0.00018 + distortion * 0.0011)))
  const effectiveSnr = clamp(
    config.snrDb -
      config.noiseLevel * 0.14 -
      (config.jammer ? config.jamStrength * 0.11 : 0) -
      distortion * 5.5,
    -26,
    42,
  )
  const sigma =
    (baseAmplitude / Math.sqrt(2)) / 10 ** (effectiveSnr / 20) * (1 + config.noiseLevel / 55)
  const jamLevel = config.jammer ? (clamp(config.jamStrength, 0, 100) / 100) ** 1.1 : 0
  const jamAmplitude = jamLevel * 0.85
  const center = (config.f0 + config.f1) / 2
  const processingGain = config.processing ? 0.84 : 1
  const agcGain = config.agc ? 1.22 : 1
  const phaseOffset = rand() * Math.PI * 2
  const randomPhase = rand() * Math.PI * 2

  const txSamples: number[] = []
  const samples: number[] = []
  let latePeak = 0

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / config.sampleRate
    const phase = Math.PI * 2 * frequency * t + phaseOffset
    let clean = baseAmplitude * Math.sin(phase)

    if (echo > 0 && i > delaySamples) {
      const echoPhase = Math.PI * 2 * frequency * (t - delaySamples / config.sampleRate) + randomPhase
      clean += echo * baseAmplitude * Math.sin(echoPhase)
      latePeak = Math.max(latePeak, Math.abs(clean))
    }

    // A subtle drift models imperfect clock recovery / multipath interference.
    if (distortion > 0.35) {
      clean +=
        distortion *
        0.028 *
        baseAmplitude *
        Math.sin(Math.PI * 2 * (frequency + 330 + distortion * 460) * t + 1.4)
    }

    clean *= processingGain
    if (config.processing) {
      clean = Math.tanh(clean * 1.35) / 1.35
    }
    txSamples.push(clean)

    let received = clean

    if (sigma > 0) {
      // Gaussian thermal/room noise.
      received += gaussian(rand) * sigma
      if (config.noiseLevel > 55 && rand() < (config.noiseLevel - 55) / 500) {
        received += (rand() > 0.5 ? 1 : -1) * sigma * 7
      }
    }

    if (jamLevel > 0) {
      const sweep = Math.sin(Math.PI * 2 * (center - 240 + 480 * (i / sampleCount)) * t + 0.7)
      const tone = Math.sin(Math.PI * 2 * center * t + 1.8)
      const carrierBleed = Math.sin(Math.PI * 2 * config.f1 * t + 0.2) * 0.34
      received += jamAmplitude * (tone * 0.58 + sweep * 0.2 + carrierBleed)
      received += gaussian(rand) * jamLevel * 0.12
    }

    // Receiver AGC compensates level but also lifts the noise floor.
    if (config.agc) received *= agcGain + (1 - Math.min(1, i / sampleCount)) * 0.05

    // Model 16-bit capture / mild nonlinear OS audio path.
    received = Math.tanh(received * 1.55) / 1.55
    samples.push(received)
  }

  const fftSize = settings.fftSize ?? 4096
  const spectrumResult = computeSpectrum(samples, config.sampleRate, fftSize)
  const guard = Math.max(240, (config.sampleRate / fftSize) * 10)
  const peak0 = interpolatePeak(
    spectrumResult,
    Math.max(1000, config.f0 - guard),
    config.f0 + guard,
  )
  const peak1 = interpolatePeak(
    spectrumResult,
    Math.max(1000, config.f1 - guard),
    config.f1 + guard,
  )
  const detectedBit: 0 | 1 = peak1.magnitude > peak0.magnitude ? 1 : 0
  const noiseFloorDb = meanBandDb(
    spectrumResult,
    14000,
    Math.min(config.sampleRate / 2 - 200, 23000),
    [
      [config.f0 - 450, config.f0 + 450],
      [config.f1 - 450, config.f1 + 450],
      [center - 350, center + 350],
    ],
  )
  const chosen = detectedBit ? peak1 : peak0
  const peakDb = 20 * Math.log10(Math.max(1e-9, chosen.magnitude))
  const snrDb = clamp(peakDb - noiseFloorDb, -20, 48)
  const detectedFrequency =
    peak1.magnitude > peak0.magnitude ? peak1.frequency : peak0.frequency
  const display = spectrumToDisplay(spectrumResult, 16000, 24000, 330)

  const spectrum: SpectrumFrame = {
    freqs: display.freqs,
    db: display.db,
    peakFrequency: detectedFrequency,
    detectedBit,
    energy0: peak0.magnitude,
    energy1: peak1.magnitude,
    marginDb: Math.abs(20 * Math.log10(Math.max(1e-9, peak1.magnitude + 1e-9) / Math.max(1e-9, peak0.magnitude + 1e-9))),
    noiseFloorDb,
    snrDb,
    txFrequency: frequency,
    symbolSeed: hashSeed(seed, bitIndex),
  }

  return {
    samples,
    txSamples,
    spectrum,
    expectedBit,
    detectedBit,
    bitsFlipped: detectedBit !== expectedBit,
  }
}

function decodeWithLength(packet: AcousticPacket, bits: number[]): {
  decodedBytes: number[]
  decodedText: string
} {
  const start = packet.preambleLength + packet.lengthLength
  const payloadBits = bits.slice(start, start + packet.payloadLength)
  const decodedBytes = bitsToBytes(payloadBits)
  let decodedText = ''
  try {
    decodedText = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(decodedBytes))
  } catch {
    decodedText = ''
  }
  return { decodedBytes, decodedText }
}

export function finalizeRun(
  packet: AcousticPacket,
  demodBits: number[],
  config: SimConfig,
  seed: number,
  frameSnr: number[],
  margins: number[],
): TransmissionRun {
  const errorIndexes: number[] = []
  for (let i = 0; i < packet.bits.length; i += 1) {
    if ((demodBits[i] ?? 0) !== packet.bits[i]) errorIndexes.push(i)
  }
  const { decodedBytes, decodedText } = decodeWithLength(packet, demodBits)
  const rxLength = bitsToInt(demodBits.slice(packet.preambleLength, packet.preambleLength + 8))
  const crcReceived = bitsToInt(demodBits.slice(-16))
  const crcComputed = crc16([rxLength & 0xff, ...decodedBytes])
  const crcValid = crcReceived === crcComputed
  const preambleErrors = errorIndexes.filter((index) => index < packet.preambleLength).length
  const syncLocked = preambleErrors < 3
  const packetDurationMs = packet.bits.length * config.symbolMs
  const payloadBits = packet.payloadBytes.length * 8
  const throughputBps = (payloadBits / packetDurationMs) * 1000
  const rawBitRateBps = (packet.bits.length / packetDurationMs) * 1000
  const detectedFreqs = frameSnr.filter((value) => Number.isFinite(value))
  const marginSum = margins.reduce((sum, value) => sum + value, 0)

  return {
    id: seed,
    seed,
    packet,
    demodBits,
    decodedBytes,
    decodedText,
    errorIndexes,
    bitErrors: errorIndexes.length,
    crcExpected: packet.crcValue,
    crcReceived,
    crcComputed,
    crcValid,
    snrDb: clamp(median(detectedFreqs), -15, 45),
    fftMarginDb: marginSum / Math.max(1, packet.bits.length),
    frameSnr,
    detectionLatencyMs: config.symbolMs * 1.35 + 4.6 + (1 - config.snrDb / 60) * 3.2,
    packetDurationMs,
    throughputBps,
    rawBitRateBps,
    syncLocked,
  }
}

export function simulateTransmission(
  config: SimConfig,
  seed = (Date.now() ^ 0x5f3759df) >>> 0,
  options: { fftSize?: number; payload?: string } = {},
): TransmissionRun {
  const packet = buildPacket(options.payload ?? config.payload)
  const demodBits: number[] = []
  const frameSnr: number[] = []
  const margins: number[] = []

  for (let i = 0; i < packet.bits.length; i += 1) {
    const frame = synthSymbol(packet.bits[i], config, seed, i, { fftSize: options.fftSize })
    demodBits.push(frame.detectedBit)
    frameSnr.push(frame.spectrum.snrDb)
    margins.push(frame.spectrum.marginDb)
  }

  return finalizeRun(packet, demodBits, config, seed, frameSnr, margins)
}

export function symbolAtIndex(
  run: TransmissionRun | null,
  config: SimConfig,
  bitIndex: number,
): SymbolFrame {
  const index = Math.max(0, Math.min(bitIndex, (run?.packet.bits.length ?? 1) - 1))
  const bit = run?.packet.bits[index] ?? (index % 2 === 0 ? 1 : 0)
  const seed = run?.seed ?? 0x41c0ffee
  return synthSymbol(bit, config, seed, index)
}

export function previewSymbol(bit: number, config: SimConfig, timeTick = 0): SymbolFrame {
  return synthSymbol(bit, config, 0x61c88647, Math.floor(timeTick) % 97)
}

export function confidenceLabel(marginDb: number): string {
  if (marginDb >= 18) return 'LOCKED'
  if (marginDb >= 9) return 'STABLE'
  if (marginDb >= 3) return 'MARGINAL'
  return 'UNRELIABLE'
}

export function fmtSignedDb(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)} dB`
}

/**
 * Monte-Carlo style model sweep. Each point performs actual FSK synthesis,
 * noise injection and FFT decisions. It is not an empirical measurement.
 */
export function runSweep(config: SimConfig): SweepResult {
  const snrPoints = [-10, -5, 0, 5, 10, 15, 20, 25, 30]
  const trials = 4
  const points: SweepPoint[] = []
  const payload = 'sweep'

  for (let s = 0; s < snrPoints.length; s += 1) {
    const snr = snrPoints[s]
    let errors = 0
    let bits = 0
    let packetErrors = 0
    let throughput = 0
    let latency = 0
    let margin = 0
    let sync = 0

    for (let t = 0; t < trials; t += 1) {
      const trialConfig: SimConfig = {
        ...config,
        snrDb: snr,
        handshake: false,
      }
      const run = simulateTransmission(
        trialConfig,
        hashSeed(0xc0ffee + s * 17, t, 0x85ebca6b),
        { fftSize: 2048, payload },
      )
      errors += run.bitErrors
      bits += run.packet.bits.length
      if (!run.crcValid) packetErrors += 1
      throughput += run.throughputBps
      latency += run.detectionLatencyMs
      margin += run.fftMarginDb
      sync += run.syncLocked ? 1 : 0
    }

    points.push({
      snr,
      ber: errors / Math.max(1, bits),
      per: packetErrors / trials,
      throughput: throughput / trials,
      latency: latency / trials,
      fftMargin: margin / trials,
      syncStability: sync / trials,
    })
  }

  return {
    points,
    sampleRate: config.sampleRate,
    f0: config.f0,
    f1: config.f1,
    generatedAt: Date.now(),
  }
}

export function getSignalLabel(run: TransmissionRun | null): string {
  if (!run) return 'STANDBY'
  if (!run.crcValid) return 'INTEGRITY FAIL'
  return 'VERIFIED'
}

export function displayPayload(text: string): string {
  return Array.from(text)
    .map((char) => {
      const code = char.charCodeAt(0)
      if (code < 32 || code === 127) return '·'
      return char
    })
    .join('')
}
