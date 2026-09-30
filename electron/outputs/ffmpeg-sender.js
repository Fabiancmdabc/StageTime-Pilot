import { spawn } from 'node:child_process'
import fs from 'node:fs'

function findFfmpeg() {
  const candidates = [
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    'ffmpeg',
  ]
  for (const c of candidates) {
    if (c.includes('/') && fs.existsSync(c)) return c
  }
  return 'ffmpeg'
}

export function createFfmpegSender() {
  /** @type {import('node:child_process').ChildProcessWithoutNullStreams | null} */
  let proc = null
  let busy = false
  let lastError = null
  let kind = null
  let url = ''

  function start({ type, url: dest, width = 1920, height = 1080, fps = 30 }) {
    stop()
    lastError = null
    kind = type
    url = dest
    if (!dest) {
      lastError = 'Kein Ziel-URL'
      throw new Error(lastError)
    }

    const bin = findFfmpeg()
    const args = [
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'image2pipe',
      '-vcodec',
      'mjpeg',
      '-framerate',
      String(fps),
      '-i',
      '-',
      '-an',
      '-s',
      `${width}x${height}`,
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-tune',
      'zerolatency',
      '-pix_fmt',
      'yuv420p',
      '-g',
      String(fps),
    ]

    if (type === 'rtmp') {
      args.push('-f', 'flv', dest)
    } else {
      args.push('-f', 'mpegts', dest)
    }

    proc = spawn(bin, args, { stdio: ['pipe', 'ignore', 'pipe'] })
    proc.on('error', (err) => {
      lastError = String(err.message ?? err)
      proc = null
    })
    proc.stderr?.on('data', (chunk) => {
      const msg = String(chunk).trim()
      if (msg) lastError = msg.slice(0, 400)
    })
    proc.on('exit', (code) => {
      if (code && code !== 0 && !lastError) {
        lastError = `ffmpeg exited ${code}`
      }
      proc = null
    })
  }

  function writeJpeg(buffer) {
    if (!proc?.stdin || proc.stdin.destroyed || busy) return false
    busy = true
    const ok = proc.stdin.write(buffer, () => {
      busy = false
    })
    if (!ok) {
      proc.stdin.once('drain', () => {
        busy = false
      })
    } else {
      busy = false
    }
    return true
  }

  function stop() {
    if (!proc) return
    try {
      proc.stdin?.end()
    } catch {
      /* ignore */
    }
    try {
      proc.kill('SIGTERM')
    } catch {
      /* ignore */
    }
    proc = null
    busy = false
  }

  function status() {
    return {
      running: Boolean(proc),
      error: lastError,
      kind,
      url,
      ffmpeg: findFfmpeg(),
    }
  }

  return { start, writeJpeg, stop, status }
}
