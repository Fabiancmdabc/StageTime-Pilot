# StageTime-Pilot Architecture

Redezeituhr für Veranstaltungen – Produktfamilie **Tasty-world** / Companion zu **Cue-Pilot**.

## Stack

- React 19 + TypeScript + Vite
- Electron (Control-, Show-, PGM-Fenster)
- HTTP + WebSocket API (`electron/api-server.js`) für Cue-Pilot / Companion / iPad-Remote

## Fenster

| Hash | Rolle |
|------|--------|
| `#control` | Operator-UI (Master-State) |
| `#show` | Frameless Fullscreen Stage-Ausgabe (pro ausgewähltem Display) |
| `#pgm` | Operator-Vorschau derselben Show-View |
| `#remote` | Browser-Ansicht für iPad (WLAN) |

| `#output` | Offscreen-Capture für NDI/RTMP/UDP |

State-Sync: Master (Control) → `BroadcastChannel` + Electron IPC `broadcast-state` → Show/PGM/Output; Remote via WebSocket `/ws`.

Netzwerk-Video (Einstellungen → Ausgabe): Offscreen `#output` @ 1920×1080 → NDI (`grandi`), RTMP/UDP (ffmpeg). Siehe [outputs.md](./outputs.md).

iPad-Remote und Companion-API: Tab **Remote**.

Control-UI: Hell-/Dunkelmodus (`data-theme`, `localStorage`). Show-Displays: Mehrfachauswahl in **Einstellungen**; Electron öffnet je Display ein Show-Fenster.
## Timer-Modell

- Modi: `countdown` | `clock`
- Status: `idle` | `running` | `paused` | `overtime`
- Phasen: `normal` → `warn` (Gelb) → `critical` (Rot blinken) → `overtime` (`+mm:ss`)

Persistenz: `localStorage` (`stagetime.pilot.state.v1`, `stagetime.pilot.api.v1`).

## API

Siehe [api.md](./api.md). Standard-Port `8787`, Bind `0.0.0.0`.
