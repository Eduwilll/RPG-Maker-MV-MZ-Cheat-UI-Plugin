// @ts-check

/**
 * RPG Maker globals the separate cheat window reads through the game window.
 *
 * The pop-out runs in its own browser realm. Panels and runtime helpers refer
 * to these names as bare globals, so they must be bridged before any UI module
 * runs. Values are resolved live: RPG Maker replaces `$dataMap`, `$gameMap` and
 * similar objects during map loads, and a copied snapshot would go stale.
 *
 * Keep this list aligned with the engine declarations under `types/` and
 * `js/runtime/` users. Adding a global here is safer than relying on a local
 * `window.X` copy in one panel.
 */
export const RPG_MAKER_GLOBALS = Object.freeze([
  "$gameParty",
  "$gamePlayer",
  "$gameSystem",
  "$gameVariables",
  "$gameSwitches",
  "$gameSelfSwitches",
  "$gameTemp",
  "$gameActors",
  "$gameMap",
  "$gameTroop",
  "$gameMessage",
  "$gameTimer",
  "$gameEnemies",
  "$gameData",
  "SceneManager",
  "DataManager",
  "Utils",
  "ImageManager",
  "SoundManager",
  "TextManager",
  "Graphics",
  "Input",
  "TouchInput",
  "Game_Actor",
  "Game_Enemy",
  "Game_Message",
  "Game_Party",
  "Game_Variables",
  "Game_Switches",
  "Game_Timer",
  "Sprite_Enemy",
  "ConfigManager",
  "Window_Options",
  "Rectangle",
  "Scene_Base",
  "Scene_Map",
  "Scene_Battle",
  "Scene_Title",
  "Scene_Save",
  "Scene_Load",
  "Scene_Debug",
  "BattleManager",
  // Database
  "$dataActors",
  "$dataClasses",
  "$dataSkills",
  "$dataItems",
  "$dataWeapons",
  "$dataArmors",
  "$dataEnemies",
  "$dataTroops",
  "$dataStates",
  "$dataAnimations",
  "$dataTilesets",
  "$dataCommonEvents",
  "$dataSystem",
  "$dataMapInfos",
  "$dataMap",
]);

/**
 * Result of bridging one global.
 *
 * - `live`: a getter/setter forwards reads and writes to the source window.
 * - `copy`: the definition was rejected, so the current value was copied once.
 * - `skipped`: the definition was rejected and the source had no value yet.
 *
 * @typedef {"live" | "copy" | "skipped"} BridgeOutcome
 */

/**
 * Bridge one global from `source` onto `target`.
 *
 * The source is read on every access, so a global that is still `undefined`
 * during startup becomes available as soon as the game creates it.
 *
 * @param {any} target window that receives the property
 * @param {any} source window that owns the value
 * @param {string} name global name
 * @returns {BridgeOutcome}
 */
export function bridgeGlobal(target, source, name) {
  try {
    Object.defineProperty(target, name, {
      configurable: true,
      enumerable: true,
      get() {
        return source[name];
      },
      set(value) {
        source[name] = value;
      },
    });
    return "live";
  } catch (error) {
    if (source[name]) {
      target[name] = source[name];
      return "copy";
    }
    return "skipped";
  }
}

/**
 * Bridge every known RPG Maker global onto the pop-out window.
 *
 * @param {any} target window that receives the properties
 * @param {any} source game window that owns the values
 * @param {readonly string[]} [names] override for tests or future engines
 * @returns {{ live: number, copy: number, skipped: number }} per-outcome counts
 */
export function bridgeGlobals(target, source, names = RPG_MAKER_GLOBALS) {
  const counts = { live: 0, copy: 0, skipped: 0 };
  for (const name of names) {
    counts[bridgeGlobal(target, source, name)] += 1;
  }
  return counts;
}
