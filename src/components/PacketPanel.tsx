import { useMemo } from 'react'
import {
  Binary,
  Check,
  CircleAlert,
  FileKey2,
  Hash,
  ShieldCheck,
  ShieldX,
} from 'lucide-react'
import type { SimulationController } from '../hooks/useSimulation'
import { buildPacket, crcHex } from '../lib/sim'
import { PanelHeader, Tag, cx } from './ui'

export function PacketPanel({ sim, onInfo }: { sim: SimulationController; onInfo: () => void }) {
  const packet = sim.packet ?? buildPacket(sim.config.payload)
  const errorSet = useMemo(() => {
    const set = new Set<number>()
    if (sim.run) {
      for (const index of sim.run.errorIndexes) set.add(index)
    } else {
      for (let i = 0; i < sim.recoveredBits.length; i += 1) {
        if (sim.recoveredBits[i] !== packet.bits[i]) set.add(i)
      }
    }
    return set
  }, [sim.run, sim.recoveredBits, packet.bits])

  const fieldAt = (index: number): string => {
    if (index < packet.preambleLength) return 'preamble'
    if (index < packet.preambleLength + packet.lengthLength) return 'length'
    if (index < packet.preambleLength + packet.lengthLength + packet.payloadLength) return 'payload'
    return 'crc'
  }

  const receivedCrc = sim.run
    ? sim.run.crcReceived
    : sim.recoveredBits.length === packet.bits.length
      ? packet.crcBits.reduce((value, _bit, index) => (value << 1) | (sim.recoveredBits[packet.bits.length - 16 + index] ?? 0), 0)
      : null
  const computedCrc = sim.run?.crcComputed ?? null
  const statusIsValid = sim.terminal === 'complete'
  const statusIsFailed = sim.terminal === 'failed' || (sim.run && !sim.run.crcValid)
  const statusPending = !statusIsValid && !statusIsFailed

  return (
    <section className="panel packet-panel">
      <PanelHeader
        index="05"
        eyebrow="DATA-LINK LAYER / FRAME + CRC-16"
        title="Packet assembly & integrity"
        meta={<Tag tone="neutral">CRC-16/CCITT</Tag>}
        onInfo={onInfo}
      />

      <div className="packet-fields">
        <div className="field-segment preamble" style={{ flex: packet.preambleLength }}>
          <span className="field-label">PREAMBLE</span>
          <span className="field-detail">{packet.preambleLength}b</span>
          <span className="field-code">1010…</span>
        </div>
        <div className="field-segment length" style={{ flex: packet.lengthLength }}>
          <span className="field-label">LEN</span>
          <span className="field-detail">{packet.lengthLength}b</span>
          <span className="field-code">{packet.payloadBytes.length.toString(16).padStart(2, '0').toUpperCase()}</span>
        </div>
        <div className="field-segment payload" style={{ flex: Math.max(4, packet.payloadLength) }}>
          <span className="field-label">PAYLOAD</span>
          <span className="field-detail">{packet.payloadBytes.length} bytes</span>
          <span className="field-code">{packet.payloadBytes.length}×8b</span>
        </div>
        <div className="field-segment crc" style={{ flex: packet.crcLength }}>
          <span className="field-label">CRC</span>
          <span className="field-detail">16b</span>
          <span className="field-code">{crcHex(packet.crcValue)}</span>
        </div>
      </div>

      <div className="packet-meta-line">
        <span><Binary size={11} /> PACKET / {String(sim.run?.id ?? 0).slice(-4).padStart(4, '0')}</span>
        <span>{packet.bits.length} BITS · MSB FIRST</span>
        <span><Hash size={11} /> POLY 0x1021 · INIT 0xFFFF</span>
      </div>

      <div className="packet-matrix-block">
        <div className="panel-subhead">
          <span>SERIALISED FRAME / BIT FIELD</span>
          <div className="matrix-legend">
            <span><i className="bit-legend preamble" /> preamble</span>
            <span><i className="bit-legend payload" /> payload</span>
            <span><i className="bit-legend crc" /> crc</span>
            <span><i className="bit-legend error" /> error</span>
          </div>
        </div>
        <div className="packet-bit-matrix">
          {packet.bits.map((bit, index) => {
            const field = fieldAt(index)
            const received = sim.recoveredBits[index]
            const corrupted = errorSet.has(index)
            return (
              <span
                key={index}
                title={`bit ${index} · ${field} · ${bit}${received !== undefined ? ` → ${received}` : ''}`}
                className={cx(
                  'packet-bit',
                  `field-${field}`,
                  corrupted && 'is-error',
                  index === sim.activeBit && 'is-active',
                  received !== undefined && !corrupted && 'is-read',
                )}
              >
                {bit}
              </span>
            )
          })}
        </div>
      </div>

      <div className={cx('crc-integrity-card', statusIsValid && 'is-valid', statusIsFailed && 'is-failed', statusPending && 'is-pending')}>
        <div className="crc-corner-stamp">
          {statusIsValid ? <ShieldCheck size={22} /> : statusIsFailed ? <ShieldX size={22} /> : <FileKey2 size={22} />}
          <span>{statusIsValid ? 'VERIFIED' : statusIsFailed ? 'CORRUPTED' : 'PENDING'}</span>
        </div>
        <div className="crc-main">
          <div className="crc-check-line">
            <span>CRC CHECK</span>
            <strong>{crcHex(packet.crcValue)}</strong>
          </div>
          <div className="crc-values">
            <div>
              <span>EXPECTED</span>
              <strong>{crcHex(packet.crcValue)}</strong>
            </div>
            <div>
              <span>RECEIVED</span>
              <strong>{receivedCrc !== null ? crcHex(receivedCrc) : '————'}</strong>
            </div>
            <div>
              <span>RECOMPUTED</span>
              <strong>{computedCrc !== null ? crcHex(computedCrc) : '————'}</strong>
            </div>
            <div>
              <span>STATUS</span>
              <strong className={statusIsValid ? 'tone-green' : statusIsFailed ? 'tone-red' : ''}>
                {statusIsValid ? 'VALID' : statusIsFailed ? 'FAILED' : 'WAITING'}
              </strong>
            </div>
          </div>
        </div>
        <div className="crc-glyph" aria-hidden="true">
          <span className="crc-orbit" />
          <span className="crc-orbit second" />
          <div>{statusIsValid ? <Check size={20} /> : statusIsFailed ? <CircleAlert size={20} /> : <Hash size={20} />}</div>
        </div>
        {statusIsFailed && <div className="crc-glitch-overlay" aria-hidden="true" />}
      </div>

      <div className="packet-payload-row">
        <div>
          <span>DECODED PAYLOAD</span>
          <strong className={statusIsValid ? 'tone-green' : ''}>
            {statusIsValid ? sim.run?.decodedText || '∅' : statusIsFailed ? 'REJECTED' : 'LISTENING…'}
          </strong>
        </div>
        <div>
          <span>BYTES RECEIVED</span>
          <strong>{sim.recoveredBits.length} / {packet.bits.length}</strong>
        </div>
        <div>
          <span>FRAME TIME</span>
          <strong>{((packet.bits.length * sim.config.symbolMs) / 1000).toFixed(2)} s</strong>
        </div>
      </div>

      <div className="panel-footnote-row">
        <span><Check size={11} /> CRC closes the loop between the signal and the message.</span>
        <span>Integrity check is not encryption or authentication.</span>
      </div>
    </section>
  )
}
