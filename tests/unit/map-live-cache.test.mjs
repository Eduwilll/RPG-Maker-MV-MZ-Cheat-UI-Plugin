import test from "node:test";
import assert from "node:assert/strict";
import {
  readMapMarkers,
  markerVisible,
} from "../../cheat-engine/www/cheat/js/panels/map/MapMarkers.js";
import { KEY_VALUE_STORAGE } from "../../cheat-engine/www/cheat/js/storage/KeyValueStorage.js";

const settingsUrl = new URL(
  "../../cheat-engine/www/cheat/js/panels/minimap/MinimapPanelState.js",
  import.meta.url,
);
const defaults = {
  enabled: false,
  moveMode: false,
  position: "top-right",
  customX: 8,
  customY: 8,
  size: 176,
  zoom: 1,
  mode: "follow",
  opacity: 0.85,
  showEvents: true,
};

function trackedList(commands) {
  let reads = 0;
  return {
    list: commands.map(([code, parameters = []]) => ({
      get code() {
        reads++;
        return code;
      },
      parameters,
    })),
    reads: () => reads,
  };
}

function markerGame(page) {
  const event = {
    _eventId: 1,
    _pageIndex: 0,
    _characterName: "People",
    _realX: 1,
    _realY: 2,
    _direction: 2,
    _pattern: 1,
    page: () => page,
  };
  return {
    event,
    game: {
      $gameMap: { _mapId: 1, events: () => [event] },
      $dataMap: { events: [null, { name: "Villager", pages: [page] }] },
      $dataCommonEvents: [],
      SceneManager: { _scene: {} },
    },
  };
}

test("cached command classification still returns fresh primitive live markers", () => {
  const tracked = trackedList([[0]]);
  const { game, event } = markerGame({ list: tracked.list });
  const [first] = readMapMarkers(game);
  const scans = tracked.reads();
  assert.ok(scans > 0);
  Object.assign(event, {
    _realX: 4.5,
    _realY: 6.25,
    _direction: 8,
    _pattern: 2,
    _opacity: 64,
    _transparent: true,
    _tileId: 7,
    _characterIndex: 3,
    _moveType: 1,
    shiftY: () => 6,
    jumpHeight: () => 9,
  });
  game.$dataMap.events[1].name = "Renamed";
  for (let frame = 0; frame < 120; frame++) {
    const [row] = readMapMarkers(game);
    assert.deepEqual(row, {
      id: 1,
      name: "Renamed",
      x: 4.5,
      y: 6.25,
      kind: "npc",
      color: "#ffd700",
      erased: false,
      characterName: "People",
      tileId: 7,
      characterIndex: 3,
      pattern: 2,
      opacity: 64,
      transparent: true,
      shiftY: 6,
      jumpHeight: 9,
      direction: 8,
      moving: true,
    });
    assert.equal(markerVisible(row, {}), false);
  }
  assert.equal(first.x, 1);
  assert.equal(tracked.reads(), scans, "RAF must not rescan stable commands");
  event._transparent = false;
  event._opacity = 0;
  assert.equal(markerVisible(readMapMarkers(game)[0], {}), false);
  event._opacity = 255;
  assert.equal(markerVisible(readMapMarkers(game)[0], {}), true);
});

test("page, command list and graphic changes reclassify without caching erased or inactive events", () => {
  const tracked = trackedList([[0]]);
  const page = { list: tracked.list };
  const { game, event } = markerGame(page);
  assert.equal(readMapMarkers(game)[0].kind, "npc");
  event._characterName = "";
  assert.equal(readMapMarkers(game)[0].kind, "event");
  const scans = tracked.reads();
  event._erased = true;
  assert.deepEqual(readMapMarkers(game), []);
  event._erased = false;
  event._pageIndex = -1;
  assert.deepEqual(readMapMarkers(game), []);
  assert.equal(tracked.reads(), scans);
  event._pageIndex = 1;
  const battle = trackedList([[301]]);
  event.page = () => ({ list: battle.list });
  assert.equal(readMapMarkers(game)[0].kind, "enemy");
  event.page = () => page;
  page.list = [{ code: 125, parameters: [0] }];
  assert.equal(readMapMarkers(game)[0].kind, "treasure");
  event._realX = NaN;
  event.x = 9;
  assert.equal(readMapMarkers(game)[0].x, 9);
  event.x = undefined;
  assert.deepEqual(readMapMarkers(game), []);
});

