// @ts-check

import { Alert } from "../AlertHelper.js";

/**
 * Runtime battlers expose a few battle mutation methods that the upstream
 * engine typings do not model consistently across MV/MZ.
 *
 * @typedef {Game_Battler & {
 *   hp: number,
 *   mp: number,
 *   mhp: number,
 *   mmp: number,
 *   setHp(value: number): void,
 *   setMp(value: number): void,
 *   setTp(value: number): void,
 *   maxTp(): number,
 *   clearStates(): void,
 *   addNewState(stateId: number): void,
 *   deathStateId(): number
 * }} BattleCheatBattlerLike
 */

export class BattleCheat {
  /**
   * @param {BattleCheatBattlerLike} battler
   */
  static recover(battler) {
    battler.setHp(battler.mhp);
    battler.setMp(battler.mmp);
    battler.setTp(battler.maxTp());
  }

  static recoverAllEnemy() {
    for (const member of $gameTroop.members()) {
      this.recover(/** @type {BattleCheatBattlerLike} */ (member));
    }

    Alert.success("Recovery all enemies");
  }

  static recoverAllParty() {
    for (const member of $gameParty.members()) {
      this.recover(/** @type {BattleCheatBattlerLike} */ (member));
    }

    Alert.success("Recovery all party members");
  }

  static fillTpAllEnemy() {
    for (const member of $gameTroop.members()) {
      const battler = /** @type {BattleCheatBattlerLike} */ (member);
      battler.setTp(battler.maxTp());
    }

    Alert.success("Fill TP all enemies");
  }

  static fillTpAllParty() {
    for (const member of $gameParty.members()) {
      const battler = /** @type {BattleCheatBattlerLike} */ (member);
      battler.setTp(battler.maxTp());
    }

    Alert.success("Fill TP all party members");
  }

  /**
   * @param {BattleCheatBattlerLike} battler
   */
  static clearStates(battler) {
    battler.clearStates();
  }

  static clearStatesAllEnemy() {
    for (const member of $gameTroop.members()) {
      this.clearStates(/** @type {BattleCheatBattlerLike} */ (member));
    }

    Alert.success("Clear states all enemies");
  }

  static clearStatesAllParty() {
    for (const member of $gameParty.members()) {
      this.clearStates(/** @type {BattleCheatBattlerLike} */ (member));
    }

    Alert.success("Clear states all party members");
  }

  /**
   * @param {number} newHp
   */
  static changeAllEnemyHealth(newHp) {
    for (const member of $gameTroop.members()) {
      /** @type {BattleCheatBattlerLike} */ (member).setHp(newHp);
    }

    Alert.success(`HP ${newHp} for all enemies`);
  }

  /**
   * @param {number} newHp
   */
  static changeAllPartyHealth(newHp) {
    for (const member of $gameParty.members()) {
      /** @type {BattleCheatBattlerLike} */ (member).setHp(newHp);
    }

    Alert.success(`HP ${newHp} for all party members`);
  }

  static canExecuteBattleEndProcess() {
    const currentScene = /** @type {SceneManagerRuntimeLike} */ (
      /** @type {unknown} */ (SceneManager)
    )._scene;
    const battleManager = /** @type {BattleManagerRuntimeLike} */ (
      /** @type {unknown} */ (BattleManager)
    );

    return (
      currentScene &&
      currentScene.constructor === Scene_Battle &&
      battleManager._phase !== "battleEnd"
    );
  }

  static encounterBattle() {
    /** @type {GamePlayerEncounterLike} */ (
      /** @type {unknown} */ ($gamePlayer)
    )._encounterCount = 0;
  }

  static victory() {
    if (this.canExecuteBattleEndProcess()) {
      $gameTroop.members().forEach((enemy) => {
        const battler = /** @type {BattleCheatBattlerLike} */ (enemy);
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
        const battler = /** @type {BattleCheatBattlerLike} */ (actor);
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
      /** @type {BattleManagerRuntimeLike} */ (
        /** @type {unknown} */ (BattleManager)
      )._escaped = true;
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
      /** @type {BattleManagerRuntimeLike} */ (
        /** @type {unknown} */ (BattleManager)
      )._escaped = true;
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
