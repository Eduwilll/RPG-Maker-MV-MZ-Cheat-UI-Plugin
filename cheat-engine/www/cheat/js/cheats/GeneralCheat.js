// @ts-check

import { Alert } from "../AlertHelper.js";
import { createMovementCheat } from "./movement/MovementCheat.js";
import { createGodModeCheat } from "./actors/GodModeCheat.js";
import { createPersistenceCheat } from "./persistence/PersistenceCheat.js";

/**
 * @typedef {Game_Actor & {
 *   _actorId: number,
 *   mhp: number,
 *   mmp: number,
 *   setHp(value: number): void,
 *   setMp(value: number): void,
 *   setTp(value: number): void,
 *   maxTp(): number,
 *   paySkillCost(skill: DataSkill): void,
 *   gainHP_bkup?: (value: number) => void,
 *   setHp_bkup?: (value: number) => void,
 *   gainMp_bkup?: (value: number) => void,
 *   setMp_bkup?: (value: number) => void,
 *   gainTp_bkup?: (value: number) => void,
 *   setTp_bkup?: (value: number) => void,
 *   paySkillCost_bkup?: (skill: DataSkill) => void
 * }} GodModeActorLike
 */

/**
 * @typedef {Game_Player & { _through: boolean }} NoClipPlayerLike
 */

const movement = createMovementCheat();
const godMode = createGodModeCheat();
const persistence = createPersistenceCheat();

/**
 * Static facade kept for panels, shortcuts and the separate cheat window.
 * The behaviour lives in the focused modules above.
 */
export class GeneralCheat {
  static openFeatureFinder() {}

  static toggleCheatModal(componentName = null) {}

  static openCheatModal(componentName = null) {}

  static toggleNoClip(notify = false) {
    movement.toggleNoClip(notify);
  }

  static changeName(actor, newName) {
    if (actor && typeof actor.setName === "function") {
      actor.setName(newName);
    }
  }

  static getGodModeOnActorIds() {
    return godMode.getGodModeOnActorIds();
  }

  static getGodModeData(actor) {
    return godMode.getGodModeData(actor);
  }

  static godModeOn(actor) {
    godMode.godModeOn(actor);
  }

  static godModeOff(actor) {
    godMode.godModeOff(actor);
  }

  static toggleGodMode(actor) {
    godMode.toggleGodMode(actor);
  }

  static isGodMode(actor) {
    return godMode.isGodMode(actor);
  }

  static forceEnableSave(enabled) {
    persistence.forceEnableSave(enabled);
  }

  static isForceSaveEnabled() {
    return persistence.isForceSaveEnabled();
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
      const currentScene = /** @type {SceneManagerRuntimeLike} */ (
        /** @type {unknown} */ (SceneManager)
      )._scene;
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
    movement.toggleMouseTeleport(enabled);
  }

  static isMouseTeleportEnabled() {
    return movement.isMouseTeleportEnabled();
  }

  static toggleMouseMove(enabled) {
    movement.toggleMouseMove(enabled);
  }

  static isMouseMoveEnabled() {
    return movement.isMouseMoveEnabled();
  }

  static isMouseInputPatchEnabled() {
    return movement.isMouseInputPatchEnabled();
  }
}
