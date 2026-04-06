// @ts-check

import { Alert } from "./AlertHelper.js";

export class GeneralCheat {
  static toggleCheatModal(componentName = null) {}

  static openCheatModal(componentName = null) {}

  static toggleNoClip(notify = false) {
    const gamePlayer = /** @type {any} */ ($gamePlayer);
    gamePlayer._through = !gamePlayer._through;
    if (gamePlayer._through) {
      Alert.success(`No clip toggled: ${gamePlayer._through}`);
    } else {
      Alert.info(`No clip toggled: ${gamePlayer._through}`);
    }
  }

  static getGodModeOnActorIds() {
    if (!this.godModeMap) {
      return [];
    }

    const ret = [];

    for (const actor of this.godModeMap.keys()) {
      const data = this.godModeMap.get(actor);

      if (data.godMode) {
        ret.push(actor._actorId);
      }
    }

    return ret;
  }

  static getGodModeData(actor) {
    if (!this.godModeMap) {
      this.godModeMap = new Map();
    }

    if (this.godModeMap.has(actor)) {
      return this.godModeMap.get(actor);
    }

    const defaultData = {
      godMode: false,
      gainHp: null,
      setHp: null,
      gainMp: null,
      setMp: null,
      gainTp: null,
      setTp: null,
      paySkillCost: null,
      godModeInterval: null,
    };

    this.godModeMap.set(actor, defaultData);

    return defaultData;
  }

  static godModeOn(actor) {
    if (actor instanceof Game_Actor && !this.isGodMode(actor)) {
      const godModeData = this.getGodModeData(actor);
      godModeData.godMode = true;
      const battler = /** @type {any} */ (actor);

      battler.gainHP_bkup = battler.gainHp;
      battler.gainHp = function (value) {
        value = battler.mhp;
        battler.gainHP_bkup(value);
      };

      battler.setHp_bkup = battler.setHp;
      battler.setHp = function (hp) {
        hp = battler.mhp;
        battler.setHp_bkup(hp);
      };

      battler.gainMp_bkup = battler.gainMp;
      battler.gainMp = function (value) {
        value = battler.mmp;
        battler.gainMp_bkup(value);
      };

      battler.setMp_bkup = battler.setMp;
      battler.setMp = function (mp) {
        mp = battler.mmp;
        battler.setMp_bkup(mp);
      };

      battler.gainTp_bkup = battler.gainTp;
      battler.gainTp = function (value) {
        value = battler.maxTp();
        battler.gainTp_bkup(value);
      };

      battler.setTp_bkup = battler.setTp;
      battler.setTp = function (tp) {
        tp = battler.maxTp();
        battler.setTp_bkup(tp);
      };

      battler.paySkillCost_bkup = battler.paySkillCost;
      battler.paySkillCost = function (skill) {
        // do nothing
      };

      godModeData.godModeInterval = setInterval(function () {
        battler.gainHp(battler.mhp);
        battler.gainMp(battler.mmp);
        battler.gainTp(battler.maxTp());
      }, 1000);
    }
  }

  static godModeOff(actor) {
    if (actor instanceof Game_Actor && this.isGodMode(actor)) {
      const godModeData = this.getGodModeData(actor);
      godModeData.godMode = false;
      const battler = /** @type {any} */ (actor);

      clearInterval(godModeData.godModeInterval);
      godModeData.godModeInterval = null;

      if (battler.gainHP_bkup) {
        battler.gainHp = battler.gainHP_bkup;
        battler.setHp = battler.setHp_bkup;
        battler.gainMp = battler.gainMp_bkup;
        battler.setMp = battler.setMp_bkup;
        battler.gainTp = battler.gainTp_bkup;
        battler.setTp = battler.setTp_bkup;
        battler.paySkillCost = battler.paySkillCost_bkup;
      }
    }
  }

  static toggleGodMode(actor) {
    if (this.isGodMode(actor)) {
      this.godModeOff(actor);
    } else {
      this.godModeOn(actor);
    }
  }

  static isGodMode(actor) {
    return this.getGodModeData(actor).godMode;
  }

