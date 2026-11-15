# Sharing Settings Between Games

Each game stores its own cheat settings — shortcuts, speed multiplier, encounter toggle, translation config — in a folder called `cheat-settings`.

## Where settings are stored

| Engine | Path |
|--------|------|
| RPG Maker MV | `{game directory}/www/cheat-settings/` |
| RPG Maker MZ | `{game directory}/cheat-settings/` |

## Portable settings backup (recommended)

1. Open **Settings > Game Options** in the source game.
2. Use **Export File** under **Portable Settings Backup**.
3. Open the same panel in the destination game, then choose **Open File**.
4. Review the recognized changes and confirm **Apply**.

The profile contains supported appearance preferences, shortcut bindings, and only
the game options you explicitly changed through this panel. Unrelated game options
are not overwritten. Unsupported game-specific options are skipped with a summary.
Use **Exclude from Backup** to keep a current game-option value without transferring it.

::: tip
The importer validates JSON, versions, primitive values, ranges, and shortcut
conflicts. Review the preview before restoring a profile into a different game.
:::

## Game-local and save-local data

- Locks and favorites stay in this game's `cheat-settings/value-locks.json` and are
  deliberately excluded from portable profiles. Locks apply across save slots in
  that game; unlock them before loading a save if you do not want its values overridden.
- Enemy, skill, and class overrides are stored in ordinary game saves, not in
  profiles. Loading a different save or starting a new game resets those edits.
- Dialogue history is session-only and clears on new game/load.
- Translation banks, endpoint credentials, saved locations, and other unlisted
  settings are not included in portable profiles.

Copying the entire `cheat-settings` folder manually also copies game-specific IDs
and locks. Do not use that as a portable settings backup. Installer rollback
backups remain complete and serve a different purpose: recovering an installation.

## Resetting settings

If you run into errors after updating the plugin, deleting the `cheat-settings` folder fixes most of them. The folder will be recreated with defaults on next launch.

See [Troubleshooting](/guide/troubleshooting/troubleshooting) for more detail.
