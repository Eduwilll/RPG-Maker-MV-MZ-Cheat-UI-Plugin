import test from "node:test";
import assert from "node:assert/strict";
import { applyPanelSnapshot } from "../../cheat-engine/www/cheat/js/panels/PanelGameState.js";

test("a snapshot copies every field onto the panel", () => {
  const panel = {};
  const changed = applyPanelSnapshot(panel, {
    gold: 10,
    speed: 4,
    gameReady: true,
  });

  assert.equal(changed, 3);
  assert.deepEqual(panel, { gold: 10, speed: 4, gameReady: true });
});

test("unchanged values are not reassigned", () => {
  const panel = { gold: 10 };
  let writes = 0;
  Object.defineProperty(panel, "gold", {
    configurable: true,
    enumerable: true,
    get() {
      return 10;
    },
    set() {
      writes += 1;
    },
  });

  const changed = applyPanelSnapshot(panel, { gold: 10, speed: 4 });

  assert.equal(changed, 1, "only the new field counts as changed");
  assert.equal(writes, 0, "the unchanged field was not written");
  assert.equal(panel.speed, 4);
});

test("a changed value is written through", () => {
  const panel = { gold: 10 };
  const changed = applyPanelSnapshot(panel, { gold: 99 });

  assert.equal(changed, 1);
  assert.equal(panel.gold, 99);
});

test("missing snapshot keys leave the panel's own state alone", () => {
  const panel = { rows: [], draft: { a: 1 }, seconds: 0 };
  applyPanelSnapshot(panel, { rows: [1, 2] });

  assert.deepEqual(panel.rows, [1, 2]);
  assert.deepEqual(panel.draft, { a: 1 }, "draft survives a snapshot");
  assert.equal(panel.seconds, 0);
});

test("undefined values in the snapshot are skipped", () => {
  const panel = { enabled: true };
  const changed = applyPanelSnapshot(panel, { enabled: undefined });

  assert.equal(changed, 0, "undefined does not count as a change");
  assert.equal(panel.enabled, true, "the existing value is preserved");
});

test("null and non-object inputs are tolerated", () => {
  assert.equal(applyPanelSnapshot(null, { a: 1 }), 0);
  assert.equal(applyPanelSnapshot({}, null), 0);
  assert.equal(applyPanelSnapshot(undefined, undefined), 0);
});

test("a snapshot with a null value is written (only undefined is skipped)", () => {
  const panel = { preview: { a: 1 } };
  const changed = applyPanelSnapshot(panel, { preview: null });

  assert.equal(changed, 1);
  assert.equal(panel.preview, null, "null clears the field");
});

test("polling the same snapshot does not dirty the panel", () => {
  const panel = {};
  applyPanelSnapshot(panel, { gold: 5, gameSpeed: 1 });
  const second = applyPanelSnapshot(panel, { gold: 5, gameSpeed: 1 });

  assert.equal(second, 0, "an identical poll changes nothing");
});