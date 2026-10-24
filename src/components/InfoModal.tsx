import { useEffect } from 'react'
import { BookOpen, CircleAlert, X } from 'lucide-react'
import { INFO_TOPICS } from '../content'
import { Tag } from './ui'

export function InfoModal({ topic, onClose }: { topic: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!topic) return undefined
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [topic, onClose])

  if (!topic) return null
  const content = INFO_TOPICS[topic]
  if (!content) return null

  return (
    <div className="modal-backdrop info-backdrop" role="dialog" aria-modal="true" aria-labelledby="info-title">
      <div className="info-modal">
        <div className="info-modal-rail" aria-hidden="true">
          <span>SCIENTIFIC EXPLANATION</span>
          <span>FIG. {content.eyebrow.split(' / ')[1] || 'A'}</span>
        </div>
        <div className="info-modal-body">
          <header className="modal-head">
            <div>
              <span className="panel-eyebrow">{content.eyebrow}</span>
              <h2 id="info-title">What is happening?</h2>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close explanation">
              <X size={17} />
            </button>
          </header>
          <div className="info-main">
            <div className="info-icon"><BookOpen size={24} /></div>
            <h3>{content.title}</h3>
            <p>{content.body}</p>
            {content.points && (
              <ul className="info-points">
                {content.points.map((point) => (
                  <li key={point}><span />{point}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="info-boundary">
            <CircleAlert size={13} />
            <span>
              This is an architecture visualization. Values are simulated or user-configured and are not measured
              results from the supplied paper.
            </span>
          </div>
          <footer className="modal-foot info-foot">
            <div className="info-tags">
              <Tag tone="amber">SIMULATED</Tag>
              <Tag tone="neutral">PAPER-INSPIRED</Tag>
            </div>
            <button type="button" className="primary-small" onClick={onClose}>RETURN TO LAB</button>
          </footer>
        </div>
      </div>
    </div>
  )
}
