import type { OutputConfig, OutputStatus } from '../types'

interface Props {
  config: OutputConfig
  status: OutputStatus | null
  onChange: (patch: Partial<OutputConfig>) => void
  onApply: () => void
}

function badge(ch: { enabled: boolean; sending: boolean; error?: string | null }) {
  if (ch.error && ch.enabled) return { cls: 'err', text: 'Fehler' }
  if (ch.sending) return { cls: 'on', text: 'sendet' }
  if (ch.enabled) return { cls: 'wait', text: 'startet…' }
  return { cls: 'off', text: 'aus' }
}

export function OutputsPanel({ config, status, onChange, onApply }: Props) {
  const ndi = badge(status?.ndi ?? { enabled: config.ndiEnabled, sending: false })
  const rtmp = badge(status?.rtmp ?? { enabled: config.rtmpEnabled, sending: false })
  const udp = badge(status?.udp ?? { enabled: config.udpEnabled, sending: false })

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Ausgabe · NDI / RTMP / UDP</h2>
        <p>
          Show ohne HDMI: vMix/OBS holen das Signal übers Netz. Chroma-Key aus
          Look bleibt erhalten.
        </p>
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
          Source-Name
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
            In vMix/OBS als NDI-Quelle „{config.ndiName}“ wählen. NDI Runtime auf
            dem Mac empfohlen.
            {status?.ndi.connections
              ? ` Empfänger: ${status.ndi.connections}`
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
          URL
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
          <p className="hint">
            Braucht ffmpeg im PATH (Homebrew). OBS: Media Source / Custom RTMP.
          </p>
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
          Ziel
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
          <p className="hint">ffmpeg MPEG-TS über UDP (LAN-Decoder / Pipelines).</p>
        )}
      </div>

      <div className="inline-form" style={{ marginTop: '0.75rem' }}>
        <button type="button" className="btn primary" onClick={onApply}>
          Ausgaben übernehmen
        </button>
        {status?.capturing ? (
          <span className="hint">Capture 1920×1080 @ {config.fps} fps aktiv</span>
        ) : (
          <span className="hint">Capture startet, sobald ein Ausgang an ist.</span>
        )}
      </div>
    </section>
  )
}
