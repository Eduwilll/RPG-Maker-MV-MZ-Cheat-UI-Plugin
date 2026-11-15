import test from "node:test";
import assert from "node:assert/strict";
import {
  createMapScene,
  drawPlayerArrow,
  MAP_MARKER_STYLES,
} from "../../cheat-engine/www/cheat/js/panels/map/MapScene.js";
import { mapCamera } from "../../cheat-engine/www/cheat/js/panels/map/MapCamera.js";

function context() {
  const calls = { images: 0, rotations: [], radii: [] };
  return Object.assign(calls, {
    drawImage() {
      calls.images++;
    },
    clearRect() {},
    fillRect() {},
    save() {},
    restore() {},
    translate() {},
    beginPath() {},
    closePath() {},
    fill() {},
    stroke() {},
    moveTo() {},
    lineTo() {},
    rotate(angle) {
      calls.rotations.push(angle);
    },
    arc(x, y, r) {
      calls.radii.push(r);
    },
  });
}

test("viewport artwork stays cached between movement frames but refreshes in-place animated tiles", () => {
  const bg = context(),
    ctx = context();
  const canvas = {
    ownerDocument: { createElement: () => ({ getContext: () => bg }) },
    getContext: () => ctx,
  };
  const scene = createMapScene(canvas),
    base = {};
  const options = {
    game: { $dataMap: {}, Graphics: { frameCount: 0 } },
    camera: mapCamera({
      mapWidth: 10,
      mapHeight: 10,
      width: 100,
      height: 100,
      zoom: 1,
    }),
    mode: "realistic",
    layers: { background: true, sprites: false, player: false },
    markers: [],
  };
  scene.draw(base, options);
  scene.draw(base, options);
  assert.equal(bg.images, 1);
  assert.equal(ctx.images, 2);
  options.game.Graphics.frameCount = 30;
  scene.draw(base, options);
  assert.equal(bg.images, 2);
  scene.invalidate();
  scene.draw(base, options);
  assert.equal(bg.images, 3);
});

test("player arrow follows facing, and reduced motion stops its pulse without hiding direction", () => {
  const ctx = context();
  drawPlayerArrow(ctx, 10, 10, 4, 1, 0, true);
  drawPlayerArrow(ctx, 10, 10, 4, 1, 500, true);
  assert.deepEqual(ctx.rotations, [-Math.PI / 2, -Math.PI / 2]);
  assert.equal(ctx.radii[0], ctx.radii[1]);
  drawPlayerArrow(ctx, 10, 10, 6, 1, 500, false);
  assert.notEqual(ctx.radii[1], ctx.radii[2]);
  assert.equal(
    new Set(Object.values(MAP_MARKER_STYLES).map((row) => row.glyph)).size,
    4,
  );
});
