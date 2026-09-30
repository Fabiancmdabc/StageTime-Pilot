import { BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createFfmpegSender } from './ffmpeg-sender.js'
import { ndiStatus, sendNdiFrame, startNdi, stopNdi } from './ndi-sender.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULT_CONFIG = {
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

export function createOutputManager({ resolveHtml, getLatestState }) {
  let config = { ...DEFAULT_CONFIG }
  let captureWindow = null
  let capturing = false
  let lastFrameAt = 0
  const rtmp = createFfmpegSender()
  const udp = createFfmpegSender()
  let minInterval = 1000 / 30

  function anyEnabled() {
    return Boolean(config.ndiEnabled || config.rtmpEnabled || config.udpEnabled)
  }

  function ensureCaptureWindow() {
    if (captureWindow && !captureWindow.isDestroyed()) return captureWindow

    captureWindow = new BrowserWindow({
      width: config.width,
      height: config.height,
      show: false,
      frame: false,
      backgroundColor: '#00b140',
      webPreferences: {
        preload: path.join(__dirname, '../preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        offscreen: true,
        backgroundThrottling: false,
      },
    })

    captureWindow.webContents.setFrameRate(config.fps)
    captureWindow.webContents.on('paint', (_event, _dirty, image) => {
      void onPaint(image)
    })
    captureWindow.on('closed', () => {
      captureWindow = null
      capturing = false
    })

    captureWindow.loadURL(resolveHtml('#output'))
    const state = getLatestState?.()
    if (state) {
      captureWindow.webContents.once('did-finish-load', () => {
        if (captureWindow && !captureWindow.isDestroyed()) {
          captureWindow.webContents.send('state-update', state)
        }
      })
    }
    capturing = true
    return captureWindow
  }

  function destroyCaptureWindow() {
    capturing = false
    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.close()
    }
    captureWindow = null
  }

  async function onPaint(image) {
    const now = Date.now()
    if (now - lastFrameAt < minInterval - 2) return
    lastFrameAt = now

    if (config.ndiEnabled) {
      void sendNdiFrame(image)
    }
    if (config.rtmpEnabled || config.udpEnabled) {
      const jpeg = image.toJPEG(70)
      if (config.rtmpEnabled) rtmp.writeJpeg(jpeg)
      if (config.udpEnabled) udp.writeJpeg(jpeg)
    }
  }

  function syncState(state) {
    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.webContents.send('state-update', state)
    }
  }

  async function applyConfig(next) {
    const prev = { ...config }
    config = { ...DEFAULT_CONFIG, ...config, ...next }
    minInterval = 1000 / Math.max(1, config.fps)

    if (anyEnabled()) {
      ensureCaptureWindow()
    } else {
      destroyCaptureWindow()
    }

    if (config.ndiEnabled) {
      if (!prev.ndiEnabled || prev.ndiName !== config.ndiName || !ndiStatus().running) {
        try {
          await startNdi(config.ndiName)
        } catch (err) {
          console.error('NDI start failed', err)
        }
      }
    } else if (prev.ndiEnabled) {
      await stopNdi()
    }

    if (config.rtmpEnabled) {
      if (!prev.rtmpEnabled || prev.rtmpUrl !== config.rtmpUrl || !rtmp.status().running) {
        try {
          rtmp.start({
            type: 'rtmp',
            url: config.rtmpUrl,
            width: config.width,
            height: config.height,
            fps: config.fps,
          })
        } catch (err) {
          console.error('RTMP start failed', err)
        }
      }
    } else {
      rtmp.stop()
    }

    if (config.udpEnabled) {
      if (!prev.udpEnabled || prev.udpUrl !== config.udpUrl || !udp.status().running) {
        try {
          udp.start({
            type: 'udp',
            url: config.udpUrl,
            width: config.width,
            height: config.height,
            fps: config.fps,
          })
        } catch (err) {
          console.error('UDP start failed', err)
        }
      }
    } else {
      udp.stop()
    }

    return getStatus()
  }

  function getStatus() {
    const ndi = ndiStatus()
    const rtmpStatus = rtmp.status()
    const udpStatus = udp.status()
    return {
      capturing,
      config,
      ndi: {
        enabled: config.ndiEnabled,
        sending: ndi.running,
        error: ndi.error,
        name: ndi.name,
        connections: ndi.connections,
      },
      rtmp: {
        enabled: config.rtmpEnabled,
        sending: rtmpStatus.running,
        error: rtmpStatus.error,
        url: config.rtmpUrl,
        ffmpeg: rtmpStatus.ffmpeg,
      },
      udp: {
        enabled: config.udpEnabled,
        sending: udpStatus.running,
        error: udpStatus.error,
        url: config.udpUrl,
      },
    }
  }

  async function stopAll() {
    destroyCaptureWindow()
    await stopNdi()
    rtmp.stop()
    udp.stop()
  }

  return { applyConfig, getStatus, syncState, stopAll, DEFAULT_CONFIG }
}
