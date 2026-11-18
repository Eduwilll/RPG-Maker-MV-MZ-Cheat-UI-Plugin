// @ts-check

import { Alert } from "../../AlertHelper.js";

/**
 * MovementCheat - owns every movement-related mutation seam.
 *
 * No clip (`$gamePlayer._through`) plus the mouse move / mouse teleport
 * patches for `TouchInput` and `Scene_Map`. Each seam is injected so the
 * module can run against fakes in tests.
 */

/**
 * @typedef {Object} MovementGlobals
 * @property {() => any} getPlayer
 * @property {() => any} getTouchInput
 * @property {() => any} getSceneMap
 * @property {() => any} getGameMap
 * @property {() => any} getGameTemp
 * @property {() => any} getAlert
 */

/** @returns {MovementGlobals} */
function liveGlobals() {
  return {
    // eslint-disable-next-line no-undef
    getPlayer: () => $gamePlayer,
    // eslint-disable-next-line no-undef
    getTouchInput: () => TouchInput,
    // eslint-disable-next-line no-undef
    getSceneMap: () => Scene_Map,
    // eslint-disable-next-line no-undef
    getGameMap: () => $gameMap,
    // eslint-disable-next-line no-undef
    getGameTemp: () => $gameTemp,
    getAlert: () => Alert,
  };
}

/**
 * @param {Partial<MovementGlobals>} [overrides]
 * @returns {Object} Movement cheat module
 */
