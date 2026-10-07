import type { CSSProperties } from 'react'
import type { TimerState } from '../types'
import { formatClock, formatCountdown, phaseColor, shouldBlink } from '../utils/time'

interface Props {
  state: TimerState
  label?: string
  compact?: boolean
}

export function ShowDisplay({ state, label, compact }: Props) {
  const { visuals, mode, message } = state
  const blink = shouldBlink(state)
  const color = phaseColor(state)

  const timeText =
    mode === 'clock'
      ? formatClock(new Date(), visuals.showSeconds)
      : formatCountdown(state.remainingMs, visuals.showSeconds)

  const justify =
    visuals.verticalAlign === 'top'
      ? 'flex-start'
      : visuals.verticalAlign === 'bottom'
        ? 'flex-end'
        : 'center'

  const align =
    visuals.textAlign === 'left'
      ? 'flex-start'
      : visuals.textAlign === 'right'
        ? 'flex-end'
        : 'center'

  const rootStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    minHeight: compact ? 180 : '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: justify,
    alignItems: align,
    padding: compact ? '1rem' : '4vw',
    boxSizing: 'border-box',
    background: visuals.backgroundColor,
    color,
    fontFamily: visuals.fontFamily,
    overflow: 'hidden',
    position: 'relative',
    ...(compact ? { containerType: 'size' } : {}),
  }

  // Breite steuern, Höhe begrenzen – verhindert Überlauf bei großen Werten
  const timeSize = compact
    ? `min(${visuals.fontSizeVw}cqw, 72cqh)`
    : `min(${visuals.fontSizeVw}vw, 72vh)`

  const messageSize = compact ? 'min(3.2cqw, 8cqh)' : 'min(3.2vw, 8vh)'

  const letter = `${visuals.letterSpacingEm}em`
  // letter-spacing hängt rechts „Leerraum“ an → optisch nach links verschoben
  const letterFix =
    visuals.textAlign === 'center'
      ? ({ marginRight: `-${letter}` } as CSSProperties)
      : visuals.textAlign === 'right'
        ? ({ marginRight: `-${letter}` } as CSSProperties)
        : {}

  return (
    <div className={`show-display ${blink ? 'is-blinking' : ''}`} style={rootStyle}>
      {label ? <div className="show-label">{label}</div> : null}
      <div
        className="show-time"
        style={{
          fontSize: timeSize,
          letterSpacing: letter,
          ...letterFix,
          lineHeight: 1,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          textAlign: visuals.textAlign,
          color,
        }}
      >
        {timeText}
      </div>
      {message?.text ? (
        <div
          className="show-message"
          style={{
            color: visuals.messageColor,
            textAlign: visuals.textAlign,
            marginTop: compact ? '0.75rem' : '2vw',
            fontSize: messageSize,
            maxWidth: '90%',
            fontWeight: 600,
          }}
        >
          {message.text}
        </div>
      ) : null}
    </div>
  )
}