test("common-event traversal is cached but database, map and scene identities invalidate it", () => {
  const tracked = trackedList([[117, [1]]]);
  const common = trackedList([
    [126, [1, 0]],
    [117, [1]],
  ]);
  const { game } = markerGame({ list: tracked.list });
  game.$dataCommonEvents = [null, { list: common.list }];
  assert.equal(readMapMarkers(game)[0].kind, "treasure");
  const scans = common.reads();
  for (let i = 0; i < 60; i++) readMapMarkers(game);
  assert.equal(common.reads(), scans, "nested common events scan only once");
  game.$dataCommonEvents = [null, { list: [{ code: 301 }] }];
  assert.equal(readMapMarkers(game)[0].kind, "enemy");

  const transitions = [
    () => {
      game.SceneManager._scene = {};
    },
    () => {
      game.$gameMap._mapId++;
    },
    () => {
      game.$dataMap = { ...game.$dataMap };
    },
    () => {
      game.$gameMap = { ...game.$gameMap };
    },
  ];
  for (const transition of transitions) {
    const before = tracked.reads();
    transition();
    assert.equal(readMapMarkers(game)[0].kind, "enemy");
    assert.ok(tracked.reads() > before, "new context must reclassify");
    const after = tracked.reads();
    readMapMarkers(game);
    assert.equal(tracked.reads(), after);
  }
  const otherGame = { ...game, $dataCommonEvents: [] };
  assert.equal(readMapMarkers(otherGame)[0].kind, "npc");
  game.$gameMap = null;
  assert.deepEqual(readMapMarkers(game), []);
  assert.deepEqual(readMapMarkers(null), []);
});

test("classification preserves battle precedence, gain semantics and traversal limits", () => {
  const cases = [
    { list: [{ code: 125, parameters: [1] }], want: "npc" },
    { list: [{ code: 128, parameters: [1, 0] }], want: "treasure" },
    { list: [{ code: 125, parameters: [0] }, { code: 301 }], want: "enemy" },
    {
      list: [
        ...Array.from({ length: 2048 }, () => ({ code: 0 })),
        { code: 301 },
      ],
      want: "npc",
    },
    {
      list: [{ code: 355, parameters: ["throw Error('never execute')"] }],
      want: "npc",
    },
  ];
  for (const { list, want } of cases) {
    const { game } = markerGame({ list });
    assert.equal(readMapMarkers(game)[0].kind, want);
    assert.equal(readMapMarkers(game)[0].kind, want);
  }
});

function memoryStorage(t, initial = {}) {
  const values = new Map(Object.entries(initial));
  let reads = 0;
  t.mock.method(KEY_VALUE_STORAGE, "getItem", (key) => {
    reads++;
    return values.get(key);
  });
  t.mock.method(KEY_VALUE_STORAGE, "setItem", (key, value) => {
    values.set(key, value);
  });
  return { values, reads: () => reads };
}

function useWindow(t, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value,
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else delete globalThis.window;
  });
}

test("minimap RAF reads use a defensive in-memory snapshot with old defaults", async (t) => {
  useWindow(t, {});
  const storage = memoryStorage(t);
  const state = await import(`${settingsUrl}?defaults`);
  assert.deepEqual(state.readMinimapSettings(), defaults);
  const reads = storage.reads();
  assert.equal(reads, 10);
  state.readMinimapSettings().enabled = true;
  for (let i = 0; i < 120; i++) {
    assert.deepEqual(state.readMinimapSettings(), defaults);
  }
  assert.equal(storage.reads(), reads);
});

