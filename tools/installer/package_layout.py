"""Shared, bounded validation for legacy and compact release payloads."""

import json
from pathlib import Path, PurePosixPath
import re
import tarfile

if __package__:
    from .dependency_cache import MAX_MANIFEST_BYTES, validate_manifest
else:
    from dependency_cache import MAX_MANIFEST_BYTES, validate_manifest

COMPACT_FILES = ["cheat/init/import.js", "cheat/cheat-bundle.js", "cheat/cheat-bundle.css",
                 "cheat/window.html", "cheat/dependencies.json"]
LEGACY_FILES = ["cheat/init/import.js", "cheat/init/setup.js", "cheat/init/setup.bundle.js",
                "cheat/js/window-init.bundle.js", "cheat/CheatModal.js", "cheat/MainComponent.js"]


def validate_metadata(data, *, engine=None, edition=None, source=False):
    if edition not in {None, "offline", "online"}:
        raise ValueError("Choose Offline or Online")
    if not isinstance(data, dict):
        raise ValueError("Invalid package metadata")
    result = dict(data)
    if result.get("layout") == "compact":
        if (result.get("schema") != 2 or result.get("edition") not in {"offline", "online"} or
            not re.fullmatch(r"[a-f0-9]{64}", str(result.get("dependencySet", ""))) or
            not source and result.get("engine") not in {"MV", "MZ"}):
            raise ValueError("Invalid compact package metadata")
        if engine and result.get("engine", engine) != engine:
            raise ValueError(f"This game needs the {engine} package")
    else:
        if result.get("layout") is not None or result.get("schema") not in {None, 1}:
            raise ValueError("Unsupported package layout")
        result["edition"] = "legacy"
        result["layout"] = "legacy"
    actual = result["edition"]
    if edition and actual != edition and not (edition == "offline" and actual == "legacy"):
        raise ValueError(f"Choose the {edition.title()} package; this package is {actual}.")
    return result


def required_paths(metadata, *, source=False):
    paths = list(COMPACT_FILES if metadata["layout"] == "compact" else LEGACY_FILES)
    if source:
        if metadata["layout"] == "legacy":
            paths += ["cheat/js/window-init.js", "_cheat_initialize/mv/js/main.js", "_cheat_initialize/mz/js/main.js"]
    else:
        paths += ["js/main.js", "cheat-version-description.json"]
    return paths


def _json_bytes(data, limit):
    if len(data) > limit:
        raise ValueError("Package metadata exceeds its size limit")
    return json.loads(data)


def validate_dependency_manifest(metadata, manifest):
    validate_manifest(manifest)
    if manifest["id"] != metadata["dependencySet"]:
        raise ValueError("Package dependency identity mismatch")
    return manifest


def read_package_metadata(root, *, engine=None, edition=None, source=False):
    root = Path(root)
    filename = root / "cheat-version-description.json"
    if source and not filename.is_file():
        filename = root / "runtime-layout.json"
    data = _json_bytes(filename.read_bytes(), 4096) if filename.is_file() else {}
    metadata = validate_metadata(data, engine=engine, edition=edition, source=source)
    for name in required_paths(metadata, source=source):
        if not (root / name).is_file():
            raise FileNotFoundError(f"Plugin package is missing required file: {name}")
    if metadata["layout"] == "compact":
        validate_dependency_manifest(metadata, _json_bytes((root / "cheat/dependencies.json").read_bytes(), MAX_MANIFEST_BYTES))
    return metadata


def inspect_archive(path, engine, edition=None):
    named = re.match(r"rpg-(mv|mz)-cheat-", Path(path).name, re.I)
    if named and named.group(1).upper() != engine:
        raise ValueError(f"This game needs the {engine} package, not {named.group(1).upper()}.")
    prefix = "www/" if engine == "MV" else ""
    with tarfile.open(path, "r:*") as archive:
        files = {}
        seen = set()
        total = 0
        for count, member in enumerate(archive, 1):
            normalized = member.name.replace("\\", "/")
            parts = PurePosixPath(normalized).parts
            if normalized.startswith("/") or ".." in parts or ":" in normalized or not (member.isfile() or member.isdir()):
                raise ValueError("The package contains an unsafe entry. Download a fresh release.")
            if count > 20000 or member.size < 0 or member.size > 64 * 1024 * 1024:
                raise ValueError("Package file limits exceeded")
            if member.isfile():
                name = PurePosixPath(normalized).as_posix()
                if name.lower() in seen:
                    raise ValueError("The package contains duplicate files")
                seen.add(name.lower())
                files[name] = member
                total += member.size
                if total > 256 * 1024 * 1024:
                    raise ValueError("Package size limit exceeded")
        version = files.get(prefix + "cheat-version-description.json")
        if not version or version.size > 4096:
            raise ValueError("The package version information is invalid")
        metadata = validate_metadata(_json_bytes(archive.extractfile(version).read(4097), 4096), engine=engine, edition=edition)
        if not metadata.get("version"):
            raise ValueError("The package is missing its version")
        if not all(prefix + name in files for name in required_paths(metadata)):
            raise ValueError(f"Choose the complete {engine} release package, not a game or source archive.")
        if metadata["layout"] == "compact":
            claimed_edition = "online" if re.search(r"-online-core\.(tar\.gz|tgz)$", Path(path).name) else "offline"
            if named and claimed_edition != metadata["edition"]:
                raise ValueError("Package filename and edition metadata disagree")
            member = files[prefix + "cheat/dependencies.json"]
            if member.size > MAX_MANIFEST_BYTES:
                raise ValueError("Dependency manifest exceeds its size limit")
            validate_dependency_manifest(metadata, _json_bytes(archive.extractfile(member).read(MAX_MANIFEST_BYTES + 1), MAX_MANIFEST_BYTES))
        return metadata
