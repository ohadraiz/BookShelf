"""Open the bookshelf with one click, without a console window.

Run with pythonw (the desktop shortcut does this). If the local server is
already running it only opens the browser; otherwise it starts the server
in the background first. Always the same address, because the browser keeps
the saved library per address (including the port).
"""
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

HOST = "127.0.0.1"
PORT = 8765
URL = f"http://{HOST}:{PORT}/app.html"
ROOT = Path(__file__).resolve().parent.parent


def server_is_up() -> bool:
    try:
        with urllib.request.urlopen(URL, timeout=1) as resp:
            return resp.status == 200
    except Exception:
        return False


def show_error(text: str) -> None:
    try:
        import ctypes
        ctypes.windll.user32.MessageBoxW(None, text, "BookShelf", 0x10)
    except Exception:
        print(text, file=sys.stderr)


def start_server() -> None:
    exe = Path(sys.executable)
    pythonw = exe.with_name("pythonw.exe")
    if pythonw.exists():
        exe = pythonw
    flags = 0
    if sys.platform == "win32":
        flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NO_WINDOW
    subprocess.Popen(
        [str(exe), "-m", "http.server", str(PORT), "--bind", HOST],
        cwd=ROOT,
        creationflags=flags,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        close_fds=True,
    )


def main() -> int:
    if not server_is_up():
        start_server()
        for _ in range(50):
            if server_is_up():
                break
            time.sleep(0.1)
        else:
            show_error(
                f"The bookshelf server did not start on port {PORT}.\n"
                "Run start.cmd to see the error."
            )
            return 1
    webbrowser.open(URL)
    return 0


if __name__ == "__main__":
    sys.exit(main())
