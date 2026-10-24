export type LabMode = 'overview' | 'signal' | 'experiment' | 'defense' | 'stego'

export type RunPhase =
  | 'idle'
  | 'framing'
  | 'modulating'
  | 'channel'
  | 'demodulating'
  | 'verifying'
  | 'complete'
  | 'failed'

export type FlowStage =
  | 'payload'
  | 'binary'
  | 'frame'
  | 'crc'
  | 'fsk'
  | 'acoustic'
  | 'fft'
  | 'demod'
  | 'verify'
  | 'recovered'

export interface SimConfig {
  payload: string
  sampleRate: number
  f0: number
  f1: number
  symbolMs: number
  snrDb: number
  noiseLevel: number
  jammer: boolean
  jamStrength: number
  distortion: number
  distance: number
  reflections: number
  speakerResponse: number
  micResponse: number
  agc: boolean
  processing: boolean
  handshake: boolean
}

export interface AcousticPacket {
  payload: string
  payloadBytes: Uint8Array
  preambleBits: number[]
  lengthBits: number[]
  payloadBits: number[]
  crcBits: number[]
  bits: number[]
  crcValue: number
  preambleLength: number
  lengthLength: number
  payloadLength: number
  crcLength: number
}

export interface SpectrumFrame {
  freqs: number[]
  db: number[]
  peakFrequency: number
  detectedBit: 0 | 1
  energy0: number
  energy1: number
  marginDb: number
  noiseFloorDb: number
  snrDb: number
  txFrequency: number
  symbolSeed: number
}

export interface SymbolFrame {
  samples: number[]
  txSamples: number[]
  spectrum: SpectrumFrame
  expectedBit: number
  detectedBit: number
  bitsFlipped: boolean
}

export interface TransmissionRun {
  id: number
  seed: number
  packet: AcousticPacket
  demodBits: number[]
  decodedBytes: number[]
  decodedText: string
  errorIndexes: number[]
  bitErrors: number
  crcExpected: number
  crcReceived: number
  crcComputed: number
  crcValid: boolean
  snrDb: number
  fftMarginDb: number
  frameSnr: number[]
  detectionLatencyMs: number
  packetDurationMs: number
  throughputBps: number
  rawBitRateBps: number
  syncLocked: boolean
}

export interface SweepPoint {
  snr: number
  ber: number
  per: number
  throughput: number
  latency: number
  fftMargin: number
  syncStability: number
}

export interface SweepResult {
  points: SweepPoint[]
  sampleRate: number
  f0: number
  f1: number
  generatedAt: number
}

export interface InfoTopic {
  eyebrow: string
  title: string
  body: string
  points?: string[]
}
