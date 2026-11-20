# Plugin Compatibility & Manual Install

RPG Maker games often run dozens of plugins. The cheat UI does not replace the
plugin system or take over the game's menus. It reads and writes the same
`$game*` and `$data*` objects the engine exposes, so most plugins keep working
alongside it.

A few plugins change how the game boots or draw their own interface. Those need
extra attention. This page explains what the installer handles, the one manual
step FOSSIL games need, and which plugin families are tested.

::: tip Short version

Use the automatic installer when you can. For a manual **MZ + FOSSIL** install,
add one `<script>` tag to both `index.html` and `FOSSILindex.html`.

:::

## How the cheat hooks into a game

The cheat has two entry points:

- **MV** replaces `www/js/main.js` with a loader that imports
  `cheat/init/import.js`.
- **MZ** replaces `js/main.js` and adds the same import to `index.html`
  immediately before the `js/main.js` script tag.
- **MZ + FOSSIL** also needs that tag in `FOSSILindex.html`, because FOSSIL boots
  that file instead of `js/main.js`.

The game's `plugins.js` is never rewritten. Plugin order, parameters and
third-party scripts stay exactly as the game shipped them.

## Automatic vs manual install

| Install path | What is handled for you |
| --- | --- |
| **Windows installer** | Detects MV or MZ, copies the cheat files, replaces `main.js`, and patches the MZ HTML entry points, including an existing `FOSSILindex.html`. |
| **Manual MV** | Copy `js/` and `cheat/` into `www/` and replace `www/js/main.js`. No HTML edit is needed. |
| **Manual MZ** | Copy `js/` and `cheat/` into the game root, replace `js/main.js`, and add the import tag to `index.html`. |
| **Manual MZ + FOSSIL** | Do the manual MZ steps, then add the same tag to `FOSSILindex.html` as well. |

