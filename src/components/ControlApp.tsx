import { useEffect, useMemo, useState } from 'react'
import type { ApiSettings, OutputConfig, OutputStatus, TimerState, UiTheme } from '../types'
import {
  DEFAULT_OUTPUT_CONFIG,
  OUTPUT_STORAGE_KEY,
  SHOW_DISPLAYS_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from '../types'
import { APP_VERSION, checkForUpdates, type RemoteVersionInfo } from '../utils/updates'
import { formatCountdown, getPhase } from '../utils/time'
import { MessagePanel } from './MessagePanel'
import { OutputsPanel } from './OutputsPanel'
import { PresetsPanel } from './PresetsPanel'
import { ShowDisplay } from './ShowDisplay'
import { VisualEditor } from './VisualEditor'

interface DisplayInfo {
  id: number
  label: string
  bounds: { x: number; y: number; width: number; height: number }
  size: { width: number; height: number }
  scaleFactor: number
  primary: boolean
}

interface StoreApi {
  state: TimerState
  apiSettings: ApiSettings
  setApiSettings: (s: ApiSettings) => void
  setDuration: (seconds: number, autoStart?: boolean) => void
  start: () => void
  pause: () => void
  reset: () => void
  stop: () => void
  setMode: (mode: 'countdown' | 'clock') => void
  setThresholds: (warnAtSec: number, criticalAtSec: number) => void
  setVisuals: (v: Partial<TimerState['visuals']>) => void
  sendMessage: (text: string, seconds?: number, prominent?: boolean) => void
  clearMessage: () => void
  applyPreset: (preset: TimerState['presets'][number]) => void
  addPreset: (label: string, seconds: number, autoStart?: boolean) => void
  removePreset: (id: string) => void
}

function loadTheme(): UiTheme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    return raw === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function loadOutputConfig(): OutputConfig {
  try {
    const raw = localStorage.getItem(OUTPUT_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_OUTPUT_CONFIG }
    return { ...DEFAULT_OUTPUT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_OUTPUT_CONFIG }
  }
}

function loadSavedDisplayIds(): number[] {
  try {
    const raw = localStorage.getItem(SHOW_DISPLAYS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as number[]
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : []
  } catch {
    return []
  }
}

function applyThemeToDom(theme: UiTheme) {
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme
}

export function ControlApp(store: StoreApi) {
  const { state, apiSettings } = store
  const [durationMin, setDurationMin] = useState(
    Math.floor(state.durationMs / 60000),
  )
  const [durationSec, setDurationSec] = useState(
    Math.floor((state.durationMs % 60000) / 1000),
  )
  const [warnAt, setWarnAt] = useState(state.warnAtSec)
  const [criticalAt, setCriticalAt] = useState(state.criticalAtSec)
  const [addresses, setAddresses] = useState<string[]>([])
  const [tab, setTab] = useState<'run' | 'look' | 'remote' | 'settings'>('run')
  const [theme, setTheme] = useState<UiTheme>(() => loadTheme())
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const [selectedDisplayIds, setSelectedDisplayIds] = useState<number[]>(() =>
    loadSavedDisplayIds(),
  )
  const [outputConfig, setOutputConfig] = useState<OutputConfig>(() =>
    loadOutputConfig(),
  )
  const [outputStatus, setOutputStatus] = useState<OutputStatus | null>(null)
  const [updateInfo, setUpdateInfo] = useState<{
    checking: boolean
    updateAvailable: boolean
    remote: RemoteVersionInfo | null
    error?: string
  }>({ checking: false, updateAvailable: false, remote: null })

  useEffect(() => {
    applyThemeToDom(theme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  useEffect(() => {
    void window.electronAPI?.getLocalAddresses().then(setAddresses)
    void window.electronAPI?.setApiConfig(apiSettings)

    const bootDisplays = async () => {
      if (!window.electronAPI?.getDisplays) return
      const list = await window.electronAPI.getDisplays()
      setDisplays(list)
      const saved = loadSavedDisplayIds()
      const available = new Set(list.map((d) => d.id))
      let next = saved.filter((id) => available.has(id))
      if (next.length === 0) {
        const primary = list.find((d) => d.primary) ?? list[0]
        next = primary ? [primary.id] : []
      }
      setSelectedDisplayIds(next)
      await window.electronAPI.setSelectedShowDisplays(next)
    }
    void bootDisplays()

    const unsub = window.electronAPI?.onDisplaysChanged?.((list) => {
      setDisplays(list)
      setSelectedDisplayIds((prev) => {
        const available = new Set(list.map((d) => d.id))
        const kept = prev.filter((id) => available.has(id))
        if (kept.length > 0) return kept
        const primary = list.find((d) => d.primary) ?? list[0]
        return primary ? [primary.id] : []
      })
    })
    const unsubOut = window.electronAPI?.onOutputStatus?.((s) => setOutputStatus(s))
    void window.electronAPI?.getOutputStatus?.().then((s) => {
      if (s) setOutputStatus(s)
    })
    const poll = window.setInterval(() => {
      void window.electronAPI?.getOutputStatus?.().then((s) => {
        if (s) setOutputStatus(s)
      })
    }, 2000)
    return () => {
      unsub?.()
      unsubOut?.()
      window.clearInterval(poll)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(OUTPUT_STORAGE_KEY, JSON.stringify(outputConfig))
    } catch {
      /* ignore */
    }
  }, [outputConfig])

  useEffect(() => {
    try {
      localStorage.setItem(
        SHOW_DISPLAYS_STORAGE_KEY,
        JSON.stringify(selectedDisplayIds),
      )
    } catch {
      /* ignore */
    }
  }, [selectedDisplayIds])

  useEffect(() => {
    setDurationMin(Math.floor(state.durationMs / 60000))
    setDurationSec(Math.floor((state.durationMs % 60000) / 1000))
  }, [state.durationMs])

  const remoteUrls = useMemo(() => {
    const hosts = addresses.length ? addresses : ['127.0.0.1']
    return hosts.map((ip) => {
      const tokenQ = apiSettings.token
        ? `?token=${encodeURIComponent(apiSettings.token)}`
        : ''
      return `http://${ip}:${apiSettings.port}/remote${tokenQ}`
    })
  }, [addresses, apiSettings.port, apiSettings.token])

  const phase = getPhase(state)
  const running = state.status === 'running' || state.status === 'overtime'

  const toggleDisplay = async (id: number) => {
    const next = selectedDisplayIds.includes(id)
      ? selectedDisplayIds.filter((x) => x !== id)
      : [...selectedDisplayIds, id]
    // Mindestens ein Display behalten
    if (next.length === 0) return
    setSelectedDisplayIds(next)
    await window.electronAPI?.setSelectedShowDisplays(next)
  }

  const applyOutputs = async () => {
    const result = await window.electronAPI?.setOutputConfig(outputConfig)
    if (result?.status) setOutputStatus(result.status)
  }

  const runUpdateCheck = async () => {
    setUpdateInfo((s) => ({ ...s, checking: true, error: undefined }))
    const result = await checkForUpdates()
    setUpdateInfo({
      checking: false,
      updateAvailable: result.updateAvailable,
      remote: result.remote,
      error: result.error,
    })
  }

  const openShows = async () => {
    await window.electronAPI?.setSelectedShowDisplays(selectedDisplayIds)
    await window.electronAPI?.openShowWindow(selectedDisplayIds)
  }

  return (
    <div className="control-shell">
      <header className="topbar">
        <div className="brand">
          <img
            src="./brand/Logo-StageTime-Pilot.png"
            alt="StageTime-Pilot"
            className="brand-logo"
          />
        </div>
        <nav className="tabs">
          <button
            type="button"
            className={tab === 'run' ? 'active' : ''}
            onClick={() => setTab('run')}
          >
            Timer
          </button>
          <button
            type="button"
            className={tab === 'look' ? 'active' : ''}
            onClick={() => setTab('look')}
          >
            Look
          </button>
          <button
            type="button"
            className={tab === 'remote' ? 'active' : ''}
            onClick={() => setTab('remote')}
          >
            Remote
          </button>
          <button
            type="button"
            className={tab === 'settings' ? 'active' : ''}
            onClick={() => setTab('settings')}
          >
            Einstellungen
          </button>
        </nav>
        <div className="window-actions">
          <button
            type="button"
            className="btn ghost theme-toggle"
            title={theme === 'dark' ? 'Hellmodus' : 'Dunkelmodus'}
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? 'Hell' : 'Dunkel'}
          </button>
          <button type="button" className="btn secondary" onClick={() => void openShows()}>
            Show öffnen
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => void window.electronAPI?.openPgmWindow()}
          >
            PGM öffnen
          </button>
        </div>
      </header>

      <main className="control-main">
        <aside className="preview-col">
          <div className="pgm-frame">
            <div className="pgm-badge">PGM Preview</div>
            <ShowDisplay state={state} compact />
          </div>
          <div className={`status-pill phase-${phase}`}>{phaseLabel(phase)}</div>
          {selectedDisplayIds.length > 0 && (
            <div className="hint">
              Show-Displays: {selectedDisplayIds.length} ausgewählt
            </div>
          )}
        </aside>

        <section className="ops-col">
          {tab === 'run' && (
            <>
              <section className="panel hero-timer">
                <div className="mode-toggle">
                  <button
                    type="button"
                    className={state.mode === 'countdown' ? 'active' : ''}
                    onClick={() => store.setMode('countdown')}
                  >
                    Countdown
                  </button>
                  <button
                    type="button"
                    className={state.mode === 'clock' ? 'active' : ''}
                    onClick={() => store.setMode('clock')}
                  >
                    Uhrzeit
                  </button>
                </div>

                <div className={`hero-time phase-${phase}`}>
                  {state.mode === 'clock'
                    ? formatClockLocal(state.visuals.showSeconds)
                    : formatCountdown(state.remainingMs, true)}
                </div>

                <div className="transport">
                  {!running ? (
                    <button type="button" className="btn primary large" onClick={store.start}>
                      Start
                    </button>
                  ) : (
                    <button type="button" className="btn warn large" onClick={store.pause}>
                      Pause
                    </button>
                  )}
                  <button type="button" className="btn secondary large" onClick={store.reset}>
                    Reset
                  </button>
                  <button type="button" className="btn ghost large" onClick={store.stop}>
                    Stop
                  </button>
                </div>

                {state.mode === 'countdown' && (
                  <div className="inline-form duration-form">
                    <span>Dauer</span>
                    <input
                      type="number"
                      min={0}
                      value={durationMin}
                      onChange={(e) => setDurationMin(Number(e.target.value))}
                    />
                    <span>min</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={durationSec}
                      onChange={(e) => setDurationSec(Number(e.target.value))}
                    />
                    <span>s</span>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() =>
                        store.setDuration(durationMin * 60 + durationSec, false)
                      }
                    >
                      Setzen
                    </button>
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() =>
                        store.setDuration(durationMin * 60 + durationSec, true)
                      }
                    >
                      Setzen & Start
                    </button>
                  </div>
                )}

                <div className="inline-form thresholds">
                  <label>
                    Gelb ab (s)
                    <input
                      type="number"
                      min={0}
                      value={warnAt}
                      onChange={(e) => setWarnAt(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Rot blinken ab (s)
                    <input
                      type="number"
                      min={0}
                      value={criticalAt}
                      onChange={(e) => setCriticalAt(Number(e.target.value))}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => store.setThresholds(warnAt, criticalAt)}
                  >
                    Schwellen speichern
                  </button>
                </div>
              </section>

              <PresetsPanel
                presets={state.presets}
                onApply={store.applyPreset}
                onAdd={store.addPreset}
                onRemove={store.removePreset}
              />

              <MessagePanel
                currentText={state.message?.text}
                onSend={store.sendMessage}
                onClear={store.clearMessage}
              />
            </>
          )}

          {tab === 'look' && (
            <VisualEditor visuals={state.visuals} onChange={store.setVisuals} />
          )}

          {tab === 'remote' && (
            <section className="panel">
              <header className="panel-header">
                <h2>Remote / iPad</h2>
                <p>
                  Zeitanzeige im Browser über WLAN und HTTP-Steuerung für Cue-Pilot /
                  Companion.
                </p>
              </header>

              <div className="form-grid">
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={apiSettings.enabled}
                    onChange={(e) =>
                      store.setApiSettings({
                        ...apiSettings,
                        enabled: e.target.checked,
                      })
                    }
                  />
                  API / Remote-Server aktiv
                </label>

                <label>
                  Port
                  <input
                    type="number"
                    min={1024}
                    max={65535}
                    value={apiSettings.port}
                    onChange={(e) =>
                      store.setApiSettings({
                        ...apiSettings,
                        port: Number(e.target.value) || 8787,
                      })
                    }
                  />
                </label>

                <label>
                  Token (optional)
                  <input
                    type="text"
                    value={apiSettings.token}
                    placeholder="leer = ohne Auth"
                    onChange={(e) =>
                      store.setApiSettings({
                        ...apiSettings,
                        token: e.target.value,
                      })
                    }
                  />
                </label>

                <button
                  type="button"
                  className="btn primary"
                  onClick={() => void window.electronAPI?.setApiConfig(apiSettings)}
                >
                  Server neu starten
                </button>
              </div>

              <div className="remote-urls">
                <h3>Remote-URLs (WLAN / iPad)</h3>
                {remoteUrls.map((url) => (
                  <code key={url}>{url}</code>
                ))}
                <p className="hint">
                  Auf dem iPad dieselbe WLAN-Adresse im Safari öffnen. Live-Sync per
                  WebSocket.
                </p>
              </div>
            </section>
          )}

          {tab === 'settings' && (
            <>
            <section className="panel">
              <header className="panel-header">
                <h2>Ausgabe · Displays</h2>
                <p>
                  Mehrere Monitore auswählen – „Show öffnen“ startet auf allen
                  markierten Displays gleichzeitig.
                </p>
              </header>

              {displays.length === 0 ? (
                <p className="hint">
                  Keine Display-Infos (nur in der Desktop-App verfügbar).
                </p>
              ) : (
                <div className="display-list">
                  {displays.map((d) => {
                    const checked = selectedDisplayIds.includes(d.id)
                    return (
                      <label key={d.id} className={`display-card ${checked ? 'selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => void toggleDisplay(d.id)}
                        />
                        <div>
                          <strong>
                            {d.label}
                            {d.primary ? ' · Primär' : ''}
                          </strong>
                          <span>
                            {d.size.width}×{d.size.height}
                            {d.scaleFactor !== 1 ? ` @${d.scaleFactor}x` : ''}
                            {' · '}
                            Position {d.bounds.x},{d.bounds.y}
                          </span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}

              <div className="inline-form" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn primary" onClick={() => void openShows()}>
                  Show auf Auswahl öffnen
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => void window.electronAPI?.closeShowWindow()}
                >
                  Alle Shows schließen
                </button>
              </div>
            </section>

            <OutputsPanel
              config={outputConfig}
              status={outputStatus}
              onChange={(patch) =>
                setOutputConfig((prev) => ({ ...prev, ...patch }))
              }
              onApply={() => void applyOutputs()}
            />

            <section className="panel">
              <header className="panel-header">
                <h2>Darstellung</h2>
                <p>Oberfläche der Control-App (Show-Fenster bleibt eigenständig).</p>
              </header>
              <div className="mode-toggle">
                <button
                  type="button"
                  className={theme === 'dark' ? 'active' : ''}
                  onClick={() => setTheme('dark')}
                >
                  Dunkel
                </button>
                <button
                  type="button"
                  className={theme === 'light' ? 'active' : ''}
                  onClick={() => setTheme('light')}
                >
                  Hell
                </button>
              </div>
            </section>

            <section className="panel">
              <header className="panel-header">
                <h2>Updates</h2>
                <p>
                  Installierte Version {APP_VERSION}. Prüft die öffentliche
                  Website-API.
                </p>
              </header>
              <div className="inline-form">
                <button
                  type="button"
                  className="btn secondary"
                  disabled={updateInfo.checking}
                  onClick={() => void runUpdateCheck()}
                >
                  {updateInfo.checking ? 'Prüfe…' : 'Nach Updates suchen'}
                </button>
                {updateInfo.updateAvailable && updateInfo.remote ? (
                  <span className="hint" style={{ color: 'var(--teal)' }}>
                    Neu: v{updateInfo.remote.version}
                    {updateInfo.remote.notes ? ` — ${updateInfo.remote.notes}` : ''}
                  </span>
                ) : null}
                {!updateInfo.checking &&
                updateInfo.remote &&
                !updateInfo.updateAvailable &&
                !updateInfo.error ? (
                  <span className="hint">Du bist auf dem neuesten Stand.</span>
                ) : null}
                {updateInfo.error ? (
                  <span className="hint error-hint">{updateInfo.error}</span>
                ) : null}
              </div>
              {updateInfo.updateAvailable ? (
                <p className="hint" style={{ marginTop: '0.75rem' }}>
                  Download:{' '}
                  <a
                    href="https://stagetime-pilot.vercel.app/download"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--teal)' }}
                  >
                    stagetime-pilot.vercel.app/download
                  </a>
                </p>
              ) : null}
            </section>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

function phaseLabel(phase: string) {
  switch (phase) {
    case 'warn':
      return 'Gelb'
    case 'critical':
      return 'Rot blinkt'
    case 'overtime':
      return 'Overtime'
    default:
      return 'Normal'
  }
}

function formatClockLocal(showSeconds: boolean) {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  return showSeconds ? `${h}:${m}:${s}` : `${h}:${m}`
}
