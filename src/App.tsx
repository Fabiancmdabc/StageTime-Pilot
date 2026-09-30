import { useEffect, useState } from 'react'
import { ControlApp } from './components/ControlApp'
import { OutputApp } from './components/OutputApp'
import { useTimerStore } from './store/timerStore'
import './styles/app.css'

type Route = 'control' | 'show' | 'pgm' | 'remote' | 'output'

function parseRoute(): Route {
  const h = (location.hash || '#control').replace(/^#/, '')
  if (h === 'show' || h === 'pgm' || h === 'remote' || h === 'output') return h
  return 'control'
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute())
  const store = useTimerStore({ master: route === 'control' })

  useEffect(() => {
    const onHash = () => setRoute(parseRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (route !== 'control') return
    const unsub = window.electronAPI?.onApiCommand((payload) => {
      const result = store.applyApiCommand(payload.action, payload.params ?? {})
      if (payload.expectReply && payload.requestId) {
        window.electronAPI?.replyApiQuery(payload.requestId, result)
      }
    })
    return () => unsub?.()
    // applyApiCommand is stable enough via master store; rebind when route changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route])

  useEffect(() => {
    document.title =
      route === 'show'
        ? 'StageTime Show'
        : route === 'pgm'
          ? 'StageTime PGM'
          : route === 'remote'
            ? 'StageTime Remote'
            : route === 'output'
              ? 'StageTime Output'
              : 'StageTime-Pilot'

    const isOutput =
      route === 'show' || route === 'pgm' || route === 'remote' || route === 'output'
    document.documentElement.classList.toggle('route-control', !isOutput)
    document.documentElement.classList.toggle('route-output', isOutput)
  }, [route])

  if (route === 'show') return <OutputApp variant="show" />
  if (route === 'output') return <OutputApp variant="output" />
  if (route === 'pgm') return <OutputApp variant="pgm" />
  if (route === 'remote') return <OutputApp variant="remote" />

  return <ControlApp {...store} />
}
