# StageTime-Pilot — Launch-Checkliste

Kostenloses Tool: Website, Downloads, Icon, Updates.

## Live

- Homepage: https://stagetime-pilot.vercel.app
- Download: https://stagetime-pilot.vercel.app/download
- Version-API: https://stagetime-pilot.vercel.app/api/version
- macOS DMG (GitHub Release): https://github.com/Fabiancmdabc/StageTime-Pilot/releases/tag/v1.0.0
- tasty-world Tools-Link: https://tasty-world.com/#tools

## Erledigt

- [x] Produkt-Homepage (Next.js) + Deploy auf Vercel
- [x] Download-Seite + `/api/version` für In-App-Check
- [x] macOS arm64 DMG/ZIP als GitHub Release v1.0.0
- [x] Link auf tasty-world.com Tools-Sektion
- [x] App-Icon (`build/icon.icns` / `build/icon.png`)
- [x] In-App „Nach Updates suchen“

## Noch offen / optional

1. **Windows-Installer** (`npm run electron:build:win` auf Windows-Maschine) + Release-Asset + `releases.win`
2. **macOS Notarisierung** (Apple Developer) — ohne Rechtsklick → Öffnen
3. **Intel-Mac** Build (`--x64` / universal) falls nötig
4. Auto-Update via `electron-updater`
5. Screenshots / Impressum analog Cue-Pilot
6. Optional Domain: `stagetime.tasty-world.com`

## Lokal starten

```bash
# Website
cd Homepage/stagetime-pilot && npm install && npm run dev
# → http://localhost:3002

# Desktop
cd StageTime-Pilot && npm run electron:dev
```
