import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  API_STORAGE_KEY,
  DEFAULT_API_SETTINGS,
  DEFAULT_TIMER_STATE,
  STORAGE_KEY,
  SYNC_CHANNEL,
  type ApiSettings,
  type ShowVisuals,
  type TimePreset,
  type TimerMode,
  type TimerState,
} from '../types'
import { computeRemaining, uid } from '../utils/time'

type Listener = (state: TimerState) => void

function loadState(): TimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_TIMER_STATE, updatedAt: Date.now() }
    const parsed = JSON.parse(raw) as Partial<TimerState>
    const mergedVisuals = {
      ...DEFAULT_TIMER_STATE.visuals,
      ...(parsed.visuals ?? {}),
    }
    delete (mergedVisuals as { transparentBackground?: boolean }).transparentBackground

    return {
      ...DEFAULT_TIMER_STATE,
      ...parsed,
      visuals: mergedVisuals,
      presets: parsed.presets?.length ? parsed.presets : DEFAULT_TIMER_STATE.presets,
      message: parsed.message ?? null,
      runStartedAt: null,
      status:
        parsed.status === 'running' || parsed.status === 'overtime'
          ? 'paused'
          : (parsed.status ?? 'idle'),
      updatedAt: Date.now(),
    }
  } catch {
    return { ...DEFAULT_TIMER_STATE, updatedAt: Date.now() }
  }
}

function loadApi(): ApiSettings {
  try {
    const raw = localStorage.getItem(API_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_API_SETTINGS }
    return { ...DEFAULT_API_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_API_SETTINGS }
  }
}

