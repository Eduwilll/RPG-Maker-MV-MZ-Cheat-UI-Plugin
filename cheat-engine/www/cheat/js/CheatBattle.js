// @ts-check

import { Alert } from "./AlertHelper.js";

export class SceneCheat {
  static gotoTitle() {
    SceneManager.goto(Scene_Title);
  }

  static getSceneManagerRuntime() {
    return /** @type {any} */ (SceneManager);
  }

  static getCurrentScene() {
    return this.getSceneManagerRuntime()._scene;
  }

  static isFileScene(scene) {
    return (
      !!scene &&
      (scene.constructor === Scene_Save || scene.constructor === Scene_Load)
    );
  }

  static isSceneTransitionLocked() {
    const currentScene = this.getCurrentScene();

    if (!currentScene) {
      return false;
    }

    if (this.isFileScene(currentScene)) {
      return false;
    }

    const sceneManager = this.getSceneManagerRuntime();

    if (
      typeof sceneManager.isSceneChanging === "function" &&
      sceneManager.isSceneChanging()
    ) {
      return true;
    }

    if (
      typeof sceneManager.isCurrentSceneBusy === "function" &&
      sceneManager.isCurrentSceneBusy()
    ) {
      return true;
    }

    if (
      currentScene.constructor === Scene_Map &&
      (($gameMessage &&
        typeof $gameMessage.isBusy === "function" &&
        $gameMessage.isBusy()) ||
        ($gameMap &&
          typeof $gameMap.isEventRunning === "function" &&
          $gameMap.isEventRunning()))
    ) {
      return true;
    }

    return false;
  }

  static warnSceneTransitionLocked(actionName) {
    Alert.warn(
      actionName +
        " is unavailable while a message, event, or scene transition is running.",
    );
  }

  static toggleSaveScene() {
    const currentScene = this.getCurrentScene();
    if (this.isSceneTransitionLocked()) {
      this.warnSceneTransitionLocked("Save screen");
      return false;
    }

    if (currentScene.constructor === Scene_Save) {
      SceneManager.pop();
    } else if (currentScene.constructor === Scene_Load) {
      SceneManager.goto(Scene_Save);
    } else {
      SceneManager.push(Scene_Save);
    }

    return true;
  }

  static toggleLoadScene() {
    const currentScene = this.getCurrentScene();
    if (this.isSceneTransitionLocked()) {
      this.warnSceneTransitionLocked("Load screen");
      return false;
    }

    if (currentScene.constructor === Scene_Load) {
      SceneManager.pop();
    } else if (currentScene.constructor === Scene_Save) {
      SceneManager.goto(Scene_Load);
    } else {
      SceneManager.push(Scene_Load);
    }

    return true;
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
    const battler = /** @type {any} */ (member);
    battler.setHp(battler.mhp);
    battler.setMp(battler.mmp);
    battler.setTp(battler.maxTp());
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
      const battler = /** @type {any} */ (member);
      battler.setTp(battler.maxTp());
    }

    Alert.success("Fill TP all enemies");
  }

  static fillTpAllParty() {
    for (const member of $gameParty.members()) {
      const battler = /** @type {any} */ (member);
      battler.setTp(battler.maxTp());
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
      /** @type {any} */ (member).setHp(newHp);
    }

    Alert.success(`HP ${newHp} for all enemies`);
  }

  static changeAllPartyHealth(newHp) {
    for (const member of $gameParty.members()) {
      /** @type {any} */ (member).setHp(newHp);
    }

    Alert.success(`HP ${newHp} for all party members`);
  }

  static canExecuteBattleEndProcess() {
    const currentScene = /** @type {any} */ (SceneManager)._scene;
    const battleManager = /** @type {any} */ (BattleManager);
    return (
      currentScene &&
      currentScene.constructor === Scene_Battle &&
      battleManager._phase !== "battleEnd"
    );
  }

  static encounterBattle() {
    /** @type {any} */ ($gamePlayer)._encounterCount = 0;
  }

  static victory() {
    if (this.canExecuteBattleEndProcess()) {
      $gameTroop.members().forEach((enemy) => {
        const battler = /** @type {any} */ (enemy);
        battler.addNewState(battler.deathStateId());
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
        const battler = /** @type {any} */ (actor);
        battler.addNewState(battler.deathStateId());
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
      /** @type {any} */ (BattleManager)._escaped = true;
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
      /** @type {any} */ (BattleManager)._escaped = true;
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
