import test from "node:test";
import assert from "node:assert/strict";
import {
  initializeFeatureRuntime,
  getFeatureRuntime,
  getGameWindow,
} from "../../cheat-engine/www/cheat/js/runtime/FeatureRuntime.js";

test("pop-out resolves the same game-owned runtime and initialization is idempotent", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  };
  const game = {
    JSON,
    DataManager: {
      setupNewGame() {},
      makeSaveContents() {
        return {};
      },
      extractSaveContents() {},
    },
  };
  const runtime = initializeFeatureRuntime(game, {
    settingsStorage: storage,
    lockStorage: storage,
  });
  const popup = { __cheatOpener: game };
  assert.equal(getFeatureRuntime(popup), runtime);
  assert.equal(initializeFeatureRuntime(game), runtime);
  assert.equal(getGameWindow(popup), game);
  assert.equal(getFeatureRuntime({}), null);
  assert.ok(
    runtime.database &&
      runtime.history &&
      runtime.locks &&
      runtime.options &&
      runtime.battle,
  );
  runtime.locks.dispose();
});

test("an injected runtime wins over the installed locator", () => {
  const installed = { name: "installed" };
  const injected = { name: "injected" };

  // The game window stands in for the installed runtime; the component passes
  // the one it received through provide/inject.
  assert.equal(getFeatureRuntime({}, { runtime: injected }), injected);
  assert.notEqual(getFeatureRuntime({}, { runtime: injected }), installed);
});

test("injection is optional: without it the locator still resolves", () => {
  const runtime = { name: "installed" };
  const game = { __cheatFeatures: runtime };

  assert.equal(getFeatureRuntime(game), runtime);
  assert.equal(getFeatureRuntime(game, {}), runtime);
  assert.equal(getFeatureRuntime(game, { runtime: null }), runtime);
});

test("the runtime is resolved per call, not cached at import time", () => {
  // The pop-out mounts before the opener installs the runtime. A lazy
  // provider plus the locator fallback is what lets the first panel work.
  const game = {};
  assert.equal(getFeatureRuntime(game), null);

  game.__cheatFeatures = { name: "late" };
  assert.equal(getFeatureRuntime(game).name, "late");
});
