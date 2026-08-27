# Optionaler Weg fuer eine vollstaendig in sich geschlossene .app, die kein
# separat installiertes Python/pywebview auf dem Zielrechner braucht.
# Muss auf einem echten Mac ausgefuehrt werden (py2app gibt es nur fuer macOS):
#
#   cd macos
#   python3 -m venv .venv && source .venv/bin/activate
#   pip install py2app pywebview pyobjc-framework-Cocoa pyobjc-framework-WebKit
#   python3 setup_py2app.py py2app
#
# Ergebnis liegt danach in macos/dist/RF Link Budget Calculator.app
from setuptools import setup

APP = ["app.py"]
DATA_FILES = ["../index.html", "../style.css", "../script.js"]
OPTIONS = {
    "argv_emulation": False,
    "packages": ["webview"],
    "plist": {
        "CFBundleName": "RF Link Budget Calculator",
        "CFBundleDisplayName": "RF Link Budget Calculator",
        "CFBundleIdentifier": "com.sounddesignlive.rflinkbudget",
        "CFBundleVersion": "1.0",
        "CFBundleShortVersionString": "1.0",
        "NSHighResolutionCapable": True,
    },
}

setup(
    app=APP,
    data_files=DATA_FILES,
    options={"py2app": OPTIONS},
    setup_requires=["py2app"],
)
