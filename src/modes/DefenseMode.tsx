import { useMemo, useState } from 'react'
import {
  AudioLines,
  Blocks,
  Check,
  Headphones,
  LockKeyhole,
  Mic,
  Monitor,
  Radio,
  ScanSearch,
  ShieldCheck,
  Speaker,
  TriangleAlert,
  Waves,
} from 'lucide-react'
import type { SimulationController } from '../hooks/useSimulation'
import { SectionIntro, SimulatedBadge, Tag, cx } from '../components/ui'

interface Mitigations {
  hardware: boolean
  restrictions: boolean
  monitoring: boolean
  testing: boolean
}

const MITIGATIONS = [
  {
    key: 'hardware' as const,
    title: 'Remove unnecessary audio hardware',
    short: 'HARDWARE REMOVAL',
    description:
      'Physically remove or disable speakers and microphones from hosts that do not need them. A transducer that is not present cannot be repurposed by software alone.',
    icon: Speaker,
    riskReduction: 27,
    layer: 'SOURCE',
  },
  {
    key: 'restrictions' as const,
    title: 'Restrict microphones and personal devices',
    short: 'AUDIO RESTRICTIONS',
    description:
      'Control audio-capable peripherals and personal devices near the isolated environment. Policy must be paired with technical enforcement at the boundary.',
    icon: Mic,
    riskReduction: 22,
    layer: 'RECEIVER',
  },
  {
    key: 'monitoring' as const,
    title: 'Monitor unexpected high-frequency activity',
    short: 'HF MONITORING',
    description:
      'Deploy calibrated near-ultrasonic monitoring for unexpected tonal energy. Detection is model- and placement-sensitive; it is not a guarantee of absence.',
    icon: ScanSearch,
    riskReduction: 18,
    layer: 'CHANNEL',
  },
  {
    key: 'testing' as const,
    title: 'Test unintended emanation paths',
    short: 'EMANATION TESTING',
    description:
      'Periodically inspect the whole room — not just the host — for unintended acoustic, electrical or optical paths in an authorised laboratory.',
    icon: Waves,
    riskReduction: 17,
    layer: 'PROCESS',
  },
]

