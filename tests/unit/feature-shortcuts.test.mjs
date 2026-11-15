import test from "node:test";
import assert from "node:assert/strict";
import { Key } from "../../cheat-engine/www/cheat/js/shortcuts/KeyCodes.js";
import { handleFeatureShortcut } from "../../cheat-engine/www/cheat/js/ui/FeatureShortcuts.js";
test("feature shortcuts honor customized keys and suppress browser actions without hijacking key recording", () => {
  let called = 0,
    blocked = 0;
  const keys = {
    openFeatureFinder: Key.fromString("ctrl p"),
    openMessageLog: Key.fromString("alt h"),
  };
  const manager = { getShortcut: (id) => keys[id] };
  const actions = {
    openFeatureFinder: () => called++,
    openMessageLog: () => called++,
  };
  const event = {
    keyCode: 80,
    ctrlKey: true,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    repeat: false,
    target: { closest: () => null },
    preventDefault() {
      blocked++;
    },
    stopPropagation() {},
    stopImmediatePropagation() {},
  };
  assert.equal(handleFeatureShortcut(event, manager, actions), true);
  assert.equal(called, 1);
  assert.equal(blocked, 1);
  event.repeat = true;
  handleFeatureShortcut(event, manager, actions);
  assert.equal(called, 1);
  assert.equal(blocked, 2);
  event.target.closest = () => ({});
  assert.equal(handleFeatureShortcut(event, manager, actions), false);
  event.target.closest = () => null;
  event.repeat = false;
  event.keyCode = 72;
  assert.equal(
    handleFeatureShortcut(event, manager, actions),
    false,
    "Ctrl+H no longer assigned",
  );
  event.ctrlKey = false;
  event.altKey = true;
  assert.equal(handleFeatureShortcut(event, manager, actions), true);
  assert.equal(called, 2);
});
test("a game-window key matches events created by the pop-out's separate Key constructor", () => {
  class GameRealmKey extends Key {}
  const assigned = new GameRealmKey(72, true, false, false, false);
  const manager = {
    getShortcut: (id) =>
      id === "openMessageLog" ? assigned : Key.createEmpty(),
  };
  let opened = false;
  const event = {
    keyCode: 72,
    ctrlKey: true,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    repeat: false,
    preventDefault() {},
    stopPropagation() {},
    stopImmediatePropagation() {},
  };
  assert.equal(
    handleFeatureShortcut(event, manager, {
      openMessageLog: () => {
        opened = true;
      },
    }),
    true,
  );
  assert.equal(opened, true);
});