The automatic installer backs up the original files first, so you can
[restore or uninstall](/guide/installation/installer#restore-or-uninstall) later.
For manual installs, back up `main.js` yourself.

## FOSSIL games (MZ)

[FOSSIL](https://github.com/FossilMZ/fossil-MV-MZ) is an interoperability layer
that lets MV plugins run on RPG Maker MZ. Instead of booting `js/main.js`, it creates
and loads `FOSSILindex.html`, which loads `js/plugins/FOSSIL.js`.

A `main.js`-only install therefore never runs. The usual symptoms are:

- the cheat never appears, even after <kbd>Ctrl</kbd> + <kbd>C</kbd>;
- there is no `cheat-settings/` folder in the game root;
- the developer console has no `[Cheat]` startup lines.

### Manual FOSSIL install

Install the normal MZ files first, then edit both HTML entry points. The tag must
come **immediately before** the script that starts the game.

**`{game directory}/index.html`**

```html
<script type="text/javascript" src="cheat/init/import.js"></script>
<script type="text/javascript" src="js/main.js"></script>
```

**`{game directory}/FOSSILindex.html`**

```html
<script type="text/javascript" src="cheat/init/import.js"></script>
<script type="text/javascript" src="js/plugins/FOSSIL.js"></script>
```

If your `FOSSILindex.html` uses a different path for the FOSSIL script, keep the
cheat tag directly above that script instead.

### Why both files

FOSSIL regenerates `FOSSILindex.html` from `index.html` on boot. Keeping the tag
in `index.html` means the import survives that regeneration, even if
`FOSSILindex.html` is deleted. Patching an existing `FOSSILindex.html` covers
games that launch that file directly.

### Verify

1. Launch the game and press <kbd>Ctrl</kbd> + <kbd>C</kbd>.
2. Open **Settings > About** and confirm the engine reads **MZ**.
3. Check that `{game directory}/cheat-settings/` was created after changing a
   setting.

If the overlay still does not load, confirm that both files contain exactly one
`cheat/init/import.js` tag and that `cheat/init/import.js` exists in the game
root. See [Troubleshooting](/guide/troubleshooting/troubleshooting) for the other
startup checks.

## Compatibility at a glance

These statuses describe the **cheat UI**, not every feature of the plugin.

| Status | Meaning |
| --- | --- |
| **Integrated** | The installer has dedicated handling for this plugin. |
| **Tested** | The plugin family ships in a bundled test game; the game boots and the overlay and core panels are exercised. |
| **Expected** | Follows the normal engine APIs but is not in the bundled test set yet. Test it in your game and report problems. |
| **Limited** | The plugin keeps working, but its custom UI or data is outside the cheat panels. |
| **Unsupported** | The game replaces or obfuscates the engine scripts the cheat needs. |

| Plugin / family | Engine | Status | Notes |
| --- | --- | --- | --- |
| **FOSSIL** | MZ | Integrated | Installer patches `index.html` and an existing `FOSSILindex.html`; manual installs add the tag to both. |
| **Yanfly Engine Plugins (YEP)** | MV, MZ via FOSSIL | Tested | Core Engine, Message Core, Battle Engine, Save Core, Item Core, Gab Window and related plugins are used by the bundled MV test games. |
| **VisuStella** | MZ | Tested | The MZ FOSSIL test game runs Core, Options, Items/Equips, Battle, Main Menu, Skills/States, Message, Frontview UI and Combat Log. VisuStella's own menus stay in charge of their windows. |
| **MOG Hunter** | MV, MZ | Tested | Battle transitions, menu cursor/particles, weather, treasure popup and battler motion run alongside the overlay. Visual effects are not recreated in the minimap. |
| **GALV** | MV, MZ | Tested | Bust menus, message busts, image cache, event spawner, layer graphics, pixel move, visibility and action indicators are exercised. |
| **SRD / SumRndmDde** | MV, MZ | Tested | Super Tools, HUD Maker, name box, menu backgrounds, battle status and timed-attack plugins are exercised. HUD Maker widgets are plugin-drawn and cannot be edited from cheat panels. |
| **HIME** | MV, MZ | Tested | Menu music, pre-title events, choice controls, followers and state/battle helpers are exercised. |
| **Victor Engine (VE)** | MV | Tested | Basic Module, Command Replace, Diagonal Movement and Fog and Overlay are exercised. |
| **Olivia** | MV | Tested | OctoBattle, MetaControls, HorrorEffects and AntiPlayerStress are exercised. |
| **CGMZ (Casper Gaming)** | MZ | Tested | Core, quests, crafting, save file, fast travel, world map and encyclopedia are exercised in the MZ FOSSIL test game. |
| **Eli / Hakuen Studio** | MV, MZ | Tested | Eli book/button plugins and the MZ camera, character and choice helpers are exercised. |
| **PKD** | MV, MZ | Tested | Mobile controls, simple fishing and pocket events are exercised. |
| **Terrax / MVNova / UMC lighting** | MV, MZ | Tested (visual) | Lighting and fog load normally. The minimap renders tiles and characters, not plugin lighting, weather or screen effects. |
| **FilterController** | MV, MZ | Tested | Screen filters run normally; the overlay draws independently of the game canvas. |
| **Mano_InputConfig** | MZ | Tested | Input rebinding and mouse/touch behavior are exercised in the MZ test game. |
| **MUSH Audio Engine** | MZ | Tested | Loads and plays alongside the cheat in the MZ test game. |
| **PluginCommonBase** | MZ | Tested | Required by many MZ plugins; loads with the cheat and the rest of the plugin list. |
| **OrangeGreenworks / Steamworks** | MV, MZ | Tested | Steam integration loads normally. The cheat does not change achievements or Steam state. |
| **Triacontane** | MZ | Expected | Popular MZ plugin family, but not yet part of the bundled test set. |
| **Luna Engine** | MV | Expected | Custom menu framework; test menu and save flows in the actual game. |
| **Custom menu/HUD plugins** | MV, MZ | Limited | Plugin-drawn windows and HUD widgets stay under the plugin's control and cannot be edited from the cheat. |
| **Obfuscated or engine-replacing games** | MV, MZ | Unsupported | If the game replaces the globals the cheat patches, there is no general fix. |

The bundled test games cover more than 200 unique plugin names, including
Yanfly, VisuStella, MOG, GALV, SRD, HIME, Victor Engine, Olivia, CGMZ, Eli, PKD
and FOSSIL. A plugin appearing in that set means the game and overlay were
exercised together, not that every plugin feature has a dedicated cheat control.

## What the cheat can see

| Game data | Behavior |
| --- | --- |
| Actors, items, weapons, armors, skills, classes, enemies, troops, states | Standard `$data*` records can be inspected and edited from the database panels. |
| Gold, HP/MP/TP, EXP, level, parameters | Read and written on the live game objects. |
| Switches, variables, self switches | Read and written from their panels and the Watcher. |
| Plugin-specific currencies, gauges or derived stats | Not shown in dedicated panels unless the plugin stores them in standard engine fields. Some changes may need a save/reload before the plugin recalculates them. |
| Plugin-drawn menus, HUDs and windows | The plugin keeps rendering them. The cheat cannot click or edit those controls for you. |
| Plugin message escape codes | The Message Log shows the readable text and does not execute plugin escape evaluators a second time. Unknown custom codes stay visible. |
| Complex plugin options | Read-only in **Settings > Game Options**; standard options still work. |
| Plugin lighting, fog, weather and pictures | Not baked into the Map / Minimap artwork. The actual game rendering is untouched. |

### After editing database records

Database edits are stored by the cheat and applied to the running game. The
game's original `data/*.json` files are never written. A plugin that caches a
value at boot may keep using the old value until it recalculates or the save is
reloaded.

Third-party battle systems can also change how troops are rendered or started.
If **Start Troop** reports an unsupported renderer, the normal battle tools still
work inside a battle the game started itself.

## Check your plugin list

If a game misbehaves, the plugin list is the first thing to capture:

| Engine | Plugin list |
| --- | --- |
| MV | `{game directory}/www/js/plugins.js` |
| MZ | `{game directory}/js/plugins.js` |

FOSSIL games also have a `FOSSILindex.html` in the game root and a `FOSSIL` entry
near the top of `plugins.js`.

When [reporting an issue](https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/issues/new?template=bug_report.yml),
include the game title, engine, whether the game uses FOSSIL, whether you used
the installer or a manual copy, the failing panel or action, and any console
errors or `[Cheat]` lines.
