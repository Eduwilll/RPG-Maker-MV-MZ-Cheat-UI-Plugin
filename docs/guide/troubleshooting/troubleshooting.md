# Troubleshooting

## The game crashes immediately after installing

**Most likely cause:** The game's bundled NW.js is older than v0.26.4, which doesn't support the ES6 syntax used by this plugin.

**Fix:** Update NW.js manually. See the [Updating NW.js](/guide/installation/update-nwjs) guide.

If updating NW.js doesn't help, the game may be fundamentally incompatible. Try the [alternative plugin](https://github.com/emerladCoder/RPG-Maker-MV-Cheat-Menu-Plugin) instead.

---

## The cheat window doesn't appear

**Check 1 — Wrong key**: The default toggle is <kbd>`Ctrl`</kbd> + <kbd>`C`</kbd>. If you changed it, use your custom binding.

**Check 2 — Window is transparent**: The cheat window is semi-transparent when your mouse isn't hovering over it. Move your mouse to the **upper-right corner** of the game window and hover there.

**Check 3 — Wrong install path**: 
- MV: files must be in `{game}/www/`
- MZ: files must be in `{game}/` (root)

Double-check you used the right install guide for your engine version.

---

## Errors after updating the plugin

Settings saved by an older version of the plugin may be incompatible with the new one.

**Fix:** Delete the `cheat-settings` folder:

| Engine | Folder to delete |
|--------|-----------------|
| MV | `{game directory}/www/cheat-settings/` |
| MZ | `{game directory}/cheat-settings/` |

The folder will be recreated with clean defaults on next launch.

---

## God mode causes an error when loading a save

This is a known issue with earlier versions. After saving with god mode active, loading that save can trigger an error.

**Fix:** Disable god mode before saving. If you already have a broken save, delete `cheat-settings/` (see above) and reload.

---

## The game works but cheats don't take effect

Some games use obfuscated or heavily modified scripts that override the globals the plugin patches. There is no general fix for this — the plugin cannot be applied to such games.

---

## Still stuck?

Open an issue on the [GitHub repository](https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/issues) with:
- The game name and engine version (MV or MZ)
- What you did and what happened
- Any error messages from the developer console
