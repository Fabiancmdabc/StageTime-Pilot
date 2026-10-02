# StageTime-Pilot — Launch-Checkliste

Kostenloses Tool: Website, Downloads, Icon, Updates.

## Live

- Homepage: https://stagetime-pilot.vercel.app
- Download: https://stagetime-pilot.vercel.app/download
- Version-API: https://stagetime-pilot.vercel.app/api/version
- macOS DMG (GitHub Release): https://github.com/Fabiancmdabc/StageTime-Pilot/releases/tag/v1.0.2
- tasty-world Tools-Link: https://tasty-world.com/#tools

## Erledigt

- [x] Produkt-Homepage (Next.js) + Deploy auf Vercel
- [x] Download-Seite + `/api/version` für In-App-Check
- [x] macOS arm64 DMG als GitHub Release v1.0.2
- [x] Link auf tasty-world.com Tools-Sektion
- [x] App-Icon (`build/icon.icns` / `build/icon.png`)
- [x] In-App „Nach Updates suchen“

## Noch offen / optional

1. ~~Windows-Installer~~ → live als `StageTime-Pilot-1.0.2-Setup.exe`
2. **macOS Notarisierung** — Kauf erledigt (Bestellung W1546843264); Team-Aktivierung kann bis 48 h dauern. Danach: Developer ID Application Zertifikat + `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` setzen, `npm run electron:build:mac`
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
