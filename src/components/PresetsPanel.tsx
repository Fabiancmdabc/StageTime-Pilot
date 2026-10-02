import { useState } from 'react'
import { useT } from '../i18n'
import type { TimePreset } from '../types'

interface Props {
  presets: TimePreset[]
  onApply: (preset: TimePreset) => void
  onAdd: (label: string, seconds: number, autoStart?: boolean) => void
  onRemove: (id: string) => void
}

export function PresetsPanel({ presets, onApply, onAdd, onRemove }: Props) {
  const t = useT()
  const [label, setLabel] = useState(t('custom'))
  const [minutes, setMinutes] = useState(5)
  const [seconds, setSeconds] = useState(0)

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>{t('presetsTitle')}</h2>
        <p>{t('presetsHint')}</p>
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
              title={t('remove')}
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
          placeholder={t('label')}
        />
        <input
          type="number"
          min={0}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          title={t('minutes')}
        />
        <span>{t('min')}</span>
        <input
          type="number"
          min={0}
          max={59}
          value={seconds}
          onChange={(e) => setSeconds(Number(e.target.value))}
          title={t('seconds')}
        />
        <span>{t('sec')}</span>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            const total = minutes * 60 + seconds
            if (total <= 0 || !label.trim()) return
            onAdd(label.trim(), total, false)
          }}
        >
          {t('add')}
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
