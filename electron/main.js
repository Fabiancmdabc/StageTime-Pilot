import { app, BrowserWindow, ipcMain, screen } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { createApiServer } from './api-server.js'
import { createOutputManager } from './outputs/manager.js'

const require = createRequire(import.meta.url)
const os = require('node:os')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = process.env.NODE_ENV === 'development'
const DEV_URL = 'http://localhost:5174'

let controlWindow = null
/** @type {Map<number, import('electron').BrowserWindow>} */
const showWindows = new Map()
let pgmWindow = null
let apiServer = null
let latestState = null
/** @type {number[]} */
let selectedDisplayIds = []
let outputManager = null

const apiConfig = {
  enabled: true,
  port: 8787,
  token: '',
}

function resolveHtml(hash) {
  if (isDev) return `${DEV_URL}/${hash}`
  return `file://${path.join(__dirname, '../dist/index.html')}${hash}`
}

function listDisplays() {
  const primaryId = screen.getPrimaryDisplay().id
  return screen.getAllDisplays().map((d, index) => ({
    id: d.id,
    label: d.label?.trim() || `Display ${index + 1}`,
    bounds: d.bounds,
    size: d.size,
    scaleFactor: d.scaleFactor,
    primary: d.id === primaryId,
  }))
}

function resolveTargetDisplayIds(ids) {
  const available = new Set(screen.getAllDisplays().map((d) => d.id))
  const requested = (Array.isArray(ids) ? ids : selectedDisplayIds)
    .map(Number)
    .filter((id) => available.has(id))

  if (requested.length > 0) return [...new Set(requested)]
  return [screen.getPrimaryDisplay().id]
}

function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: '#12151a',
    title: 'StageTime-Pilot',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  controlWindow.loadURL(resolveHtml('#control'))
  controlWindow.on('closed', () => {
    controlWindow = null
  })
}

function createShowWindowOnDisplay(displayId) {
  const display = screen.getAllDisplays().find((d) => d.id === displayId)
  if (!display) return null

  const existing = showWindows.get(displayId)
  if (existing && !existing.isDestroyed()) {
    existing.focus()
    return existing
  }

  const { x, y, width, height } = display.bounds
  const bg = latestState?.visuals?.backgroundColor || '#00b140'

  let win
  try {
    // Zuerst auf dem Ziel-Display positionieren, dann Fullscreen –
    // verdeckt die macOS-Menüleiste auf diesem Screen.
    win = new BrowserWindow({
      x,
      y,
      width,
      height,
      frame: false,
      fullscreenable: true,
      fullscreen: false,
      backgroundColor: bg,
      hasShadow: false,
      show: false,
      title: `StageTime-Pilot Show (${displayId})`,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false,
      },
    })
  } catch (err) {
    console.error('createShowWindowOnDisplay failed', displayId, err)
    return null
  }

  win.once('ready-to-show', () => {
    if (win.isDestroyed()) return
    win.setBounds({ x, y, width, height })
    win.show()
    win.setFullScreen(true)
  })

  win.loadURL(resolveHtml('#show'))
  win.on('closed', () => {
    showWindows.delete(displayId)
  })
  win.webContents.on('render-process-gone', (_e, details) => {
    console.error('Show renderer gone', displayId, details)
  })

  if (latestState) {
    win.webContents.once('did-finish-load', () => {
      if (!win.isDestroyed()) win.webContents.send('state-update', latestState)
    })
  }

  showWindows.set(displayId, win)
  return win
}

function closeShowWindow(displayId) {
  const win = showWindows.get(displayId)
  if (win && !win.isDestroyed()) win.close()
  showWindows.delete(displayId)
}

function closeAllShowWindows() {
  for (const id of [...showWindows.keys()]) closeShowWindow(id)
}

/**
 * Open show on selected displays. Optionally pass explicit ids.
 * Closes windows for displays that are no longer selected when `syncClose` is true.
 */
function openShowWindows(displayIds, { syncClose = true } = {}) {
  const targets = resolveTargetDisplayIds(displayIds)
  selectedDisplayIds = targets

  if (syncClose) {
    for (const id of [...showWindows.keys()]) {
      if (!targets.includes(id)) closeShowWindow(id)
    }
  }

  for (const id of targets) {
    const existing = showWindows.get(id)
    if (existing && !existing.isDestroyed()) {
      existing.focus()
    } else {
      createShowWindowOnDisplay(id)
    }
  }

  return { ok: true, displayIds: targets }
}

function createPgmWindow() {
  if (pgmWindow && !pgmWindow.isDestroyed()) {
    pgmWindow.focus()
    return
  }

  pgmWindow = new BrowserWindow({
    width: 960,
    height: 540,
    backgroundColor: '#000000',
    title: 'StageTime-Pilot PGM',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  pgmWindow.loadURL(resolveHtml('#pgm'))
  pgmWindow.on('closed', () => {
    pgmWindow = null
  })

  if (latestState) {
    pgmWindow.webContents.once('did-finish-load', () => {
      pgmWindow?.webContents.send('state-update', latestState)
    })
  }
}

function broadcastToOutputs(state) {
  latestState = state
  for (const win of showWindows.values()) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('state-update', state)
    }
  }
  if (pgmWindow && !pgmWindow.isDestroyed()) {
    pgmWindow.webContents.send('state-update', state)
  }
  outputManager?.syncState(state)
  apiServer?.broadcastState(state)
}

