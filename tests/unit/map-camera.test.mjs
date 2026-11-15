import test from "node:test";
import assert from "node:assert/strict";
import {
  mapCamera,
  worldAtPoint,
  panCamera,
  zoomCamera,
} from "../../cheat-engine/www/cheat/js/panels/map/MapCamera.js";
import { startMapFrames } from "../../cheat-engine/www/cheat/js/panels/map/MapFrames.js";

test("fit camera letterboxes rectangular maps and excludes empty margins from picking", () => {
  const view = mapCamera({
    mapWidth: 30,
    mapHeight: 10,
    width: 600,
    height: 400,
    zoom: 1,
    x: 15,
    y: 5,
  });
  assert.equal(view.unit, 20);
  assert.equal(view.oy, 100);
  assert.equal(worldAtPoint(view, 10, 50), null);
  assert.deepEqual(worldAtPoint(view, 10, 110), { x: 0.5, y: 0.5 });
  assert.equal(worldAtPoint(view, 600, 300), null);
});

test("zoom preserves the tile under the pointer and pan uses the same transform", () => {
  const view = mapCamera({
    mapWidth: 100,
    mapHeight: 100,
    width: 500,
    height: 400,
    zoom: 3,
    x: 50,
    y: 50,
  });
  const point = { x: 180, y: 170 };
  const before = worldAtPoint(view, point.x, point.y);
  const after = zoomCamera(view, 1.5, point);
  const anchored = worldAtPoint(after, point.x, point.y);
  assert.ok(Math.abs(anchored.x - before.x) < 1e-10);
  assert.ok(Math.abs(anchored.y - before.y) < 1e-10);
  const moved = panCamera(after, 24, -24);
  assert.equal(moved.x, after.x - 24 / after.unit);
  assert.equal(moved.y, after.y + 24 / after.unit);
});

test("camera clamps map edges, zoom and degenerate dimensions", () => {
  const view = mapCamera({
    mapWidth: 5,
    mapHeight: 4,
    width: 0,
    height: 0,
    x: -999,
    y: Infinity,
    zoom: NaN,
  });
  assert.ok(Number.isFinite(view.unit) && view.unit > 0);
  assert.ok(Number.isFinite(view.x) && Number.isFinite(view.y));
  assert.ok(zoomCamera(view, 1000).zoom <= 64);
});

test("frame loop renders fractional movement every frame, skips hidden documents and cancels on teardown", () => {
  let callback,
    cancelled = 0,
    frames = 0;
  const host = {
    document: { hidden: false },
    requestAnimationFrame(fn) {
      callback = fn;
      return 7;
    },
    cancelAnimationFrame(id) {
      cancelled = id;
    },
  };
  const stop = startMapFrames(host, () => frames++);
  callback(16);
  callback(32);
  assert.equal(frames, 2);
  host.document.hidden = true;
  callback(48);
  assert.equal(frames, 2);
  stop();
  callback(64);
  assert.equal(frames, 2);
  assert.equal(cancelled, 7);
});
