import json
import os
import shutil
import tarfile
import tempfile
from dataclasses import dataclass
from datetime import datetime
from enum import Enum


EPHEMERAL_RUNTIME_DIRS = {"cheat-settings"}
BACKUP_DIR_NAME = "cheat-installer-backups"
BACKUP_REASON_ORIGINAL = "original-game"
BACKUP_REASON_PLUGIN = "plugin-version"


class GameType(Enum):
    MV = "MV"
    MZ = "MZ"


@dataclass
class GameTarget:
    game_path: str
    root_path: str
    game_type: GameType

    @property
    def main_js_path(self):
        return os.path.join(self.root_path, "js", "main.js")

    @property
    def cheat_path(self):
        return os.path.join(self.root_path, "cheat")

    @property
    def version_path(self):
        return os.path.join(self.root_path, "cheat-version-description.json")

    @property
    def settings_path(self):
        return os.path.join(self.root_path, "cheat-settings")

    @property
    def backup_root(self):
        return os.path.join(self.root_path, BACKUP_DIR_NAME)


def detect_game(game_path):
    game_path = os.path.abspath(game_path)
    candidates = [
        (GameType.MZ, os.path.join(game_path, "js", "rmmz_core.js"), game_path),
        (GameType.MZ, os.path.join(game_path, "www", "js", "rmmz_core.js"), os.path.join(game_path, "www")),
        (GameType.MV, os.path.join(game_path, "www", "js", "rpg_core.js"), os.path.join(game_path, "www")),
        (GameType.MV, os.path.join(game_path, "js", "rpg_core.js"), game_path),
        (GameType.MZ, os.path.join(game_path, "game", "js", "rmmz_core.js"), os.path.join(game_path, "game")),
        (GameType.MV, os.path.join(game_path, "game", "js", "rpg_core.js"), os.path.join(game_path, "game")),
    ]

    for game_type, marker_path, root_path in candidates:
        if os.path.exists(marker_path):
            return GameTarget(game_path, os.path.abspath(root_path), game_type)

    raise RuntimeError(
        "Could not detect RPG Maker MV or MZ. Select the game folder that contains "
        "js/rmmz_core.js, www/js/rpg_core.js, or the equivalent game/www folder."
    )


def read_package_version(project_root):
    package_path = os.path.join(project_root, "package.json")
    with open(package_path, "r", encoding="utf-8") as rf:
        package_data = json.load(rf)
    return str(package_data.get("version") or "unknown")


def get_project_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def validate_source_root(source_root):
    required_paths = [
        os.path.join("cheat", "init", "import.js"),
        os.path.join("cheat", "init", "setup.js"),
        os.path.join("cheat", "CheatModal.js"),
        os.path.join("cheat", "MainComponent.js"),
        os.path.join("cheat", "js", "window-init.js"),
        os.path.join("_cheat_initialize", "mv", "js", "main.js"),
        os.path.join("_cheat_initialize", "mz", "js", "main.js"),
    ]
    validate_required_paths(source_root, required_paths, "Installer source")


def validate_installed_layout(target):
    validate_required_paths(
        target.root_path,
        [
            os.path.join("cheat", "init", "import.js"),
            os.path.join("cheat", "init", "setup.js"),
            os.path.join("cheat", "CheatModal.js"),
            os.path.join("cheat", "MainComponent.js"),
            os.path.join("js", "main.js"),
            "cheat-version-description.json",
        ],
        "Installed cheat",
    )

    with open(target.main_js_path, "r", encoding="utf-8") as rf:
        main_js = rf.read()

    if "cheat/init/import.js" not in main_js:
        raise RuntimeError("Installed main.js does not include the cheat bootstrap import.")


def validate_required_paths(root_dir, relative_paths, label):
    missing_paths = []
    for relative_path in relative_paths:
        if not os.path.exists(os.path.join(root_dir, relative_path)):
            missing_paths.append(relative_path)

    if missing_paths:
        missing_text = "\n".join([f"  - {path}" for path in missing_paths])
        raise FileNotFoundError(f"{label} is missing required files:\n{missing_text}")


