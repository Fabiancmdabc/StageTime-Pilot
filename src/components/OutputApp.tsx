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
  const [pgmChromeVisible, setPgmChromeVisible] = useState(false)

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
    if (variant !== 'pgm') return
    let hideTimer = 0
    const reveal = () => {
      setPgmChromeVisible(true)
      window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => setPgmChromeVisible(false), 1600)
    }
    window.addEventListener('mousemove', reveal)
    return () => {
      window.removeEventListener('mousemove', reveal)
      window.clearTimeout(hideTimer)
    }
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
    <div
      className={`output-root output-${variant}${
        variant === 'pgm' && pgmChromeVisible ? ' pgm-chrome-on' : ''
      }`}
    >
      {variant === 'pgm' ? (
        <>
          <div className="pgm-drag-region" aria-hidden />
          <div className="pgm-window-chrome" role="toolbar" aria-label="PGM">
            <button
              type="button"
              className="pgm-win-btn pgm-win-close"
              title={t('closePgmTitle')}
              onClick={() => void window.electronAPI?.closePgmWindow()}
            />
            <button
              type="button"
              className="pgm-win-btn pgm-win-min"
              title={t('minimizePgmTitle')}
              onClick={() => void window.electronAPI?.minimizePgmWindow()}
            />
          </div>
        </>
      ) : null}
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
      <ShowDisplay state={state} />
    </div>
  )
}
