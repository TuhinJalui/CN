/**
 * Small, dependency-free DSP kit for the acoustic bridge simulation.
 * The receiver path deliberately uses an actual windowed FFT so the plotted
 * spectrum and symbol decisions share the same mathematical source.
 */

export interface FFTResult {
  magnitudes: Float32Array
  frequencies: Float32Array
  fftSize: number
}

export function nextPowerOfTwo(value: number): number {
  return 2 ** Math.ceil(Math.log2(Math.max(2, value)))
}

/** In-place radix-2 Cooley–Tukey FFT. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length
  let j = 0
  for (let i = 1; i < n; i += 1) {
    let bit = n >> 1
    while (j & bit) {
      j ^= bit
      bit >>= 1
    }
    j ^= bit
    if (i < j) {
      const tr = re[i]
      re[i] = re[j]
      re[j] = tr
      const ti = im[i]
      im[i] = im[j]
      im[j] = ti
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len
    const wLenRe = Math.cos(angle)
    const wLenIm = Math.sin(angle)
    for (let i = 0; i < n; i += len) {
      let wRe = 1
      let wIm = 0
      for (let k = 0; k < len / 2; k += 1) {
        const uRe = re[i + k]
        const uIm = im[i + k]
        const vRe = re[i + k + len / 2] * wRe - im[i + k + len / 2] * wIm
        const vIm = re[i + k + len / 2] * wIm + im[i + k + len / 2] * wRe
        re[i + k] = uRe + vRe
        im[i + k] = uIm + vIm
        re[i + k + len / 2] = uRe - vRe
        im[i + k + len / 2] = uIm - vIm
        const nextWRe = wRe * wLenRe - wIm * wLenIm
        wIm = wRe * wLenIm + wIm * wLenRe
        wRe = nextWRe
      }
    }
  }
}

export function computeSpectrum(
  samples: ArrayLike<number>,
  sampleRate: number,
  requestedSize = 4096,
): FFTResult {
  const fftSize = nextPowerOfTwo(requestedSize)
  const re = new Float64Array(fftSize)
  const im = new Float64Array(fftSize)
  const count = Math.min(samples.length, fftSize)

  // Hann window reduces spectral leakage; the signal length is much shorter
  // than the FFT, which gives the display a high-resolution interpolated peak.
  for (let i = 0; i < count; i += 1) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / Math.max(1, count - 1))
    re[i] = samples[i] * w
  }

  fft(re, im)

  const bins = fftSize / 2
  const magnitudes = new Float32Array(bins)
  const frequencies = new Float32Array(bins)
  const norm = 2 / Math.max(1, count)
  for (let i = 0; i < bins; i += 1) {
    magnitudes[i] = Math.hypot(re[i], im[i]) * norm
    frequencies[i] = (i * sampleRate) / fftSize
  }

  return { magnitudes, frequencies, fftSize }
}

export function interpolatePeak(
  result: FFTResult,
  lowHz: number,
  highHz: number,
): { frequency: number; magnitude: number } {
  const { magnitudes, frequencies } = result
  let bestIndex = -1
  let best = -1
  for (let i = 1; i < magnitudes.length - 1; i += 1) {
    const f = frequencies[i]
    if (f < lowHz || f > highHz) continue
    if (magnitudes[i] > best) {
      best = magnitudes[i]
      bestIndex = i
    }
  }

  if (bestIndex <= 0) return { frequency: lowHz, magnitude: 0 }

  const a = magnitudes[bestIndex - 1]
  const b = magnitudes[bestIndex]
  const c = magnitudes[bestIndex + 1]
  const denominator = a - 2 * b + c
  const offset = denominator === 0 ? 0 : (0.5 * (a - c)) / denominator
  const frequency = frequencies[bestIndex] + offset * (frequencies[1] - frequencies[0])
  return { frequency, magnitude: Math.max(0, b - Math.abs(offset) * 0.15 * b) }
}

export function meanBandDb(
  result: FFTResult,
  lowHz: number,
  highHz: number,
  exclude: Array<[number, number]> = [],
): number {
  const { magnitudes, frequencies } = result
  let sum = 0
  let count = 0
  for (let i = 1; i < magnitudes.length; i += 1) {
    const f = frequencies[i]
    if (f < lowHz || f > highHz) continue
    if (exclude.some(([lo, hi]) => f >= lo && f <= hi)) continue
    sum += magnitudes[i] * magnitudes[i]
    count += 1
  }
  if (count === 0) return -120
  return 10 * Math.log10(Math.max(1e-14, sum / count))
}

/**
 * Build a display-ready dB spectrum in the ultrasonic region. Values are
 * normalised around the measured peak so the UI can preserve near/far
 * dynamic range without flattening the noise floor.
 */
export function spectrumToDisplay(
  result: FFTResult,
  fromHz: number,
  toHz: number,
  points = 320,
): { freqs: number[]; db: number[] } {
  const freqs: number[] = []
  const db: number[] = []
  const binHz = result.frequencies[1] - result.frequencies[0]
  const maxBin = Math.min(result.magnitudes.length - 1, Math.floor(toHz / binHz))
  let peak = 1e-9
  for (let i = 0; i <= maxBin; i += 1) peak = Math.max(peak, result.magnitudes[i])
  const reference = 20 * Math.log10(peak)

  for (let p = 0; p < points; p += 1) {
    const f = fromHz + ((toHz - fromHz) * p) / (points - 1)
    const bin = f / binHz
    const lo = Math.max(0, Math.floor(bin) - 1)
    const hi = Math.min(result.magnitudes.length - 1, Math.ceil(bin) + 1)
    let m = 0
    for (let i = lo; i <= hi; i += 1) m = Math.max(m, result.magnitudes[i])
    const valueDb = 20 * Math.log10(Math.max(1e-9, m)) - reference
    freqs.push(f)
    db.push(valueDb)
  }
  return { freqs, db }
}

export function fmtFrequency(hz: number): string {
  return `${(hz / 1000).toFixed(2)} kHz`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function linToDb(value: number, floor = -120): number {
  return value <= 0 ? floor : Math.max(floor, 20 * Math.log10(value))
}