export function createMovementCheat(overrides = {}) {
  const globals = Object.assign(liveGlobals(), overrides);

  let mouseMove = false;
  let mouseTeleport = false;
  let touchOriginals = null;
  let mapTouchOriginals = null;

  /**
   * @param {"success"|"info"} level
   * @param {string} text
   */
  function notify(level, text) {
    const alert = globals.getAlert();
    if (alert && typeof alert[level] === "function") alert[level](text);
  }

  function toggleNoClip() {
    const player = globals.getPlayer();
    player._through = !player._through;
    notify(
      player._through ? "success" : "info",
      `No clip toggled: ${player._through}`,
    );
  }

  function isMouseInputPatchEnabled() {
    return mouseMove || mouseTeleport;
  }

  function storeTouchInputOriginals() {
    const touchInput = globals.getTouchInput();
    if (!touchInput) return false;
    if (!touchOriginals) {
      touchOriginals = {
        isPressed: touchInput.isPressed,
        isTriggered: touchInput.isTriggered,
        isRepeated: touchInput.isRepeated,
        isLongPressed: touchInput.isLongPressed,
        isCancelled: touchInput.isCancelled,
        isMoved: touchInput.isMoved,
        isReleased: touchInput.isReleased,
        wheelX: Object.getOwnPropertyDescriptor(touchInput, "wheelX"),
        wheelY: Object.getOwnPropertyDescriptor(touchInput, "wheelY"),
      };
    }
    return true;
  }

  function applyTouchInputPatch() {
    if (!storeTouchInputOriginals()) return;
    const touchInput = globals.getTouchInput();

    if (!isMouseInputPatchEnabled()) {
      touchInput.isPressed = touchOriginals.isPressed;
      touchInput.isTriggered = touchOriginals.isTriggered;
      touchInput.isRepeated = touchOriginals.isRepeated;
      touchInput.isLongPressed = touchOriginals.isLongPressed;
      touchInput.isCancelled = touchOriginals.isCancelled;
      touchInput.isMoved = touchOriginals.isMoved;
      touchInput.isReleased = touchOriginals.isReleased;
      if (touchOriginals.wheelX) {
        Object.defineProperty(touchInput, "wheelX", touchOriginals.wheelX);
      }
      if (touchOriginals.wheelY) {
        Object.defineProperty(touchInput, "wheelY", touchOriginals.wheelY);
      }
      return;
    }

    touchInput.isPressed = function () {
      return !!(this._mousePressed || this._screenPressed);
    };
    touchInput.isTriggered = function () {
      return !!this._triggered;
    };
    touchInput.isRepeated = function () {
      return (
        this.isPressed() &&
        (this._triggered ||
          (this._pressedTime >= this.keyRepeatWait &&
            this._pressedTime % this.keyRepeatInterval === 0))
      );
    };
    touchInput.isLongPressed = function () {
      return this.isPressed() && this._pressedTime >= this.keyRepeatWait;
    };
    touchInput.isCancelled = function () {
      return !!this._cancelled;
    };
    touchInput.isMoved = function () {
      return !!this._moved;
    };
    touchInput.isReleased = function () {
      return !!this._released;
    };

    Object.defineProperty(touchInput, "wheelX", {
      get: function () {
        return this._wheelX || 0;
      },
      configurable: true,
    });
    Object.defineProperty(touchInput, "wheelY", {
      get: function () {
        return this._wheelY || 0;
      },
      configurable: true,
    });
  }

  function storeMapTouchOriginals() {
    const sceneMap = /** @type {any} */ (globals.getSceneMap());
    if (!sceneMap) return false;
    if (!mapTouchOriginals) {
      mapTouchOriginals = {
        updateDestination: sceneMap.prototype.updateDestination,
        processMapTouch: sceneMap.prototype.processMapTouch,
        onMapTouch: sceneMap.prototype.onMapTouch,
      };
    }
    return true;
  }

  function applyMapTouchPatch() {
    if (!storeMapTouchOriginals()) return;
    const proto = /** @type {any} */ (globals.getSceneMap()).prototype;

    if (!isMouseInputPatchEnabled()) {
      if (mapTouchOriginals.updateDestination) {
        proto.updateDestination = mapTouchOriginals.updateDestination;
      }
      if (mapTouchOriginals.processMapTouch) {
        proto.processMapTouch = mapTouchOriginals.processMapTouch;
      }
      if (mapTouchOriginals.onMapTouch) {
        proto.onMapTouch = mapTouchOriginals.onMapTouch;
      }
      return;
    }

    proto.updateDestination = function () {
      const gamePlayer = globals.getPlayer();
      const canTouchMap =
        (!this.isActive || this.isActive()) &&
        (!gamePlayer ||
          typeof gamePlayer.canMove !== "function" ||
          gamePlayer.canMove());

      if (canTouchMap) {
        this.processMapTouch();
      } else {
        const gameTemp = globals.getGameTemp();
        if (gameTemp && typeof gameTemp.clearDestination === "function") {
          gameTemp.clearDestination();
        }
      }
    };

    proto.processMapTouch = function () {
      const scene = /** @type {any} */ (this);
      const touchInput = globals.getTouchInput();
      if (typeof scene._touchCount !== "number") {
        scene._touchCount = 0;
      }

      const isTriggered =
        typeof touchInput.isTriggered === "function" &&
        touchInput.isTriggered();
      const isPressed =
        typeof touchInput.isPressed === "function" && touchInput.isPressed();

      if (isTriggered || scene._touchCount > 0) {
        if (isPressed) {
          scene._touchCount += 1;
          if (scene._touchCount === 1 || scene._touchCount >= 15) {
            scene.onMapTouch();
          }
        } else {
          scene._touchCount = 0;
        }
      }
    };

    proto.onMapTouch = function () {
      const touchInput = globals.getTouchInput();
      const gameMap = globals.getGameMap();
      const gameTemp = globals.getGameTemp();
      const x = gameMap.canvasToMapX(touchInput.x);
      const y = gameMap.canvasToMapY(touchInput.y);

      if (isMouseTeleportEnabled()) {
        globals.getPlayer().locate(x, y);
      } else if (gameTemp && typeof gameTemp.setDestination === "function") {
        gameTemp.setDestination(x, y);
      }
    };
  }

  function toggleMouseTeleport(enabled) {
    if (enabled === undefined) {
      enabled = !isMouseTeleportEnabled();
    }
    mouseTeleport = enabled;
    if (enabled) {
      mouseMove = false;
    }

    applyTouchInputPatch();
    applyMapTouchPatch();
    notify(
      enabled ? "success" : "info",
      `Mouse Teleport: ${enabled ? "Enabled" : "Disabled"}`,
    );
  }

  function isMouseTeleportEnabled() {
    return !!mouseTeleport;
  }

  function toggleMouseMove(enabled) {
    if (enabled === undefined) {
      enabled = !isMouseMoveEnabled();
    }
    mouseMove = enabled;
    if (enabled) {
      mouseTeleport = false;
    }

    applyTouchInputPatch();
    applyMapTouchPatch();
    notify(
      enabled ? "success" : "info",
      `Mouse Move: ${enabled ? "Enabled" : "Disabled"}`,
    );
  }

  function isMouseMoveEnabled() {
    return !!mouseMove;
  }

  return Object.freeze({
    toggleNoClip,
    toggleMouseTeleport,
    isMouseTeleportEnabled,
    toggleMouseMove,
    isMouseMoveEnabled,
    isMouseInputPatchEnabled,
    applyTouchInputPatch,
    applyMapTouchPatch,
  });
}
