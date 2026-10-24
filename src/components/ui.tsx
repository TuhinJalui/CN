import type { CSSProperties, ReactNode } from 'react'
import { CircleHelp, Info } from 'lucide-react'

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export function PanelHeader({
  index,
  title,
  eyebrow,
  meta,
  onInfo,
  actions,
}: {
  index?: string
  title: string
  eyebrow?: string
  meta?: ReactNode
  onInfo?: () => void
  actions?: ReactNode
}) {
  return (
    <header className="panel-head">
      <div className="panel-head-copy">
        {index && <span className="panel-index">{index}</span>}
        <div className="panel-title-group">
          <div className="panel-eyebrow">{eyebrow}</div>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="panel-head-actions">
        {meta && <div className="panel-meta">{meta}</div>}
        {onInfo && (
          <button className="explain-btn" type="button" onClick={onInfo}>
            <CircleHelp size={13} />
            <span>What is happening?</span>
          </button>
        )}
        {actions}
      </div>
    </header>
  )
}

export function InfoButton({ onClick, label = 'Explain' }: { onClick: () => void; label?: string }) {
  return (
    <button className="icon-btn" type="button" onClick={onClick} aria-label={label}>
      <Info size={15} />
    </button>
  )
}

export function SectionIntro({
  kicker,
  title,
  description,
  right,
}: {
  kicker: string
  title: ReactNode
  description: string
  right?: ReactNode
}) {
  return (
    <div className="section-intro">
      <div>
        <div className="section-kicker">{kicker}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {right && <div className="section-intro-right">{right}</div>}
    </div>
  )
}

export function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  detail,
  disabled = false,
  accent = 'cyan',
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  format?: (value: number) => string
  detail?: string
  disabled?: boolean
  accent?: 'cyan' | 'violet' | 'amber' | 'green' | 'red'
}) {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  const style = {
    '--range-fill': `${percentage}%`,
  } as CSSProperties
  return (
    <div className={cx('range-control', disabled && 'is-disabled')}>
      <div className="range-label-row">
        <span className="range-label">{label}</span>
        <span className="range-value">{format ? format(value) : value}</span>
      </div>
      <input
        className={cx('range-input', `accent-${accent}`)}
        style={style}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {detail && <div className="range-detail">{detail}</div>}
    </div>
  )
}

export function ToggleControl({
  label,
  detail,
  checked,
  onChange,
  disabled = false,
}: {
  label: string
  detail?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className={cx('toggle-control', checked && 'is-on', disabled && 'is-disabled')}>
      <span className="toggle-copy">
        <span className="toggle-label">{label}</span>
        {detail && <span className="toggle-detail">{detail}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-throb" />
      </span>
    </label>
  )
}

export function StatCell({
  label,
  value,
  tone = 'default',
  hint,
}: {
  label: string
  value: ReactNode
  tone?: 'default' | 'cyan' | 'green' | 'red' | 'amber' | 'violet'
  hint?: string
}) {
  return (
    <div className={cx('stat-cell', `tone-${tone}`)}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  )
}

export function Tag({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'cyan' | 'green' | 'red' | 'amber' | 'violet'
}) {
  return <span className={cx('tag', `tag-${tone}`)}>{children}</span>
}

export function SimulatedBadge({ label = 'SIMULATED' }: { label?: string }) {
  return (
    <span className="sim-badge">
      <span className="sim-dot" />
      {label}
    </span>
  )
}

export function CornerFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('corner-frame', className)}>
      <span className="corner corner-tl" />
      <span className="corner corner-tr" />
      <span className="corner corner-bl" />
      <span className="corner corner-br" />
      {children}
    </div>
  )
}
