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
    }


def install_from_source(game_path, source_root=None, version=None, clean_settings=False):
    project_root = get_project_root()
    source_root = os.path.abspath(source_root or os.path.join(project_root, "cheat-engine", "www"))
    version = version or read_package_version(project_root)
    target = detect_game(game_path)

    validate_source_root(source_root)
    backup_path = create_backup(target)

    if clean_settings:
        remove_path(target.settings_path)

    replace_directory(os.path.join(source_root, "cheat"), target.cheat_path)
    install_main_js_from_source(source_root, target)
    copy_extra_source_files(source_root, target.root_path)
    write_version_file(target.version_path, version)
    validate_installed_layout(target)

    return {
        "target": target,
        "backup_path": backup_path,
        "version": version,
        "source": source_root,
    }


def install_from_archive(game_path, archive_path, version=None, clean_settings=False):
    target = detect_game(game_path)
    archive_path = os.path.abspath(archive_path)

    if not tarfile.is_tarfile(archive_path):
        raise RuntimeError(f"Unsupported archive: {archive_path}")

    backup_path = create_backup(target)

    with tempfile.TemporaryDirectory(prefix="rpg-cheat-install-") as temp_dir:
        with tarfile.open(archive_path, "r:*") as archive:
            safe_extract_archive(archive, temp_dir)

        package_root = find_archive_package_root(temp_dir, target.game_type)

        if clean_settings:
            remove_path(target.settings_path)

        install_package_root(package_root, target.root_path)

        if version:
            write_version_file(target.version_path, version)

    validate_installed_layout(target)

    return {
        "target": target,
        "backup_path": backup_path,
        "version": version,
        "source": archive_path,
    }


def uninstall(game_path, backup_path=None):
    target = detect_game(game_path)
    backup_path = os.path.abspath(backup_path) if backup_path else find_latest_backup(target)

    if not backup_path:
        raise RuntimeError("No installer backup found. Provide --backup-path to restore manually.")

    restore_backup(target, backup_path)

    return {
        "target": target,
        "backup_path": backup_path,
    }


def create_backup(target):
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = os.path.join(target.backup_root, timestamp)
    os.makedirs(backup_path, exist_ok=True)

    backup_items = [
        (target.main_js_path, os.path.join(backup_path, "js", "main.js")),
        (target.cheat_path, os.path.join(backup_path, "cheat")),
        (target.version_path, os.path.join(backup_path, "cheat-version-description.json")),
    ]

    for src, dst in backup_items:
        if os.path.exists(src):
            copy_path(src, dst)

    metadata = {
        "gamePath": target.game_path,
        "rootPath": target.root_path,
        "gameType": target.game_type.value,
        "createdAt": timestamp,
    }
    with open(os.path.join(backup_path, "installer-backup.json"), "w", encoding="utf-8") as wf:
        json.dump(metadata, wf, indent=2)

    return backup_path


def restore_backup(target, backup_path):
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


def find_latest_backup(target):
    if not os.path.isdir(target.backup_root):
        return None

    backups = [
        os.path.join(target.backup_root, name)
        for name in os.listdir(target.backup_root)
        if os.path.isdir(os.path.join(target.backup_root, name))
    ]

    if not backups:
        return None

    backups.sort(reverse=True)
    return backups[0]


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
        member_path = os.path.abspath(os.path.join(target_dir, member.name))
        if not member_path.startswith(target_dir + os.sep):
            raise RuntimeError(f"Archive contains an unsafe path: {member.name}")

    archive.extractall(target_dir)


def write_version_file(version_path, version):
    with open(version_path, "w", encoding="utf-8") as wf:
        json.dump({"version": str(version)}, wf, indent=2)


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

    if os.path.islink(path) or os.path.isfile(path):
        os.unlink(path)
        return

    shutil.rmtree(path, ignore_errors=True)
