import { useEffect } from 'react'
import {
  ArrowRight,
  AudioLines,
  Check,
  Cpu,
  Mic,
  Orbit,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Speaker,
  TriangleAlert,
  X,
} from 'lucide-react'
import type { TransmissionRun } from '../lib/types'
import { crcHex, displayPayload } from '../lib/sim'
import { Tag, cx } from './ui'

export function CompletionOverlay({
  run,
  onClose,
  onRetry,
  onOpen3D,
}: {
  run: TransmissionRun | null
  onClose: () => void
  onRetry: () => void
  onOpen3D: () => void
}) {
  useEffect(() => {
    if (!run) return undefined
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [run, onClose])

  if (!run) return null
  const success = run.crcValid && run.syncLocked

  return (
    <div className={cx('modal-backdrop completion-backdrop', success ? 'is-success' : 'is-failed')} role="dialog" aria-modal="true" aria-label="Transmission result">
      <div className={cx('completion-modal', success ? 'is-success' : 'is-failed')}>
        <div className="completion-scan" aria-hidden="true" />
        <div className="completion-corner tl" />
        <div className="completion-corner tr" />
        <div className="completion-corner bl" />
        <div className="completion-corner br" />

        <header className="completion-head">
          <div className="completion-kicker">
            <span className={cx('completion-dot', success ? 'green' : 'red')} />
            TRANSMISSION RESULT / PKT {String(run.id).slice(-4).padStart(4, '0')}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close result">
            <X size={18} />
          </button>
        </header>

        <div className="completion-emblem">
          <div className="emblem-rings">
            <span />
            <span />
            <span />
          </div>
          <div className="emblem-core">
            {success ? <ShieldCheck size={34} /> : <ShieldAlert size={34} />}
          </div>
        </div>

        <div className="completion-title-block">
          <span className="completion-eyebrow">
            {success ? 'ACOUSTIC TRANSFER COMPLETE' : 'PACKET INTEGRITY EVENT'}
          </span>
          <h1>{success ? 'AIR GAP BRIDGED' : 'CRC REJECTED THE FRAME'}</h1>
          <p>
            {success
              ? 'A structured payload crossed a modelled physical air gap as sound and was reconstructed with no network path.'
              : 'Noise or jamming corrupted at least one symbol. The integrity gate correctly refused to deliver the payload.'}
          </p>
        </div>

        <div className="completion-badges">
          <span className={cx('completion-badge', success ? 'is-valid' : 'is-invalid')}>
            {success ? <Check size={13} /> : <X size={13} />}
            {success ? 'CRC VERIFIED' : 'CRC FAILED'}
          </span>
          <span className={cx('completion-badge', run.syncLocked ? 'is-valid' : 'is-invalid')}>
            {run.syncLocked ? <Check size={13} /> : <TriangleAlert size={13} />}
            {run.syncLocked ? 'SYNC LOCKED' : 'SYNC UNSTABLE'}
          </span>
          <span className="completion-badge is-neutral">
            <AudioLines size={13} />
            NO NETWORK PATH
          </span>
        </div>

        <div className="completion-payload-panel">
          <div className="payload-result-main">
            <span>{success ? 'RECOVERED PAYLOAD' : 'FRAME DECISION'}</span>
            <strong className={success ? '' : 'tone-red'}>
              {success ? displayPayload(run.decodedText) || '∅' : 'DISCARDED'}
            </strong>
            <small>UTF-8 · {run.packet.payloadBytes.length} bytes · {run.packet.bits.length} bits</small>
          </div>
          <div className="payload-result-stat">
            <span>EXPECTED CRC</span>
            <strong>{crcHex(run.crcExpected)}</strong>
          </div>
          <div className="payload-result-stat">
            <span>RECEIVED CRC</span>
            <strong className={success ? 'tone-green' : 'tone-red'}>{crcHex(run.crcReceived)}</strong>
          </div>
          <div className="payload-result-stat">
            <span>BIT ERRORS</span>
            <strong className={run.bitErrors ? 'tone-red' : 'tone-green'}>{run.bitErrors}</strong>
          </div>
          <div className="payload-result-stat">
            <span>MODELLED SNR</span>
            <strong>{run.snrDb.toFixed(1)} dB</strong>
          </div>
        </div>

        <div className="completion-architecture">
          <div className="arch-endpoint">
            <span className="arch-icon"><Cpu size={17} /></span>
            <strong>ISOLATED TX</strong>
            <small>payload</small>
          </div>
          <div className="arch-link">
            <span className="arch-arrow" />
            <span className="arch-node"><Speaker size={15} /> TX</span>
            <span className={cx('arch-wave', success && 'is-valid', !success && 'is-error')}>
              〰〰〰〰〰
            </span>
            <span className="arch-node"><Mic size={15} /> RX</span>
            <span className="arch-arrow" />
          </div>
          <div className="arch-endpoint">
            <span className="arch-icon"><Cpu size={17} /></span>
            <strong>ISOLATED RX</strong>
            <small>{success ? 'verified payload' : 'rejected frame'}</small>
          </div>
        </div>

        <div className="completion-stack">
          {['APPLICATION', 'DATA-LINK', 'PHYSICAL FSK', 'ACOUSTIC I/O'].map((layer, index) => (
            <div key={layer} className={cx('stack-glow', success && 'is-valid')}>
              <span>L{4 - index}</span>
              <strong>{layer}</strong>
              <i />
            </div>
          ))}
        </div>

        <div className="completion-footer">
          <div className="completion-takeaway">
            {success ? (
              <>
                <ShieldCheck size={15} />
                <span><strong>Defensive takeaway:</strong> remove or restrict audio transducers on isolated systems.</span>
              </>
            ) : (
              <>
                <TriangleAlert size={15} />
                <span><strong>Reliability note:</strong> reduce noise, lower distance, or retransmit with a cleaner channel.</span>
              </>
            )}
          </div>
          <div className="completion-actions">
            <button type="button" className="ghost-button" onClick={onClose}>
              RETURN TO LAB
            </button>
            {success ? (
              <button type="button" className="ghost-button" onClick={onOpen3D}>
                <Orbit size={14} /> INSPECT 3D
              </button>
            ) : (
              <button type="button" className="ghost-button danger" onClick={onRetry}>
                <RotateCcw size={14} /> RETRY
              </button>
            )}
            <button type="button" className="primary-small" onClick={onClose}>
              <ArrowRight size={14} /> CONTINUE
            </button>
          </div>
        </div>

        <div className="completion-footer-tag">
          <Tag tone={success ? 'amber' : 'neutral'}>SIMULATED RESULT · NOT PAPER DATA</Tag>
          <span>Near-ultrasonic audio is not guaranteed inaudible. Controlled jamming is an authorised-lab activity.</span>
        </div>
      </div>
    </div>
  )
}
