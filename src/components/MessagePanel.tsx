import { useState } from 'react'

interface Props {
  onSend: (text: string, seconds: number, prominent: boolean) => void
  onClear: () => void
  currentText?: string
}

export function MessagePanel({ onSend, onClear, currentText }: Props) {
  const [text, setText] = useState('')
  const [seconds, setSeconds] = useState(10)
  const [prominent, setProminent] = useState(false)

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Nachricht / Hinweis</h2>
        <p>Wird auf Show, PGM und Remote eingeblendet.</p>
      </header>

      {currentText ? (
        <div className="message-live">Aktiv: {currentText}</div>
      ) : null}

      <div className="inline-form">
        <input
          className="grow"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="z. B. Bitte zum Schluss kommen"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSend(text, seconds, prominent)
              setText('')
            }
          }}
        />
        <input
          type="number"
          min={0}
          value={seconds}
          onChange={(e) => setSeconds(Number(e.target.value))}
          title="Anzeige in Sekunden (0 = dauerhaft)"
          style={{ width: 72 }}
        />
        <span>s</span>
        <label className="check-row compact">
          <input
            type="checkbox"
            checked={prominent}
            onChange={(e) => setProminent(e.target.checked)}
          />
          Prominent
        </label>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            onSend(text, seconds, prominent)
            setText('')
          }}
        >
          Senden
        </button>
        <button type="button" className="btn ghost" onClick={onClear}>
          Clear
        </button>
      </div>
    </section>
  )
}
