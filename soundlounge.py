"""Sound Lounge — main entry point.

This file is used as the PyInstaller target. It:
1. Resolves bundled FFmpeg path and injects it into the environment
2. Launches the FastAPI app via uvicorn on the configured port
3. Opens the browser automatically after a short delay
"""

import os
import sys

# Prevent AttributeError/ValueError when running as a windowed/noconsole app where stdout/stderr are None.
# In frozen mode, redirect them to a log file in the user's Local AppData directory so we can diagnose crashes.
if sys.stdout is None or sys.stderr is None:
    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        log_dir = os.path.join(local_app_data, "SoundLounge")
    else:
        log_dir = os.path.join(os.path.expanduser("~"), ".soundlounge")
    
    try:
        os.makedirs(log_dir, exist_ok=True)
        log_file = open(os.path.join(log_dir, "soundlounge.log"), "a", encoding="utf-8", buffering=1)
        if sys.stdout is None:
            sys.stdout = log_file
        if sys.stderr is None:
            sys.stderr = log_file
    except Exception:
        import io
        if sys.stdout is None:
            sys.stdout = io.StringIO()
        if sys.stderr is None:
            sys.stderr = io.StringIO()

import time
import threading
import webbrowser
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("soundlounge")


def _setup_ffmpeg() -> None:
    """Inject bundled ffmpeg into PATH when running as a frozen executable.

    PyInstaller 6.x (one-folder mode) places all datas inside sys._MEIPASS
    which maps to the _internal/ subfolder next to the .exe.  We check there
    first, then fall back to a folder directly next to the executable.
    """
    if getattr(sys, "frozen", False):
        exe_dir = os.path.dirname(sys.executable)
        # sys._MEIPASS = _internal/ in PyInstaller 6 one-folder builds
        meipass = getattr(sys, "_MEIPASS", None)

        candidates = []
        if meipass:
            candidates.append(os.path.join(meipass, "ffmpeg"))   # _internal/ffmpeg/
        candidates.append(os.path.join(exe_dir, "ffmpeg"))        # SoundLounge/ffmpeg/
        candidates.append(exe_dir)                                 # exe dir itself

        for ffmpeg_dir in candidates:
            if os.path.isfile(os.path.join(ffmpeg_dir, "ffmpeg.exe")):
                os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
                logger.info(f"Bundled FFmpeg added to PATH: {ffmpeg_dir}")
                break


def _open_browser(port: int, delay: float = 2.5) -> None:
    """Open the app in the default browser after a short startup delay."""
    def _open():
        time.sleep(delay)
        url = f"http://127.0.0.1:{port}"
        logger.info(f"Opening browser at {url}")
        webbrowser.open(url)

    threading.Thread(target=_open, daemon=True).start()


def main() -> None:
    try:
        _setup_ffmpeg()

        # Import here (after path setup) so config resolves correctly
        import uvicorn
        from app.config import settings

        port = settings.PORT
        logger.info(f"Starting Sound Lounge on http://127.0.0.1:{port}")

        _open_browser(port)

        uvicorn.run(
            "app.main:app",
            host=settings.HOST,
            port=port,
            log_level="warning",
            # Disable reload in production
            reload=False,
        )
    except Exception as e:
        logger.exception("Application failed to start:")
        if sys.platform == "win32":
            try:
                import ctypes
                import traceback
                tb_str = traceback.format_exc()
                ctypes.windll.user32.MessageBoxW(
                    0, 
                    f"Sound Lounge failed to start:\n\n{tb_str}", 
                    "Sound Lounge Error", 
                    0x10  # MB_ICONERROR
                )
            except Exception:
                pass
        raise


if __name__ == "__main__":
    main()
