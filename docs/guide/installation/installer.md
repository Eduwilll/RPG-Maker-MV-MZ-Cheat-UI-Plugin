# Installer

The installer is a helper for users who do not want to manually copy the `cheat/` and `js/` folders into an RPG Maker game.

::: tip Download
Grab `RPGMakerCheatInstaller-v*-windows.zip` from the [Releases page](https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/releases), extract it, and run the EXE — no repository clone needed. The rest of this page covers running it from source and the command line.
:::

It can:

- detect RPG Maker MV or MZ automatically
- install from the repository source tree
- install from a packaged release archive
- back up original game files touched by the first install
- back up the currently installed plugin before updates/reinstalls
- restore any selected backup
- uninstall by restoring the original-game backup, or by removing cheat files if no original backup exists
- optionally remove old `cheat-settings`
- show progress, persistent completion messages and actionable errors in a guided GUI

::: warning
Back up the game folder before installing. The installer also creates its own backup, but a full game backup is still the safest fallback.
:::

## Open the GUI installer

```powershell
py -3 tools\installer\gui.py
```

### Install in Three Steps

1. **Choose your game.** Use **Browse...**, paste the game folder, or paste the path to `Game.exe`. The installer automatically checks the selection and detects MV or MZ. `Ctrl+O` opens the folder picker; **Check** checks the current selection again.
2. **Review the result.** Check the game title, engine, installed version and detected release version. The installer finds the matching package beside the EXE. Keep both `.tar.gz` packages from the installer ZIP in that folder.
3. **Close the game and install.** Choose **Install plugin** or **Update / reinstall**, then confirm. Wait for **You're ready to play.** You can then open the game normally.

The main action stays at the bottom of the window while the content scrolls. File operations run one at a time, with a progress indicator and current phase. The installer prevents closing through its Close button while an operation is running. Completion and errors remain on screen, not only in a popup or log.

The default view is compact. Extra explanations are behind **Help** buttons: hover, focus, click or press `F1` to read them, and press `Esc` to dismiss them. Errors and important confirmations remain visible without opening help.

### Advanced Options

**Show advanced options** reveals an optional release package picker, displayed-version override and **Reset cheat preferences**.

Reset is **off by default**. It removes `cheat-settings`, including plugin preferences and translation cache, but not game saves. The confirmation explains when reset is enabled. A manually selected invalid package is reported rather than silently replaced with another source.

When run from a repository checkout, local source files remain a developer fallback if no matching archive is found. The packaged EXE needs the release packages; it does not use repository source files.

### Manage an Installation

Choose **Manage** in the sidebar to see original-file recovery information and dated backups. **Restore selected backup** uses the selected backup; **Uninstall plugin...** uses the original-game backup when available, regardless of the dropdown selection. Both require confirmation. Restoring/uninstalling resets cheat preferences, not game saves.

**Save editor** is available after game detection, even without an installation package. Editors are associated with their game, so switching games cannot silently reuse another game's save files.

The save editor has a narrow, resizable file list and separate **Party & actors** and **Inventory** sections. Actor fields wrap into a readable grid, and scrolling keeps every parameter reachable. **Info** shows file details without widening the list. One **Save changes** button remains at the bottom and writes the selected editing mode with a verified backup. Global/Config metadata opens in **Raw JSON**, not in the actor form.

### About And Credits

Choose **About** in the sidebar to see the installer version when available, project links and credits. **GitHub repository** and **Documentation** open in your default browser, and **Report an issue** opens the issue chooser. The page credits paramonos for the original plugin, sieucapoccho3717 for the translation idea, Justype for the Map Event Panel, and Eduwilll plus all contributors for maintenance and enhancements. It also links to the MIT license and lists the Python/Tkinter and Vue/Vuetify foundations.

### Troubleshooting

Open **Show activity log** for technical details. **Copy log** copies the current session; **Save log...** exports it to a local file. Check folder paths before sharing logs. Errors keep the current path and explain how to recover. After a file-operation error, use **Check** to refresh game status before retrying.

You can also preselect a game when launching from source:

```powershell
py -3 tools\installer\gui.py --game-path "C:\Games\MyGame"
```

There are two backup types:

- `original-game`: created once before the first clean install, used by uninstall.
- `plugin-version`: created before updating/reinstalling over an existing plugin, available under **Restore selected backup**.

## Check a game

```powershell
.venv\Scripts\python.exe tools\installer\cli.py status --game-path "C:\Games\MyGame"
```

The status command prints the detected engine, install root, current plugin version, and backup folder.

## Install from this repository

Use this while developing or testing from a local clone.

```powershell
.venv\Scripts\python.exe tools\installer\cli.py install --game-path "C:\Games\MyGame"
```

To force a clean plugin settings state:

```powershell
.venv\Scripts\python.exe tools\installer\cli.py install --game-path "C:\Games\MyGame" --clean-settings
```

## Install from a release archive

Use this when the installer is run beside a packaged release archive downloaded from the [Releases page](https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/releases).

```powershell
.venv\Scripts\python.exe tools\installer\cli.py install --game-path "C:\Games\MyGame" --archive "output\rpg-mv-cheat-1.3.1-core.tar.gz"
```

For MZ, pass the MZ archive instead:

```powershell
.venv\Scripts\python.exe tools\installer\cli.py install --game-path "C:\Games\MyGame" --archive "output\rpg-mz-cheat-1.3.1-core.tar.gz"
```

## Restore or uninstall

The installer stores backups under the detected game install root:

```text
cheat-installer-backups/
```

Uninstall from the command line:

```powershell
.venv\Scripts\python.exe tools\installer\cli.py uninstall --game-path "C:\Games\MyGame"
```

The uninstall command restores the original-game backup when one exists. If no original-game backup exists, it removes the installed cheat files but keeps a tiny disabled `cheat/init/import.js` loader. This prevents the already-patched `main.js` from crashing the game while keeping the cheat UI disabled.

Restore a specific backup manually:

```powershell
.venv\Scripts\python.exe tools\installer\cli.py uninstall --game-path "C:\Games\MyGame" --backup-path "C:\Games\MyGame\www\cheat-installer-backups\20260606-123000"
```

The GUI lists detected backups for manual restore, but uninstall does not use the selected backup. Uninstall only uses the `original-game` backup so it does not accidentally restore an older plugin version. Use Restore Old Plugin when you intentionally want a `plugin-version` rollback.

## Next step

## Build the Windows installer ZIP

Build MV/MZ release archives first:

```powershell
py -3 deploy\main.py --version 1.3.1
```

Install PyInstaller dependencies:

```powershell
py -3 -m pip install pyinstaller pillow
```

Build the portable Windows installer ZIP:

```powershell
py -3 tools\installer\build_windows.py --version 1.3.1
```

The output is:

```text
output/RPGMakerCheatInstaller-v1.3.1-windows.zip
```

The GitHub release workflow builds this ZIP automatically for version tags.
