import { Alert } from "./AlertHelper.js";
import { KeyValueStorage } from "./KeyValueStorage.js";
export { GameSpeedCheat, MessageCheat, SpeedCheat } from "./CheatSpeed.js";

export class GeneralCheat {
  static toggleCheatModal(componentName = null) {}

  static openCheatModal(componentName = null) {}

  static toggleNoClip(notify = false) {
    $gamePlayer._through = !$gamePlayer._through;
    if ($gamePlayer._through) {
      Alert.success(`No clip toggled: ${$gamePlayer._through}`);
    } else {
      Alert.info(`No clip toggled: ${$gamePlayer._through}`);
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

      actor.gainHP_bkup = actor.gainHp;
      actor.gainHp = function (value) {
        value = actor.mhp;
        actor.gainHP_bkup(value);
      };

      actor.setHp_bkup = actor.setHp;
      actor.setHp = function (hp) {
        hp = actor.mhp;
        actor.setHp_bkup(hp);
      };

      actor.gainMp_bkup = actor.gainMp;
      actor.gainMp = function (value) {
        value = actor.mmp;
        actor.gainMp_bkup(value);
      };

      actor.setMp_bkup = actor.setMp;
      actor.setMp = function (mp) {
        mp = actor.mmp;
        actor.setMp_bkup(mp);
      };

      actor.gainTp_bkup = actor.gainTp;
      actor.gainTp = function (value) {
        value = actor.maxTp();
        actor.gainTp_bkup(value);
      };

      actor.setTp_bkup = actor.setTp;
      actor.setTp = function (tp) {
        tp = actor.maxTp();
        actor.setTp_bkup(tp);
      };

      actor.paySkillCost_bkup = actor.paySkillCost;
      actor.paySkillCost = function (skill) {
        // do nothing
      };

      godModeData.godModeInterval = setInterval(function () {
        actor.gainHp(actor.mhp);
        actor.gainMp(actor.mmp);
        actor.gainTp(actor.maxTp());
      }, 1000);

      // this.saveCheatSettings()
    }
  }

