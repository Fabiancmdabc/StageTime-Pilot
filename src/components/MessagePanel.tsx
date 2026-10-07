import { useState } from 'react'
import { useT } from '../i18n'
import { MESSAGE_MAX_CHARS } from '../types'

interface Props {
  onSend: (text: string) => void
  onClear: () => void
  currentText?: string
}

export function MessagePanel({ onSend, onClear, currentText }: Props) {
  const t = useT()
  const [text, setText] = useState('')

  const send = () => {
    onSend(text)
    setText('')
  }

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
          maxLength={MESSAGE_MAX_CHARS}
          onChange={(e) => setText(e.target.value.slice(0, MESSAGE_MAX_CHARS))}
          placeholder={t('messagePlaceholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send()
          }}
        />
        <span className="char-count">
          {text.length}/{MESSAGE_MAX_CHARS}
        </span>
        <button type="button" className="btn primary" onClick={send}>
          {t('send')}
        </button>
        <button type="button" className="btn ghost" onClick={onClear}>
          {t('clear')}
        </button>
      </div>
    </section>
  )
}
