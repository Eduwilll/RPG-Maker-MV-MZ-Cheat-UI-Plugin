import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
const root = new URL("../../cheat-engine/www/cheat/", import.meta.url);
const source = (path) => readFileSync(new URL(path, root), "utf8");

test("destination validation is map-scoped and rejects fractional and missing coordinates", async () => {
  const url = new URL("js/panels/map/DestinationState.js", root);
  assert.ok(existsSync(url), "destination state helper is missing");
  const { isDestinationValid } = await import(url);
  const dimensions = { mapId: 2, width: 20, height: 10 };
  assert.equal(isDestinationValid({ mapId: 2, x: 19, y: 9 }, dimensions), true);
  for (const point of [
    { mapId: 1, x: 1, y: 1 },
    { mapId: 2, x: 20, y: 0 },
    { mapId: 2, x: 1.2, y: 1 },
    { mapId: 2, x: null, y: 1 },
  ])
    assert.equal(isDestinationValid(point, dimensions), false);
});

test("event explorer lists nearby event identities independently of references", async () => {
  const url = new URL("js/panels/event-analyzer/EventExplorerState.js", root);
  assert.ok(existsSync(url), "event explorer state helper is missing");
  const { readNearbyEvents } = await import(url);
  const game = {
    $gamePlayer: { x: 4, y: 4 },
    $gameMap: {
      mapId: () => 1,
      event: (id) => (id === 1 ? { x: 9, y: 9, _pageIndex: 0 } : null),
    },
    $dataMap: {
      events: [
        null,
        { id: 1, name: "Moved NPC", x: 4, y: 5, pages: [{}] },
        { id: 2, name: "Lamp", x: 5, y: 4, pages: [{}] },
      ],
    },
  };
  const rows = readNearbyEvents(game);
  assert.deepEqual(
    rows.map((row) => row.id),
    [2, 1],
  );
  assert.equal(rows[0].mapId, 1);
  assert.equal(rows[1].distance, 10);
});

test("destination and event workflows use a finder and a focused inspector", () => {
  for (const panel of ["TeleportPanel", "SaveRecallPanel"])
    assert.match(source("panels/" + panel + ".js"), /destination-rail/);
  assert.match(source("components/MapPreview.js"), /Zoom in preview/);
  const analyzer = source("panels/EventAnalyzerPanel.js");
  assert.match(analyzer, /event-workspace/);
  assert.match(analyzer, /Switches &amp; variables|Switches & variables/);
  assert.match(source("components/EventContext.js"), /event-choice/);
});

test("common and battle activation switches normalize without mutating game records", async () => {
  const api = await import(
    new URL("js/panels/event-analyzer/EventExplorerState.js", root)
  );
  assert.equal(typeof api.eventReferencePages, "function");
  const common = { trigger: 2, switchId: 7, list: [] },
    battle = {
      pages: [{ conditions: { switchValid: true, switchId: 8 }, list: [] }],
    };
  assert.equal(
    api.eventReferencePages(common, "common", 0)[0].conditions.switch1Id,
    7,
  );
  assert.equal(
    api.eventReferencePages(battle, "battle", 0)[0].conditions.switch1Id,
    8,
  );
  assert.equal(battle.pages[0].conditions.switch1Valid, undefined);
  assert.equal(common.conditions, undefined);
});