  static godModeOff(actor) {
    if (actor instanceof Game_Actor && this.isGodMode(actor)) {
      const godModeData = this.getGodModeData(actor);
      godModeData.godMode = false;

      clearInterval(godModeData.godModeInterval);
      godModeData.godModeInterval = null;

      if (actor.gainHP_bkup) {
        actor.gainHp = actor.gainHP_bkup;
        actor.setHp = actor.setHp_bkup;
        actor.gainMp = actor.gainMp_bkup;
        actor.setMp = actor.setMp_bkup;
        actor.gainTp = actor.gainTp_bkup;
        actor.setTp = actor.setTp_bkup;
        actor.paySkillCost = actor.paySkillCost_bkup;
      }

      // this.saveCheatSettings()
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

      // --- Menu Visibility Fixes ---
      if (typeof Window_MenuCommand !== "undefined") {
        // 1. Force 'needsCommand' (Overriding Database System toggle)
        if (!this._orig_needsCommand) {
          this._orig_needsCommand = Window_MenuCommand.prototype.needsCommand;
        }
        Window_MenuCommand.prototype.needsCommand = function (name) {
          if (name === "save") return true;
          return GeneralCheat._orig_needsCommand.call(this, name);
        };

        // 2. Inject command if still missing (Brute-force)
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

      // --- Scene Guard Fix ---
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
        const gui = require("nw.gui");
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
      if (SceneManager._scene instanceof Scene_Map) {
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
        const x = $gameMap.canvasToMapX(TouchInput.x);
        const y = $gameMap.canvasToMapY(TouchInput.y);
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

export class SceneCheat {
  static gotoTitle() {
    SceneManager.goto(Scene_Title);
  }

  static toggleSaveScene() {
    if (SceneManager._scene.constructor === Scene_Save) {
      SceneManager.pop();
    } else if (SceneManager._scene.constructor === Scene_Load) {
      SceneManager.goto(Scene_Save);
    } else {
      SceneManager.push(Scene_Save);
    }
  }

  static toggleLoadScene() {
    if (SceneManager._scene.constructor === Scene_Load) {
      SceneManager.pop();
    } else if (SceneManager._scene.constructor === Scene_Save) {
      SceneManager.goto(Scene_Load);
    } else {
      SceneManager.push(Scene_Load);
    }
  }

  static quickSave(slot = 1) {
    $gameSystem.onBeforeSave();
    DataManager.saveGame(slot);

    Alert.success(`Game saved to slot ${slot}`);
  }

  static quickLoad(slot = 1) {
    DataManager.loadGame(slot);
    SceneManager.goto(Scene_Map);

    Alert.success(`Game loaded from slot ${slot}`);
  }
}

export class BattleCheat {
  static recover(member) {
    member.setHp(member.mhp);
    member.setMp(member.mmp);
    member.setTp(member.maxTp());
  }

  static recoverAllEnemy() {
    for (const member of $gameTroop.members()) {
      this.recover(member);
    }

    Alert.success("Recovery all enemies");
  }

  static recoverAllParty() {
    for (const member of $gameParty.members()) {
      this.recover(member);
    }

    Alert.success("Recovery all party members");
  }

  static fillTpAllEnemy() {
    for (const member of $gameTroop.members()) {
      member.setTp(member.maxTp());
    }

    Alert.success("Fill TP all enemies");
  }

  static fillTpAllParty() {
    for (const member of $gameParty.members()) {
      member.setTp(member.maxTp());
    }

    Alert.success("Fill TP all party members");
  }

  static clearStates(member) {
    member.clearStates();
  }

  static clearStatesAllEnemy() {
    for (const member of $gameTroop.members()) {
      this.clearStates(member);
    }

    Alert.success("Clear states all enemies");
  }

  static clearStatesAllParty() {
    for (const member of $gameParty.members()) {
      this.clearStates(member);
    }

    Alert.success("Clear states all party members");
  }

  static changeAllEnemyHealth(newHp) {
    for (const member of $gameTroop.members()) {
      member.setHp(newHp);
    }

    Alert.success(`HP ${newHp} for all enemies`);
  }

  static changeAllPartyHealth(newHp) {
    for (const member of $gameParty.members()) {
      member.setHp(newHp);
    }

    Alert.success(`HP ${newHp} for all party members`);
  }

  static canExecuteBattleEndProcess() {
    return (
      SceneManager._scene &&
      SceneManager._scene.constructor === Scene_Battle &&
      BattleManager._phase !== "battleEnd"
    );
  }

  static encounterBattle() {
    $gamePlayer._encounterCount = 0;
  }

  static victory() {
    if (this.canExecuteBattleEndProcess()) {
      $gameTroop.members().forEach((enemy) => {
        enemy.addNewState(enemy.deathStateId());
      });
      BattleManager.processVictory();
      Alert.success("Forced victory from battle!");
      return true;
    }
    return false;
  }

  static defeat() {
    if (this.canExecuteBattleEndProcess()) {
      $gameParty.members().forEach((actor) => {
        actor.addNewState(actor.deathStateId());
      });
      BattleManager.processDefeat();
      Alert.success("Forced defeat from battle...");
      return true;
    }
    return false;
  }

  static escape() {
    if (this.canExecuteBattleEndProcess()) {
      $gameParty.performEscape();
      SoundManager.playEscape();
      BattleManager._escaped = true;
      BattleManager.processEscape();
      Alert.success("Forced escape from battle");
      return true;
    }
    return false;
  }

  static abort() {
    if (this.canExecuteBattleEndProcess()) {
      $gameParty.performEscape();
      SoundManager.playEscape();
      BattleManager._escaped = true;
      BattleManager.processAbort();
      Alert.success("Forced abort battle");
      return true;
    }
    return false;
  }

  static toggleDisableRandomEncounter() {
    if (this.isDisableRandomEncounter()) {
      if (this.canEncounter_bkup) {
        $gamePlayer.canEncounter = this.canEncounter_bkup;
      }
      Alert.info("Disable Random Encounter: Disabled");
    } else {
      this.canEncounter_bkup = $gamePlayer.canEncounter;

      $gamePlayer.canEncounter = function () {
        return false;
      };
      Alert.success("Disable Random Encounter: Enabled");
    }

    this.disableRandomEncounter = !this.isDisableRandomEncounter();
  }

  static isDisableRandomEncounter() {
    return !!this.disableRandomEncounter && this.disableRandomEncounter;
  }
}
