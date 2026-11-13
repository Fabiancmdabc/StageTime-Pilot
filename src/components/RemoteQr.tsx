import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function RemoteQr({ url, label }: { url: string; label?: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void QRCode.toDataURL(url, {
      margin: 1,
      width: 168,
      color: { dark: '#0b1220', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((data) => {
        if (!cancelled) setSrc(data)
      })
      .catch(() => {
        if (!cancelled) setSrc(null)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  return (
    <figure className="remote-qr-card">
      {src ? (
        <img className="remote-qr" src={src} alt={label ? `QR ${label}` : 'QR Code'} />
      ) : (
        <div className="remote-qr remote-qr-placeholder" aria-hidden />
      )}
      <figcaption>
        <code>{url}</code>
      </figcaption>
    </figure>
  )
}
