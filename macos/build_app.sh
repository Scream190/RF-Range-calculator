#!/bin/bash
# Baut "RF Link Budget Calculator.app" aus den Quelldateien in diesem Repo.
# Kann auf macOS ODER auf jedem System mit bash/cp/zip ausgeführt werden
# (das eigentliche App-Bundle ist reines Kopieren von Dateien, keine
# Kompilierung nötig - "gebaut" wird nur die Ordnerstruktur der .app).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_NAME="RF Link Budget Calculator"
DIST_DIR="$SCRIPT_DIR/dist"
APP_DIR="$DIST_DIR/$APP_NAME.app"

rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources"

cp "$SCRIPT_DIR/Info.plist" "$APP_DIR/Contents/Info.plist"
cp "$SCRIPT_DIR/app.py" "$APP_DIR/Contents/Resources/app.py"
cp "$ROOT_DIR/index.html" "$APP_DIR/Contents/Resources/index.html"
cp "$ROOT_DIR/style.css" "$APP_DIR/Contents/Resources/style.css"
cp "$ROOT_DIR/script.js" "$APP_DIR/Contents/Resources/script.js"

cat > "$APP_DIR/Contents/MacOS/$APP_NAME" <<'LAUNCHER'
#!/bin/bash
# Startet die App. Installiert pywebview beim allerersten Start automatisch
# nach, falls es fehlt, und faellt notfalls auf den Standardbrowser zurueck.
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../Resources" && pwd)"
PYTHON_BIN="$(command -v python3 || true)"

if [ -z "$PYTHON_BIN" ]; then
  osascript -e 'display alert "Python 3 nicht gefunden" message "Bitte installiere Python 3 (z.B. von python.org oder mit brew install python) und starte die App erneut."' >/dev/null 2>&1 || true
  exit 1
fi

if ! "$PYTHON_BIN" -c "import webview" >/dev/null 2>&1; then
  "$PYTHON_BIN" -m pip install --user --quiet pywebview pyobjc-framework-Cocoa pyobjc-framework-WebKit \
    >/tmp/rf_link_budget_install.log 2>&1 || {
      osascript -e 'display alert "Installation fehlgeschlagen" message "pywebview konnte nicht automatisch installiert werden. Die Berechnung wird stattdessen im Standardbrowser geoeffnet. Details: /tmp/rf_link_budget_install.log"' >/dev/null 2>&1 || true
      open "$DIR/index.html"
      exit 0
    }
fi

exec "$PYTHON_BIN" "$DIR/app.py"
LAUNCHER

chmod +x "$APP_DIR/Contents/MacOS/$APP_NAME"

echo "Gebaut: $APP_DIR"
echo "Installation: App in den Programme-Ordner ziehen."
echo "Erster Start: Rechtsklick -> Oeffnen (Gatekeeper-Warnung, da die App nicht signiert ist)."
