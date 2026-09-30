import http from 'node:http'
import { WebSocketServer } from 'ws'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Companion-Token, X-Api-Token',
    'Cache-Control': 'no-store',
  })
  res.end(payload)
}

function parseUrl(reqUrl) {
  const u = new URL(reqUrl, 'http://127.0.0.1')
  const params = Object.fromEntries(u.searchParams.entries())
  return { pathname: u.pathname, params }
}

function remoteHtml() {
  const file = path.join(__dirname, 'remote.html')
  try {
    return fs.readFileSync(file, 'utf8')
  } catch {
    return `<!doctype html><html><body style="background:#000;color:#fff">StageTime Remote fehlt.</body></html>`
  }
}

export function createApiServer({ port, token, onCommand, getState }) {
  let server = null
  let wss = null
  const pending = new Map()
  let listenPort = port

  function checkToken(req, params) {
    if (!token) return true
    const header =
      req.headers['x-api-token'] ||
      req.headers['x-companion-token'] ||
      ''
    const q = params.token ?? ''
    return header === token || q === token
  }

  function dispatch(action, params, expectReply = false) {
    const requestId = expectReply
      ? `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      : undefined

    return new Promise((resolve) => {
      if (expectReply && requestId) {
        const timer = setTimeout(() => {
          pending.delete(requestId)
          resolve(getState() ?? { ok: false, error: 'timeout' })
        }, 1500)
        pending.set(requestId, {
          resolve: (data) => {
            clearTimeout(timer)
            resolve(data)
          },
        })
      } else {
        resolve({ ok: true })
      }
      onCommand?.({ action, params, requestId, expectReply })
    })
  }

  function broadcastState(state) {
    if (!wss) return
    const msg = JSON.stringify({ type: 'state', state })
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(msg)
    }
  }

  function resolveQuery(requestId, data) {
    const entry = pending.get(requestId)
    if (!entry) return
    pending.delete(requestId)
    entry.resolve(data)
  }

  async function handleApi(pathname, params, req, res) {
    if (!checkToken(req, params)) {
      sendJson(res, 401, { ok: false, error: 'unauthorized' })
      return
    }

    const map = {
      '/api/health': async () =>
        sendJson(res, 200, { ok: true, service: 'stagetime-pilot', port: listenPort }),
      '/api/status': async () => {
        const data = await dispatch('status', params, true)
        sendJson(res, 200, { ok: true, state: data })
      },
      '/api/timer/start': async () => {
        await dispatch('timer.start', params)
        sendJson(res, 200, { ok: true })
      },
      '/api/timer/stop': async () => {
        await dispatch('timer.stop', params)
        sendJson(res, 200, { ok: true })
      },
      '/api/timer/pause': async () => {
        await dispatch('timer.pause', params)
        sendJson(res, 200, { ok: true })
      },
      '/api/timer/resume': async () => {
        await dispatch('timer.resume', params)
        sendJson(res, 200, { ok: true })
      },
      '/api/timer/reset': async () => {
        await dispatch('timer.reset', params)
        sendJson(res, 200, { ok: true })
      },
      '/api/timer/set': async () => {
        await dispatch('timer.set', params)
        sendJson(res, 200, { ok: true })
      },
      '/api/timer/mode': async () => {
        await dispatch('timer.mode', params)
        sendJson(res, 200, { ok: true })
      },
      '/api/message': async () => {
        await dispatch('message', params)
        sendJson(res, 200, { ok: true })
      },
      '/api/message/clear': async () => {
        await dispatch('message.clear', params)
        sendJson(res, 200, { ok: true })
      },
      '/api/preset': async () => {
        await dispatch('preset', params)
        sendJson(res, 200, { ok: true })
      },
    }

    // short aliases without /api
    const aliases = {
      '/health': '/api/health',
      '/status': '/api/status',
      '/timer/start': '/api/timer/start',
      '/timer/stop': '/api/timer/stop',
      '/timer/pause': '/api/timer/pause',
      '/timer/resume': '/api/timer/resume',
      '/timer/reset': '/api/timer/reset',
      '/timer/set': '/api/timer/set',
      '/timer/mode': '/api/timer/mode',
      '/message': '/api/message',
      '/message/clear': '/api/message/clear',
      '/preset': '/api/preset',
    }

    const target = map[pathname] ? pathname : aliases[pathname]
    const handler = target ? map[target] : null
    if (!handler) {
      sendJson(res, 404, { ok: false, error: 'not_found', path: pathname })
      return
    }
    await handler()
  }

  function start() {
    return new Promise((resolve, reject) => {
      server = http.createServer(async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,OPTIONS',
            'Access-Control-Allow-Headers':
              'Content-Type, X-Companion-Token, X-Api-Token',
          })
          res.end()
          return
        }

        const { pathname, params } = parseUrl(req.url ?? '/')

        if (pathname === '/remote' || pathname === '/remote/') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(remoteHtml())
          return
        }

        // Serve built assets for remote clients in production
        if (!pathname.startsWith('/api') && pathname !== '/health' && pathname !== '/status') {
          const assetPath = pathname === '/' ? '/index.html' : pathname
          if (assetPath.startsWith('/assets') || assetPath.endsWith('.js') || assetPath.endsWith('.css') || assetPath.endsWith('.png')) {
            const file = path.join(__dirname, '../dist', assetPath.replace(/^\//, ''))
            if (fs.existsSync(file)) {
              const ext = path.extname(file)
              const types = {
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.png': 'image/png',
                '.html': 'text/html',
                '.svg': 'image/svg+xml',
              }
              res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' })
              fs.createReadStream(file).pipe(res)
              return
            }
          }
        }

        if (req.method !== 'GET') {
          sendJson(res, 405, { ok: false, error: 'method_not_allowed' })
          return
        }

        try {
          await handleApi(pathname, params, req, res)
        } catch (err) {
          sendJson(res, 500, { ok: false, error: String(err?.message ?? err) })
        }
      })

      wss = new WebSocketServer({ server, path: '/ws' })
      wss.on('connection', (socket) => {
        const state = getState?.()
        if (state) socket.send(JSON.stringify({ type: 'state', state }))
      })

      server.once('error', reject)
      server.listen(port, '0.0.0.0', () => {
        listenPort = port
        resolve({ ok: true, port })
      })
    })
  }

  function stop() {
    try {
      wss?.close()
    } catch {
      /* ignore */
    }
    try {
      server?.close()
    } catch {
      /* ignore */
    }
    wss = null
    server = null
  }

  return { start, stop, broadcastState, resolveQuery }
}
