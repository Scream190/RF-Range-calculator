import os

import webview

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def main():
    index_path = os.path.join(BASE_DIR, "index.html")
    webview.create_window(
        "RF Link Budget Calculator",
        url=f"file://{index_path}",
        width=1150,
        height=820,
        min_size=(780, 620),
    )
    webview.start()


if __name__ == "__main__":
    main()
