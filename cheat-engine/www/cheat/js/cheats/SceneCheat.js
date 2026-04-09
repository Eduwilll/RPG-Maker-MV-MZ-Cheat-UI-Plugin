// @ts-check

import { Alert } from "../AlertHelper.js";

export class SceneCheat {
  static gotoTitle() {
    SceneManager.goto(Scene_Title);
  }

  static getSceneManagerRuntime() {
    return /** @type {SceneManagerRuntimeLike} */ (
      /** @type {unknown} */ (SceneManager)
    );
  }

  static getCurrentScene() {
    return this.getSceneManagerRuntime()._scene;
  }

  /**
   * @param {Scene_Base | null | undefined} scene
   * @returns {boolean}
   */
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

    return false;
  }

  /**
   * @param {string} actionName
   */
  static warnSceneTransitionLocked(actionName) {
    Alert.warn(
      actionName + " is unavailable while a scene transition is running.",
    );
  }

  static toggleSaveScene() {
    const currentScene = this.getCurrentScene();

    if (this.isSceneTransitionLocked()) {
      this.warnSceneTransitionLocked("Save screen");
      return false;
    }

    if (!currentScene) {
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

    if (!currentScene) {
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

  /**
   * @param {number} slot
   */
  static quickSave(slot = 1) {
    $gameSystem.onBeforeSave();
    DataManager.saveGame(slot);

    Alert.success(`Game saved to slot ${slot}`);
  }

  /**
   * @param {number} slot
   */
  static quickLoad(slot = 1) {
    DataManager.loadGame(slot);
    SceneManager.goto(Scene_Map);

    Alert.success(`Game loaded from slot ${slot}`);
  }
}
