"""Loopback-only standalone UI preview. Run with --help for launcher options."""

import argparse
import errno
import hashlib
import http.server
import json
import os
from pathlib import Path
import sys
import threading
import time
from urllib.parse import unquote, urlsplit
import webbrowser


MOUNTS = ("preview", "cheat-engine/www/cheat", "docs/public")
SOURCE_SUFFIXES = frozenset((".js", ".css", ".html", ".json"))
IGNORED_DIRECTORIES = frozenset((
    "generatedstorage", "tmp", "temp", "games", "game", "node_modules", "__pycache__"
))
MAX_SCAN_ENTRIES = 10000


def _inside(path, directory):
    try:
        path.relative_to(directory)
        return True
    except ValueError:
        return False


class SourceVersion:
    """Cache a bounded source-metadata fingerprint, never reading file contents."""

    def __init__(self, root, reload=True):
        self.root = root
        self.reload = reload
        self._version = "disabled"
        self._checked_at = float("-inf")
        self._lock = threading.Lock()

    def payload(self):
        with self._lock:
            now = time.monotonic()
            if self.reload and now - self._checked_at >= 1.0:
                self._version = self._fingerprint()
                self._checked_at = time.monotonic()
            return {"version": self._version, "reload": self.reload}

    def _fingerprint(self):
        records = []
        remaining = MAX_SCAN_ENTRIES
        for name in MOUNTS[:2]:
            base = self.root / name
            try:
                if base.resolve() != base:
                    continue
            except (OSError, RuntimeError):
                continue
            pending = [base]
            while pending and remaining > 0:
                directory = pending.pop()
                try:
                    with os.scandir(directory) as entries:
                        for entry in entries:
                            if remaining <= 0:
                                break
                            remaining -= 1
                            if entry.name.startswith(".") or entry.is_symlink():
                                continue
                            path = Path(entry.path)
                            # Also excludes Windows junctions and other redirected paths.
                            if path.resolve() != path:
                                continue
                            if entry.is_dir(follow_symlinks=False):
                                if entry.name.casefold() not in IGNORED_DIRECTORIES:
                                    pending.append(path)
                            elif (path.suffix.lower() in SOURCE_SUFFIXES
                                  and entry.is_file(follow_symlinks=False)):
                                stat = entry.stat(follow_symlinks=False)
                                records.append((
                                    str(path.relative_to(self.root)),
                                    stat.st_mtime_ns,
                                    stat.st_size,
                                ))
                except (OSError, RuntimeError):
                    # Editors may rename or delete a source during the scan.
                    continue
        metadata = json.dumps(sorted(records), ensure_ascii=True).encode("ascii")
        return hashlib.sha256(metadata).hexdigest()


class PreviewServer(http.server.ThreadingHTTPServer):
    # HTTPServer's address reuse permits duplicate listeners on Windows.
    allow_reuse_address = os.name != "nt"


class PreviewHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "application/javascript",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def log_message(self, format, *args):
        # Polling every second should not drown out useful startup messages.
        pass

    def do_GET(self):
        self._respond()

    def do_HEAD(self):
        self._respond(head_only=True)

    def _respond(self, head_only=False):
        try:
            path = unquote(urlsplit(self.path).path, errors="strict")
        except (ValueError, UnicodeError):
            self.send_error(400, "Invalid URL")
            return
        parts = path.split("/")[1:]
        if (not path.startswith("/") or any(part.startswith(".") for part in parts)
                or any(char in path for char in "\\:\x00")
                or any(ord(char) < 32 or ord(char) == 127 for char in path)):
            self.send_error(404, "Not found")
            return
        if path == "/":
            self.send_response(302)
            self.send_header("Location", "/preview/index.html")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if path == "/__preview__/version":
            payload = json.dumps(self.server.source_version.payload()).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            if not head_only:
                self.wfile.write(payload)
            return
        mount = next((
            name for name in MOUNTS if path.startswith("/" + name + "/")
        ), None)
        if mount is None:
            self.send_error(404, "Not found")
            return
        base = self.server.preview_root / mount
        try:
            target = self.server.preview_root.joinpath(*parts).resolve()
            if (not _inside(target, base)
                    or any(part.startswith(".") for part in target.relative_to(base).parts)
                    or not target.is_file()):
                self.send_error(404, "Not found")
                return
            source = target.open("rb")
        except (OSError, ValueError, RuntimeError):
            self.send_error(404, "Not found")
            return
        with source:
            self.send_response(200)
            self.send_header("Content-Type", self.guess_type(str(target)))
            self.send_header("Content-Length", str(os.fstat(source.fileno()).st_size))
            self.end_headers()
            if not head_only:
                self.copyfile(source, self.wfile)


def create_server(root=None, port=8080, *, reload=True):
    """Bind without starting a loop or browser; caller owns shutdown/server_close.

    root is the repository directory, independent of the process working directory.
    port=0 requests a free port, available as server.server_port.
    """
    if not isinstance(port, int) or isinstance(port, bool) or not 0 <= port <= 65535:
        raise ValueError("port must be an integer between 0 and 65535")
    root = Path(root if root is not None else Path(__file__).resolve().parent).resolve()
    server = PreviewServer(("127.0.0.1", port), PreviewHandler)
    server.preview_root = root
    server.source_version = SourceVersion(root, reload=reload)
    return server


def start_server(root=None, port=8080, *, open_browser=True, reload=True):
    """Run until Ctrl+C, close the socket, and return a CLI-compatible exit code."""
    try:
        server = create_server(root, port, reload=reload)
    except OSError as error:
        if error.errno == errno.EADDRINUSE or getattr(error, "winerror", None) == 10048:
            print(
                "Port {} is already in use. Try --port 8081 or --port 0.".format(port),
                file=sys.stderr,
            )
        else:
            print(
                "Cannot start preview on 127.0.0.1:{}: {}".format(port, error),
                file=sys.stderr,
            )
        return 1
    with server:
        url = "http://localhost:{}/preview/index.html".format(server.server_port)
        print("Standalone UI preview (no game)")
        print(url, flush=True)
        print("Auto reload: {}. Press Ctrl+C to stop.".format("on" if reload else "off"))
        try:
            if open_browser:
                webbrowser.open(url)
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nPreview stopped.")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--port", type=int, default=8080,
        help="loopback port (default: 8080; 0: free port)",
    )
    parser.add_argument("--no-browser", action="store_true", help="do not open a browser")
    parser.add_argument(
        "--no-reload", action="store_true", help="disable source-change reload polling"
    )
    args = parser.parse_args(argv)
    if not 0 <= args.port <= 65535:
        parser.error("--port must be between 0 and 65535")
    return start_server(
        port=args.port, open_browser=not args.no_browser, reload=not args.no_reload
    )


if __name__ == "__main__":
    sys.exit(main())
