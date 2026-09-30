# StageTime-Pilot HTTP API

Der Electron-Main startet `electron/api-server.js` auf **`0.0.0.0:<port>`** (Standard **8787**).

Optionaler Token: Query `?token=…` oder Header `X-Api-Token` / `X-Companion-Token`.

Alle Steuerungs-Endpunkte sind **GET** (Companion Generic HTTP / Cue-Pilot).

## System

| Pfad | Wirkung |
|------|---------|
| `/api/health` | `{ ok, service: "stagetime-pilot" }` |
| `/api/status` | Live-Timer-State |

Kurzformen: `/health`, `/status`.

## Timer

| Pfad | Params | Wirkung |
|------|--------|---------|
| `/api/timer/start` | | Start / Resume |
| `/api/timer/stop` | | Stop + Clear Message |
| `/api/timer/pause` | | Pause |
| `/api/timer/resume` | | Resume |
| `/api/timer/reset` | | Zurück auf Dauer |
| `/api/timer/set` | `seconds` oder `ms`, optional `autostart=1` | Dauer setzen |
| `/api/timer/mode` | `mode=countdown\|clock` | Anzeigemodus |

## Nachricht / Preset

| Pfad | Params | Wirkung |
|------|--------|---------|
| `/api/message` | `text`, optional `seconds`, `prominent=1` | Hinweis auf Show |
| `/api/message/clear` | | Nachricht löschen |
| `/api/preset` | `id` oder `name` | Schnellwahl anwenden |

## Remote (iPad)

| Pfad | Wirkung |
|------|---------|
| `/remote` | Show-View im Browser |
| `/ws` | WebSocket State-Push `{ type: "state", state }` |

Beispiel Cue-Pilot / Companion:

```
http://127.0.0.1:8787/api/timer/set?seconds=300&autostart=1
http://127.0.0.1:8787/api/timer/start
http://127.0.0.1:8787/api/message?text=Bitte%20Schluss&seconds=8
```
