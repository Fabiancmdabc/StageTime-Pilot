import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { THEME_STORAGE_KEY } from './types'

try {
  const theme = localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme
} catch {
  document.documentElement.setAttribute('data-theme', 'dark')
}

const hash = (location.hash || '#control').replace(/^#/, '')
const isOutput =
  hash === 'show' || hash === 'pgm' || hash === 'remote' || hash === 'output'
document.documentElement.classList.toggle('route-control', !isOutput)
document.documentElement.classList.toggle('route-output', isOutput)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
