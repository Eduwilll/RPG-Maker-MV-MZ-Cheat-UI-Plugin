# Installing on RPG Maker MZ

MZ has a slightly different folder structure than MV — the game data lives at the **root level** rather than inside a `www/` subfolder.

## Step 1 — Unpack the game (if needed)

If the game's assets are encrypted, decrypt them first before proceeding.

## Step 2 — Download the plugin

Go to the [Releases page](https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/releases) and download the latest `rpg-mz-cheat-{version}-core.tar.gz`. Extract it anywhere.

## Step 3 — Back up `main.js`

The plugin replaces `main.js` in the `js/` folder at the **game root**:

```
{game directory}/
  js/
    main.js   ← copy this somewhere safe
```

## Step 4 — Copy plugin files

Copy the extracted `js/` and `cheat/` folders directly into `{game directory}/` (the game root), overwriting when prompted.

```
{game directory}/        ← copy here (not www/)
  js/
    main.js              ← replaced by plugin
    plugins.js
    ...
  cheat/                 ← new folder from plugin
  audio/
  data/
  img/
  ...
```

::: warning MZ vs MV difference
MV: copy into `{game}/www/`  
MZ: copy into `{game}/` (root)

Getting this wrong is the most common install mistake.
:::

## Step 5 — Launch and verify

Run the game executable. Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to open the cheat window in the upper-right corner.

## Troubleshooting

See the [Troubleshooting guide](/guide/troubleshooting/troubleshooting) if the game crashes or nothing happens. Check the [Updating nwjs](/guide/installation/update-nwjs) page if you get a JavaScript error about unsupported syntax.
