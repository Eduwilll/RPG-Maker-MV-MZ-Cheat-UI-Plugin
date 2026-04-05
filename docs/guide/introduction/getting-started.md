# Getting Started

This guide helps you install the plugin, launch your game, and confirm that the cheat UI is working.

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
  <a class="doc-card" href="/RPG-Maker-MV-MZ-Cheat-UI-Plugin/guide/installation/install-mv">
    <strong>🗂️ RPG Maker MV</strong>
    <span>Copy the packaged files into the game's `www/` folder and replace `www/js/main.js`.</span>
  </a>
  <a class="doc-card" href="/RPG-Maker-MV-MZ-Cheat-UI-Plugin/guide/installation/install-mz">
    <strong>🗂️ RPG Maker MZ</strong>
    <span>Copy the packaged files into the game root and replace `js/main.js`.</span>
  </a>
</div>

## First launch checklist

After copying the plugin files into the correct location:

1. Start the game normally.
2. Press <kbd>Ctrl</kbd> + <kbd>C</kbd>.
3. Look in the upper-right corner for the cheat overlay.
4. Hover over the panel if it looks semi-transparent.

If the UI does not appear, continue to [Troubleshooting](/guide/troubleshooting/troubleshooting).

## What opens first

Once the overlay is visible, you can move through the main panels right away:

| Area | Use it for |
| --- | --- |
| General | Utility toggles, debug access, save helpers, and pop-out window mode |
| Stats | Party HP, MP, gold, speed, and related core values |
| Items | Items, weapons, and armors |
| Variables / Switches | Editing game logic values in real time |
| Map / Teleport | Position tools, no-clip, saved locations, and fast movement |
| Battle | Battle outcome controls and health or TP shortcuts |
| Translation | Endpoint setup, targets, and batch translation |
| Shortcuts | Rebinding actions to custom key combinations |

## Recommended next pages

- [Install on RPG Maker MV](/guide/installation/install-mv)
- [Install on RPG Maker MZ](/guide/installation/install-mz)
- [Feature Reference](/guide/features/features)
- [Shortcuts](/guide/features/shortcuts)
- [Translation Usage](/guide/translation/translation-usage)
