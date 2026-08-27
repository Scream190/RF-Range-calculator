import os

import webview

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _activate_macos_app():
    # Without this, the WKWebView window sometimes needs an extra click
    # after launch before it accepts input (a known pywebview/macOS quirk
    # when the app isn't launched as a compiled, signed bundle).
    try:
        from AppKit import NSApp

        NSApp.activateIgnoringOtherApps_(True)
    except Exception:
        pass


def main():
    index_path = os.path.join(BASE_DIR, "index.html")
    window = webview.create_window(
        "RF Link Budget Calculator",
        url=f"file://{index_path}",
        width=1150,
        height=820,
        min_size=(780, 620),
    )
    window.events.shown += _activate_macos_app
    webview.start(_activate_macos_app)


if __name__ == "__main__":
    main()
