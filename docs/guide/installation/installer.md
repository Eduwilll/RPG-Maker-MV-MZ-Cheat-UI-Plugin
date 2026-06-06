# Installer

The installer is a helper for users who do not want to manually copy the `cheat/` and `js/` folders into an RPG Maker game.

It can:

- detect RPG Maker MV or MZ automatically
- install from the repository source tree
- install from a packaged release archive
- back up original game files touched by the first install
- back up the currently installed plugin before updates/reinstalls
- restore any selected backup
- uninstall by restoring the original-game backup, or by removing cheat files if no original backup exists
- optionally remove old `cheat-settings`
- show install and restore progress in a simple GUI

::: warning
Back up the game folder before installing. The installer also creates its own backup, but a full game backup is still the safest fallback.
:::

## Open the GUI installer

```powershell
py -3 tools\installer\gui.py
```

The GUI provides:

- Browse button for the game folder
- optional release archive picker
- optional version override
- clean settings toggle
- install button
- restore old plugin button that reveals the backup list
- uninstall cheat button
- status and log panels

The GUI shows a completion popup after install, restore, or uninstall. The log remains available for troubleshooting.
The backup list is hidden during normal install flow and only appears for manual rollback/uninstall workflows.

There are two backup types:

- `original-game`: created once before the first clean install, used by uninstall.
- `plugin-version`: created before updating/reinstalling over an existing plugin, used by Restore Old Plugin.

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

Use this when the installer is run beside a packaged release archive.

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