def get_status(game_path):
    target = detect_game(game_path)
    version = None
    installed = os.path.exists(target.cheat_path) and os.path.exists(target.version_path)

    if os.path.exists(target.version_path):
        try:
            with open(target.version_path, "r", encoding="utf-8") as rf:
                version = json.load(rf).get("version")
        except (OSError, ValueError):
            version = "unreadable"

    return {
        "game_path": target.game_path,
        "root_path": target.root_path,
        "game_type": target.game_type.value,
        "installed": installed,
        "version": version,
        "settings_path": target.settings_path,
        "backup_root": target.backup_root,
        "original_backup": find_original_backup(target),
        "backups": list_backup_summaries(target),
    }


def install_from_source(
    game_path,
    source_root=None,
    version=None,
    clean_settings=False,
    logger=None,
):
    project_root = get_project_root()
    source_root = os.path.abspath(source_root or os.path.join(project_root, "cheat-engine", "www"))
    version = normalize_version_string(version or read_package_version(project_root))
    target = detect_game(game_path)

    log(logger, f"Detected {target.game_type.value} game at {target.game_path}")
    validate_source_root(source_root)
    affected_paths = get_source_install_paths(source_root, clean_settings=clean_settings)
    backups = prepare_install_backups(target, affected_paths, logger=logger)

    if clean_settings:
        log(logger, f"Removing runtime settings: {target.settings_path}")
        remove_path(target.settings_path)

    log(logger, "Copying cheat UI files")
    replace_directory(os.path.join(source_root, "cheat"), target.cheat_path)
    log(logger, "Installing engine bootstrap")
    install_main_js_from_source(source_root, target)
    copy_extra_source_files(source_root, target.root_path)
    write_version_file(target.version_path, version)
    validate_installed_layout(target)
    log(logger, f"Install complete: {version}")

    return {
        "target": target,
        "backup_path": backups["original_backup"],
        "backup_reason": BACKUP_REASON_ORIGINAL if backups["original_backup"] else None,
        "original_backup_path": backups["original_backup"],
        "plugin_backup_path": backups["plugin_backup"],
        "version": version,
        "source": source_root,
    }


def install_from_archive(
    game_path,
    archive_path,
    version=None,
    clean_settings=False,
    logger=None,
):
    target = detect_game(game_path)
    archive_path = os.path.abspath(archive_path)

    if not tarfile.is_tarfile(archive_path):
        raise RuntimeError(f"Unsupported archive: {archive_path}")

    log(logger, f"Detected {target.game_type.value} game at {target.game_path}")

    with tempfile.TemporaryDirectory(prefix="rpg-cheat-install-") as temp_dir:
        log(logger, f"Extracting archive: {archive_path}")
        with tarfile.open(archive_path, "r:*") as archive:
            safe_extract_archive(archive, temp_dir)

        package_root = find_archive_package_root(temp_dir, target.game_type)
        affected_paths = get_archive_install_paths(
            package_root,
            clean_settings=clean_settings,
            writes_version_override=bool(version),
        )
        backups = prepare_install_backups(target, affected_paths, logger=logger)

        if clean_settings:
            log(logger, f"Removing runtime settings: {target.settings_path}")
            remove_path(target.settings_path)

        log(logger, "Copying packaged plugin files")
        install_package_root(package_root, target.root_path)

        if version:
            write_version_file(target.version_path, version)

    validate_installed_layout(target)
    installed_version = normalize_installed_version_file(target.version_path)
    log(logger, "Install complete")

    return {
        "target": target,
        "backup_path": backups["original_backup"],
        "backup_reason": BACKUP_REASON_ORIGINAL if backups["original_backup"] else None,
        "original_backup_path": backups["original_backup"],
        "plugin_backup_path": backups["plugin_backup"],
        "version": installed_version,
        "source": archive_path,
    }


def uninstall(game_path, backup_path=None, logger=None):
    target = detect_game(game_path)
    backup_path = os.path.abspath(backup_path) if backup_path else find_original_backup(target)

    if not backup_path:
        log(
            logger,
            "No original-game backup found; removing cheat files and leaving a disabled loader "
            "so the existing patched main.js can still boot the game.",
        )
        remove_installed_cheat(target, keep_disabled_loader=True)
        return {
            "target": target,
            "backup_path": None,
        }

    log(logger, f"Restoring backup: {backup_path}")
    restore_backup(target, backup_path)
    remove_path(target.settings_path)
    log(logger, "Restore complete")

    return {
        "target": target,
        "backup_path": backup_path,
    }