  static forceEnableSave(enabled) {
    this._forceSave = enabled;
    if (enabled) {
      if (!this._orig_isSaveEnabled) {
        this._orig_isSaveEnabled = Game_System.prototype.isSaveEnabled;
      }
      Game_System.prototype.isSaveEnabled = function () {
        return true;
      };

      if (typeof Window_MenuCommand !== "undefined") {
        if (!this._orig_needsCommand) {
          this._orig_needsCommand = Window_MenuCommand.prototype.needsCommand;
        }
        Window_MenuCommand.prototype.needsCommand = function (name) {
          if (name === "save") return true;
          return GeneralCheat._orig_needsCommand.call(this, name);
        };

        if (!this._menuCommandPatched) {
          this._menuCommandPatched = true;
          const _makeCommandList = Window_MenuCommand.prototype.makeCommandList;
          Window_MenuCommand.prototype.makeCommandList = function () {
            _makeCommandList.call(this);
            if (GeneralCheat.isForceSaveEnabled() && !this.findSymbol("save")) {
              const index = this._list.findIndex(
                (cmd) => cmd.symbol === "gameEnd",
              );
              const saveCmd = {
                name: TextManager.save,
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
      }

      if (typeof Scene_Menu !== "undefined") {
        if (!this._orig_commandSave) {
          this._orig_commandSave = Scene_Menu.prototype.commandSave;
        }
        Scene_Menu.prototype.commandSave = function () {
          if (GeneralCheat.isForceSaveEnabled()) {
            SceneManager.push(Scene_Save);
            return;
          }
          GeneralCheat._orig_commandSave.call(this);
        };
      }

      if (typeof $gameSystem !== "undefined" && $gameSystem) {
        $gameSystem.enableSave();
      }
      Alert.success("Force Save: Enabled");
    } else {
      if (this._orig_isSaveEnabled) {
        Game_System.prototype.isSaveEnabled = this._orig_isSaveEnabled;
      }
      Alert.info("Force Save: Disabled");
    }
  }

  static isForceSaveEnabled() {
    return !!this._forceSave;
  }

  static openConsole() {
    try {
      if (typeof nw !== "undefined" && nw.Window) {
        nw.Window.get().showDevTools();
      } else {
        const gui = /** @type {any} */ (require("nw.gui"));
        if (gui && gui.Window) {
          gui.Window.get().showDevTools();
        }
      }
    } catch (e) {
      console.error("Failed to open console:", e);
      Alert.error(
        "Failed to open console. Note: This only works in NW.js (PC vers).",
      );
    }
  }

  static openDebugMenu() {
    try {
      const currentScene = /** @type {any} */ (SceneManager)._scene;
      if (currentScene instanceof Scene_Map) {
        SceneManager.push(Scene_Debug);
        Alert.success("Opening Debug Menu (F9)");
      } else {
        Alert.error("Open Debug Menu only works on Map screen");
      }
    } catch (e) {
      console.error("Failed to open Debug Menu:", e);
      Alert.error("Debug Menu not available in this game");
    }
  }

  static toggleMouseTeleport(enabled) {
    if (enabled === undefined) {
      enabled = !this.isMouseTeleportEnabled();
    }
    this._mouseTeleport = enabled;
    if (enabled) {
      if (!this._orig_onMapTouch) {
        this._orig_onMapTouch = Scene_Map.prototype.onMapTouch;
      }
      Scene_Map.prototype.onMapTouch = function () {
        const touchInput = /** @type {any} */ (TouchInput);
        const x = $gameMap.canvasToMapX(touchInput.x);
        const y = $gameMap.canvasToMapY(touchInput.y);
        $gamePlayer.locate(x, y);
      };
      Alert.success("Mouse Teleport: Enabled");
    } else {
      if (this._orig_onMapTouch) {
        Scene_Map.prototype.onMapTouch = this._orig_onMapTouch;
      }
      Alert.info("Mouse Teleport: Disabled");
    }
  }

  static isMouseTeleportEnabled() {
    return !!this._mouseTeleport;
  }
}