function forwardApiCommand(payload) {
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.webContents.send('api-command', payload)
  }
}

function ensureApiServer() {
  if (apiServer) {
    apiServer.stop()
    apiServer = null
  }
  if (!apiConfig.enabled) return Promise.resolve({ ok: true })

  apiServer = createApiServer({
    port: apiConfig.port,
    token: apiConfig.token,
    onCommand: (payload) => forwardApiCommand(payload),
    getState: () => latestState,
  })

  return apiServer.start()
}

function getLocalAddresses() {
  const nets = os.networkInterfaces()
  const result = []
  for (const entries of Object.values(nets)) {
    for (const net of entries ?? []) {
      const family = String(net.family)
      if ((family === 'IPv4' || family === '4') && !net.internal) {
        result.push(net.address)
      }
    }
  }
  return result
}

ipcMain.handle('get-displays', async () => listDisplays())

ipcMain.handle('get-selected-show-displays', async () => selectedDisplayIds)

ipcMain.handle('set-selected-show-displays', async (_e, displayIds) => {
  selectedDisplayIds = resolveTargetDisplayIds(displayIds)
  const anyOpen = [...showWindows.values()].some((w) => w && !w.isDestroyed())
  if (anyOpen) {
    openShowWindows(selectedDisplayIds, { syncClose: true })
  }
  return { ok: true, displayIds: selectedDisplayIds }
})

ipcMain.handle('open-show-window', async (_e, displayIds) => {
  return openShowWindows(displayIds?.length ? displayIds : selectedDisplayIds, {
    syncClose: true,
  })
})

ipcMain.handle('open-pgm-window', async () => {
  createPgmWindow()
})

ipcMain.handle('close-show-window', async () => {
  closeAllShowWindows()
})

ipcMain.handle('close-focused-show-window', async (event) => {
  const sender = BrowserWindow.fromWebContents(event.sender)
  for (const [id, win] of showWindows.entries()) {
    if (win === sender) {
      closeShowWindow(id)
      if (controlWindow && !controlWindow.isDestroyed()) controlWindow.show()
      return { ok: true }
    }
  }
  return { ok: false }
})

ipcMain.handle('focus-control-window', async () => {
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.show()
    controlWindow.focus()
  }
})

ipcMain.handle('close-pgm-window', async () => {
  if (pgmWindow && !pgmWindow.isDestroyed()) pgmWindow.close()
})

ipcMain.handle('get-local-addresses', async () => getLocalAddresses())

ipcMain.handle('set-output-config', async (_e, config) => {
  if (!outputManager) return { ok: false, error: 'not_ready' }
  try {
    const status = await outputManager.applyConfig(config)
    controlWindow?.webContents.send('output-status', status)
    return { ok: true, status }
  } catch (err) {
    return { ok: false, error: String(err?.message ?? err) }
  }
})

ipcMain.handle('get-output-status', async () => outputManager?.getStatus() ?? null)
ipcMain.handle('get-api-info', async () => ({
  port: apiConfig.port,
  token: apiConfig.token,
  enabled: apiConfig.enabled,
}))

ipcMain.handle('set-api-config', async (_e, config) => {
  apiConfig.enabled = Boolean(config?.enabled)
  apiConfig.port = Number(config?.port) || 8787
  apiConfig.token = String(config?.token ?? '')
  try {
    const result = await ensureApiServer()
    return { ok: true, port: apiConfig.port, ...result }
  } catch (err) {
    return { ok: false, error: String(err?.message ?? err) }
  }
})

ipcMain.on('broadcast-state', (_e, state) => {
  broadcastToOutputs(state)
})

ipcMain.on('api-query-reply', (_e, requestId, data) => {
  apiServer?.resolveQuery(requestId, data)
})

app.whenReady().then(async () => {
  selectedDisplayIds = [screen.getPrimaryDisplay().id]
  outputManager = createOutputManager({
    resolveHtml,
    getLatestState: () => latestState,
  })
  createControlWindow()
  try {
    await ensureApiServer()
  } catch (err) {
    console.error('API server failed to start', err)
  }

  screen.on('display-added', () => {
    controlWindow?.webContents.send('displays-changed', listDisplays())
  })
  screen.on('display-removed', () => {
    const available = new Set(screen.getAllDisplays().map((d) => d.id))
    for (const id of [...showWindows.keys()]) {
      if (!available.has(id)) closeShowWindow(id)
    }
    selectedDisplayIds = selectedDisplayIds.filter((id) => available.has(id))
    if (selectedDisplayIds.length === 0) {
      selectedDisplayIds = [screen.getPrimaryDisplay().id]
    }
    controlWindow?.webContents.send('displays-changed', listDisplays())
  })
  screen.on('display-metrics-changed', () => {
    controlWindow?.webContents.send('displays-changed', listDisplays())
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createControlWindow()
  })
})

app.on('window-all-closed', () => {
  apiServer?.stop()
  void outputManager?.stopAll()
  if (process.platform !== 'darwin') app.quit()
})

process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err)
})

process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection', err)
})
