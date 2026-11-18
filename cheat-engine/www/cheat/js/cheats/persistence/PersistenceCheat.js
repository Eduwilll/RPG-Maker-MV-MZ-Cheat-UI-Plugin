// @ts-check

import { Alert } from "../../AlertHelper.js";

/**
 * PersistenceCheat - owns the force-save seam.
 *
 * Patches `Game_System`, `Window_MenuCommand`, `Scene_Menu` and `$gameSystem`
 * so saves stay available on any map. The menu command list patch is installed
 * once and guarded by the live force-save flag, matching the released
 * behaviour.
 */

/**
 * @typedef {Object} PersistenceGlobals
 * @property {() => any} getGameSystemPrototype
 * @property {() => any} getWindowMenuCommand
 * @property {() => any} getSceneMenu
 * @property {() => any} getGameSystem
 * @property {() => any} getSceneManager
 * @property {() => any} getSceneSave
 * @property {() => any} getTextManager
 * @property {() => any} getAlert
 */

/** @returns {PersistenceGlobals} */
function liveGlobals() {
  return {
    // eslint-disable-next-line no-undef
    getGameSystemPrototype: () =>
      typeof Game_System === "undefined" ? null : Game_System.prototype,
    // eslint-disable-next-line no-undef
    getWindowMenuCommand: () =>
      typeof Window_MenuCommand === "undefined" ? null : Window_MenuCommand,
    // eslint-disable-next-line no-undef
    getSceneMenu: () => (typeof Scene_Menu === "undefined" ? null : Scene_Menu),
    // eslint-disable-next-line no-undef
    getGameSystem: () =>
      typeof $gameSystem === "undefined" ? null : $gameSystem,
    // eslint-disable-next-line no-undef
    getSceneManager: () =>
      typeof SceneManager === "undefined" ? null : SceneManager,
    // eslint-disable-next-line no-undef
    getSceneSave: () => (typeof Scene_Save === "undefined" ? null : Scene_Save),
    // eslint-disable-next-line no-undef
    getTextManager: () =>
      typeof TextManager === "undefined" ? null : TextManager,
    getAlert: () => Alert,
  };
}

/**
 * @param {Partial<PersistenceGlobals>} [overrides]
 * @returns {Object} Persistence cheat module
 */
export function createPersistenceCheat(overrides = {}) {
  const globals = Object.assign(liveGlobals(), overrides);

  let forceSave = false;
  let originals = null;
  let menuCommandPatched = false;

  /**
   * @param {"success"|"info"} level
   * @param {string} text
   */
  function notify(level, text) {
    const alert = globals.getAlert();
    if (alert && typeof alert[level] === "function") alert[level](text);
  }

  function storeOriginals() {
    if (originals) return;
    const gameSystemPrototype = globals.getGameSystemPrototype();
    const windowMenuCommand = globals.getWindowMenuCommand();
    const sceneMenu = globals.getSceneMenu();
    originals = {
      isSaveEnabled: gameSystemPrototype && gameSystemPrototype.isSaveEnabled,
      needsCommand:
        windowMenuCommand && windowMenuCommand.prototype.needsCommand,
      commandSave: sceneMenu && sceneMenu.prototype.commandSave,
    };
  }

  function isForceSaveEnabled() {
    return !!forceSave;
  }

  function patchMenuCommandList(windowMenuCommand) {
    if (menuCommandPatched || !windowMenuCommand) return;
    menuCommandPatched = true;
    const makeCommandList = windowMenuCommand.prototype.makeCommandList;
    windowMenuCommand.prototype.makeCommandList = function () {
      makeCommandList.call(this);
      if (isForceSaveEnabled() && !this.findSymbol("save")) {
        const textManager = globals.getTextManager();
        const index = this._list.findIndex((cmd) => cmd.symbol === "gameEnd");
        const saveCmd = {
          name: textManager ? textManager.save : "Save",
          symbol: "save",
          enabled: true,
          ext: null,
        };
        if (index >= 0) {
          this._list.splice(index, 0, saveCmd);
        } else {
          this._list.push(saveCmd);
        }
      }
    };
  }

  function forceEnableSave(enabled) {
    forceSave = enabled;
    if (enabled) {
      storeOriginals();

      const gameSystemPrototype = globals.getGameSystemPrototype();
      if (gameSystemPrototype && originals.isSaveEnabled) {
        gameSystemPrototype.isSaveEnabled = function () {
          return true;
        };
      }

      const windowMenuCommand = globals.getWindowMenuCommand();
      if (windowMenuCommand && originals.needsCommand) {
        windowMenuCommand.prototype.needsCommand = function (name) {
          if (name === "save") return true;
          return originals.needsCommand.call(this, name);
        };
        patchMenuCommandList(windowMenuCommand);
      }

      const sceneMenu = globals.getSceneMenu();
      if (sceneMenu && originals.commandSave) {
        sceneMenu.prototype.commandSave = function () {
          if (isForceSaveEnabled()) {
            const sceneManager = globals.getSceneManager();
            const sceneSave = globals.getSceneSave();
            if (sceneManager && sceneSave) sceneManager.push(sceneSave);
            return;
          }
          originals.commandSave.call(this);
        };
      }

      const gameSystem = globals.getGameSystem();
      if (gameSystem && typeof gameSystem.enableSave === "function") {
        gameSystem.enableSave();
      }
      notify("success", "Force Save: Enabled");
      return;
    }

    const gameSystemPrototype = globals.getGameSystemPrototype();
    if (originals && originals.isSaveEnabled && gameSystemPrototype) {
      gameSystemPrototype.isSaveEnabled = originals.isSaveEnabled;
    }
    notify("info", "Force Save: Disabled");
  }

  return Object.freeze({
    forceEnableSave,
    isForceSaveEnabled,
  });
}
