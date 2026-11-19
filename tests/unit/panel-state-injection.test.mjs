import test from "node:test";
import assert from "node:assert/strict";
import {
  readMapLayers,
  writeMapLayer,
  resetMapLayers,
} from "../../cheat-engine/www/cheat/js/panels/map/MapLayersState.js";
import {
  readLocksState,
  favoriteSort,
} from "../../cheat-engine/www/cheat/js/panels/locks/LockPanelState.js";
import {
  readGameOptionsState,
} from "../../cheat-engine/www/cheat/js/panels/options/GameOptionsPanelState.js";
import {
  readMessageLog,
  readMessageLogPreferences,
} from "../../cheat-engine/www/cheat/js/panels/history/MessageLogPanelState.js";

function fakeRuntime() {
  const calls = [];
  const store = new Map();
  return {
    calls,
    store,
    mapLayers: {
      read: () => ({ sprites: false }),
      write: (key, value) => calls.push(["write", key, value]),
      reset: () => calls.push(["reset"]),
    },
    locks: {
      list: () => ["lock-a"],
      sortFavorites: (rows) => ["favorite-first"].concat(rows),
    },
    options: { list: () => ["alwaysDash"] },
    history: { list: () => ["line-1"] },
    messageLogPreferences: {
      read: () => ({ followLatest: false }),
      revision: () => 7,
      write: (patch) => calls.push(["writePrefs", patch]),
      reset: () => calls.push(["resetPrefs"]),
    },
  };
}

test("map layer state reads through the injected runtime", () => {
  const runtime = fakeRuntime();
  assert.deepEqual(readMapLayers(runtime), { sprites: false });
});

test("map layer writes and resets go to the injected runtime", () => {
  const runtime = fakeRuntime();
  writeMapLayer("sprites", false, runtime);
  resetMapLayers(runtime);
  assert.deepEqual(runtime.calls, [["write", "sprites", false], ["reset"]]);
});

test("locks state reads and sorts through the injected runtime", () => {
  const runtime = fakeRuntime();
  assert.deepEqual(readLocksState(runtime), ["lock-a"]);
  assert.deepEqual(favoriteSort(["row"], null, runtime), [
    "favorite-first",
    "row",
  ]);
});

test("game options state reads through the injected runtime", () => {
  assert.deepEqual(readGameOptionsState(fakeRuntime()), ["alwaysDash"]);
});

test("message log state reads through the injected runtime", () => {
  const runtime = fakeRuntime();
  assert.deepEqual(readMessageLog({}, runtime), ["line-1"]);
  assert.deepEqual(readMessageLogPreferences(runtime), {
    followLatest: false,
  });
});

test("a missing runtime keeps the documented fallbacks", () => {
  // These are the shapes the panels render before the game exists; passing
  // `null` must not throw or reach the locator.
  assert.equal(readLocksState(null).length, 0);
  assert.equal(readGameOptionsState(null).length, 0);
  assert.equal(readMessageLog(null, null).length, 0);
  assert.equal(readMapLayers(null).sprites, true, "layer defaults");
  assert.equal(readMessageLogPreferences(null).fontSize, 16, "log defaults");
});