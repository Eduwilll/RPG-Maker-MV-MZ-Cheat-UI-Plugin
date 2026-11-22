import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
const root = new URL("../../cheat-engine/www/cheat/", import.meta.url);
const source = (path) => readFileSync(new URL(path, root), "utf8");

test("window defaults are shared and are 880 by 660", async () => {
  const geometry = await import(new URL("js/ui/LayoutGeometry.js", root));
  assert.deepEqual(geometry.DEFAULT_WINDOW_SIZE, { width: 880, height: 660 });
  assert.deepEqual(geometry.boundedSize(null, null, 1200, 900), {
    width: 880,
    height: 660,
  });
  for (const file of [
    "CheatModal.js",
    "MainComponent.js",
    "panels/AppearancePanel.js",
  ])
    assert.match(source(file), /DEFAULT_WINDOW_SIZE/);
});

test("saved locations preserve legacy entries and delete by stable identity", async () => {
  const url = new URL("js/panels/map/SavedLocationState.js", root);
  assert.ok(existsSync(url), "shared saved-location state is missing");
  const { createLocationStore } = await import(url);
  let value = JSON.stringify([
    { name: "Old", mapId: 2, x: 3, y: 4, flags: ["Shop"] },
  ]);
  const store = createLocationStore({
    getItem: () => value,
    setItem: (_key, v) => {
      value = v;
    },
  });
  const old = store.read()[0];
  assert.equal(old.name, "Old");
  assert.deepEqual(old.flags, ["Shop"]);
  const next = store.add({ name: "New", mapId: 4, x: 1, y: 2, flags: ["NPC"] });
  assert.notEqual(old.id, next.id);
  store.remove(next.id);
  assert.deepEqual(store.read(), [old]);
  assert.throws(() => store.add({ mapId: 1, x: -1, y: 0 }), /location/i);
  assert.throws(
    () => store.add({ mapId: 1, x: 10, y: 0 }, { width: 10, height: 8 }),
    /inside the map/i,
  );
  value = "broken";
  assert.deepEqual(store.read(), []);
});

test("preview clicks ignore letterboxing and map to bounded tile coordinates", async () => {
  const url = new URL("js/panels/map/PreviewGeometry.js", root);
  assert.ok(existsSync(url), "shared preview geometry is missing");
  const { previewViewport, previewTile } = await import(url);
  const view = previewViewport(480, 300, 20, 10);
  assert.equal(previewTile(view, 10, 5), null);
  assert.deepEqual(previewTile(view, 479, 269), { x: 19, y: 9 });
  assert.deepEqual(previewTile(view, 12, 42), { x: 0, y: 0 });
});

test("map actor links use party identity, not similar NPC names", async () => {
  const url = new URL("js/panels/map/MapActors.js", root);
  assert.ok(existsSync(url), "party map identities are missing");
  const { readMapActors } = await import(url);
  const actor = { actorId: () => 7, name: () => "Marina" };
  const game = {
    $gameParty: { leader: () => actor },
    $gamePlayer: { x: 2, y: 3, followers: () => ({ _data: [] }) },
  };
  const rows = readMapActors(game);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].actorId, 7);
  assert.equal(rows[0].kind, "actor");
});

test("Watch has only saved targets and Analyzer owns map context", () => {
  const watch = source("panels/WatcherPanel.js"),
    analyzer = source("panels/EventAnalyzerPanel.js");
  assert.doesNotMatch(watch, /Facing Event|Nearby Map References/);
  assert.match(analyzer, /event-context/);
  assert.match(analyzer, /selectEvent\(/);
  assert.match(
    source("components/InteractiveMap.js"),
    /requestEventNavigation/,
  );
  const teleport = source("panels/TeleportPanel.js");
  assert.match(teleport, /@click="selectMap\(item\)"/);
  assert.ok(
    teleport.indexOf("<map-preview") < teleport.indexOf("<v-dialog"),
    "preview remains inline; only saving uses a dialog",
  );
});

test("zoomed-out saved pins can be selected at their drawn head, and actors keep their identity", async () => {
  const { selectMapPoint } = await import(
    new URL("js/panels/map/MapSelection.js", root)
  );
  const pin = {
    id: "saved-1",
    name: "Shop",
    kind: "saved",
    x: 5,
    y: 5,
    flags: ["Shop"],
  };
  const selected = selectMapPoint({ x: 5.5, y: 2.5 }, [pin], {}, 1, 4);
  assert.equal(selected.id, "saved-1");
  assert.deepEqual(selected.flags, ["Shop"]);
  const actor = {
    id: "actor-7",
    actorId: 7,
    name: "Hero",
    kind: "actor",
    x: 3.2,
    y: 2,
  };
  assert.equal(selectMapPoint({ x: 3.7, y: 2.5 }, [actor], {}, 1).actorId, 7);
});

test("reloading a revisited map discards events removed from its data", async () => {
  const { EventDatabase } = await import(
    new URL("js/panels/event-analyzer/EventDatabase.js", root)
  );
  const previous = globalThis.window;
  globalThis.window = {
    $dataMap: { events: [null, { id: 1, pages: [] }, { id: 2, pages: [] }] },
    $gameMap: { mapId: () => 1 },
  };
  try {
    const db = new EventDatabase();
    db.loadFromGlobals();
    window.$dataMap = { events: [null, { id: 1, name: "New", pages: [] }] };
    db.loadFromGlobals();
    assert.deepEqual(
      db.getMapEvents(1).map((row) => row.id),
      [1],
    );
    assert.equal(db.getMapEvent(1, 1).name, "New");
  } finally {
    globalThis.window = previous;
  }
});

test("location tags have distinct line-art designs, including custom-tag fallback", async () => {
  const { LOCATION_TAGS } = await import(
    new URL("js/panels/map/SavedLocationState.js", root)
  );
  const { drawLocationPin } = await import(
    new URL("js/panels/map/LocationPins.js", root)
  );
  const designs = LOCATION_TAGS.concat([{ value: "Custom" }]).map((tag) => {
    const calls = [],
      ctx = {};
    for (const method of [
      "save",
      "restore",
      "translate",
      "scale",
      "beginPath",
      "moveTo",
      "lineTo",
      "quadraticCurveTo",
      "closePath",
      "fill",
      "stroke",
      "rect",
      "arc",
    ])
      ctx[method] = (...args) => calls.push([method, ...args]);
    drawLocationPin(ctx, 10, 10, [tag.value]);
    return JSON.stringify(calls);
  });
  assert.equal(new Set(designs).size, 7);
});
