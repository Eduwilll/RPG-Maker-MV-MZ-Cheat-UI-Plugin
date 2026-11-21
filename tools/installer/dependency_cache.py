"""Release-pinned dependency protocol and shared, verified per-user cache."""

from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import re
import queue
import socket
import stat
import sys
import tempfile
import threading
import time
import urllib.request

REPOSITORY = "Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin"
ASSET_BASE = "cheat-engine/www/cheat/libs/"
MAX_MANIFEST_BYTES = 128 * 1024


def asset_urls(revision, path):
    return [f"https://cdn.jsdelivr.net/gh/{REPOSITORY}@{revision}/{ASSET_BASE}{path}",
            f"https://raw.githubusercontent.com/{REPOSITORY}/{revision}/{ASSET_BASE}{path}"]


def canonical_assets(assets):
    return json.dumps([[a["path"], a["kind"], a["size"], a["sha256"]]
                       for a in sorted(assets, key=lambda a: a["path"])], separators=(",", ":")).encode("utf-8")


def validate_manifest(manifest):
    def fail():
        raise ValueError("Invalid dependency manifest")
    if (not isinstance(manifest, dict) or manifest.get("schema") != 1 or
        not re.fullmatch(r"[a-f0-9]{64}", str(manifest.get("id", ""))) or
        not re.fullmatch(r"[a-f0-9]{40}", str(manifest.get("revision", ""))) or
        not isinstance(manifest.get("assets"), list) or not 1 <= len(manifest["assets"]) <= 64 or
        len(json.dumps(manifest).encode("utf-8")) > MAX_MANIFEST_BYTES):
        fail()
    seen = []
    total = 0
    for asset in manifest["assets"]:
        if not isinstance(asset, dict):
            fail()
        path = asset.get("path", "")
        if not isinstance(path, str) or len(path) > 180 or not re.fullmatch(r"[A-Za-z0-9_./-]+", path):
            fail()
        if any(not part or part in {".", ".."} or part.endswith(".") or
               re.match(r"^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)", part, re.I) for part in path.split("/")):
            fail()
        lower = path.lower()
        if any(old == lower or old.startswith(lower + "/") or lower.startswith(old + "/") for old in seen):
            fail()
        seen.append(lower)
        extension = {"script": ".js", "style": ".css", "font": ".woff2"}.get(asset.get("kind"))
        size = asset.get("size")
        urls = asset.get("urls")
        if (not extension or not lower.endswith(extension) or type(size) is not int or not 0 < size <= 32 * 1024 * 1024 or
            not re.fullmatch(r"[a-f0-9]{64}", str(asset.get("sha256", ""))) or
            not isinstance(urls, list) or not 1 <= len(urls) <= 2 or
            any(url not in asset_urls(manifest["revision"], path) for url in urls)):
            fail()
        total += size
    if total > 64 * 1024 * 1024 or hashlib.sha256(canonical_assets(manifest["assets"])).hexdigest() != manifest["id"]:
        fail()
    return manifest


def default_cache_root():
    if sys.platform == "win32":
        parent = Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local")
    elif sys.platform == "darwin":
        parent = Path.home() / "Library" / "Caches"
    else:
        parent = Path(os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache")
    return parent / "RPGMakerCheatUI" / "dependencies"


def _check(path, directory):
    info = path.lstat()
    if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & 0x400:
        raise OSError(f"Unsafe dependency cache link: {path}")
    if not (stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode)):
        raise OSError(f"Unsafe dependency cache path: {path}")


def _mkdir(path):
    try:
        _check(path, True)
    except FileNotFoundError:
        _mkdir(path.parent)
        path.mkdir(exist_ok=True)
        _check(path, True)


def _asset_path(root, relative):
    _mkdir(root)
    path = root
    parts = relative.split("/")
    for part in parts[:-1]:
        path = path / part
        _mkdir(path)
    path = path / parts[-1]
    try:
        _check(path, False)
    except FileNotFoundError:
        pass
    return path


def _verify(asset, data):
    if not isinstance(data, bytes) or len(data) != asset["size"] or hashlib.sha256(data).hexdigest() != asset["sha256"]:
        raise ValueError(f"Dependency integrity check failed: {asset['path']}")
    return data