def list_backups(game_path):
    target = detect_game(game_path)
    return list_backup_summaries(target)


def log(logger, message):
    if logger:
        logger(message)


def create_backup(target, affected_paths=None, reason=BACKUP_REASON_ORIGINAL):
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = get_available_backup_path(target.backup_root, timestamp)
    os.makedirs(backup_path)

    affected_paths = affected_paths or get_default_backup_paths()
    entries = []

    for relative_path in normalize_relative_paths(affected_paths):
        src = os.path.join(target.root_path, relative_path)
        dst = os.path.join(backup_path, relative_path)
        existed = os.path.exists(src)

        if existed:
            copy_path(src, dst)

        entries.append(
            {
                "path": relative_path,
                "existed": existed,
                "kind": get_path_kind(src) if existed else None,
            }
        )

    metadata = {
        "schema": 2,
        "gamePath": target.game_path,
        "rootPath": target.root_path,
        "gameType": target.game_type.value,
        "createdAt": timestamp,
        "reason": reason,
        "entries": entries,
    }
    with open(os.path.join(backup_path, "installer-backup.json"), "w", encoding="utf-8") as wf:
        json.dump(metadata, wf, indent=2)

    return backup_path


def restore_backup(target, backup_path):
    metadata = read_backup_metadata(backup_path)
    entries = metadata.get("entries") or []

    if entries:
        for entry in sorted(entries, key=get_restore_order, reverse=True):
            relative_path = entry["path"]
            target_path = os.path.join(target.root_path, relative_path)
            source_path = os.path.join(backup_path, relative_path)

            remove_path(target_path)

            if entry.get("existed"):
                if not os.path.exists(source_path):
                    raise RuntimeError(f"Backup is missing {relative_path}: {backup_path}")
                copy_path(source_path, target_path)

        return

    backup_main = os.path.join(backup_path, "js", "main.js")
    backup_cheat = os.path.join(backup_path, "cheat")
    backup_version = os.path.join(backup_path, "cheat-version-description.json")

    if not os.path.exists(backup_main):
        raise RuntimeError(f"Backup is missing js/main.js: {backup_path}")

    remove_path(target.cheat_path)
    remove_path(target.version_path)
    copy_path(backup_main, target.main_js_path)

    if os.path.exists(backup_cheat):
        copy_path(backup_cheat, target.cheat_path)

    if os.path.exists(backup_version):
        copy_path(backup_version, target.version_path)


def ensure_original_backup(target, affected_paths, logger=None):
    original_backup = find_original_backup(target)

    if original_backup:
        log(logger, f"Original-game backup already exists: {original_backup}")
        return original_backup

    if has_cheat_bootstrap(target):
        log(
            logger,
            "Current main.js already looks cheat-modified; skipping original-game backup "
            "to avoid saving plugin files as the uninstall source.",
        )
        return None

    backup_path = create_backup(target, affected_paths, reason=BACKUP_REASON_ORIGINAL)
    log(logger, f"Created original-game backup: {backup_path}")
    return backup_path


def prepare_install_backups(target, affected_paths, logger=None):
    original_backup = ensure_original_backup(target, affected_paths, logger=logger)
    plugin_backup = None

    if is_plugin_installed(target):
        plugin_backup = create_backup(target, affected_paths, reason=BACKUP_REASON_PLUGIN)
        log(logger, f"Created plugin-version backup: {plugin_backup}")

    return {
        "original_backup": original_backup,
        "plugin_backup": plugin_backup,
    }


def find_latest_backup(target):
    backup_paths = list_backup_paths(target)
    return backup_paths[0] if backup_paths else None


def find_original_backup(target):
    for backup_path in list_backup_paths(target):
        metadata = read_backup_metadata(backup_path)
        if metadata.get("reason") == BACKUP_REASON_ORIGINAL:
            return backup_path

        if not metadata.get("reason") and backup_has_original_main_js(backup_path):
            return backup_path

    return None


def list_backup_paths(target):
    if not os.path.isdir(target.backup_root):
        return []

    backups = [
        os.path.join(target.backup_root, name)
        for name in os.listdir(target.backup_root)
        if os.path.isdir(os.path.join(target.backup_root, name))
    ]

    backups.sort(reverse=True)
    return backups


