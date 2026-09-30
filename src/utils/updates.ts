/** Update-Check gegen die öffentliche Version-API der Website. */
export const UPDATE_FEED_URL =
  import.meta.env.VITE_UPDATE_FEED_URL ??
  'https://stagetime-pilot.vercel.app/api/version'

export const APP_VERSION = '1.0.0'

export interface RemoteVersionInfo {
  name: string
  version: string
  releasedAt?: string
  notes?: string
  downloads?: { mac?: string | null; win?: string | null }
}

function parseSemver(v: string): number[] {
  return v
    .replace(/^v/i, '')
    .split('.')
    .map((p) => Number.parseInt(p.replace(/\D/g, ''), 10) || 0)
}

/** true wenn remote > local */
export function isNewerVersion(remote: string, local: string): boolean {
  const a = parseSemver(remote)
  const b = parseSemver(local)
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x > y) return true
    if (x < y) return false
  }
  return false
}

export async function checkForUpdates(
  feedUrl = UPDATE_FEED_URL,
): Promise<{ updateAvailable: boolean; remote: RemoteVersionInfo | null; error?: string }> {
  try {
    const res = await fetch(feedUrl, { cache: 'no-store' })
    if (!res.ok) {
      return { updateAvailable: false, remote: null, error: `HTTP ${res.status}` }
    }
    const remote = (await res.json()) as RemoteVersionInfo
    if (!remote?.version) {
      return { updateAvailable: false, remote: null, error: 'ungültige Antwort' }
    }
    return {
      updateAvailable: isNewerVersion(remote.version, APP_VERSION),
      remote,
    }
  } catch (err) {
    return {
      updateAvailable: false,
      remote: null,
      error: String(err instanceof Error ? err.message : err),
    }
  }
}
