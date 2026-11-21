"""Read-only preflight and queued jobs for the desktop installer."""

from dataclasses import dataclass
import glob
import json
import os
from pathlib import PurePosixPath
import queue
import re
import tarfile
import threading

if __package__:
    from .core import get_status, normalize_version_string, validate_source_root
    from .package_layout import inspect_archive, read_package_metadata
else:
    from core import get_status, normalize_version_string, validate_source_root
    from package_layout import inspect_archive, read_package_metadata


@dataclass(frozen=True)
class InstallSource:
    kind: str
    path: str
    version: str
    edition: str = "legacy"
    layout: str = "legacy"


@dataclass(frozen=True)
class Inspection:
    title: str
    status: dict
    source: InstallSource | None
    package_error: str = ""


def normalize_game_path(value):
    path = os.path.abspath(os.path.expanduser(str(value).strip().strip('"')))
    return os.path.dirname(path) if os.path.isfile(path) else path


def archive_source(path, engine, edition=None):
    path = os.path.abspath(path)
    try:
        data = inspect_archive(path, engine, edition)
        version = normalize_version_string(data.get("version"))
    except (tarfile.TarError, OSError, EOFError, ValueError, AttributeError) as error:
        raise ValueError(f"Could not use this package: {error}") from error
    return InstallSource("archive", path, version, data["edition"], data["layout"])


def _version_key(path):
    match = re.search(r"-(\d+)\.(\d+)\.(\d+)([^/]*)-core\.", os.path.basename(path).replace("-online-core.", "-core."))
    if not match:
        return (0, 0, 0, False, os.path.basename(path))
    return (*map(int, match.group(1, 2, 3)), not bool(match.group(4)), match.group(4))


def select_source(engine, archive_path, search_dirs, source_root, source_version, edition="offline"):
    if archive_path:
        return archive_source(os.path.expanduser(str(archive_path).strip().strip('"')), engine, edition)
    for directory in search_dirs:
        matches = []
        for extension in ("tar.gz", "tgz"):
            matches.extend(glob.glob(os.path.join(directory, f"rpg-{engine.lower()}-cheat-*-core.{extension}")))
        matches = sorted((path for path in matches if os.path.isfile(path) and
                          ("-online-core." in os.path.basename(path)) == (edition == "online")), key=_version_key, reverse=True)
        if matches:
            return archive_source(matches[0], engine, edition)
    if source_root:
        built = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(source_root))), "output", "runtime", edition)
        if os.path.isfile(os.path.join(built, "runtime-layout.json")):
            source_root = built
        metadata = read_package_metadata(source_root, engine=engine, edition=edition, source=True)
        validate_source_root(str(source_root))
        return InstallSource("source", os.path.abspath(source_root), normalize_version_string(source_version), metadata["edition"], metadata["layout"])
    if edition == "online":
        raise FileNotFoundError("No matching Online package found. Keep the Online MV/MZ package beside the installer.")
    raise FileNotFoundError("No matching package found. Extract the full installer ZIP and keep the MV/MZ packages beside the EXE, or choose a package in Advanced options.")


def inspect_game(game_path, archive_path="", *, search_dirs=(), source_root=None, source_version="unknown", edition="offline"):
    status = get_status(normalize_game_path(game_path))
    title = os.path.basename(status["game_path"])
    if title.lower() in {"www", "game"}:
        title = os.path.basename(os.path.dirname(status["game_path"]))
    try:
        filename = os.path.join(status["root_path"], "data", "System.json")
        if os.path.getsize(filename) <= 1024 * 1024:
            with open(filename, encoding="utf-8-sig") as stream:
                data = json.load(stream)
            candidate = data.get("gameTitle")
            if isinstance(candidate, str) and candidate.strip():
                title = " ".join(candidate.split())[:160]
    except (OSError, ValueError, AttributeError):
        pass
    try:
        source = select_source(status["game_type"], archive_path, search_dirs, source_root, source_version, edition)
        return Inspection(title, status, source)
    except (OSError, ValueError) as error:
        return Inspection(title, status, None, str(error))


def explain_error(error):
    if isinstance(error, PermissionError):
        return "Can't access the game files", "Close the game and try again. Check that the game folder is writable and not locked by another program. Technical details are in Activity."
    if isinstance(error, FileNotFoundError):
        return "A required file is missing", "Check the game folder and extract the complete installer ZIP, including its MV/MZ packages. Then check the game again."
    if isinstance(error, RuntimeError) and "detect RPG Maker" in str(error):
        return "This game wasn't recognized", "Choose the folder containing Game.exe, or its www/game folder. Only RPG Maker MV and MZ are supported."
    return "The operation couldn't finish", "Your selection has been kept. Close the game, check the folder and package, then try again. Open Activity for technical details; if files were already changed, use Manage installation to review recovery backups."


class JobRunner:
    """Workers emit data only; the UI owns result handling and busy state."""

    def __init__(self):
        self.events = queue.Queue()
        self.busy = False

    def start(self, operation, work):
        if self.busy:
            return False
        self.busy = True

        def run():
            try:
                self.events.put(("result", operation, work()))
            except Exception as error:
                self.events.put(("error", operation, error))

        threading.Thread(target=run, daemon=True).start()
        return True

    def finish(self):
        self.busy = False

    def log(self, message):
        self.events.put(("log", "", str(message)))
