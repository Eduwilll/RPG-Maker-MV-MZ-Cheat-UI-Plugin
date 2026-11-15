import test from "node:test";
import assert from "node:assert/strict";

test("map viewport clamps at edges and hit-testing matches scaled canvas", async () => {
  const { mapViewport, tileAtPointer } =
    await import("../../cheat-engine/www/cheat/js/panels/map/MapViewport.js");
  const view = mapViewport(100, 60, 99, 59, true, 25);
  assert.deepEqual(view, { startX: 75, startY: 35, endX: 100, endY: 60 });
  const canvas = {
    width: 350,
    height: 350,
    getBoundingClientRect: () => ({
      left: 10,
      top: 20,
      width: 700,
      height: 700,
    }),
  };
  assert.deepEqual(
    tileAtPointer({ clientX: 709, clientY: 719 }, canvas, view),
    { x: 99, y: 59 },
  );
  assert.equal(
    tileAtPointer({ clientX: 710, clientY: 720 }, canvas, view),
    null,
  );
  assert.deepEqual(mapViewport(5, 3, 4, 2, true, 25), {
    startX: 0,
    startY: 0,
    endX: 5,
    endY: 3,
  });
  assert.deepEqual(mapViewport(100, 60, 99, 59, false, 25), {
    startX: 0,
    startY: 0,
    endX: 100,
    endY: 60,
  });
});
