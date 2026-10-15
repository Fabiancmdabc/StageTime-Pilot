import { app, dialog, net, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { createWriteStream } from 'node:fs'

/**
 * Lädt die Installationsdatei und öffnet sie (DMG / Setup.exe).
 * @param {import('electron').BrowserWindow | null} parent
 * @param {{
 *   version: string
 *   downloadUrl: string
 *   confirmTitle: string
 *   confirmMessage: string
 *   confirmDetail: string
 *   confirmOk: string
 *   confirmCancel: string
 *   doneTitle: string
 *   doneMessage: string
 * }} opts
 */
export async function installUpdate(parent, opts) {
  const url = String(opts?.downloadUrl || '').trim()
  if (!url) {
    return { ok: false, error: 'missing_url' }
  }

  const confirm = await dialog.showMessageBox(parent ?? undefined, {
    type: 'question',
    buttons: [opts.confirmCancel || 'Cancel', opts.confirmOk || 'OK'],
    defaultId: 1,
    cancelId: 0,
    title: opts.confirmTitle || 'Update',
    message: opts.confirmMessage || 'Download and install?',
    detail: opts.confirmDetail || '',
    noLink: true,
  })

  if (confirm.response !== 1) {
    return { ok: false, cancelled: true }
  }

  let pathname = 'StageTime-Pilot-update'
  try {
    pathname = path.basename(new URL(url).pathname) || pathname
  } catch {
    /* keep fallback */
  }
  if (!pathname || pathname === '/' || !pathname.includes('.')) {
    pathname =
      process.platform === 'darwin'
        ? 'StageTime-Pilot-update.dmg'
        : 'StageTime-Pilot-update.exe'
  }

  const dest = path.join(app.getPath('temp'), pathname)

  try {
    await downloadFile(url, dest)
  } catch (err) {
    return { ok: false, error: String(err?.message ?? err) }
  }

  const openError = await shell.openPath(dest)
  if (openError) {
    return { ok: false, error: openError, path: dest }
  }

  await dialog.showMessageBox(parent ?? undefined, {
    type: 'info',
    buttons: ['OK'],
    defaultId: 0,
    title: opts.doneTitle || 'Update',
    message: opts.doneMessage || 'Installer opened.',
    noLink: true,
  })

  return { ok: true, path: dest }
}

async function downloadFile(url, destPath) {
  const res = await net.fetch(url, { bypassCustomProtocolHandlers: true })
  if (!res.ok) {
    throw new Error(`Download fehlgeschlagen (HTTP ${res.status})`)
  }

  await fs.promises.mkdir(path.dirname(destPath), { recursive: true })

  if (res.body && typeof res.body.getReader === 'function') {
    const file = createWriteStream(destPath)
    const reader = res.body.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          const ok = file.write(Buffer.from(value))
          if (!ok) {
            await new Promise((resolve) => file.once('drain', resolve))
          }
        }
      }
      await new Promise((resolve, reject) => {
        file.end((err) => (err ? reject(err) : resolve()))
      })
    } catch (err) {
      file.destroy()
      try {
        await fs.promises.unlink(destPath)
      } catch {
        /* ignore */
      }
      throw err
    }
    return
  }

  const buf = Buffer.from(await res.arrayBuffer())
  await fs.promises.writeFile(destPath, buf)
}
