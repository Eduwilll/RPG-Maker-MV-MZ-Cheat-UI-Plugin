import test from "node:test";
import assert from "node:assert/strict";
import {
  ensureSaveRuntime,
  watchSaveRuntime,
} from "../../cheat-engine/www/cheat/js/runtime/EarlySaveRuntime.js";
import { initializeFeatureRuntime } from "../../cheat-engine/www/cheat/js/runtime/FeatureRuntime.js";

function gameFixture() {
  return {
    JSON,
    $dataEnemies: [null, { id: 1, name: "Slime", gold: 5 }],
    DataManager: {
      makeSaveContents() {
        return { ordinary: 42 };
      },
      extractSaveContents() {},
      setupNewGame() {},
    },
  };
}
const saved = {
  cheatDatabaseOverrides: {
    version: 1,
    entries: [{ kind: "enemy", id: 1, patch: { gold: 99 } }],
  },
};

test("save edits survive a load and save while UI dependencies are unavailable", () => {
  const game = gameFixture();
  const database = ensureSaveRuntime(game);
  const extract = game.DataManager.extractSaveContents;
  assert.equal(ensureSaveRuntime(game), database);
  assert.equal(game.DataManager.extractSaveContents, extract);
  game.DataManager.extractSaveContents(saved);
  assert.equal(game.$dataEnemies[1].gold, 99);
  assert.deepEqual(
    game.DataManager.makeSaveContents().cheatDatabaseOverrides,
    saved.cheatDatabaseOverrides,
  );
  assert.equal(game.__cheatFeatures, undefined);
  // A failed UI download never owns or clears the early game runtime.
  assert.deepEqual(
    game.DataManager.makeSaveContents().cheatDatabaseOverrides,
    saved.cheatDatabaseOverrides,
  );
  game.DataManager.setupNewGame();
  assert.equal(game.$dataEnemies[1].gold, 5);
});

test("later UI initialization reuses the early runtime and its pending edits", () => {
  const game = gameFixture();
  const database = ensureSaveRuntime(game);
  game.DataManager.extractSaveContents(saved);
  const storage = { getItem() {}, setItem() {} };
  const runtime = initializeFeatureRuntime(game, {
    settingsStorage: storage,
    lockStorage: storage,
  });
  assert.equal(runtime.database, database);
  assert.equal(runtime.database.isEdited("enemy", 1), true);
  assert.equal(game.$dataEnemies[1].gold, 99);
  runtime.locks.dispose();
});

test("installation can be retried when DataManager is not yet available", () => {
  const game = gameFixture();
  const manager = game.DataManager;
  delete game.DataManager;
  const database = ensureSaveRuntime(game);
  game.DataManager = manager;
  assert.equal(ensureSaveRuntime(game), database);
  manager.extractSaveContents(saved);
  assert.equal(game.$dataEnemies[1].gold, 99);
});

test("late MZ managers install save hooks on script load without any UI retry", () => {
  for (const initial of [undefined, {}]) {
    const game = gameFixture();
    const manager = game.DataManager;
    game.DataManager = initial;
    game.document = new EventTarget();
    let poll;
    let cleared = false;
    game.setInterval = (action) => {
      poll = action;
      return 1;
    };
    game.clearInterval = () => {
      cleared = true;
    };
    watchSaveRuntime(game);
    watchSaveRuntime(game);
    game.DataManager = initial || {};
    Object.assign(game.DataManager, manager);
    // MZ loads rmmz_managers.js after the classic cheat bootstrap. Its captured
    // script-load event runs before game boot and does not await UI dependencies.
    game.document.dispatchEvent(new Event("load"));
    game.DataManager.extractSaveContents(saved);
    assert.equal(game.$dataEnemies[1].gold, 99);
    assert.deepEqual(
      game.DataManager.makeSaveContents().cheatDatabaseOverrides,
      saved.cheatDatabaseOverrides,
    );
    assert.equal(cleared, true);
    assert.equal(typeof poll, "function");
    assert.equal(game.__cheatFeatures, undefined);
  }
});
