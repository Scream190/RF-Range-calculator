# macOS App

Native macOS-App für den RF Link Budget Calculator. Öffnet die vorhandene
Oberfläche (`../index.html`) in einem echten Fenster (WebKit, kein
Browser-Chrome/Adressleiste) statt in einem Browser-Tab.

## Fertige App installieren

1. `RF Link Budget Calculator.app` (aus `dist/` bzw. dem mitgelieferten ZIP)
   in den `Programme`-Ordner ziehen.
2. Beim allerersten Start: **Rechtsklick auf die App → Öffnen** wählen (nicht
   per Doppelklick), da die App nicht mit einem Apple-Entwicklerzertifikat
   signiert ist und macOS Gatekeeper sonst eine Warnung zeigt. Danach genügt
   ein normaler Doppelklick.
3. Voraussetzung: Python 3 muss installiert sein (z. B. von
   [python.org](https://www.python.org/downloads/macos/) oder via
   `brew install python`). Fehlt `pywebview`, installiert die App es beim
   ersten Start automatisch nach (kurzer Moment, benötigt Internet). Schlägt
   das fehl, öffnet sich stattdessen automatisch der Standardbrowser.

## App selbst bauen

```bash
cd macos
./build_app.sh
```

Erstellt `macos/dist/RF Link Budget Calculator.app`. Das Skript kopiert nur
Dateien (`index.html`, `style.css`, `script.js`, `app.py`) in ein
App-Bundle — es ist keine Kompilierung nötig und das Skript kann auch
außerhalb von macOS ausgeführt werden, um das Bundle vorzubereiten.

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
