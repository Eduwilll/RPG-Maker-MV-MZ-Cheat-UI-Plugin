# Installer

The installer is a command-line helper for users who do not want to manually copy the `cheat/` and `js/` folders into an RPG Maker game.

It can:

- detect RPG Maker MV or MZ automatically
- install from the repository source tree
- install from a packaged release archive
- back up the original `main.js`
- restore the latest backup
- optionally remove old `cheat-settings`

::: warning
Back up the game folder before installing. The installer also creates its own backup, but a full game backup is still the safest fallback.
:::

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

## Restore backup

The installer stores backups under the detected game install root:

```text
cheat-installer-backups/
```

Restore the newest backup:

```powershell
.venv\Scripts\python.exe tools\installer\cli.py uninstall --game-path "C:\Games\MyGame"
```

Restore a specific backup:

```powershell
.venv\Scripts\python.exe tools\installer\cli.py uninstall --game-path "C:\Games\MyGame" --backup-path "C:\Games\MyGame\www\cheat-installer-backups\20260606-123000"
```

## Next step

This CLI is the reusable base for a future Windows GUI installer. The GUI can call the same installer core while providing a Browse button, install summary, clean settings toggle, and restore button.
