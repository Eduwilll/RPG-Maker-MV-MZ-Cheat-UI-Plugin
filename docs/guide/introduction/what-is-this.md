# What is this?

**RPG Maker MV/MZ Cheat UI Plugin** is a GUI-based cheat overlay that injects into any RPG Maker MV or MZ game. Press a hotkey and a floating panel appears in the corner of the game window — no external trainers, no memory editors, no alt-tabbing.

## Why use this instead of a trainer?

Generic game trainers work by scanning and patching memory, which means they break on every game update and require running external software with elevated privileges. This plugin instead hooks into the game's own JavaScript runtime, giving you direct access to the game's internal data — reliably, for any MV/MZ title.

## How it works

RPG Maker MV and MZ games are built on [NW.js](https://nwjs.io/) (a Node + Chromium shell) and run entirely in JavaScript. The plugin patches the game's `main.js` entry point to load a lightweight cheat engine alongside the game. The cheat UI is a floating HTML panel rendered inside the game's own window.

Because the plugin runs inside the game process, it has full access to `$gameParty`, `$gameSwitches`, `$gameVariables`, `$gameMap`, and all other RPG Maker globals — no memory scanning required.

## Compatibility

| Engine | Status |
|--------|--------|
| RPG Maker MV | ✅ Fully supported |
| RPG Maker MZ | ✅ Fully supported |
| RPG Maker XP / VX / VX Ace | ❌ Not supported |

::: tip
The game must be the PC (NW.js) version. Browser or mobile builds of RPG Maker games are not supported.
:::

## License

Released under the [MIT License](/guide/meta/license). Originally created by [paramonos](https://github.com/paramonos). This fork is maintained by [Eduwilll](https://github.com/Eduwilll).
