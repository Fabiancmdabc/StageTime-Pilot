# StageTime-Pilot — Launch-Checkliste

Kostenloses Tool: Website, Downloads, Icon, Updates.

## Erledigt in diesem Stand

- [x] Produkt-Homepage unter `Homepage/stagetime-pilot` (Next.js, Port 3002)
- [x] Download-Seite + `/api/version` für In-App-Check
- [x] Link auf tasty-world.com Tools-Sektion (+ `site.tools.stageTimePilot`)
- [x] App-Icon (`build/icon.icns` / `build/icon.png`)
- [x] In-App „Nach Updates suchen“ (Einstellungen)

## Noch zu tun vor öffentlichem Launch

1. **Builds erzeugen**
   - macOS: `npm run electron:build:mac` (idealerweise signiert + notarisiert)
   - Windows: `npm run electron:build:win` (Code-Signing empfohlen)
2. **Installer hochladen**
   - Dateien nach `Homepage/stagetime-pilot/public/downloads/`
   - Links in `src/lib/releases.ts` (`mac` / `win`) setzen
3. **Website deployen**
   - Vercel-Projekt z. B. `stagetime-pilot.vercel.app`
   - Domain optional: `stagetime.tasty-world.com`
4. **tasty-world deployen**
   - damit der neue Tool-Block live ist
5. **Optional später**
   - Auto-Update via `electron-updater` + GitHub Releases
   - Windows `.ico` aus dem PNG erzeugen
   - App-Icon ohne Wordmark (nur ST-Emblem) feiner designen
   - Screenshots auf der Homepage
   - Impressum/Datenschutz-Seiten analog Cue-Pilot

## Lokal starten

```bash
# Website
cd Homepage/stagetime-pilot && npm install && npm run dev
# → http://localhost:3002

# Desktop
cd StageTime-Pilot && npm run electron:dev
```
