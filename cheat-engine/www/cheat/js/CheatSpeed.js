// @ts-check

import { KeyValueStorage } from "./KeyValueStorage.js";

export class GameSpeedCheat {
  static sceneOptions() {
    if (!this._sceneOptions) {
      this._sceneOptions = {
        all() {
          return true;
        },

        battle() {
          return (
            /** @type {any} */ (SceneManager)._scene instanceof Scene_Battle
          );
        },
      };
    }

    return this._sceneOptions;
  }

  static getRate() {
    if (this.rate) {
      return this.rate;
    }

    return 1;
  }

  static getSceneOption() {
    if (this.sceneOption) {
      return this.sceneOption;
    }

    return this.sceneOptions().all;
  }

  static removeApplied() {
    if (this.isApplied) {
      SceneManager.updateScene = this.origin_SceneManager_updateScene;
      Scene_Map.prototype.update = this.origin_Scene_Map_update;
      Spriteset_Base.prototype.update = this.origin_Spriteset_Base_update;
      this.isApplied = false;
    }
  }

  static setGameSpeed(rate, sceneOption) {
    if (!this.origin_SceneManager_updateScene) {
      this.origin_SceneManager_updateScene = SceneManager.updateScene;
    }

    if (!this.origin_Scene_Map_update) {
      this.origin_Scene_Map_update = Scene_Map.prototype.update;
    }

    if (!this.origin_Spriteset_Base_update) {
      this.origin_Spriteset_Base_update = Spriteset_Base.prototype.update;
    }

    if (!sceneOption) {
      sceneOption = GameSpeedCheat.sceneOptions().all;
    }

    this.rate = rate;
    this.sceneOption = sceneOption;
    this.removeApplied();

    if (Math.abs(rate - 1.0) < Number.EPSILON) {
      return;
    }

    const SceneManager_updateScene = this.origin_SceneManager_updateScene;
    let currentUpdateSceneRate = 0;
    SceneManager.updateScene = function () {
      if (!sceneOption()) {
        SceneManager_updateScene.call(this);
        return;
      }

      currentUpdateSceneRate += rate;
      const currStep = Math.floor(currentUpdateSceneRate);
      currentUpdateSceneRate -= currStep;

      if (currStep > 0) {
        SceneManager_updateScene.call(this);

        for (let i = 0; i < currStep - 1; ++i) {
          SceneManager.updateInputData();
          SceneManager.changeScene();
          SceneManager_updateScene.call(this);
        }
      }
    };

    this.isApplied = true;
  }

  static __writeSettings(rate, sceneOption) {
    const options = GameSpeedCheat.sceneOptions();
    const sceneOptionKey = Object.keys(GameSpeedCheat.sceneOptions()).find(
      (key) => options[key] === sceneOption,
    );

    const storage = new KeyValueStorage("./www/cheat-settings/gameSpeed.json");

    storage.setItem(
      "data",
      JSON.stringify({ rate: rate, sceneOption: sceneOptionKey }),
    );
  }

  static __readSettings() {
    const storage = new KeyValueStorage("./www/cheat-settings/gameSpeed.json");
    const json = storage.getItem("data");

    if (!json) {
      return;
    }

    const data = JSON.parse(json);

    GameSpeedCheat.setGameSpeed(
      data.rate,
      GameSpeedCheat.sceneOptions()[data.sceneOption],
    );
  }
}

export class SpeedCheat {
  static isFixed() {
    return !!SpeedCheat.fixed;
  }

  static setFixSpeedInterval(speed) {
    if (SpeedCheat.isFixed()) {
      SpeedCheat.removeFixSpeedInterval();
    }

    SpeedCheat.fixed = setInterval(() => {
      SpeedCheat.__setSpeed(speed);
    }, 1000);
  }

  static removeFixSpeedInterval() {
    if (SpeedCheat.isFixed()) {
      clearInterval(SpeedCheat.fixed);
      SpeedCheat.fixed = undefined;
    }
  }

