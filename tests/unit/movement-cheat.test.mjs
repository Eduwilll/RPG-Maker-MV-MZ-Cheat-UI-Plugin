import test from "node:test";
import assert from "node:assert/strict";
import { createMovementCheat } from "../../cheat-engine/www/cheat/js/cheats/movement/MovementCheat.js";

function alertSpy() {
  const messages = [];
  return {
    messages,
    success: (text) => messages.push(["success", text]),
    info: (text) => messages.push(["info", text]),
  };
}

function fakeTouchInput() {
  return {
    x: 0,
    y: 0,
    _mousePressed: false,
    _screenPressed: false,
    _triggered: false,
    isPressed() {
      return false;
    },
    isTriggered() {
      return false;
    },
    isRepeated() {
      return false;
    },
    isLongPressed() {
      return false;
    },
    isCancelled() {
      return false;
    },
    isMoved() {
      return false;
    },
    isReleased() {
      return false;
    },
  };
}

function setup() {
  class SceneMap {
    updateDestination() {}
    processMapTouch() {}
    onMapTouch() {}
  }
  const player = { _through: false, canMove: () => true, locate() {} };
  const gameMap = {
    canvasToMapX: (x) => x,
    canvasToMapY: (y) => y,
  };
  const gameTemp = { destination: null, setDestination(x, y) {
    this.destination = [x, y];
  }, cleared: 0, clearDestination() {
    this.cleared += 1;
  } };
  const alert = alertSpy();
  const module = createMovementCheat({
    getPlayer: () => player,
    getTouchInput: () => touchInput,
    getSceneMap: () => SceneMap,
    getGameMap: () => gameMap,
    getGameTemp: () => gameTemp,
    getAlert: () => alert,
  });
  const touchInput = fakeTouchInput();
  return { module, player, gameTemp, alert, touchInput, SceneMap };
}

test("no clip flips the player flag and reports the new state", () => {
  const { module, player, alert } = setup();

  module.toggleNoClip();
  assert.equal(player._through, true);
  assert.deepEqual(alert.messages.at(-1), [
    "success",
    "No clip toggled: true",
  ]);

  module.toggleNoClip();
  assert.equal(player._through, false);
  assert.deepEqual(alert.messages.at(-1), ["info", "No clip toggled: false"]);
});

test("mouse move and mouse teleport are mutually exclusive", () => {
  const { module } = setup();

  module.toggleMouseMove(true);
  assert.equal(module.isMouseMoveEnabled(), true);
  assert.equal(module.isMouseTeleportEnabled(), false);

  module.toggleMouseTeleport(true);
  assert.equal(module.isMouseTeleportEnabled(), true);
  assert.equal(module.isMouseMoveEnabled(), false);

  module.toggleMouseTeleport(false);
  assert.equal(module.isMouseTeleportEnabled(), false);
  assert.equal(module.isMouseInputPatchEnabled(), false);
});

test("turning mouse input off restores the original TouchInput methods", () => {
  const { module, touchInput } = setup();
  const originalPressed = touchInput.isPressed;
  const originalTriggered = touchInput.isTriggered;

  module.toggleMouseMove(true);
  assert.notEqual(touchInput.isPressed, originalPressed);
  touchInput._mousePressed = true;
  assert.equal(touchInput.isPressed(), true);

  module.toggleMouseMove(false);
  assert.equal(touchInput.isPressed, originalPressed);
  assert.equal(touchInput.isTriggered, originalTriggered);
});

test("the map touch patch follows the movement flags", () => {
  const { module, gameTemp, touchInput, SceneMap } = setup();
  const originalOnMapTouch = SceneMap.prototype.onMapTouch;

  module.toggleMouseMove(true);
  assert.notEqual(SceneMap.prototype.onMapTouch, originalOnMapTouch);

  touchInput.x = 3;
  touchInput.y = 4;
  SceneMap.prototype.onMapTouch.call({});
  assert.deepEqual(gameTemp.destination, [3, 4]);

  module.toggleMouseMove(false);
  assert.equal(SceneMap.prototype.onMapTouch, originalOnMapTouch);
});

test("mouse teleport relocates the player instead of pathing", () => {
  const { module, player, gameTemp, touchInput, SceneMap } = setup();
  let located = null;
  player.locate = (x, y) => {
    located = [x, y];
  };

  module.toggleMouseTeleport(true);
  touchInput.x = 7;
  touchInput.y = 9;
  SceneMap.prototype.onMapTouch.call({});

  assert.deepEqual(located, [7, 9]);
  assert.equal(gameTemp.destination, null);
});
