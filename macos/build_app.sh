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
# Startet die App. Legt beim allerersten Start eine eigene, isolierte
# Python-Umgebung an (umgeht "externally-managed-environment" Fehler von
# Homebrew-Python) und installiert pywebview dort hinein. Faellt bei jedem
# Fehler sauber auf den Standardbrowser zurueck, statt die App abstuerzen
# zu lassen.
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../Resources" && pwd)"
SUPPORT_DIR="$HOME/Library/Application Support/RFLinkBudgetCalculator"
VENV_DIR="$SUPPORT_DIR/venv"
LOG_FILE="$SUPPORT_DIR/install.log"
READY_MARKER="$SUPPORT_DIR/.setup_complete"
PYTHON_BIN="$(command -v python3 || true)"

fallback_to_browser() {
  osascript -e "display alert \"Native App nicht verfuegbar\" message \"$1 Die Berechnung wird stattdessen im Standardbrowser geoeffnet. Details im Log: $LOG_FILE\"" >/dev/null 2>&1 || true
  open "$DIR/index.html"
  exit 0
}

if [ -z "$PYTHON_BIN" ]; then
  osascript -e 'display alert "Python 3 nicht gefunden" message "Bitte installiere Python 3 (z.B. von python.org oder mit brew install python) und starte die App erneut."' >/dev/null 2>&1 || true
  exit 1
fi

mkdir -p "$SUPPORT_DIR"

# Setup (venv + pywebview install) only ever runs once, tracked via a marker
# file. Without this, every single launch would pay the cost of spawning a
# whole extra Python interpreter just to test "import webview" before
# spawning a second one for the real app - roughly doubling startup time
# forever, not just on first run.
if [ ! -f "$READY_MARKER" ]; then
  osascript -e 'display notification "Einmalige Einrichtung laeuft (ca. 30 Sekunden)…" with title "RF Link Budget Calculator"' >/dev/null 2>&1 || true

  if [ ! -x "$VENV_DIR/bin/python3" ]; then
    rm -rf "$VENV_DIR"
    "$PYTHON_BIN" -m venv "$VENV_DIR" >"$LOG_FILE" 2>&1 \
      || fallback_to_browser "Konnte keine eigene Python-Umgebung anlegen."
  fi

  "$VENV_DIR/bin/python3" -m pip install --quiet --upgrade pip >>"$LOG_FILE" 2>&1 || true
  "$VENV_DIR/bin/python3" -m pip install --quiet pywebview pyobjc-framework-Cocoa pyobjc-framework-WebKit \
    >>"$LOG_FILE" 2>&1 \
    || fallback_to_browser "pywebview konnte nicht installiert werden."

  touch "$READY_MARKER"
fi

exec "$VENV_DIR/bin/python3" "$DIR/app.py"
LAUNCHER

chmod +x "$APP_DIR/Contents/MacOS/$APP_NAME"

echo "Gebaut: $APP_DIR"
echo "Installation: App in den Programme-Ordner ziehen."
echo "Erster Start: Rechtsklick -> Oeffnen (Gatekeeper-Warnung, da die App nicht signiert ist)."
