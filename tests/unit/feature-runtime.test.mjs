import test from "node:test";
import assert from "node:assert/strict";
test("pop-out resolves the same game-owned runtime and initialization is idempotent", async () => {
  const { initializeFeatureRuntime, getFeatureRuntime, getGameWindow } =
    await import("../../cheat-engine/www/cheat/js/runtime/FeatureRuntime.js");
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
