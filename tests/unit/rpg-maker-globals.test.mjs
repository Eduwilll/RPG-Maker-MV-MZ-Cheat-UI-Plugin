import test from "node:test";
import assert from "node:assert/strict";
import {
  RPG_MAKER_GLOBALS,
  bridgeGlobal,
  bridgeGlobals,
} from "../../cheat-engine/www/cheat/js/runtime/RpgMakerGlobals.js";

test("the global list covers the objects panels touch", () => {
  for (const name of [
    "$gameParty",
    "$gamePlayer",
    "$dataMap",
    "Utils",
    "SceneManager",
    "Game_Actor",
  ]) {
    assert.ok(RPG_MAKER_GLOBALS.includes(name), `${name} is bridged`);
  }
  assert.ok(RPG_MAKER_GLOBALS.length > 50, "the whole surface is listed");
});

test("the list is frozen so callers cannot extend it by accident", () => {
  assert.ok(Object.isFrozen(RPG_MAKER_GLOBALS));
});

test("a bridged global reads through to the game window", () => {
  const game = { $gameParty: { gold: 1 } };
  const popup = {};

  assert.equal(bridgeGlobal(popup, game, "$gameParty"), "live");
  assert.equal(popup.$gameParty, game.$gameParty);
});

test("writes from the pop-out land on the game window", () => {
  const game = { $gameMap: null };
  const popup = {};

  bridgeGlobal(popup, game, "$gameMap");
  const next = { mapId: 3 };
  popup.$gameMap = next;

  assert.equal(game.$gameMap, next);
});

test("a global the game creates later appears without rebinding", () => {
  const game = {};
  const popup = {};

  bridgeGlobal(popup, game, "$gamePlayer");

  assert.equal(popup.$gamePlayer, undefined, "still undefined after bridging");

  const player = { x: 5 };
  game.$gamePlayer = player;

  assert.equal(popup.$gamePlayer, player, "the getter reads the live value");
});

test("each outcome is reported once", () => {
  const blocked = {};
  Object.defineProperty(blocked, "fixed", {
    configurable: false,
    writable: true,
    value: "untouched",
  });
  const counts = bridgeGlobals(
    blocked,
    { a: 1, fixed: 2, c: "still live" },
    ["a", "fixed", "c"],
  );

  assert.deepEqual(counts, { live: 2, copy: 1, skipped: 0 });
});

test("a non-configurable target falls back to a copied value", () => {
  const sealed = {};
  Object.defineProperty(sealed, "$gameParty", {
    configurable: false,
    writable: true,
    value: null,
  });
  const game = { $gameParty: { gold: 9 } };

  assert.equal(bridgeGlobal(sealed, game, "$gameParty"), "copy");
  assert.equal(sealed.$gameParty, game.$gameParty);
});

test("a skipped global does not clobber the target", () => {
  const target = {};
  Object.defineProperty(target, "Utils", {
    configurable: false,
    writable: true,
    value: "keep",
  });
  const source = {};

  assert.equal(bridgeGlobal(target, source, "Utils"), "skipped");
  assert.equal(target.Utils, "keep");
});

test("a global the game has not created yet is skipped, not lost", () => {
  // Real windows accept a getter even when the source is undefined, so this
  // pins the documented fallback behaviour on a target that refuses it.
  const blocked = {};
  Object.defineProperty(blocked, "Utils", {
    configurable: false,
    writable: true,
    value: "untouched",
  });

  assert.equal(bridgeGlobal(blocked, {}, "Utils"), "skipped");
  assert.equal(blocked.Utils, "untouched");
});

test("bridging is idempotent and keeps working on the same window", () => {
  const game = { Utils: { isNwjs: () => true } };
  const popup = {};

  bridgeGlobals(popup, game, ["Utils"]);
  bridgeGlobals(popup, game, ["Utils"]);

  assert.equal(popup.Utils.isNwjs(), true);
});