import { useState } from 'react'
import { useT } from '../i18n'

interface Props {
  onSend: (text: string, seconds: number, prominent: boolean) => void
  onClear: () => void
  currentText?: string
}

export function MessagePanel({ onSend, onClear, currentText }: Props) {
  const t = useT()
  const [text, setText] = useState('')
  const [seconds, setSeconds] = useState(10)
  const [prominent, setProminent] = useState(false)

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>{t('messageTitle')}</h2>
        <p>{t('messageHint')}</p>
      </header>

      {currentText ? (
        <div className="message-live">{t('messageActive', { text: currentText })}</div>
      ) : null}

      <div className="inline-form">
        <input
          className="grow"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('messagePlaceholder')}
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
          title={t('messageDurationTitle')}
          style={{ width: 72 }}
        />
        <span>{t('sec')}</span>
        <label className="check-row compact">
          <input
            type="checkbox"
            checked={prominent}
            onChange={(e) => setProminent(e.target.checked)}
          />
          {t('prominent')}
        </label>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            onSend(text, seconds, prominent)
            setText('')
          }}
        >
          {t('send')}
        </button>
        <button type="button" className="btn ghost" onClick={onClear}>
          {t('clear')}
        </button>
      </div>
    </section>
  )
}