def list_backup_summaries(target):
    summaries = []

    for backup_path in list_backup_paths(target):
        metadata = read_backup_metadata(backup_path)
        reason = metadata.get("reason") or infer_legacy_backup_reason(backup_path)
        summaries.append(
            {
                "name": os.path.basename(backup_path),
                "path": backup_path,
                "createdAt": metadata.get("createdAt") or os.path.basename(backup_path),
                "gameType": metadata.get("gameType"),
                "schema": metadata.get("schema", 1),
                "reason": reason,
                "entryCount": len(metadata.get("entries") or []),
            }
        )

    return summaries


def read_backup_metadata(backup_path):
    metadata_path = os.path.join(backup_path, "installer-backup.json")
    if not os.path.exists(metadata_path):
        return {}

    try:
        with open(metadata_path, "r", encoding="utf-8") as rf:
            return json.load(rf)
    except (OSError, ValueError):
        return {}


def get_available_backup_path(backup_root, timestamp):
    backup_path = os.path.join(backup_root, timestamp)
    if not os.path.exists(backup_path):
        return backup_path

    counter = 2
    while True:
        backup_path = os.path.join(backup_root, f"{timestamp}-{counter}")
        if not os.path.exists(backup_path):
            return backup_path
        counter += 1


def get_restore_order(entry):
    relative_path = entry["path"].replace("\\", "/")
    return relative_path.count("/")


def install_main_js_from_source(source_root, target):
    game_key = "mv" if target.game_type == GameType.MV else "mz"
    src_main = os.path.join(source_root, "_cheat_initialize", game_key, "js", "main.js")
    os.makedirs(os.path.dirname(target.main_js_path), exist_ok=True)
    shutil.copy2(src_main, target.main_js_path)


def copy_extra_source_files(source_root, target_root):
    for name in os.listdir(source_root):
        if name in {"cheat", "js", "_cheat_initialize"} or name in EPHEMERAL_RUNTIME_DIRS:
            continue

        copy_path(os.path.join(source_root, name), os.path.join(target_root, name))


def get_source_install_paths(source_root, clean_settings=False):
    paths = ["cheat", os.path.join("js", "main.js"), "cheat-version-description.json"]

    for name in os.listdir(source_root):
        if name in {"cheat", "js", "_cheat_initialize"} or name in EPHEMERAL_RUNTIME_DIRS:
            continue
        paths.append(name)

    if clean_settings:
        paths.append("cheat-settings")

    return paths


def get_archive_install_paths(package_root, clean_settings=False, writes_version_override=False):
    paths = []

    for name in os.listdir(package_root):
        if name in EPHEMERAL_RUNTIME_DIRS:
            continue

        src = os.path.join(package_root, name)
        if name == "cheat":
            paths.append(name)
        elif os.path.isdir(src):
            for root, _dirs, files in os.walk(src):
                for file_name in files:
                    full_path = os.path.join(root, file_name)
                    paths.append(os.path.relpath(full_path, package_root))
        else:
            paths.append(name)

    if writes_version_override:
        paths.append("cheat-version-description.json")

    if clean_settings:
        paths.append("cheat-settings")

    return paths


def get_default_backup_paths():
    return ["cheat", os.path.join("js", "main.js"), "cheat-version-description.json"]


def normalize_relative_paths(paths):
    normalized = []
    seen = set()

    for path in paths:
        relative_path = os.path.normpath(path)
        if (
            os.path.isabs(relative_path)
            or relative_path == os.pardir
            or relative_path.startswith(os.pardir + os.sep)
        ):
            raise RuntimeError(f"Unsafe backup path: {path}")
        if relative_path in seen:
            continue
        seen.add(relative_path)
        normalized.append(relative_path)

    return normalized


def get_path_kind(path):
    if os.path.isdir(path):
        return "directory"
    return "file"


def has_cheat_bootstrap(target):
    if not os.path.exists(target.main_js_path):
        return False

    try:
        with open(target.main_js_path, "r", encoding="utf-8") as rf:
            return "cheat/init/import.js" in rf.read()
    except OSError:
        return False


def is_plugin_installed(target):
    return (
        has_cheat_bootstrap(target)
        or os.path.exists(target.cheat_path)
        or os.path.exists(target.version_path)
    )


