"""Sound Lounge — main entry point.

This file is used as the PyInstaller target. It:
1. Resolves bundled FFmpeg path and injects it into the environment
2. Launches the FastAPI app via uvicorn on the configured port
3. Opens the browser automatically after a short delay
"""

import os
import sys
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
    """Inject bundled ffmpeg into PATH when running as a frozen executable."""
    if getattr(sys, "frozen", False):
        exe_dir = os.path.dirname(sys.executable)
        ffmpeg_dir = os.path.join(exe_dir, "ffmpeg")
        if os.path.isdir(ffmpeg_dir):
            os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
            logger.info(f"Bundled FFmpeg added to PATH: {ffmpeg_dir}")


def _open_browser(port: int, delay: float = 2.5) -> None:
    """Open the app in the default browser after a short startup delay."""
    def _open():
        time.sleep(delay)
        url = f"http://127.0.0.1:{port}"
        logger.info(f"Opening browser at {url}")
        webbrowser.open(url)

    threading.Thread(target=_open, daemon=True).start()


def main() -> None:
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


if __name__ == "__main__":
    main()
