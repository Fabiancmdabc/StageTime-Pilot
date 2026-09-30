export type TimerMode = 'countdown' | 'clock'
export type TimerStatus = 'idle' | 'running' | 'paused' | 'overtime'
export type TimerPhase = 'normal' | 'warn' | 'critical' | 'overtime'

export type TextAlign = 'left' | 'center' | 'right'
export type VerticalAlign = 'top' | 'center' | 'bottom'

export interface TimePreset {
  id: string
  label: string
  seconds: number
  autoStart?: boolean
}

export interface ShowVisuals {
  backgroundColor: string
  timeColor: string
  warnColor: string
  criticalColor: string
  messageColor: string
  fontSizeVw: number
  showSeconds: boolean
  textAlign: TextAlign
  verticalAlign: VerticalAlign
  fontFamily: string
  letterSpacingEm: number
}

export interface ShowMessage {
  text: string
  prominent: boolean
  expiresAt: number | null
}

export interface TimerState {
  mode: TimerMode
  status: TimerStatus
  durationMs: number
  remainingMs: number
  /** Wall-clock ms when the current running segment started (for drift-free ticks). */
  runStartedAt: number | null
  /** remainingMs snapshot when current running segment started */
  remainingAtRunStart: number
  warnAtSec: number
  criticalAtSec: number
  message: ShowMessage | null
  presets: TimePreset[]
  visuals: ShowVisuals
  updatedAt: number
}

export interface ApiSettings {
  enabled: boolean
  port: number
  token: string
}

export const DEFAULT_VISUALS: ShowVisuals = {
  backgroundColor: '#00b140',
  timeColor: '#ffffff',
  warnColor: '#f5c542',
  criticalColor: '#ff3b3b',
  messageColor: '#ffffff',
  fontSizeVw: 22,
  showSeconds: true,
  textAlign: 'center',
  verticalAlign: 'center',
  fontFamily: '"SF Pro Display", "Segoe UI", system-ui, sans-serif',
  letterSpacingEm: 0.04,
}

/** Chroma-Key-Presets für vMix / OBS / Atem */
export const CHROMA_PRESETS = [
  { id: 'green', label: 'Greenscreen', color: '#00b140' },
  { id: 'green-pure', label: 'Key-Grün', color: '#00ff00' },
  { id: 'blue', label: 'Bluescreen', color: '#0047bb' },
  { id: 'magenta', label: 'Magenta', color: '#ff00ff' },
  { id: 'black', label: 'Schwarz', color: '#000000' },
] as const

export const DEFAULT_PRESETS: TimePreset[] = [
  { id: 'p1', label: '1 min', seconds: 60, autoStart: false },
  { id: 'p2', label: '3 min', seconds: 180, autoStart: false },
  { id: 'p3', label: '5 min', seconds: 300, autoStart: false },
  { id: 'p4', label: '10 min', seconds: 600, autoStart: false },
  { id: 'p5', label: '15 min', seconds: 900, autoStart: false },
  { id: 'p6', label: '20 min', seconds: 1200, autoStart: false },
]

export const DEFAULT_TIMER_STATE: TimerState = {
  mode: 'countdown',
  status: 'idle',
  durationMs: 300_000,
  remainingMs: 300_000,
  runStartedAt: null,
  remainingAtRunStart: 300_000,
  warnAtSec: 60,
  criticalAtSec: 30,
  message: null,
  presets: DEFAULT_PRESETS,
  visuals: DEFAULT_VISUALS,
  updatedAt: 0,
}

export const DEFAULT_API_SETTINGS: ApiSettings = {
  enabled: true,
  port: 8787,
  token: '',
}

export const SYNC_CHANNEL = 'stagetime.pilot.sync.v1'
export const STORAGE_KEY = 'stagetime.pilot.state.v1'
export const API_STORAGE_KEY = 'stagetime.pilot.api.v1'
export const THEME_STORAGE_KEY = 'stagetime.pilot.theme.v1'
export const SHOW_DISPLAYS_STORAGE_KEY = 'stagetime.pilot.showDisplays.v1'
export const OUTPUT_STORAGE_KEY = 'stagetime.pilot.outputs.v1'

export type UiTheme = 'dark' | 'light'

export interface OutputConfig {
  ndiEnabled: boolean
  ndiName: string
  rtmpEnabled: boolean
  rtmpUrl: string
  udpEnabled: boolean
  udpUrl: string
  width: number
  height: number
  fps: number
}

export interface OutputChannelStatus {
  enabled: boolean
  sending: boolean
  error: string | null
  name?: string
  url?: string
  connections?: number
  ffmpeg?: string
}

export interface OutputStatus {
  capturing: boolean
  config: OutputConfig
  ndi: OutputChannelStatus
  rtmp: OutputChannelStatus
  udp: OutputChannelStatus
}

export const DEFAULT_OUTPUT_CONFIG: OutputConfig = {
  ndiEnabled: false,
  ndiName: 'StageTime-Pilot',
  rtmpEnabled: false,
  rtmpUrl: 'rtmp://127.0.0.1/live/stagetime',
  udpEnabled: false,
  udpUrl: 'udp://127.0.0.1:1234',
  width: 1920,
  height: 1080,
  fps: 30,
}