test("all minimap writers persist and refresh the shared game/popout snapshot", async (t) => {
  const game = {};
  useWindow(t, game);
  const storage = memoryStorage(t);
  const main = await import(`${settingsUrl}?game`);
  const popup = await import(`${settingsUrl}?popup`);
  main.readMinimapSettings();
  const reads = storage.reads();
  globalThis.window = { __cheatOpener: game };
  assert.deepEqual(popup.readMinimapSettings(), defaults);
  assert.equal(
    storage.reads(),
    reads,
    "separate module instances share one snapshot",
  );
  const cases = [
    ["Enabled", "enabled", true, "true"],
    ["MoveMode", "moveMode", true, "true"],
    ["Position", "position", "custom", "custom"],
    ["CustomX", "customX", 0, "0"],
    ["CustomY", "customY", 42, "42"],
    ["Size", "size", 240, "240"],
    ["Zoom", "zoom", 2, "2"],
    ["Mode", "mode", "full", "full"],
    ["Opacity", "opacity", 0, "0"],
    ["ShowEvents", "showEvents", false, "false"],
  ];
  const expected = { ...defaults };
  for (const [suffix, field, value, serialized] of cases) {
    globalThis.window = { __cheatOpener: game };
    popup[`writeMinimap${suffix}`](value);
    expected[field] = value;
    assert.equal(storage.values.get(`minimap.${field}`), serialized);
    globalThis.window = game;
    assert.deepEqual(main.readMinimapSettings(), expected);
    const afterWrite = storage.reads();
    globalThis.window = { __cheatOpener: game };
    assert.deepEqual(popup.readMinimapSettings(), expected);
    assert.equal(storage.reads(), afterWrite);
  }
  assert.equal(popup.toggleMinimapEnabled(), false);
  globalThis.window = game;
  assert.equal(main.readMinimapSettings().enabled, false);
  assert.equal(main.toggleMinimapEnabled(), true);
  globalThis.window = { __cheatOpener: game };
  assert.equal(popup.readMinimapSettings().enabled, true);
  globalThis.window = {};
  assert.equal(main.readMinimapSettings().size, 240);
  assert.ok(
    storage.reads() > reads,
    "a different game hydrates its own snapshot",
  );
});

test("minimap parsing and no-window fallback are safe with missing or broken storage", async (t) => {
  useWindow(t, undefined);
  const storage = memoryStorage(t, {
    "minimap.enabled": "invalid",
    "minimap.moveMode": "true",
    "minimap.position": "",
    "minimap.customX": "not a number",
    "minimap.customY": "0",
    "minimap.mode": "",
    "minimap.showEvents": "false",
  });
  const state = await import(`${settingsUrl}?fallback`);
  assert.deepEqual(state.readMinimapSettings(), {
    ...defaults,
    moveMode: true,
    customY: 0,
    showEvents: false,
  });
  const reads = storage.reads();
  state.readMinimapSettings();
  assert.equal(storage.reads(), reads);
  t.mock.method(KEY_VALUE_STORAGE, "getItem", () => {
    throw Error("unavailable");
  });
  const unavailable = await import(`${settingsUrl}?unavailable`);
  assert.deepEqual(unavailable.readMinimapSettings(), defaults);
});

test("failed minimap writes leave the persisted snapshot intact", async (t) => {
  useWindow(t, {});
  const storage = memoryStorage(t, { "minimap.size": "240" });
  const state = await import(`${settingsUrl}?failed-write`);
  assert.equal(state.readMinimapSettings().size, 240);
  const reads = storage.reads();
  t.mock.method(KEY_VALUE_STORAGE, "setItem", () => {
    throw Error("read only");
  });
  assert.throws(() => state.writeMinimapSize(320), /read only/);
  assert.equal(state.readMinimapSettings().size, 240);
  assert.equal(storage.reads(), reads);
});

test("a non-extensible browser host retains a local settings cache", async (t) => {
  useWindow(t, Object.preventExtensions({}));
  const storage = memoryStorage(t);
  const state = await import(`${settingsUrl}?browser-host`);
  assert.deepEqual(state.readMinimapSettings(), defaults);
  const reads = storage.reads();
  assert.deepEqual(state.readMinimapSettings(), defaults);
  assert.equal(storage.reads(), reads);
  state.writeMinimapEnabled(true);
  assert.equal(state.readMinimapSettings().enabled, true);
});
