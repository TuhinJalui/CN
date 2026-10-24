import type { InfoTopic } from './lib/types'

export const INFO_TOPICS: Record<string, InfoTopic> = {
  airgap: {
    eyebrow: 'TOPOLOGY / 01',
    title: 'How the air gap is bridged',
    body:
      'Two isolated machines share no network path in this model. The only modelled channel between them is an acoustic one: a speaker emits high-frequency tones and a microphone on the isolated receiver observes them. This is a research architecture, not proof that a particular physical room can be covertly bridged.',
    points: [
      'No Ethernet, Wi-Fi, Bluetooth or storage hand-off is used in the model.',
      'The channel is intentionally visible, narrow-band and easy to disrupt.',
      'An air gap remains a layered control, not a single absolute barrier.',
    ],
  },
  fsk: {
    eyebrow: 'PHYSICAL LAYER / 02',
    title: 'Binary frequency-shift keying',
    body:
      'Frequency-shift keying maps each binary symbol to a carrier frequency. Here a 0 selects FREQ 0 and a 1 selects FREQ 1. The receiver does not read a voltage level; it estimates which of the two tone frequencies is present.',
    points: [
      'Higher frequency produces denser oscillations in the plot.',
      'The waveform plot is time-compressed for legibility; carrier and symbol values are the actual model parameters.',
      'Continuous phase and receiver clock recovery matter in a real implementation.',
    ],
  },
  fft: {
    eyebrow: 'RECEIVER / 03',
    title: 'Why the receiver uses an FFT',
    body:
      'The microphone captures a mixture of tone, room noise and unwanted signals. A windowed Fast Fourier Transform converts a short block of time-domain samples into a frequency spectrum, making the two carriers measurable as peaks.',
    points: [
      'The decision compares energy near FREQ 0 and FREQ 1.',
      'A larger margin generally means a more reliable symbol decision.',
      'The 22.05 kHz marker is the ideal Nyquist limit for 44.1 kHz sampling.',
    ],
  },
  crc: {
    eyebrow: 'DATA-LINK / 04',
    title: 'CRC is an integrity check, not encryption',
    body:
      'The packet carries a 16-bit CRC computed over the length and payload bytes. After demodulation the receiver recomputes that value. A mismatch causes the packet to be rejected because at least one bit was corrupted.',
    points: [
      'CRC-16/CCITT detects many accidental bit errors but is not cryptographic authentication.',
      'A corrupted packet is rejected rather than silently displayed.',
      'Retransmission is the simplest recovery strategy for this low-rate channel.',
    ],
  },
  scope: {
    eyebrow: 'TIME DOMAIN / 05',
    title: 'Reading the oscilloscope',
    body:
      'The upper trace is the received time-domain signal. The dashed reference is the clean transmitted symbol. Differences between them show how noise, jamming, multipath and hardware response distort information.',
    points: [
      'Amplitude is normalised for display; the exact ADC scale is simulated.',
      'Heavier trace corruption corresponds to lower symbol confidence in the FFT path.',
      'A good-looking waveform is not sufficient proof of correct decoding — CRC closes the loop.',
    ],
  },
  channel: {
    eyebrow: 'CHANNEL MODEL / 06',
    title: 'What the hardware model changes',
    body:
      'The laboratory models distance loss, room reflections, speaker and microphone response, automatic gain control, compression and high-frequency filtering. These are user-configured parameters, not calibrated measurements of a specific device.',
    points: [
      'Distance lowers signal level while noise stays present.',
      'Reflections create delayed copies and can smear the spectrum.',
      'AGC can raise both signal and noise; it does not create information.',
    ],
  },
  handshake: {
    eyebrow: 'SYNCHRONISATION / 07',
    title: 'Why a sonic handshake exists',
    body:
      'Before payload bits, a sync tone and timing exchange establish a shared symbol clock. Without timing alignment, the receiver may sample during transitions or select the wrong frequency bins.',
    points: [
      'Detection latency, missed detections and false detections are explicitly important evaluation metrics.',
      'The numbers shown in this interface are model outputs or illustrative values.',
      'An ACK stage closes the timing loop before data is sent.',
    ],
  },
  stego: {
    eyebrow: 'RESEARCH VISUAL / 08',
    title: 'Acoustic concealment is conceptual here',
    body:
      'This view illustrates a cover waveform plus a high-frequency hidden component. It is not an encoder, an audio export tool or a practical covert-channel deployment. Real masking depends on loudspeaker response, room noise, listener position and legal/ethical boundaries.',
    points: [
      'The hidden symbols are deliberately highlighted so the concept can be inspected.',
      'Natural acoustic cover is much less controllable than digital cover media.',
      'Use only in an authorised laboratory with informed participants.',
    ],
  },
  defense: {
    eyebrow: 'DEFENSIVE ANALYSIS / 09',
    title: 'Reducing an unexpected acoustic path',
    body:
      'Defensive engineering starts with removing unnecessary transducers, then restricting access to audio hardware and monitoring for unexpected high-frequency emissions. Air-gap security should be tested as a system rather than assumed from network separation.',
    points: [
      'Remove speakers and microphones from hosts that do not need them.',
      'Control personal devices and audio-capable peripherals near the isolated environment.',
      'Use calibrated near-ultrasonic monitoring and periodic emanation testing in an authorised lab.',
    ],
  },
  metrics: {
    eyebrow: 'TELEMETRY / 10',
    title: 'Simulated numbers, not paper results',
    body:
      'Every BER, PER, SNR, latency, throughput and CRC figure shown is generated by this interactive model or configured by the user. The supplied research paper describes an architecture and implementation plan, not measured experimental results.',
    points: [
      'Hardware response, OS audio processing and room acoustics vary widely.',
      'The 18–21 kHz region is near-ultrasonic/high-frequency audio, not guaranteed inaudible.',
      'Do not cite these figures as empirical findings.',
    ],
  },
  nyquist: {
    eyebrow: 'SAMPLING / 11',
    title: 'The 22.05 kHz boundary',
    body:
      'At 44.1 kHz sampling, the ideal Nyquist frequency is 22.05 kHz. A 20 kHz carrier is represented in theory, but anti-alias filters, speaker roll-off and microphone response may attenuate it long before the mathematical limit.',
    points: [
      'Choose a sample rate comfortably above the highest carrier of interest.',
      'A frequency below Nyquist does not guarantee a usable signal-to-noise ratio.',
      'Perception varies by listener, level and content; “inaudible” is not a universal claim.',
    ],
  },
}