export function DefenseMode({ sim, onInfo }: { sim: SimulationController; onInfo: (key: string) => void }) {
  const [mitigations, setMitigations] = useState<Mitigations>({
    hardware: false,
    restrictions: false,
    monitoring: false,
    testing: false,
  })

  const residual = useMemo(() => {
    return Math.max(4, 100 - MITIGATIONS.reduce((sum, item) => sum + (mitigations[item.key] ? item.riskReduction : 0), 0))
  }, [mitigations])

  const posture =
    residual > 70 ? 'EXPOSED' : residual > 45 ? 'PARTIAL' : residual > 20 ? 'HARDENED' : 'RESILIENT'
  const applied = MITIGATIONS.filter((item) => mitigations[item.key]).length
  const toggle = (key: keyof Mitigations) =>
    setMitigations((current) => ({ ...current, [key]: !current[key] }))

  return (
    <div className="mode-page defense-page">
      <SectionIntro
        kicker="05 / DEFENSIVE ANALYSIS & MITIGATION"
        title={<>Close the acoustic path</>}
        description="Network isolation is a starting condition, not a complete acoustic guarantee. This conceptual hardening model shows the attack surface described by the architecture and the controls that reduce its exposure."
        right={
          <div className="intro-status-panel">
            <SimulatedBadge label="CONCEPTUAL" />
            <span>NO MEASURED EFFICACY CLAIM</span>
            <span>
              LINK CONTEXT / {sim.config.jammer ? 'JAMMED' : 'CLEAR'} · {sim.config.distance.toFixed(1)} M
            </span>
            <button className="ghost-button" type="button" onClick={() => onInfo('defense')}>
              <ShieldCheck size={13} /> METHOD
            </button>
          </div>
        }
      />

      <div className="defense-layout">
        <div className="defense-main">
          <section className="panel attack-surface-panel">
            <div className="panel-head">
              <div className="panel-head-copy">
                <span className="panel-index">09</span>
                <div className="panel-title-group">
                  <div className="panel-eyebrow">THREAT MODEL / ACOUSTIC SURFACE</div>
                  <h2>Where the path exists</h2>
                </div>
              </div>
              <div className="panel-head-actions">
                <Tag tone="neutral">AIR-GAPPED HOSTS</Tag>
                <button className="explain-btn" type="button" onClick={() => onInfo('airgap')}>
                  <ShieldCheck size={13} /> <span>What is happening?</span>
                </button>
              </div>
            </div>

            <div className="attack-chain">
              <div className={cx('attack-node source', mitigations.hardware && 'is-mitigated')}>
                <div className="attack-node-top">
                  <span>01 / EMITTER</span>
                  <span className={cx('risk-indicator', mitigations.hardware ? 'low' : 'high')}>{mitigations.hardware ? 'REMOVED' : 'EXPOSED'}</span>
                </div>
                <div className="attack-node-icon"><Speaker size={26} /></div>
                <strong>Speaker / transducer</strong>
                <p>Converts electrical signal into pressure waves.</p>
                <span className="attack-node-footer">HARDWARE SURFACE</span>
              </div>

              <div className={cx('attack-vector', mitigations.restrictions && 'is-restricted')}>
                <span className="vector-label">ACOUSTIC</span>
                <div className="vector-wave">
                  <span /><span /><span /><span /><span />
                </div>
                <span className="vector-detail">18–21 kHz · air</span>
                {mitigations.restrictions && <LockKeyhole size={15} className="vector-lock" />}
                {mitigations.monitoring && (
                  <span className="monitor-tap">
                    <ScanSearch size={13} /> SENSOR
                  </span>
                )}
              </div>

              <div className={cx('attack-node receiver', mitigations.restrictions && 'is-mitigated')}>
                <div className="attack-node-top">
                  <span>02 / RECEIVER</span>
                  <span className={cx('risk-indicator', mitigations.restrictions ? 'low' : 'high')}>{mitigations.restrictions ? 'RESTRICTED' : 'EXPOSED'}</span>
                </div>
                <div className="attack-node-icon"><Mic size={26} /></div>
                <strong>Microphone / personal device</strong>
                <p>Moves acoustic information back into software.</p>
                <span className="attack-node-footer">HARDWARE SURFACE</span>
              </div>

              <div className="attack-vector secondary">
                <span className="vector-label">DEMOD</span>
                <div className="vector-wave"><span /><span /><span /><span /><span /></div>
                <span className="vector-detail">FFT → bits → payload</span>
              </div>

              <div className={cx('attack-node extracted', (mitigations.hardware || mitigations.restrictions) && 'is-mitigated')}>
                <div className="attack-node-top">
                  <span>03 / IMPACT</span>
                  <span className={cx('risk-indicator', residual < 45 ? 'low' : 'medium')}>{residual < 45 ? 'REDUCED' : 'POSSIBLE'}</span>
                </div>
                <div className="attack-node-icon"><Radio size={26} /></div>
                <strong>Out-of-band data path</strong>
                <p>Information crosses without a conventional network.</p>
                <span className="attack-node-footer">RESEARCH TARGET</span>
              </div>
            </div>

            <div className="surface-notes">
              <div>
                <span className="risk-pip high" /> Physical air gap
                <strong>Blocks network transport, not acoustic propagation.</strong>
              </div>
              <div>
                <span className="risk-pip medium" /> Emitter + receiver
                <strong>Both transducers are required for this path.</strong>
              </div>
              <div>
                <span className="risk-pip low" /> Network isolation
                <strong>Necessary baseline control — not a sound proof.</strong>
              </div>
            </div>
          </section>

          <section className="panel mitigation-board">
            <div className="panel-head simple">
              <div className="panel-title-group">
                <div className="panel-eyebrow">HARDENING CONTROLS / TOGGLE TO MODEL</div>
                <h2>Mitigation matrix</h2>
              </div>
              <Tag tone="cyan">CONCEPTUAL</Tag>
            </div>
            <div className="mitigation-grid">
              {MITIGATIONS.map((item) => {
                const Icon = item.icon
                const on = mitigations[item.key]
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={cx('mitigation-card', on && 'is-applied')}
                    onClick={() => toggle(item.key)}
                  >
                    <div className="mitigation-card-top">
                      <span className="mitigation-icon"><Icon size={18} /></span>
                      <span className="mitigation-check">{on ? <Check size={13} /> : '+'}</span>
                    </div>
                    <span className="mitigation-layer">{item.layer}</span>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                    <div className="mitigation-impact-row">
                      <span>MODELLED EXPOSURE IMPACT</span>
                      <span>−{item.riskReduction}%</span>
                    </div>
                    <div className="mitigation-impact-track"><span style={{ width: on ? '100%' : '0%' }} /></div>
                  </button>
                )
              })}
            </div>
            <div className="mitigation-footnote">
              <TriangleAlert size={12} />
              Percentages are illustrative interface weights for a conceptual hardening score. They are not measured
              security efficacy.
            </div>
          </section>

          <section className="panel defensive-playbook">
            <div className="panel-head simple">
              <div className="panel-title-group">
                <div className="panel-eyebrow">DEFENSIVE PLAYBOOK</div>
                <h2>What the architecture suggests</h2>
              </div>
              <Blocks size={15} />
            </div>
            <ol className="playbook-list">
              <li>
                <span>01</span>
                <div><strong>Inventory transducers</strong><p>List speakers, microphones, headsets, conference hardware and devices capable of audio I/O near the air-gapped system.</p></div>
              </li>
              <li>
                <span>02</span>
                <div><strong>Remove what is not required</strong><p>Hardware removal is stronger than policy when an audio path has no legitimate need to exist.</p></div>
              </li>
              <li>
                <span>03</span>
                <div><strong>Control the physical perimeter</strong><p>Restrict personal devices and audio-capable peripherals in sensitive spaces; enforce the boundary, don't just document it.</p></div>
              </li>
              <li>
                <span>04</span>
                <div><strong>Monitor &amp; test</strong><p>Look for unexpected high-frequency tonal energy and test the whole room for unintended emanation paths under an authorised programme.</p></div>
              </li>
            </ol>
          </section>
        </div>

        <aside className="defense-side">
          <section className="panel posture-panel">
            <div className="panel-eyebrow">MODELLED POSTURE</div>
            <h2>Residual exposure</h2>
            <div
              className="risk-dial"
              style={{
                background: `conic-gradient(from 210deg, ${residual > 60 ? '#ff6b78' : residual > 35 ? '#ffc46b' : '#58f0a7'} 0deg ${(residual / 100) * 300}deg, rgba(255,255,255,0.06) ${(residual / 100) * 300}deg 300deg, transparent 300deg)`,
              }}
            >
              <div className="risk-dial-inner">
                <span>{residual}%</span>
                <strong>{posture}</strong>
                <small>CONCEPTUAL</small>
              </div>
            </div>
            <div className="posture-stats">
              <div><span>CONTROLS APPLIED</span><strong>{applied} / 4</strong></div>
              <div><span>PATH RELIANCE</span><strong>{mitigations.hardware && mitigations.restrictions ? 'SEVERED' : mitigations.hardware || mitigations.restrictions ? 'DEGRADED' : 'INTACT'}</strong></div>
              <div><span>NETWORK STATE</span><strong className="tone-green">ISOLATED</strong></div>
            </div>
            <div className="posture-callout">
              <Monitor size={15} />
              <span>Air gap + no audio hardware is materially different from air gap alone.</span>
            </div>
          </section>

          <section className="panel operational-envelope">
            <div className="panel-eyebrow">RESEARCH BOUNDARY</div>
            <h3>No offensive capability</h3>
            <p>
              This page is a defensive model. It does not emit an acoustic payload, enumerate devices, capture
              microphone data or claim measured mitigation effectiveness.
            </p>
            <div className="envelope-list">
              <span><Headphones size={13} /> No audio capture</span>
              <span><AudioLines size={13} /> No signal emission</span>
              <span><ShieldCheck size={13} /> Conceptual scoring only</span>
            </div>
          </section>

          <section className="panel defense-citation">
            <div className="panel-eyebrow">ARCHITECTURE CONTEXT</div>
            <p>
              The supplied paper frames this as an architecture and implementation plan. It explicitly does not
              present original measured experimental results; treat this page accordingly.
            </p>
            <div className="citation-tags">
              <Tag tone="amber">SIMULATED</Tag>
              <Tag tone="neutral">PAPER-INSPIRED</Tag>
            </div>
          </section>
        </aside>
      </div>
      <div className="defense-footer-banner">
        <span className="banner-icon"><ShieldCheck size={15} /></span>
        <div>
          <strong>Networks can be isolated. Physics still connects the room.</strong>
          <span>Assess audio transducers as part of the air-gapped system boundary.</span>
        </div>
        <Tag tone="amber">DEFENSIVE RESEARCH</Tag>
      </div>
    </div>
  )
}
