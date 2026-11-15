import test from "node:test";
import assert from "node:assert/strict";

test("layer settings persist allowlisted primitive values with safe defaults", async () => {
  const { createMapLayers } =
    await import("../../cheat-engine/www/cheat/js/runtime/MapLayers.js");
  const values = new Map(),
    storage = {
      getItem: (key) => values.get(key),
      setItem: (key, value) => values.set(key, value),
    };
  const state = createMapLayers(storage);
  assert.equal(state.read().shadows, true);
  assert.equal(state.read().npcs, true);
  state.write("shadows", false);
  state.write("npcs", false);
  state.write("markerScale", 99);
  state.write("arbitrary", true);
  const restored = createMapLayers(storage).read();
  assert.equal(restored.shadows, false);
  assert.equal(restored.npcs, false);
  assert.equal(restored.markerScale, 2);
  assert.equal(restored.arbitrary, undefined);
  restored.enemies = false;
  assert.equal(state.read().enemies, true);
  const broken = createMapLayers({
    getItem() {
      throw Error("broken");
    },
    setItem() {
      throw Error("broken");
    },
  });
  assert.equal(broken.read().shadows, true);
  assert.doesNotThrow(() => broken.write("shadows", false));
});

test("active map events distinguish moving NPCs, battles and gain events without scanning inactive pages or running scripts", async () => {
  const { readMapMarkers, markerVisible } =
    await import("../../cheat-engine/www/cheat/js/panels/map/MapMarkers.js");
  const page = (list, graphic = "") => ({
    list,
    image: { characterName: graphic },
  });
  const events = [
    {
      _eventId: 1,
      _moveType: 1,
      _characterName: "People",
      page: () => page([], "People"),
      x: 1,
      y: 2,
    },
    {
      _eventId: 2,
      page: () => page([{ code: 301, parameters: [0, 1] }]),
      x: 3,
      y: 4,
    },
    {
      _eventId: 3,
      page: () => page([{ code: 117, parameters: [1] }]),
      x: 5,
      y: 6,
    },
    {
      _eventId: 4,
      page: () =>
        page([{ code: 355, parameters: ["throw Error('do not evaluate')"] }]),
      x: 7,
      y: 8,
    },
    {
      _eventId: 5,
      page: () => page([{ code: 126, parameters: [1, 1, 0, 1] }]),
      x: 9,
      y: 8,
    },
    { _eventId: 6, _erased: true, x: 0, y: 0 },
  ];
  const game = {
    $gameMap: { events: () => events },
    $dataMap: {
      events: [null, { name: "Villager", pages: [page([{ code: 301 }])] }],
    },
    $dataCommonEvents: [
      null,
      {
        list: [
          { code: 126, parameters: [1, 0, 0, 1] },
          { code: 117, parameters: [1] },
        ],
      },
    ],
  };
  const rows = readMapMarkers(game);
  assert.deepEqual(
    rows.map((row) => row.kind),
    ["npc", "enemy", "treasure", "event", "event"],
  );
  assert.equal(markerVisible(rows[0], { npcs: false }), false);
  assert.equal(markerVisible(rows[1], { npcs: false }), true);
  assert.ok(
    rows.every((row) =>
      Object.values(row).every((v) =>
        ["string", "number", "boolean"].includes(typeof v),
      ),
    ),
  );
});

test("floating minimap can show filtered markers and a grid with artwork hidden or unavailable", async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { $dataMap: { width: 10, height: 10 } };
  try {
    const { drawMinimap } =
      await import("../../cheat-engine/www/cheat/js/panels/minimap/MinimapRenderer.js");
    let images = 0,
      dots = 0,
      lines = 0,
      labels = 0;
    const ctx = {
      clearRect() {},
      fillRect() {},
      drawImage() {
        images++;
      },
      beginPath() {},
      arc() {
        dots++;
      },
      fill() {},
      moveTo() {
        lines++;
      },
      lineTo() {},
      stroke() {},
      fillText() {
        labels++;
      },
    };
    const canvas = { width: 100, height: 100, getContext: () => ctx };
    drawMinimap(canvas, null, {
      size: 100,
      mode: "full",
      events: [
        { id: 1, kind: "npc", x: 1, y: 1 },
        { id: 2, kind: "treasure", x: 2, y: 2 },
      ],
      layers: {
        background: false,
        grid: true,
        player: false,
        npcs: false,
        treasures: true,
        labels: true,
      },
    });
    assert.equal(images, 0);
    assert.equal(dots, 1);
    assert.equal(labels, 1);
    assert.ok(lines > 0);
  } finally {
    globalThis.window = previousWindow;
  }
});
