import { CHROMA_PRESETS, type ShowVisuals } from '../types'

interface Props {
  visuals: ShowVisuals
  onChange: (patch: Partial<ShowVisuals>) => void
}

export function VisualEditor({ visuals, onChange }: Props) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Look / Show-Optik</h2>
        <p>
          Hintergrund als Chroma-Key (Greenscreen) für vMix/OBS – Key raus, nur
          die Zeit bleibt als Overlay.
        </p>
      </header>

      <div className="chroma-block">
        <span className="chroma-label">Chroma-Key / Hintergrund</span>
        <div className="chroma-row">
          {CHROMA_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`chroma-swatch ${
                visuals.backgroundColor.toLowerCase() === p.color.toLowerCase()
                  ? 'active'
                  : ''
              }`}
              style={{ background: p.color }}
              title={p.label}
              onClick={() => onChange({ backgroundColor: p.color })}
            >
              <span>{p.label}</span>
            </button>
          ))}
          <label className="chroma-custom">
            Custom
            <input
              type="color"
              value={visuals.backgroundColor}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="form-grid">
        <label>
          Zeitfarbe
          <input
            type="color"
            value={visuals.timeColor}
            onChange={(e) => onChange({ timeColor: e.target.value })}
          />
        </label>

        <label>
          Gelb (Warnung)
          <input
            type="color"
            value={visuals.warnColor}
            onChange={(e) => onChange({ warnColor: e.target.value })}
          />
        </label>

        <label>
          Rot (Kritisch)
          <input
            type="color"
            value={visuals.criticalColor}
            onChange={(e) => onChange({ criticalColor: e.target.value })}
          />
        </label>

        <label>
          Nachrichtenfarbe
          <input
            type="color"
            value={visuals.messageColor}
            onChange={(e) => onChange({ messageColor: e.target.value })}
          />
        </label>

        <label>
          Schriftgröße ({visuals.fontSizeVw}vw)
          <input
            type="range"
            min={8}
            max={40}
            step={1}
            value={visuals.fontSizeVw}
            onChange={(e) => onChange({ fontSizeVw: Number(e.target.value) })}
          />
        </label>

        <label>
          Letter-Spacing ({visuals.letterSpacingEm.toFixed(2)}em)
          <input
            type="range"
            min={0}
            max={0.2}
            step={0.01}
            value={visuals.letterSpacingEm}
            onChange={(e) =>
              onChange({ letterSpacingEm: Number(e.target.value) })
            }
          />
        </label>

        <label className="check-row">
          <input
            type="checkbox"
            checked={visuals.showSeconds}
            onChange={(e) => onChange({ showSeconds: e.target.checked })}
          />
          Sekunden anzeigen
        </label>

        <label>
          Horizontal
          <select
            value={visuals.textAlign}
            onChange={(e) =>
              onChange({
                textAlign: e.target.value as ShowVisuals['textAlign'],
              })
            }
          >
            <option value="left">Links</option>
            <option value="center">Mitte</option>
            <option value="right">Rechts</option>
          </select>
        </label>

        <label>
          Vertikal
          <select
            value={visuals.verticalAlign}
            onChange={(e) =>
              onChange({
                verticalAlign: e.target.value as ShowVisuals['verticalAlign'],
              })
            }
          >
            <option value="top">Oben</option>
            <option value="center">Mitte</option>
            <option value="bottom">Unten</option>
          </select>
        </label>
      </div>
    </section>
  )
}
