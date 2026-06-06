import argparse
import json
import os
import shutil
import subprocess
import sys


INSTALLER_NAME = "RPGMakerCheatInstaller"


def main():
    parser = argparse.ArgumentParser(description="Build the Windows installer package.")
    parser.add_argument("--version", help="Release version. Defaults to package.json version.")
    parser.add_argument("--output-dir", default="output", help="Directory containing release archives.")
    parser.add_argument("--keep-build", action="store_true", help="Keep PyInstaller build folders.")
    args = parser.parse_args()

    project_root = get_project_root()
    version = args.version or read_package_version(project_root)
    output_dir = os.path.abspath(os.path.join(project_root, args.output_dir))
    build_root = os.path.join(project_root, "build", "installer")
    dist_dir = os.path.join(build_root, "dist")
    work_dir = os.path.join(build_root, "work")
    spec_dir = os.path.join(build_root, "spec")
    package_dir = os.path.join(output_dir, f"{INSTALLER_NAME}-v{version}-windows")
    zip_base = os.path.join(output_dir, f"{INSTALLER_NAME}-v{version}-windows")

    ensure_release_archives(output_dir, version)

    if os.path.exists(build_root):
        shutil.rmtree(build_root)
    if os.path.exists(package_dir):
        shutil.rmtree(package_dir)

    os.makedirs(output_dir, exist_ok=True)
    run_pyinstaller(project_root, dist_dir, work_dir, spec_dir)
    create_package(project_root, output_dir, package_dir, version)

    zip_path = shutil.make_archive(zip_base, "zip", package_dir)
    print(f"Created installer package: {zip_path}")

    if not args.keep_build:
        shutil.rmtree(build_root, ignore_errors=True)
        shutil.rmtree(package_dir, ignore_errors=True)


def get_project_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def read_package_version(project_root):
    with open(os.path.join(project_root, "package.json"), "r", encoding="utf-8") as rf:
        return str(json.load(rf).get("version") or "unknown")


def ensure_release_archives(output_dir, version):
    missing = []
    for game_key in ("mv", "mz"):
        path = get_release_archive_path(output_dir, game_key, version)
        if not os.path.exists(path):
            missing.append(path)

    if missing:
        missing_text = "\n".join([f"  - {path}" for path in missing])
        raise FileNotFoundError(
            "Build release packages before building the installer ZIP:\n"
            f"{missing_text}\n\n"
            f"Example: py -3 deploy\\main.py --version {version}"
        )


def get_release_archive_path(output_dir, game_key, version):
    return os.path.join(output_dir, f"rpg-{game_key}-cheat-{version}-core.tar.gz")


def run_pyinstaller(project_root, dist_dir, work_dir, spec_dir):
    installer_dir = os.path.join(project_root, "tools", "installer")
    gui_path = os.path.join(project_root, "tools", "installer", "gui.py")
    logo_path = os.path.join(project_root, "docs", "public", "logo.png")
    favicon_path = os.path.join(project_root, "docs", "public", "favicon.ico")
    add_data_separator = ";" if os.name == "nt" else ":"

    command = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--windowed",
        "--name",
        INSTALLER_NAME,
        "--distpath",
        dist_dir,
        "--workpath",
        work_dir,
        "--specpath",
        spec_dir,
        "--paths",
        installer_dir,
        "--hidden-import",
        "core",
    ]

    if os.path.exists(favicon_path):
        command.extend(["--icon", favicon_path])

    if os.path.exists(logo_path):
        command.extend(["--add-data", f"{logo_path}{add_data_separator}docs/public"])

    command.append(gui_path)
    subprocess.run(command, cwd=project_root, check=True)


def create_package(project_root, output_dir, package_dir, version):
    os.makedirs(package_dir, exist_ok=True)

    exe_path = os.path.join(project_root, "build", "installer", "dist", f"{INSTALLER_NAME}.exe")
    if not os.path.exists(exe_path):
        raise FileNotFoundError(f"PyInstaller did not create {exe_path}")

    shutil.copy2(exe_path, os.path.join(package_dir, f"{INSTALLER_NAME}.exe"))

    for game_key in ("mv", "mz"):
        archive_path = get_release_archive_path(output_dir, game_key, version)
        shutil.copy2(archive_path, os.path.join(package_dir, os.path.basename(archive_path)))

    write_readme(package_dir, version)


def write_readme(package_dir, version):
    readme_path = os.path.join(package_dir, "README.txt")
    with open(readme_path, "w", encoding="utf-8") as wf:
        wf.write(
            f"RPG Maker MV/MZ Cheat UI Installer v{version}\n"
            "\n"
            "How to install:\n"
            "1. Run RPGMakerCheatInstaller.exe.\n"
            "2. Select your RPG Maker MV or MZ game folder.\n"
            "3. Click Install.\n"
            "\n"
            "Keep the MV/MZ .tar.gz files beside the EXE. The installer auto-selects\n"
            "the correct package based on the selected game engine.\n"
            "\n"
            "Uninstall restores the original-game backup when available. If no original\n"
            "backup exists, it disables the cheat loader while keeping the game bootable.\n"
        )


if __name__ == "__main__":
    main()
