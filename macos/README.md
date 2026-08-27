# macOS App

Native macOS-App für den RF Link Budget Calculator. Öffnet die vorhandene
Oberfläche (`../index.html`) in einem echten Fenster (WebKit, kein
Browser-Chrome/Adressleiste) statt in einem Browser-Tab.

## Fertige App installieren

1. `RF Link Budget Calculator.app` (aus `dist/` bzw. dem mitgelieferten ZIP)
   in den `Programme`-Ordner ziehen.
2. Beim allerersten Start blockiert macOS Gatekeeper die App (nicht mit
   einem Apple-Entwicklerzertifikat signiert). Freigeben über
   **Systemeinstellungen → Datenschutz & Sicherheit** → ganz unten
   „Trotzdem öffnen" (bei älteren macOS-Versionen reicht auch Rechtsklick →
   Öffnen). Danach genügt ein normaler Doppelklick.
3. Voraussetzung: Python 3 muss installiert sein (z. B. von
   [python.org](https://www.python.org/downloads/macos/) oder via
   `brew install python`). Beim ersten Start legt die App automatisch eine
   eigene, isolierte Python-Umgebung unter
   `~/Library/Application Support/RFLinkBudgetCalculator/venv` an und
   installiert `pywebview` dort hinein (ca. 20–30 Sekunden, benötigt
   Internet; eine kurze Benachrichtigung zeigt das an). Das umgeht das
   „externally-managed-environment"-Problem, das bei Homebrew-Python sonst
   eine Installation ins System verhindert. Schlägt die Einrichtung dennoch
   fehl, öffnet sich stattdessen automatisch der Standardbrowser — Details
   dazu stehen dann in
   `~/Library/Application Support/RFLinkBudgetCalculator/install.log`.

## App selbst bauen

```bash
cd macos
./build_app.sh
```

Erstellt `macos/dist/RF Link Budget Calculator.app`. Das Skript kopiert nur
Dateien (`index.html`, `style.css`, `script.js`, `app.py`, `assets/logo.svg`,
`AppIcon.icns`) in ein App-Bundle — es ist keine Kompilierung nötig und das
Skript kann auch außerhalb von macOS ausgeführt werden, um das Bundle
vorzubereiten.

Das App-Icon (`AppIcon.icns`) ist aus [`../assets/logo.svg`](../assets/logo.svg)
gerendert (ohne `iconutil`: PNGs in den Standardgrößen erzeugt und im
Apple-.icns-Format zusammengepackt). Nach einer Änderung an `logo.svg` muss
`AppIcon.icns` entsprechend neu erzeugt werden, damit das App-Icon aktuell
bleibt.

## Vollständig eigenständige Variante (ohne Python-Abhängigkeit beim Nutzer)

Für eine .app, die Python und pywebview direkt mitbringt (größer, aber ohne
jede Voraussetzung beim Endnutzer), auf einem echten Mac:

```bash
cd macos
python3 -m venv .venv && source .venv/bin/activate
pip install py2app pywebview pyobjc-framework-Cocoa pyobjc-framework-WebKit
python3 setup_py2app.py py2app
```

Ergebnis liegt danach in `macos/dist/RF Link Budget Calculator.app`.

## Manuell testen (ohne App-Bundle)

```bash
cd macos
pip3 install -r requirements.txt
python3 app.py
```