  static __setSpeed(speed) {
    $gamePlayer.setMoveSpeed(speed);
  }

  static setSpeed(speed, fixed = false) {
    SpeedCheat.__setSpeed(speed);

    if (fixed) {
      SpeedCheat.setFixSpeedInterval(speed);
    } else {
      SpeedCheat.removeFixSpeedInterval();
    }
  }

  static __writeSettings(speed, fixed) {
    const storage = new KeyValueStorage("./www/cheat-settings/speed.json");
    storage.setItem("data", JSON.stringify({ speed: speed, fixed: fixed }));
  }

  static __readSettings() {
    const storage = new KeyValueStorage("./www/cheat-settings/speed.json");
    const json = storage.getItem("data");

    if (!json) {
      return;
    }

    const data = JSON.parse(json);

    if (data.fixed) {
      SpeedCheat.setSpeed(data.speed, data.fixed);
    }
  }
}

/** @type {ReturnType<typeof setInterval> | undefined} */
SpeedCheat.fixed = undefined;

export class MessageCheat {
  static initialize() {
    this.skip = false;

    const _Window_Message_updateShowFast =
      Window_Message.prototype.updateShowFast;
    Window_Message.prototype.updateShowFast = function () {
      _Window_Message_updateShowFast.call(this);
      if (MessageCheat.skip) {
        this._showFast = true;
        this._pauseSkip = true;
      }
    };

    const _Window_Message_updateInput = Window_Message.prototype.updateInput;
    Window_Message.prototype.updateInput = function () {
      const ret = _Window_Message_updateInput.call(this);

      if (this.pause && MessageCheat.skip) {
        this.pause = false;

        if (!this._textState) {
          this.terminateMessage();
        }
        return true;
      }

      return ret;
    };

    const Window_ScrollText_scrollSpeed =
      Window_ScrollText.prototype.scrollSpeed;
    Window_ScrollText.prototype.scrollSpeed = function () {
      let ret = Window_ScrollText_scrollSpeed.call(this);

      if (MessageCheat.skip) {
        ret *= 100;
      }

      return ret;
    };

    const _Window_BattleLog_messageSpeed =
      Window_BattleLog.prototype.messageSpeed;
    Window_BattleLog.prototype.messageSpeed = function () {
      let ret = _Window_BattleLog_messageSpeed.call(this);

      if (MessageCheat.skip) {
        ret = 1;
      }

      return ret;
    };
  }

  static startSkip(gameSpeed) {
    if (gameSpeed === 1) {
      this.gameSpeedBackup = null;
    } else {
      this.gameSpeedBackup = {
        rate: GameSpeedCheat.getRate(),
        sceneOption: GameSpeedCheat.getSceneOption(),
      };

      GameSpeedCheat.setGameSpeed(gameSpeed, GameSpeedCheat.sceneOptions().all);
    }

    this.skip = true;
  }

  static stopSkip() {
    if (this.gameSpeedBackup) {
      GameSpeedCheat.setGameSpeed(
        this.gameSpeedBackup.rate,
        this.gameSpeedBackup.sceneOption,
      );
      this.gameSpeedBackup = null;
    }

    this.skip = false;
  }
}

async function multiRetryAction(action, intervalTimeout, maxTryCount) {
  let tryCount = 0;

  const interval = setInterval(() => {
    try {
      ++tryCount;
      action();
    } catch (e) {
      console.log(e);
      if (tryCount < maxTryCount) {
        return;
      }
    }

    clearInterval(interval);
  }, intervalTimeout);
}

function initialize() {
  const intervalTimeout = 500;
  const maxTryCount = 100;
  const initializeActions = [
    SpeedCheat.__readSettings,
    GameSpeedCheat.__readSettings,
  ];

  initializeActions.forEach((action) =>
    multiRetryAction(action, intervalTimeout, maxTryCount),
  );
}

initialize();
