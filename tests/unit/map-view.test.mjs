import test from "node:test";
import assert from "node:assert/strict";
import InteractiveMap from "../../cheat-engine/www/cheat/components/InteractiveMap.js";
import MinimapOverlay from "../../cheat-engine/www/cheat/components/MinimapOverlay.js";
import { KEY_VALUE_STORAGE } from "../../cheat-engine/www/cheat/js/storage/KeyValueStorage.js";
import {
  readMinimapSettings,
  writeMinimapMode,
  writeMinimapZoom,
} from "../../cheat-engine/www/cheat/js/panels/minimap/MinimapPanelState.js";

test("stale event-search results cannot acquire the destination map ID after a transfer", () => {
  const state = {
    currentMapId: 8,
    _mapGeneration: 2,
    selection: null,
    compact: false,
    zoom: 1,
    saveView() {},
    renderMap() {},
  };
  InteractiveMap.methods.selectEvent.call(state, {
    id: 4,
    mapId: 7,
    mapRevision: 1,
    x: 3,
    y: 4,
    kind: "npc",
  });
  assert.equal(state.selection, null);
});

test("Follow normalizes a previously panned compact camera instead of multiplying zoom again", (t) => {
  const values = new Map();
  t.mock.method(KEY_VALUE_STORAGE, "getItem", (key) => values.get(key));
  t.mock.method(KEY_VALUE_STORAGE, "setItem", (key, value) =>
    values.set(key, value),
  );
  writeMinimapMode("full");
  writeMinimapZoom(4);
  const state = {
    compact: true,
    _camera: { mapWidth: 140, mapHeight: 140, zoom: 4 },
    saveView() {},
    renderMap() {},
  };
  InteractiveMap.methods.followPlayer.call(state);
  assert.equal(readMinimapSettings().zoom, 1);
  assert.equal(readMinimapSettings().mode, "follow");
});

test("minimap move handle isolates non-movement keys too", () => {
  let stopped = false;
  MinimapOverlay.methods.moveKey.call(
    {},
    {
      key: "Enter",
      stopPropagation() {
        stopped = true;
      },
    },
  );
  assert.equal(stopped, true);
});
