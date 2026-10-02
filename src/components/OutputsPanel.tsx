import { useT } from '../i18n'
import type { OutputConfig, OutputStatus } from '../types'

interface Props {
  config: OutputConfig
  status: OutputStatus | null
  onChange: (patch: Partial<OutputConfig>) => void
  onApply: () => void
}

export function OutputsPanel({ config, status, onChange, onApply }: Props) {
  const t = useT()

  const badge = (ch: { enabled: boolean; sending: boolean; error?: string | null }) => {
    if (ch.error && ch.enabled) return { cls: 'err', text: t('statusError') }
    if (ch.sending) return { cls: 'on', text: t('statusSending') }
    if (ch.enabled) return { cls: 'wait', text: t('statusStarting') }
    return { cls: 'off', text: t('statusOff') }
  }

  const ndi = badge(status?.ndi ?? { enabled: config.ndiEnabled, sending: false })
  const rtmp = badge(status?.rtmp ?? { enabled: config.rtmpEnabled, sending: false })
  const udp = badge(status?.udp ?? { enabled: config.udpEnabled, sending: false })

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>{t('outputsTitle')}</h2>
        <p>{t('outputsHint')}</p>
      </header>

      <div className="output-card">
        <div className="output-head">
          <label className="check-row">
            <input
              type="checkbox"
              checked={config.ndiEnabled}
              onChange={(e) => onChange({ ndiEnabled: e.target.checked })}
            />
            NDI
          </label>
          <span className={`out-badge ${ndi.cls}`}>{ndi.text}</span>
        </div>
        <label>
          {t('sourceName')}
          <input
            type="text"
            value={config.ndiName}
            onChange={(e) => onChange({ ndiName: e.target.value })}
          />
        </label>
        {status?.ndi.error && config.ndiEnabled ? (
          <p className="hint error-hint">{status.ndi.error}</p>
        ) : (
          <p className="hint">
            {t('ndiHint', { name: config.ndiName })}
            {status?.ndi.connections
              ? t('receivers', { n: status.ndi.connections })
              : ''}
          </p>
        )}
      </div>

      <div className="output-card">
        <div className="output-head">
          <label className="check-row">
            <input
              type="checkbox"
              checked={config.rtmpEnabled}
              onChange={(e) => onChange({ rtmpEnabled: e.target.checked })}
            />
            RTMP
          </label>
          <span className={`out-badge ${rtmp.cls}`}>{rtmp.text}</span>
        </div>
        <label>
          {t('url')}
          <input
            type="text"
            value={config.rtmpUrl}
            placeholder="rtmp://host/app/key"
            onChange={(e) => onChange({ rtmpUrl: e.target.value })}
          />
        </label>
        {status?.rtmp.error && config.rtmpEnabled ? (
          <p className="hint error-hint">{status.rtmp.error}</p>
        ) : (
          <p className="hint">{t('rtmpHint')}</p>
        )}
      </div>

      <div className="output-card">
        <div className="output-head">
          <label className="check-row">
            <input
              type="checkbox"
              checked={config.udpEnabled}
              onChange={(e) => onChange({ udpEnabled: e.target.checked })}
            />
            MPEG-TS / UDP
          </label>
          <span className={`out-badge ${udp.cls}`}>{udp.text}</span>
        </div>
        <label>
          {t('target')}
          <input
            type="text"
            value={config.udpUrl}
            placeholder="udp://239.0.0.1:1234"
            onChange={(e) => onChange({ udpUrl: e.target.value })}
          />
        </label>
        {status?.udp.error && config.udpEnabled ? (
          <p className="hint error-hint">{status.udp.error}</p>
        ) : (
          <p className="hint">{t('udpHint')}</p>
        )}
      </div>

      <div className="inline-form" style={{ marginTop: '0.75rem' }}>
        <button type="button" className="btn primary" onClick={onApply}>
          {t('applyOutputs')}
        </button>
        {status?.capturing ? (
          <span className="hint">{t('captureActive', { fps: config.fps })}</span>
        ) : (
          <span className="hint">{t('captureIdle')}</span>
        )}
      </div>
    </section>
  )
}
