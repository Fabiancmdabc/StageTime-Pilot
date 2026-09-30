# StageTime-Pilot

Redezeituhr für Veranstaltungen – **by Tasty-world**. Steuert sich lokal und per HTTP (z. B. aus **Cue-Pilot** / Bitfocus Companion).

## Features

- Countdown & reine Uhrzeit
- Show-Fenster (Fullscreen) + PGM-Vorschau
- Remote-Ansicht über WLAN (iPad)
- Optik live editierbar (Farben, Transparenz, Größe, …)
- Schnellwahl-Presets
- Nachrichten auf die Stage
- Gelb-Warnung / Rot-Blinken / Overtime
- HTTP-API für externe Trigger
- NDI / RTMP / UDP-Videoausgabe (ohne HDMI)

## Docs

## Start

```bash
npm install
npm run electron:dev
```

Nur UI (Browser): `npm run dev` → http://localhost:5174

## Docs

- [Architecture](docs/architecture.md)
- [HTTP API](docs/api.md)
- [Video-Ausgaben](docs/outputs.md)
