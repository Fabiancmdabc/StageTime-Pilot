# Video-Ausgaben (NDI / RTMP / UDP)

StageTime-Pilot kann die Show **ohne HDMI** ins Netzwerk geben. Capture läuft in einem unsichtbaren 1920×1080-Fenster.

## NDI (empfohlen für vMix/OBS)

1. Tab **Einstellungen** → **Ausgabe · NDI / RTMP / UDP** → NDI aktivieren, Name z. B. `StageTime-Pilot`
2. **Ausgaben übernehmen**
3. vMix: Input → NDI → Quelle `StageTime-Pilot`
4. OBS: NDI Source (Plugin)
5. Chroma-Key auf das Greenscreen aus **Look**

Voraussetzung: NDI Runtime/Tools auf dem Mac. Fehlt sie, erscheint die Fehlermeldung im Panel – Display/Remote bleiben nutzbar.

## RTMP

Ziel z. B. `rtmp://127.0.0.1/live/stagetime`. Braucht **ffmpeg** (`brew install ffmpeg`). OBS: Custom RTMP / Media Source.

## MPEG-TS / UDP

Ziel z. B. `udp://127.0.0.1:1234` oder Multicast `udp://239.0.0.1:1234`. ffmpeg sendet MPEG-TS.

## Hinweise

- Capture startet erst, wenn mindestens ein Ausgang an ist.
- Physisches Show-Fenster bleibt unabhängig (Einstellungen → Displays).
