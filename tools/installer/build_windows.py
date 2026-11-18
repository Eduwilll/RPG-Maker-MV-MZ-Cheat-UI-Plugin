import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
import zipfile


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
    """Find versioned Tcl and Tk library directories for bundling with PyInstaller.
    Returns (tcl_path, tk_path) if versioned directories exist, otherwise (None, None).
    """
    import sysconfig

    stdlib_path = sysconfig.get_path("stdlib")
    tcl_base = os.path.join(os.path.dirname(stdlib_path), "tcl")
    return find_versioned_tcl_tk(tcl_base)


def find_versioned_tcl_tk(tcl_base):
    """Return versioned Tcl/Tk script directories from a Python installation."""
    if not os.path.isdir(tcl_base):
        return None, None
    for name in sorted(os.listdir(tcl_base)):
        version = name[3:]
        if not name.startswith("tcl") or not version or not version[0].isdigit():
            continue
        tcl_path = os.path.join(tcl_base, name)
        tk_path = os.path.join(tcl_base, f"tk{version}")
        if is_tcl_data_dir(tcl_path) and is_tk_data_dir(tk_path):
            return tcl_path, tk_path
    return None, None


def is_tcl_data_dir(path):
    return bool(path) and os.path.isfile(os.path.join(path, "init.tcl"))


def is_tk_data_dir(path):
    return bool(path) and os.path.isfile(os.path.join(path, "tk.tcl"))


def find_tcl_tk_zips():
    """Find the Tcl/Tk 9 data archives shipped by Python 3.14+ on Windows."""
    import sysconfig

    stdlib_path = sysconfig.get_path("stdlib")
    tcl_base = os.path.join(os.path.dirname(stdlib_path), "tcl")
    tcl_zips = sorted(glob.glob(os.path.join(tcl_base, "libtcl*.zip")))
    tk_zips = sorted(glob.glob(os.path.join(tcl_base, "libtk*.zip")))
    return (tcl_zips[-1] if tcl_zips else None, tk_zips[-1] if tk_zips else None)


def prepare_tcl_tk_data(staging_dir):
    """Return Tcl/Tk script directories, extracting Python 3.14+ zip data if needed."""
    tcl_path, tk_path = get_tcl_tk_paths()
    if tcl_path and tk_path:
        return tcl_path, tk_path

    tcl_zip, tk_zip = find_tcl_tk_zips()
    if tcl_zip and tk_zip:
        tcl_path = extract_zip_library(tcl_zip, "tcl_library", os.path.join(staging_dir, "_tcl_data"))
        tk_path = extract_zip_library(tk_zip, "tk_library", os.path.join(staging_dir, "_tk_data"))
        return tcl_path, tk_path

    raise RuntimeError(
        "Could not find the Tcl/Tk script libraries needed by the installer. "
        "Install a Python build with Tcl/Tk support or check the tcl folder next to "
        f"{sys.executable}."
    )


def extract_zip_library(zip_path, member_prefix, destination):
    """Extract one Tcl/Tk library from a Python 3.14+ data archive."""
    root = os.path.abspath(destination)
    os.makedirs(root, exist_ok=True)
    prefix = member_prefix.rstrip("/") + "/"
    written = 0
    with zipfile.ZipFile(zip_path) as archive:
        for member in archive.infolist():
            if not member.filename.startswith(prefix) or member.is_dir():
                continue
            relative = member.filename[len(prefix):]
            target = os.path.abspath(os.path.join(root, *relative.split("/")))
            if os.path.commonpath([root, target]) != root:
                raise RuntimeError(f"Unsafe path in {zip_path}: {member.filename}")
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with archive.open(member) as source, open(target, "wb") as output:
                shutil.copyfileobj(source, output)
            written += 1
    if not written:
        raise RuntimeError(f"{zip_path} does not contain {member_prefix}/")
    return root


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
    # Bundle them explicitly because Python 3.14+ on Windows ships Tcl/Tk 9 as
    # zip archives that PyInstaller's automatic collection cannot read.
    build_root = os.path.join(project_root, "build", "installer")
    staging_dir = os.path.join(build_root, "tcl_data")
    tcl_path, tk_path = prepare_tcl_tk_data(staging_dir)

    # Prepare staging directories with library contents (not the tcl8.6/tk8.6 wrapper dirs)
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
    verify_onefile_tcl_data(os.path.join(dist_dir, f"{INSTALLER_NAME}.exe"))


def verify_onefile_tcl_data(exe_path):
    """Fail the build when PyInstaller did not bundle Tcl/Tk scripts."""
    from PyInstaller.archive.readers import CArchiveReader

    reader = CArchiveReader(exe_path)
    try:
        names = {name.replace("\\", "/") for name in reader.toc}
    finally:
        close = getattr(reader, "close", None)
        if close:
            close()

    required = ("_tcl_data/init.tcl", "_tk_data/tk.tcl")
    missing = [name for name in required if name not in names]
    if missing:
        raise RuntimeError(
            "PyInstaller build is missing bundled Tcl/Tk data: "
            + ", ".join(missing)
            + ". The installer would fail at startup."
        )


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