export const DISCLAIMER =
  'Architecture simulation / conceptual visualization. All telemetry is simulated or user-configured; no measured results from the paper are reproduced. Near-ultrasonic audio is not guaranteed inaudible. Jamming is modelled for authorised laboratory study only.'

export const PRESENTATION_NOTES: Record<string, { act: string; title: string; body: string }> = {
  idle: {
    act: '01 / THE AIR GAP',
    title: 'A gap with no network path',
    body:
      'Two isolated computers. No Ethernet, no Wi-Fi. The laboratory asks a narrow question: can structured information cross this physical gap as sound?',
  },
  framing: {
    act: '02 / THE PAYLOAD',
    title: 'Payload becomes structure',
    body:
      'The application payload is encoded as UTF-8 bytes, wrapped with a preamble, length field and CRC, then serialised into a binary frame.',
  },
  modulating: {
    act: '03 / FSK MODULATION',
    title: 'Bits become tones',
    body:
      'A 0 selects 18 kHz and a 1 selects 20 kHz. The resulting frequency-shift keyed signal reaches the speaker as a sequence of tonal symbols.',
  },
  channel: {
    act: '04 / ACOUSTIC PROPAGATION',
    title: 'Information crosses the gap',
    body:
      'The speaker radiates pressure waves. The microphone captures a mixture of the intended symbols, room noise, reflections and hardware coloration.',
  },
  demodulating: {
    act: '05 / FFT & DECISION',
    title: 'Tones become bits again',
    body:
      'A windowed FFT resolves the captured symbol into frequency energy. The larger peak determines whether a 1 or a 0 is decoded.',
  },
  verifying: {
    act: '06 / INTEGRITY',
    title: 'CRC closes the loop',
    body:
      'The receiver recomputes CRC-16 over the decoded frame. If the values match, the packet is accepted; if not, it is rejected.',
  },
  complete: {
    act: '07 / RECOVERY',
    title: 'Air gap bridged in the model',
    body:
      'The original payload is recovered with no network connection. The demo can now be repeated with controlled noise and jamming to show how fragility is managed.',
  },
  failed: {
    act: '07 / INTEGRITY FAILURE',
    title: 'The channel won this round',
    body:
      'Bit errors changed the decoded frame, and CRC rejected the corrupted packet. Reliability comes from redundancy, retransmission and a controlled acoustic environment.',
  },
}
