let grandiMod = null
let sender = null
let sending = false
let lastError = null
let name = 'StageTime-Pilot'

async function loadGrandi() {
  if (grandiMod) return grandiMod
  grandiMod = await import('grandi')
  return grandiMod
}

export async function startNdi(sourceName = 'StageTime-Pilot') {
  await stopNdi()
  lastError = null
  name = sourceName.trim() || 'StageTime-Pilot'
  try {
    const grandi = (await loadGrandi()).default
    if (!grandi.isSupportedCPU()) {
      throw new Error('CPU wird von NDI nicht unterstützt')
    }
    grandi.initialize()
    sender = await grandi.send({
      name,
      clockVideo: true,
      clockAudio: false,
    })
    return { ok: true, name: sender.sourceName?.() ?? name }
  } catch (err) {
    lastError = String(err?.message ?? err)
    sender = null
    throw err
  }
}

export async function sendNdiFrame(image) {
  if (!sender || sending) return false
  const grandi = grandiMod?.default
  if (!grandi) return false

  const size = image.getSize()
  const data = image.toBitmap()
  sending = true
  try {
    await sender.video({
      xres: size.width,
      yres: size.height,
      frameRateN: 30000,
      frameRateD: 1000,
      pictureAspectRatio: size.width / size.height,
      fourCC: grandi.FourCC.BGRA,
      frameFormatType: grandi.FrameType.Progressive,
      lineStrideBytes: size.width * 4,
      data,
    })
    return true
  } catch (err) {
    lastError = String(err?.message ?? err)
    return false
  } finally {
    sending = false
  }
}

export async function stopNdi() {
  if (!sender) return
  try {
    sender.destroy()
  } catch {
    /* ignore */
  }
  sender = null
  sending = false
}

export function ndiStatus() {
  let connections = 0
  try {
    connections = sender?.connections?.() ?? 0
  } catch {
    connections = 0
  }
  return {
    running: Boolean(sender),
    error: lastError,
    name,
    connections,
  }
}
