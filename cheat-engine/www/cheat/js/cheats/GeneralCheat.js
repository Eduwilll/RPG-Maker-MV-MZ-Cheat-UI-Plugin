// @ts-check

import { Alert } from "../AlertHelper.js";

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

export class GeneralCheat {
  static toggleCheatModal(componentName = null) {}

  static openCheatModal(componentName = null) {}

  static toggleNoClip(notify = false) {
    const gamePlayer = /** @type {NoClipPlayerLike} */ ($gamePlayer);
    gamePlayer._through = !gamePlayer._through;
    if (gamePlayer._through) {
      Alert.success(`No clip toggled: ${gamePlayer._through}`);
    } else {
      Alert.info(`No clip toggled: ${gamePlayer._through}`);
    }
  }

  static changeName(actor, newName) {
    if (actor && typeof actor.setName === "function") {
      actor.setName(newName);
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
      const battler = /** @type {GodModeActorLike} */ (actor);

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
      const battler = /** @type {GodModeActorLike} */ (actor);

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
    if (enabled === undefined) {
      enabled = !this.isMouseTeleportEnabled();
    }
    this._mouseTeleport = enabled;
    if (enabled) {
      this._mouseMove = false;
    }

    this.__applyTouchInputPatch();
    this.__applyMouseMapTouchPatch();
    Alert[enabled ? "success" : "info"](
      `Mouse Teleport: ${enabled ? "Enabled" : "Disabled"}`,
    );
  }

  static isMouseTeleportEnabled() {
    return !!this._mouseTeleport;
  }

  static toggleMouseMove(enabled) {
    if (enabled === undefined) {
      enabled = !this.isMouseMoveEnabled();
    }
    this._mouseMove = enabled;
    if (enabled) {
      this._mouseTeleport = false;
    }

    this.__applyTouchInputPatch();
    this.__applyMouseMapTouchPatch();
    Alert[enabled ? "success" : "info"](
      `Mouse Move: ${enabled ? "Enabled" : "Disabled"}`,
    );
  }

  static isMouseMoveEnabled() {
    return !!this._mouseMove;
  }

  static isMouseInputPatchEnabled() {
    return this.isMouseMoveEnabled() || this.isMouseTeleportEnabled();
  }

  static __storeTouchInputOriginals() {
    if (typeof TouchInput === "undefined") return false;

    if (!this._orig_touchInput) {
      this._orig_touchInput = {
        isPressed: TouchInput.isPressed,
        isTriggered: TouchInput.isTriggered,
        isRepeated: TouchInput.isRepeated,
        isLongPressed: TouchInput.isLongPressed,
        isCancelled: TouchInput.isCancelled,
        isMoved: TouchInput.isMoved,
        isReleased: TouchInput.isReleased,
        wheelX: Object.getOwnPropertyDescriptor(TouchInput, "wheelX"),
        wheelY: Object.getOwnPropertyDescriptor(TouchInput, "wheelY"),
      };
    }

    return true;
  }

  static __applyTouchInputPatch() {
    if (!this.__storeTouchInputOriginals()) return;

    if (!this.isMouseInputPatchEnabled()) {
      TouchInput.isPressed = this._orig_touchInput.isPressed;
      TouchInput.isTriggered = this._orig_touchInput.isTriggered;
      TouchInput.isRepeated = this._orig_touchInput.isRepeated;
      TouchInput.isLongPressed = this._orig_touchInput.isLongPressed;
      TouchInput.isCancelled = this._orig_touchInput.isCancelled;
      TouchInput.isMoved = this._orig_touchInput.isMoved;
      TouchInput.isReleased = this._orig_touchInput.isReleased;
      if (this._orig_touchInput.wheelX) {
        Object.defineProperty(
          TouchInput,
          "wheelX",
          this._orig_touchInput.wheelX,
        );
      }
      if (this._orig_touchInput.wheelY) {
        Object.defineProperty(
          TouchInput,
          "wheelY",
          this._orig_touchInput.wheelY,
        );
      }
      return;
    }

    TouchInput.isPressed = function () {
      const input = /** @type {any} */ (this);
      return !!(input._mousePressed || input._screenPressed);
    };
    TouchInput.isTriggered = function () {
      const input = /** @type {any} */ (this);
      return !!input._triggered;
    };
    TouchInput.isRepeated = function () {
      const input = /** @type {any} */ (this);
      return (
        this.isPressed() &&
        (input._triggered ||
          (input._pressedTime >= this.keyRepeatWait &&
            input._pressedTime % this.keyRepeatInterval === 0))
      );
    };
    TouchInput.isLongPressed = function () {
      const input = /** @type {any} */ (this);
      return this.isPressed() && input._pressedTime >= this.keyRepeatWait;
    };
    TouchInput.isCancelled = function () {
      const input = /** @type {any} */ (this);
      return !!input._cancelled;
    };
    TouchInput.isMoved = function () {
      const input = /** @type {any} */ (this);
      return !!input._moved;
    };
    TouchInput.isReleased = function () {
      const input = /** @type {any} */ (this);
      return !!input._released;
    };

    Object.defineProperty(TouchInput, "wheelX", {
      get: function () {
        return this._wheelX || 0;
      },
      configurable: true,
    });
    Object.defineProperty(TouchInput, "wheelY", {
      get: function () {
        return this._wheelY || 0;
      },
      configurable: true,
    });
  }

  static __storeMouseMapTouchOriginals() {
    if (typeof Scene_Map === "undefined") return false;

    if (!this._orig_updateDestination) {
      this._orig_updateDestination = Scene_Map.prototype.updateDestination;
    }
    if (!this._orig_processMapTouch) {
      this._orig_processMapTouch = Scene_Map.prototype.processMapTouch;
    }
    if (!this._orig_onMapTouch) {
      this._orig_onMapTouch = Scene_Map.prototype.onMapTouch;
    }

    return true;
  }

  static __applyMouseMapTouchPatch() {
    if (!this.__storeMouseMapTouchOriginals()) return;

    if (!this.isMouseMoveEnabled() && !this.isMouseTeleportEnabled()) {
      if (this._orig_updateDestination) {
        Scene_Map.prototype.updateDestination = this._orig_updateDestination;
      }
      if (this._orig_processMapTouch) {
        Scene_Map.prototype.processMapTouch = this._orig_processMapTouch;
      }
      if (this._orig_onMapTouch) {
        Scene_Map.prototype.onMapTouch = this._orig_onMapTouch;
      }
      return;
    }

    Scene_Map.prototype.updateDestination = function () {
      const canTouchMap =
        (!this.isActive || this.isActive()) &&
        (!$gamePlayer ||
          typeof $gamePlayer.canMove !== "function" ||
          $gamePlayer.canMove());

      if (canTouchMap) {
        this.processMapTouch();
      } else if (
        $gameTemp &&
        typeof $gameTemp.clearDestination === "function"
      ) {
        $gameTemp.clearDestination();
      }
    };

    Scene_Map.prototype.processMapTouch = function () {
      const touchInput = /** @type {any} */ (TouchInput);
      if (typeof this._touchCount !== "number") {
        this._touchCount = 0;
      }

      const isTriggered =
        typeof touchInput.isTriggered === "function" &&
        touchInput.isTriggered();
      const isPressed =
        typeof touchInput.isPressed === "function" && touchInput.isPressed();

      if (isTriggered || this._touchCount > 0) {
        if (isPressed) {
          this._touchCount += 1;
          if (this._touchCount === 1 || this._touchCount >= 15) {
            this.onMapTouch();
          }
        } else {
          this._touchCount = 0;
        }
      }
    };

    Scene_Map.prototype.onMapTouch = function () {
      const touchInput = /** @type {any} */ (TouchInput);
      const x = $gameMap.canvasToMapX(touchInput.x);
      const y = $gameMap.canvasToMapY(touchInput.y);

      if (GeneralCheat.isMouseTeleportEnabled()) {
        $gamePlayer.locate(x, y);
      } else if ($gameTemp && typeof $gameTemp.setDestination === "function") {
        $gameTemp.setDestination(x, y);
      }
    };
  }
}
