import type { TimerPhase, TimerState } from '../types'

export function formatCountdown(ms: number, showSeconds: boolean): string {
  const overtime = ms < 0
  const abs = Math.abs(ms)
  const totalSec = Math.floor(abs / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60

  let body: string
  if (h > 0) {
    body = showSeconds
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${h}:${String(m).padStart(2, '0')}`
  } else {
    body = showSeconds
      ? `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}`
  }

  return overtime ? `+${body}` : body
}

export function formatClock(now = new Date(), showSeconds: boolean): string {
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  return showSeconds ? `${h}:${m}:${s}` : `${h}:${m}`
}

export function getPhase(state: TimerState): TimerPhase {
  if (state.mode === 'clock') return 'normal'
  if (state.remainingMs < 0 || state.status === 'overtime') return 'overtime'
  const remSec = state.remainingMs / 1000
  if (remSec <= state.criticalAtSec) return 'critical'
  if (remSec <= state.warnAtSec) return 'warn'
  return 'normal'
}

export function phaseColor(state: TimerState): string {
  const phase = getPhase(state)
  switch (phase) {
    case 'warn':
      return state.visuals.warnColor
    case 'critical':
    case 'overtime':
      return state.visuals.criticalColor
    default:
      return state.visuals.timeColor
  }
}

export function shouldBlink(state: TimerState): boolean {
  const phase = getPhase(state)
  return phase === 'critical' || phase === 'overtime'
}

export function computeRemaining(state: TimerState, now = Date.now()): number {
  if (state.status !== 'running' && state.status !== 'overtime') {
    return state.remainingMs
  }
  if (state.runStartedAt == null) return state.remainingMs
  const elapsed = now - state.runStartedAt
  return state.remainingAtRunStart - elapsed
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}