function persist(state: TimerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

function persistApi(api: ApiSettings) {
  try {
    localStorage.setItem(API_STORAGE_KEY, JSON.stringify(api))
  } catch {
    /* ignore */
  }
}

function publicState(state: TimerState): TimerState {
  const remainingMs = computeRemaining(state)
  const status =
    state.mode === 'countdown' &&
    (state.status === 'running' || state.status === 'overtime') &&
    remainingMs < 0
      ? 'overtime'
      : state.status
  return { ...state, remainingMs, status, updatedAt: Date.now() }
}

let masterState = loadState()
const listeners = new Set<Listener>()
let channel: BroadcastChannel | null = null
let isMaster = false

function emit(state: TimerState, broadcast = true) {
  masterState = state
  persist(state)
  const pub = publicState(state)
  listeners.forEach((l) => l(pub))
  if (broadcast && isMaster) {
    try {
      channel?.postMessage({ type: 'state', state: pub })
      window.electronAPI?.broadcastState(pub)
    } catch {
      /* ignore */
    }
  }
}

function ensureChannel() {
  if (channel || typeof BroadcastChannel === 'undefined') return
  channel = new BroadcastChannel(SYNC_CHANNEL)
  channel.onmessage = (ev) => {
    const data = ev.data as { type?: string; state?: TimerState }
    if (data?.type === 'state' && data.state && !isMaster) {
      masterState = data.state
      listeners.forEach((l) => l(data.state!))
    }
  }
}

export function useTimerStore(options: { master?: boolean } = {}) {
  const master = options.master ?? false
  const [state, setState] = useState<TimerState>(() => publicState(masterState))
  const [apiSettings, setApiSettingsState] = useState<ApiSettings>(() => loadApi())
  const tickRef = useRef<number | null>(null)

  useEffect(() => {
    isMaster = master
    ensureChannel()
    const listener: Listener = (s) => setState(s)
    listeners.add(listener)
    setState(publicState(masterState))

    const unsubIpc = window.electronAPI?.onStateUpdate((incoming) => {
      if (master) return
      const s = incoming as TimerState
      masterState = s
      setState(s)
    })

    return () => {
      listeners.delete(listener)
      unsubIpc?.()
    }
  }, [master])

  useEffect(() => {
    if (!master) return
    const tick = () => {
      if (masterState.status === 'running' || masterState.status === 'overtime') {
        const next = publicState(masterState)
        if (next.message?.expiresAt && Date.now() >= next.message.expiresAt) {
          emit({ ...masterState, message: null, remainingMs: next.remainingMs, status: next.status })
        } else {
          emit({ ...masterState, remainingMs: next.remainingMs, status: next.status }, true)
        }
      } else if (masterState.mode === 'clock') {
        emit({ ...masterState, updatedAt: Date.now() }, true)
      }
    }
    tickRef.current = window.setInterval(tick, 200)
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
    }
  }, [master])

  const patch = useCallback((partial: Partial<TimerState>) => {
    if (!isMaster) return
    emit({ ...masterState, ...partial, updatedAt: Date.now() })
  }, [])

  const setDuration = useCallback((seconds: number, autoStart = false) => {
    if (!isMaster) return
    const ms = Math.max(0, Math.round(seconds * 1000))
    const base: TimerState = {
      ...masterState,
      mode: 'countdown',
      durationMs: ms,
      remainingMs: ms,
      remainingAtRunStart: ms,
      runStartedAt: null,
      status: 'idle',
      updatedAt: Date.now(),
    }
    if (autoStart) {
      emit({
        ...base,
        status: 'running',
        runStartedAt: Date.now(),
        remainingAtRunStart: ms,
      })
    } else {
      emit(base)
    }
  }, [])

  const start = useCallback(() => {
    if (!isMaster) return
    if (masterState.mode === 'clock') {
      emit({ ...masterState, status: 'running', updatedAt: Date.now() })
      return
    }
    const remaining = computeRemaining(masterState)
    emit({
      ...masterState,
      status: remaining < 0 ? 'overtime' : 'running',
      runStartedAt: Date.now(),
      remainingAtRunStart: remaining,
      remainingMs: remaining,
      updatedAt: Date.now(),
    })
  }, [])

  const pause = useCallback(() => {
    if (!isMaster) return
    const remaining = computeRemaining(masterState)
    emit({
      ...masterState,
      status: 'paused',
      remainingMs: remaining,
      runStartedAt: null,
      remainingAtRunStart: remaining,
      updatedAt: Date.now(),
    })
  }, [])

  const reset = useCallback(() => {
    if (!isMaster) return
    emit({
      ...masterState,
      status: 'idle',
      remainingMs: masterState.durationMs,
      remainingAtRunStart: masterState.durationMs,
      runStartedAt: null,
      updatedAt: Date.now(),
    })
  }, [])

  const stop = useCallback(() => {
    if (!isMaster) return
    emit({
      ...masterState,
      status: 'idle',
      remainingMs: masterState.durationMs,
      remainingAtRunStart: masterState.durationMs,
      runStartedAt: null,
      message: null,
      updatedAt: Date.now(),
    })
  }, [])

  const setMode = useCallback((mode: TimerMode) => {
    if (!isMaster) return
    emit({
      ...masterState,
      mode,
      status: 'idle',
      runStartedAt: null,
      remainingMs: mode === 'countdown' ? masterState.durationMs : 0,
      remainingAtRunStart: masterState.durationMs,
      updatedAt: Date.now(),
    })
  }, [])

  const setThresholds = useCallback((warnAtSec: number, criticalAtSec: number) => {
    if (!isMaster) return
    emit({
      ...masterState,
      warnAtSec: Math.max(0, warnAtSec),
      criticalAtSec: Math.max(0, Math.min(criticalAtSec, warnAtSec)),
      updatedAt: Date.now(),
    })
  }, [])

  const setVisuals = useCallback((visuals: Partial<ShowVisuals>) => {
    if (!isMaster) return
    const next = { ...masterState.visuals, ...visuals }
    // Legacy: transparentBackground aus alten Saves entfernen
    delete (next as { transparentBackground?: boolean }).transparentBackground
    emit({ ...masterState, visuals: next, updatedAt: Date.now() })
  }, [])

  const sendMessage = useCallback((text: string, seconds = 0, prominent = false) => {
    if (!isMaster) return
    const trimmed = text.trim()
    if (!trimmed) {
      emit({ ...masterState, message: null, updatedAt: Date.now() })
      return
    }
    emit({
      ...masterState,
      message: {
        text: trimmed,
        prominent,
        expiresAt: seconds > 0 ? Date.now() + seconds * 1000 : null,
      },
      updatedAt: Date.now(),
    })
  }, [])

  const clearMessage = useCallback(() => {
    if (!isMaster) return
    emit({ ...masterState, message: null, updatedAt: Date.now() })
  }, [])

  const applyPreset = useCallback((preset: TimePreset) => {
    // Schnellwahl setzt nur die Dauer – Start bleibt manuell
    setDuration(preset.seconds, false)
  }, [setDuration])

  const updatePresets = useCallback((presets: TimePreset[]) => {
    if (!isMaster) return
    emit({ ...masterState, presets, updatedAt: Date.now() })
  }, [])

  const addPreset = useCallback((label: string, seconds: number, autoStart = true) => {
    if (!isMaster) return
    const presets = [
      ...masterState.presets,
      { id: uid('preset'), label, seconds, autoStart },
    ]
    emit({ ...masterState, presets, updatedAt: Date.now() })
  }, [])

  const removePreset = useCallback((id: string) => {
    if (!isMaster) return
    emit({
      ...masterState,
      presets: masterState.presets.filter((p) => p.id !== id),
      updatedAt: Date.now(),
    })
  }, [])

  const setApiSettings = useCallback((next: ApiSettings) => {
    setApiSettingsState(next)
    persistApi(next)
    void window.electronAPI?.setApiConfig(next)
  }, [])

  const applyApiCommand = useCallback(
    (action: string, params: Record<string, string>) => {
      if (!isMaster) return null
      switch (action) {
        case 'timer.start':
          start()
          break
        case 'timer.stop':
          stop()
          break
        case 'timer.pause':
          pause()
          break
        case 'timer.resume':
          start()
          break
        case 'timer.reset':
          reset()
          break
        case 'timer.set': {
          const seconds = Number(params.seconds ?? (Number(params.ms ?? 0) / 1000))
          if (Number.isFinite(seconds)) setDuration(seconds, params.autostart === '1')
          break
        }
        case 'timer.mode': {
          if (params.mode === 'countdown' || params.mode === 'clock') setMode(params.mode)
          break
        }
        case 'message':
          sendMessage(params.text ?? '', Number(params.seconds ?? 0), params.prominent === '1')
          break
        case 'message.clear':
          clearMessage()
          break
        case 'preset': {
          const preset = masterState.presets.find(
            (p) => p.id === params.id || p.label === params.name,
          )
          if (preset) applyPreset(preset)
          break
        }
        case 'status':
          return publicState(masterState)
        default:
          break
      }
      return publicState(masterState)
    },
    [applyPreset, clearMessage, pause, reset, sendMessage, setDuration, setMode, start, stop],
  )

  const viewState = useMemo(() => publicState(state), [state])

  return {
    state: viewState,
    apiSettings,
    setApiSettings,
    patch,
    setDuration,
    start,
    pause,
    reset,
    stop,
    setMode,
    setThresholds,
    setVisuals,
    sendMessage,
    clearMessage,
    applyPreset,
    updatePresets,
    addPreset,
    removePreset,
    applyApiCommand,
  }
}