def _read_verified(path, asset):
    try:
        with path.open("rb") as stream:
            if os.fstat(stream.fileno()).st_size != asset["size"]:
                return None
            return _verify(asset, stream.read(asset["size"] + 1))
    except (FileNotFoundError, ValueError):
        return None


class _PinnedRedirects(urllib.request.HTTPRedirectHandler):
    def __init__(self, urls):
        super().__init__()
        self.urls = urls
        self.count = 0

    def redirect_request(self, request, fp, code, message, headers, newurl):
        self.count += 1
        if newurl not in self.urls or self.count > 3:
            raise ValueError("Untrusted dependency redirect")
        return super().redirect_request(request, fp, code, message, headers, newurl)


def download_dependency(url, asset, deadline):
    if url not in asset["urls"]:
        raise ValueError("Untrusted dependency source")
    request_deadline = min(deadline, time.monotonic() + 15)
    remaining = request_deadline - time.monotonic()
    if remaining <= 0:
        raise TimeoutError("Dependency download timed out")
    result = queue.Queue(maxsize=1)
    cancelled = threading.Event()
    active = []

    def fetch():
        try:
            request = urllib.request.Request(url, headers={"Accept-Encoding": "identity", "User-Agent": "RPGMakerCheatUI"})
            opener = urllib.request.build_opener(_PinnedRedirects(asset["urls"]))
            with opener.open(request, timeout=max(0.1, remaining)) as response:
                active.append(response)
                if response.status != 200 or response.headers.get("Content-Encoding", "identity") != "identity":
                    raise OSError("Dependency download failed")
                chunks = []
                length = 0
                while True:
                    if cancelled.is_set() or time.monotonic() >= request_deadline:
                        raise TimeoutError("Dependency download timed out")
                    chunk = response.read1(min(65536, asset["size"] + 1 - length))
                    if not chunk:
                        break
                    chunks.append(chunk)
                    length += len(chunk)
                    if length > asset["size"]:
                        raise ValueError("Dependency exceeds declared size")
                result.put_nowait((True, b"".join(chunks)))
        except Exception as error:
            result.put_nowait((False, error))

    # Socket timeouts limit inactivity, not a slow-drip request's total duration.
    # The worker never writes files; a late result cannot publish cache bytes.
    threading.Thread(target=fetch, daemon=True).start()
    try:
        success, data = result.get(timeout=max(0.001, request_deadline - time.monotonic()))
    except queue.Empty:
        cancelled.set()
        if active:
            raw = getattr(getattr(active[0], "fp", None), "raw", None)
            connection = getattr(raw, "_sock", None)
            if connection is not None:
                try:
                    connection.shutdown(socket.SHUT_RDWR)
                except OSError:
                    pass
        raise TimeoutError("Dependency download timed out") from None
    if not success:
        raise data
    return data


def prepare_dependencies(manifest, *, cache_root=None, download=None, log=None):
    validate_manifest(manifest)
    root = Path(os.path.abspath(cache_root or default_cache_root()))
    _mkdir(root)
    root = root / manifest["id"]
    _mkdir(root)
    deadline = time.monotonic() + 90
    fetch = download or download_dependency

    def prepare(asset):
        target = _asset_path(root, asset["path"])
        cached = _read_verified(target, asset)
        if cached is not None:
            return asset["path"], cached
        if log:
            log(f"Downloading dependency: {asset['path']}")
        data = None
        failure = None
        for url in asset["urls"]:
            if time.monotonic() >= deadline:
                raise TimeoutError("Dependency preparation timed out")
            try:
                data = _verify(asset, fetch(url, asset, deadline))
                break
            except (OSError, ValueError) as error:
                failure = error
        if data is None:
            raise failure
        if time.monotonic() >= deadline:
            raise TimeoutError("Dependency preparation timed out")
        fd, temporary = tempfile.mkstemp(prefix=".dependency-", suffix=".tmp", dir=target.parent)
        try:
            with os.fdopen(fd, "wb") as stream:
                stream.write(data)
                stream.flush()
                os.fsync(stream.fileno())
            _asset_path(root, asset["path"])
            try:
                os.replace(temporary, target)
            except OSError:
                if _read_verified(target, asset) is None:
                    raise
            return asset["path"], data
        finally:
            try:
                os.unlink(temporary)
            except FileNotFoundError:
                pass

    with ThreadPoolExecutor(max_workers=3) as pool:
        return dict(pool.map(prepare, manifest["assets"]))
