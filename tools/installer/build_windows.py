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


def get_tcl_tk_paths():
    """Find Tcl and Tk library directories for bundling with PyInstaller."""
    import sysconfig

    stdlib_path = sysconfig.get_path("stdlib")
    tcl_base = os.path.join(os.path.dirname(stdlib_path), "tcl")

    tcl_path = os.path.join(tcl_base, "tcl8.6")
    tk_path = os.path.join(tcl_base, "tk8.6")

    if not os.path.isdir(tcl_path):
        tcl_path = None
    if not os.path.isdir(tk_path):
        tk_path = None

    return tcl_path, tk_path


def prepare_tcl_tk_for_bundling(tcl_path, tk_path, build_root):
    """
    Prepare Tcl/Tk directories for PyInstaller --add-data.
    PyInstaller's tkinter hook expects the library files directly in _tcl_data/_tk_data,
    not inside a tcl8.6/tk8.6 subdirectory. Copy contents to staging directories.
    """
    import shutil

    staging_tcl = os.path.join(build_root, "_tcl_data")
    staging_tk = os.path.join(build_root, "_tk_data")

    if tcl_path and os.path.isdir(tcl_path):
        if os.path.exists(staging_tcl):
            shutil.rmtree(staging_tcl)
        shutil.copytree(tcl_path, staging_tcl)

    if tk_path and os.path.isdir(tk_path):
        if os.path.exists(staging_tk):
            shutil.rmtree(staging_tk)
        shutil.copytree(tk_path, staging_tk)

    return staging_tcl if os.path.isdir(staging_tcl) else None, \
           staging_tk if os.path.isdir(staging_tk) else None


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

    # PyInstaller's tkinter runtime hook looks for these exact directory names.
    # Bundle them explicitly so --onefile builds still start when automatic
    # Tcl/Tk collection is unavailable.
    tcl_path, tk_path = get_tcl_tk_paths()

    # Prepare staging directories with library contents (not the tcl8.6/tk8.6 wrapper dirs)
    build_root = os.path.join(project_root, "build", "installer")
    staging_tcl, staging_tk = prepare_tcl_tk_for_bundling(tcl_path, tk_path, build_root)

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
        "--hidden-import",
        "save_editor",
        "--hidden-import",
        "installer_ui",
        "--hidden-import",
        "presentation",
        "--hidden-import",
        "ui_theme",
        "--hidden-import",
        "save_editor_view",
    ]

    # PyInstaller 6.x mounts these as _tcl_data/_tk_data in the onefile bundle.
    # The staging directories contain the library files directly (init.tcl, etc.)
    if staging_tcl:
        command.extend(["--add-data", f"{staging_tcl}{add_data_separator}_tcl_data"])
    if staging_tk:
        command.extend(["--add-data", f"{staging_tk}{add_data_separator}_tk_data"])

    # Add runtime hook to set TCL_LIBRARY and TK_LIBRARY at startup
    runtime_hook_path = os.path.join(installer_dir, "pyi_rth_tkinter_fix.py")
    if not os.path.exists(runtime_hook_path):
        create_runtime_hook(runtime_hook_path)
    command.extend(["--runtime-hook", runtime_hook_path])

    if os.path.exists(favicon_path):
        command.extend(["--icon", favicon_path])

    if os.path.exists(logo_path):
        command.extend(["--add-data", f"{logo_path}{add_data_separator}docs/public"])

    command.append(gui_path)
    subprocess.run(command, cwd=project_root, check=True)


def create_runtime_hook(runtime_hook_path):
    """Create a PyInstaller runtime hook to set TCL_LIBRARY and TK_LIBRARY."""
    hook_content = '''import os
import sys

# When running in PyInstaller's --onefile mode, the bundled Tcl/Tk data
# directories are extracted to sys._MEIPASS. Set TCL_LIBRARY and TK_LIBRARY
# to the names used by PyInstaller's own tkinter runtime hook.

if hasattr(sys, '_MEIPASS'):
    meipass = sys._MEIPASS
    tcl_lib = os.path.join(meipass, '_tcl_data')
    tk_lib = os.path.join(meipass, '_tk_data')

    if os.path.isdir(tcl_lib):
        os.environ['TCL_LIBRARY'] = tcl_lib
    if os.path.isdir(tk_lib):
        os.environ['TK_LIBRARY'] = tk_lib
'''
    with open(runtime_hook_path, 'w', encoding='utf-8') as f:
        f.write(hook_content)


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
            "3. Review the detected game and package, then close the game.\n"
            "4. Click Install plugin (or Update / reinstall) and confirm.\n"
            "5. Wait for the completion message, then open the game normally.\n"
            "\n"
            "Keep the MV/MZ .tar.gz files beside the EXE. The installer auto-selects\n"
            "the correct package based on the selected game engine.\n"
            "\n"
            "Uninstall restores the original-game backup when available. If no original\n"
            "backup exists, it disables the cheat loader while keeping the game bootable.\n"
            "Backups and uninstall are under Manage installation. Advanced options are\n"
            "optional; cheat preferences are preserved unless you choose to reset them.\n"
            "For troubleshooting, open Activity and copy or save the log.\n"
        )


if __name__ == "__main__":
    main()
