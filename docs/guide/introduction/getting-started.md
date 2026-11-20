# Getting Started

This guide helps you install the plugin, launch your game, and confirm that the cheat UI is working.

## Download the plugin

Get the files from the [Releases page](https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/releases):

- **Recommended:** `RPGMakerCheatInstaller-v*-windows.zip` — extract, run the EXE, pick your game folder, click Install.
- **Manual install:** `rpg-mv-cheat-*-core.tar.gz` (MV) or `rpg-mz-cheat-*-core.tar.gz` (MZ) — copy the files yourself (see below).

## Before you install

- Use a desktop RPG Maker MV or MZ game that runs through NW.js.
- Make sure you can copy files into the game folder.
- Back up the original `main.js` before replacing anything.

::: warning Back up your game first
The plugin replaces `www/js/main.js` on MV and `js/main.js` on MZ. Keep a clean backup so you can revert quickly if needed.
:::

::: tip For contributors
If you want to modify the UI or work on the project itself, start with [Development & Test](/guide/introduction/development) after installation.
:::

## Choose your engine

Use the installation guide that matches the game you want to patch:

<div class="doc-card-grid">
  <a class="doc-card" href="/RPG-Maker-MV-MZ-Cheat-UI-Plugin/guide/installation/installer">
    <strong>Installer</strong>
    <span>Detect the game, back up `main.js`, and copy the plugin files with one command.</span>
  </a>
  <a class="doc-card" href="/RPG-Maker-MV-MZ-Cheat-UI-Plugin/guide/installation/install-mv">
    <strong>🗂️ RPG Maker MV</strong>
    <span>Copy the packaged files into the game's `www/` folder and replace `www/js/main.js`.</span>
  </a>
  <a class="doc-card" href="/RPG-Maker-MV-MZ-Cheat-UI-Plugin/guide/installation/install-mz">
    <strong>🗂️ RPG Maker MZ</strong>
    <span>Copy the packaged files into the game root and replace `js/main.js`.</span>
  </a>
</div>

If the game uses FOSSIL or a large plugin suite, read
[Plugin Compatibility](/guide/plugins/compatibility) before installing. It lists
the tested plugin families, the manual FOSSIL entry-point steps and known limits.

## First launch checklist

After copying the plugin files into the correct location:

1. Start the game normally.
2. Press <kbd>Ctrl</kbd> + <kbd>C</kbd>.
3. Look in the upper-right corner for the cheat overlay.
4. Hover over the panel if it looks semi-transparent.

If the UI does not appear, continue to [Troubleshooting](/guide/troubleshooting/troubleshooting).

## What you can open

Once the overlay is visible, these sidebar groups are available:

| Group | Panels |
| --- | --- |
| Play | General, HP/MP/Battle, Stats/Level, Actors, Items, Variables, Switches, Enemies, Skills, Classes |
| World | Map / Minimap, Teleport, Save Locations, Message Log, Event Analyzer, Watch |
| Tools | Shortcuts, Locks & Favorites |
| System | Settings: Game Options, Appearance, Translate, About |

## Recommended next pages

- [Installer](/guide/installation/installer)
- [Install on RPG Maker MV](/guide/installation/install-mv)
- [Install on RPG Maker MZ](/guide/installation/install-mz)
- [Plugin Compatibility](/guide/plugins/compatibility)
- [Feature Reference](/guide/features/features)
- [Shortcuts](/guide/features/shortcuts)
- [Translation Usage](/guide/translation/translation-usage)
