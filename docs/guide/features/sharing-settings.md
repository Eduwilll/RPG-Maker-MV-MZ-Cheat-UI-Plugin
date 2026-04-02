# Sharing Settings Between Games

Each game stores its own cheat settings — shortcuts, speed multiplier, encounter toggle, translation config — in a folder called `cheat-settings`.

## Where settings are stored

| Engine | Path |
|--------|------|
| RPG Maker MV | `{game directory}/www/cheat-settings/` |
| RPG Maker MZ | `{game directory}/cheat-settings/` |

## Copying settings to another game

1. Find the `cheat-settings` folder in a game that already has your preferred settings
2. Copy the entire `cheat-settings/` folder
3. Paste it into the same relative location in the other game

That's it — the settings (shortcuts, speed, etc.) will be picked up automatically on next launch.

::: tip
This is useful when you install the plugin into multiple games and don't want to reconfigure shortcuts each time.
:::

## Resetting settings

If you run into errors after updating the plugin, deleting the `cheat-settings` folder fixes most of them. The folder will be recreated with defaults on next launch.

See [Troubleshooting](/guide/troubleshooting/troubleshooting) for more detail.
