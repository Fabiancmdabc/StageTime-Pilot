import { useState } from 'react'
import type { TimePreset } from '../types'

interface Props {
  presets: TimePreset[]
  onApply: (preset: TimePreset) => void
  onAdd: (label: string, seconds: number, autoStart?: boolean) => void
  onRemove: (id: string) => void
}

export function PresetsPanel({ presets, onApply, onAdd, onRemove }: Props) {
  const [label, setLabel] = useState('Custom')
  const [minutes, setMinutes] = useState(5)
  const [seconds, setSeconds] = useState(0)

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Schnellwahl</h2>
        <p>Vorkonfigurierte Redezeiten – ein Klick setzt die Dauer (ohne Start).</p>
      </header>

      <div className="preset-row">
        {presets.map((p) => (
          <div key={p.id} className="preset-chip">
            <button type="button" className="preset-btn" onClick={() => onApply(p)}>
              {p.label}
              <span>{formatShort(p.seconds)}</span>
            </button>
            <button
              type="button"
              className="preset-remove"
              title="Entfernen"
              onClick={() => onRemove(p.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="inline-form">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label"
        />
        <input
          type="number"
          min={0}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          title="Minuten"
        />
        <span>min</span>
        <input
          type="number"
          min={0}
          max={59}
          value={seconds}
          onChange={(e) => setSeconds(Number(e.target.value))}
          title="Sekunden"
        />
        <span>s</span>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            const total = minutes * 60 + seconds
            if (total <= 0 || !label.trim()) return
            onAdd(label.trim(), total, false)
          }}
        >
          Hinzufügen
        </button>
      </div>
    </section>
  )
}

function formatShort(totalSec: number) {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return s ? `${m}:${String(s).padStart(2, '0')}` : `${m}:00`
}
