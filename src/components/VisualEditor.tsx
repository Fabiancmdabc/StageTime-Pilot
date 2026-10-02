import { useT } from '../i18n'
import type { MessageKey } from '../i18n/messages'
import { CHROMA_PRESETS, type ShowVisuals } from '../types'

interface Props {
  visuals: ShowVisuals
  onChange: (patch: Partial<ShowVisuals>) => void
}

const CHROMA_LABEL_KEYS: Record<(typeof CHROMA_PRESETS)[number]['id'], MessageKey> = {
  green: 'chromaGreen',
  'green-pure': 'chromaGreenPure',
  blue: 'chromaBlue',
  magenta: 'chromaMagenta',
  black: 'chromaBlack',
}

export function VisualEditor({ visuals, onChange }: Props) {
  const t = useT()

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>{t('lookTitle')}</h2>
        <p>{t('lookHint')}</p>
      </header>

      <div className="chroma-block">
        <span className="chroma-label">{t('chromaLabel')}</span>
        <div className="chroma-row">
          {CHROMA_PRESETS.map((p) => {
            const label = t(CHROMA_LABEL_KEYS[p.id])
            return (
              <button
                key={p.id}
                type="button"
                className={`chroma-swatch ${
                  visuals.backgroundColor.toLowerCase() === p.color.toLowerCase()
                    ? 'active'
                    : ''
                }`}
                style={{ background: p.color }}
                title={label}
                onClick={() => onChange({ backgroundColor: p.color })}
              >
                <span>{label}</span>
              </button>
            )
          })}
          <label className="chroma-custom">
            {t('custom')}
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
          {t('timeColor')}
          <input
            type="color"
            value={visuals.timeColor}
            onChange={(e) => onChange({ timeColor: e.target.value })}
          />
        </label>

        <label>
          {t('warnColor')}
          <input
            type="color"
            value={visuals.warnColor}
            onChange={(e) => onChange({ warnColor: e.target.value })}
          />
        </label>

        <label>
          {t('criticalColor')}
          <input
            type="color"
            value={visuals.criticalColor}
            onChange={(e) => onChange({ criticalColor: e.target.value })}
          />
        </label>

        <label>
          {t('messageColor')}
          <input
            type="color"
            value={visuals.messageColor}
            onChange={(e) => onChange({ messageColor: e.target.value })}
          />
        </label>

        <label>
          {t('fontSize', { n: visuals.fontSizeVw })}
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
          {t('letterSpacing', { n: visuals.letterSpacingEm.toFixed(2) })}
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
          {t('showSeconds')}
        </label>

        <label>
          {t('horizontal')}
          <select
            value={visuals.textAlign}
            onChange={(e) =>
              onChange({
                textAlign: e.target.value as ShowVisuals['textAlign'],
              })
            }
          >
            <option value="left">{t('alignLeft')}</option>
            <option value="center">{t('alignCenter')}</option>
            <option value="right">{t('alignRight')}</option>
          </select>
        </label>

        <label>
          {t('vertical')}
          <select
            value={visuals.verticalAlign}
            onChange={(e) =>
              onChange({
                verticalAlign: e.target.value as ShowVisuals['verticalAlign'],
              })
            }
          >
            <option value="top">{t('alignTop')}</option>
            <option value="center">{t('alignCenter')}</option>
            <option value="bottom">{t('alignBottom')}</option>
          </select>
        </label>
      </div>
    </section>
  )
}
