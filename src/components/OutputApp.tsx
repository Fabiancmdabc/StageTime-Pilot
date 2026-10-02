import { useEffect, useState } from 'react'
import type { TimerState } from '../types'
import { DEFAULT_TIMER_STATE } from '../types'
import { useT } from '../i18n'
import { useTimerStore } from '../store/timerStore'
import { ShowDisplay } from './ShowDisplay'

export function OutputApp({
  variant,
}: {
  variant: 'show' | 'pgm' | 'remote' | 'output'
}) {
  const t = useT()
  const store = useTimerStore({ master: false })
  const [remoteState, setRemoteState] = useState<TimerState | null>(null)

  useEffect(() => {
    if (variant !== 'show') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        void window.electronAPI?.closeFocusedShowWindow()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [variant])

  useEffect(() => {
    if (variant !== 'remote') return

    let ws: WebSocket | null = null
    let closed = false

    const connect = () => {
      if (closed) return
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      const host =
        location.port === '5174'
          ? `${location.hostname}:8787`
          : location.host
      ws = new WebSocket(`${proto}://${host}/ws`)
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data as string) as {
            type?: string
            state?: TimerState
          }
          if (data.type === 'state' && data.state) setRemoteState(data.state)
        } catch {
          /* ignore */
        }
      }
      ws.onclose = () => {
        if (!closed) setTimeout(connect, 1200)
      }
    }

    connect()
    return () => {
      closed = true
      ws?.close()
    }
  }, [variant])

  const state = variant === 'remote' ? remoteState ?? DEFAULT_TIMER_STATE : store.state

  return (
    <div className={`output-root output-${variant}`}>
      {variant === 'show' ? (
        <button
          type="button"
          className="show-close-btn"
          title={t('closeShowTitle')}
          onClick={() => void window.electronAPI?.closeFocusedShowWindow()}
        >
          ×
        </button>
      ) : null}
      <ShowDisplay
        state={state}
        label={variant === 'pgm' ? 'PGM' : undefined}
      />
    </div>
  )
}
