# Updating NW.js

Some older RPG Maker games bundle an outdated version of NW.js that doesn't support ES6 JavaScript — which this plugin requires. If you get a syntax error on launch, this is almost always why.

## Do I need this?

You need this if:
- The game crashes immediately after installing the plugin
- You see an error like `Unexpected token` or `SyntaxError` in the console
- The game's bundled NW.js is older than **v0.26.4**

## How to update NW.js

### 1. Download NW.js

Go to [https://dl.nwjs.io/](https://dl.nwjs.io/) and download the latest stable release for your platform.

- If you want the in-game developer console, download the **SDK** build (e.g. `nwjs-sdk-v0.61.0-win-x64.zip`)
- Otherwise the normal build is fine

### 2. Extract NW.js

Unzip the downloaded archive anywhere on your computer. You'll get a folder like `nwjs-v0.61.0-win-x64/`.

### 3. Copy game files into NW.js folder

Copy these two items from your **game directory** into the extracted NW.js folder:

| What to copy | From | To |
|---|---|---|
| `www/` folder (MV) or entire game root (MZ) | Game directory | NW.js folder |
| `package.json` | Game directory | NW.js folder |

```
nwjs-v0.61.0-win-x64/
  nw.exe
  www/          ← copied from game (MV)
  package.json  ← copied from game
  ...
```

### 4. Run the game via NW.js

Instead of launching `Game.exe`, launch `nw.exe` from inside the NW.js folder.

::: warning If the game still doesn't work
If the game breaks even after updating NW.js, the game itself is likely incompatible with modern NW.js versions. In that case this plugin cannot be used. Try the [alternative plugin](https://github.com/emerladCoder/RPG-Maker-MV-Cheat-Menu-Plugin) instead.
:::