def backup_has_original_main_js(backup_path):
    backup_main = os.path.join(backup_path, "js", "main.js")
    if not os.path.exists(backup_main):
        return False

    try:
        with open(backup_main, "r", encoding="utf-8") as rf:
            return "cheat/init/import.js" not in rf.read()
    except OSError:
        return False


def infer_legacy_backup_reason(backup_path):
    if backup_has_original_main_js(backup_path):
        return BACKUP_REASON_ORIGINAL
    return BACKUP_REASON_PLUGIN


def remove_installed_cheat(target, keep_disabled_loader=False):
    remove_path(target.cheat_path)
    remove_path(target.version_path)
    remove_path(target.settings_path)

    if keep_disabled_loader:
        write_disabled_loader(target)


def write_disabled_loader(target):
    loader_path = os.path.join(target.cheat_path, "init", "import.js")
    os.makedirs(os.path.dirname(loader_path), exist_ok=True)

    with open(loader_path, "w", encoding="utf-8") as wf:
        wf.write(
            "// Cheat UI disabled by installer uninstall fallback.\n"
            "// The game main.js still references this loader, so this no-op keeps the game bootable.\n"
        )


def install_package_root(package_root, target_root):
    for name in os.listdir(package_root):
        if name in EPHEMERAL_RUNTIME_DIRS:
            continue

        src = os.path.join(package_root, name)
        dst = os.path.join(target_root, name)

        if name == "cheat":
            replace_directory(src, dst)
        elif os.path.isdir(src):
            merge_directory(src, dst)
        else:
            copy_path(src, dst)


def find_archive_package_root(temp_dir, game_type):
    mv_root = os.path.join(temp_dir, "www")
    if game_type == GameType.MV and os.path.exists(os.path.join(mv_root, "cheat")):
        return mv_root

    if os.path.exists(os.path.join(temp_dir, "cheat")):
        return temp_dir

    for root, dirs, _files in os.walk(temp_dir):
        if "cheat" in dirs and "js" in dirs:
            return root

    raise RuntimeError("Could not find cheat package root inside archive.")


def safe_extract_archive(archive, target_dir):
    target_dir = os.path.abspath(target_dir)

    for member in archive.getmembers():
        if not is_safe_archive_member_path(target_dir, member.name):
            raise RuntimeError(f"Archive contains an unsafe path: {member.name}")

    archive.extractall(target_dir)


def is_safe_archive_member_path(target_dir, member_name):
    member_path = os.path.abspath(os.path.join(target_dir, member_name))
    return member_path == target_dir or member_path.startswith(target_dir + os.sep)


def write_version_file(version_path, version):
    with open(version_path, "w", encoding="utf-8") as wf:
        json.dump({"version": normalize_version_string(version)}, wf, indent=2)


def normalize_installed_version_file(version_path):
    try:
        with open(version_path, "r", encoding="utf-8") as rf:
            description = json.load(rf)
    except (OSError, ValueError):
        return None

    version = normalize_version_string(description.get("version"))
    description["version"] = version

    with open(version_path, "w", encoding="utf-8") as wf:
        json.dump(description, wf, indent=2)

    return version


def normalize_version_string(version):
    text = str(version or "").strip()
    if not text:
        return text
    return text if text.lower().startswith("v") else f"v{text}"


def merge_directory(src, dst):
    if not os.path.isdir(src):
        return

    os.makedirs(dst, exist_ok=True)

    for name in os.listdir(src):
        if name in EPHEMERAL_RUNTIME_DIRS:
            continue

        copy_path(os.path.join(src, name), os.path.join(dst, name))


def replace_directory(src, dst):
    remove_path(dst)
    shutil.copytree(src, dst)


def copy_path(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)

    if os.path.isdir(src):
        remove_path(dst)
        shutil.copytree(src, dst)
    else:
        shutil.copy2(src, dst)


def remove_path(path):
    if not os.path.exists(path):
        return

    is_junction = getattr(os.path, "isjunction", lambda _path: False)

    if os.path.islink(path) or is_junction(path):
        os.rmdir(path)
        return

    if os.path.isfile(path):
        os.unlink(path)
        return

    shutil.rmtree(path)
