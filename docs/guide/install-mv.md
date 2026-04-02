# Installing on RPG Maker MV

## Step 1 — Unpack the game (if needed)

Some MV games ship with encrypted assets (`.rpgmvp`, `.rpgmvm`, `.rpgmvo` files). If your game is encrypted, you need to decrypt it first using a tool like [RPG Maker Decrypter](https://github.com/uukrul/RPG-Maker-MV-Decrypter) before proceeding.

If the game files are already plaintext, skip this step.

## Step 2 — Download the plugin

Go to the [Releases page](https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/releases) and download the latest `rpg-mv-cheat-{version}-core.tar.gz`. Extract it anywhere.

## Step 3 — Back up `main.js`

The plugin replaces `main.js`. Before copying anything, make a backup:

```
{game directory}/
  www/
    js/
      main.js   ← copy this somewhere safe
```

## Step 4 — Copy plugin files

Copy the extracted `js/` and `cheat/` folders into `{game directory}/www/`, overwriting existing files when prompted.

Your final structure should look like this:

```
{game directory}/
  www/
    js/
      main.js         ← replaced by plugin
      plugins.js
      ...
    cheat/            ← new folder from plugin
      ...
    audio/
    data/
    img/
    ...
```

## Step 5 — Launch and verify

Run the game executable (`Game.exe` or similar). Press <kbd>Ctrl</kbd> + <kbd>C</kbd> — the cheat panel should appear in the **upper-right corner** of the game window.

::: tip Cheat window not visible?
It starts semi-transparent. Hover your mouse over the upper-right corner of the game window to make it appear fully.
:::

## Troubleshooting

If the game crashes or the cheat doesn't load, see the [Troubleshooting guide](/guide/troubleshooting). The most common cause is an outdated NW.js version bundled with the game — see [Updating nwjs](/guide/update-nwjs).
