import test from "node:test";
import assert from "node:assert/strict";

function fixture(mz) {
  const calls = [];
  const ctx = {
    clearRect() {},
    drawImage(...args) {
      calls.push(args);
    },
    fillRect() {},
    imageSmoothingEnabled: true,
  };
  const image = { width: 768, height: 768 };
  const bitmap = { isReady: () => true, canvas: image };
  function Tilemap() {
    throw new Error("must not construct a scene renderer");
  }
  if (mz)
    Tilemap.prototype._addTile = function (layer, id, x, y) {
      if (id) layer.addRect(id >= 2048 ? 0 : 5, id, 0, x, y, 48, 48);
    };
  else
    Tilemap.prototype._drawTile = function (target, id, x, y) {
      if (id)
        target.bltImage(
          this.bitmaps[id >= 2048 ? 0 : 5],
          id,
          0,
          48,
          48,
          x,
          y,
          48,
          48,
        );
    };
  const game = {
    Tilemap,
    document: {
      createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
    },
    ImageManager: { loadTileset: () => bitmap },
    $dataMap: {
      width: 2,
      height: 1,
      data: [2048, 0, 1, 0, 2, 0, 3, 0, 0, 0],
      tilesetId: 1,
    },
    $dataTilesets: [
      null,
      { tilesetNames: ["Water", "", "", "", "", "Outside"], flags: [] },
    ],
    $gameMap: {
      mapId: () => 1,
      tilesetId: () => 1,
      tileWidth: () => 48,
      tileHeight: () => 48,
    },
    Graphics: { frameCount: 0 },
  };
  return { game, calls, bitmap };
}

for (const mz of [false, true]) {
  test(
    (mz ? "MZ" : "MV") +
      " artwork preserves all layers, caches the base and updates animated cells",
    async () => {
      const { createMapArtwork } =
        await import("../../cheat-engine/www/cheat/js/panels/minimap/MapArtwork.js");
      const { game, calls } = fixture(mz);
      const artwork = createMapArtwork(game);
      const base = artwork.render();
      assert.deepEqual(
        calls.map((call) => call[1]),
        [2048, 1, 2, 3],
      );
      assert.equal(base.width, 32);
      assert.equal(artwork.render(), base);
      assert.equal(calls.length, 4);
      game.Graphics.frameCount = 30;
      artwork.render();
      assert.equal(calls.length, 8);
      game.$dataMap = Object.assign({}, game.$dataMap, {
        data: game.$dataMap.data.slice(),
      });
      assert.notEqual(artwork.render(), base);
    },
  );
}

test("pending tiles retry, and canvas allocation is bounded for large maps", async () => {
  const { createMapArtwork } =
    await import("../../cheat-engine/www/cheat/js/panels/minimap/MapArtwork.js");
  const { game, bitmap } = fixture(false);
  let ready = false;
  bitmap.isReady = () => ready;
  const artwork = createMapArtwork(game);
  assert.equal(artwork.render(), null);
  assert.equal(artwork.status().stage, "tiles-loading");
  ready = true;
  assert.ok(artwork.render());
  game.$dataMap = { width: 500, height: 500, data: [], tilesetId: 1 };
  const large = artwork.render();
  assert.ok(large.width <= 4096 && large.height <= 4096);
  assert.ok(large.width * large.height <= 8388608);
});

test("late images replace partial artwork and changed tileset names invalidate the cache", async () => {
  const { createMapArtwork } =
    await import("../../cheat-engine/www/cheat/js/panels/minimap/MapArtwork.js");
  const { game } = fixture(false);
  const originalNow = Date.now;
  let now = 0,
    ready = false;
  Date.now = () => now;
  try {
    game.ImageManager.loadTileset = (name) => ({
      isReady: () => name !== "Water" || ready,
      canvas: { width: 768, height: 768 },
    });
    const artwork = createMapArtwork(game);
    assert.equal(artwork.render(), null);
    now = 9000;
    const partial = artwork.render();
    assert.ok(partial);
    assert.equal(artwork.status().stage, "tiles-partial");
    ready = true;
    const complete = artwork.render();
    assert.notEqual(complete, partial);
    assert.equal(artwork.status().stage, "ok");
    game.$dataTilesets[1].tilesetNames[0] = "NewWater";
    assert.notEqual(artwork.render(), complete);
  } finally {
    Date.now = originalNow;
  }
});

test("higher tiles, shadows and table edges use engine drawing order", async () => {
  const { createMapArtwork } =
    await import("../../cheat-engine/www/cheat/js/panels/minimap/MapArtwork.js");
  const { game, calls } = fixture(false);
  game.$dataMap = { width: 1, height: 2, data: [1, 1, 4, 3, 2, 0, 0, 0, 0, 1] };
  game.$dataTilesets[1].flags[2] = 0x10;
  game.$dataTilesets[1].flags[4] = 0x80;
  const commands = [];
  const proto = game.Tilemap.prototype;
  const draw = proto._drawTile;
  proto._drawTile = function (target, id, x, y) {
    if (id) commands.push(id);
    return draw.call(this, target, id, x, y);
  };
  proto._drawShadow = (target, bits) => {
    if (bits) commands.push("shadow");
  };
  proto._drawTableEdge = () => commands.push("table-edge");
  createMapArtwork(game).render();
  assert.deepEqual(commands, [1, 4, 2, 1, 3, "shadow", "table-edge"]);
  assert.equal(calls.length, 5);
});

for (const mz of [false, true]) {
  test(
    (mz ? "MZ" : "MV") +
      " shadow and upper-tile switches are independent and invalidate cached artwork",
    async () => {
      const { createMapArtwork } =
        await import("../../cheat-engine/www/cheat/js/panels/minimap/MapArtwork.js");
      const { game, calls } = fixture(mz);
      let shadows = 0;
      game.Tilemap.prototype[mz ? "_addShadow" : "_drawShadow"] = () =>
        shadows++;
      game.$dataTilesets[1].flags[3] = 0x10;
      const dataBefore = game.$dataMap.data.slice(),
        flagsBefore = game.$dataTilesets[1].flags.slice();
      const artwork = createMapArtwork(game),
        original = artwork.render();
      calls.length = 0;
      shadows = 0;
      const flat = artwork.render(undefined, undefined, {
        shadows: false,
        upperTiles: false,
      });
      assert.notEqual(flat, original);
      assert.equal(shadows, 0);
      assert.deepEqual(
        calls.map((call) => call[1]),
        [2048, 1, 2],
      );
      assert.equal(
        artwork.render(undefined, undefined, {
          shadows: false,
          upperTiles: false,
        }),
        flat,
      );
      calls.length = 0;
      artwork.render(undefined, undefined, {
        shadows: false,
        upperTiles: true,
      });
      assert.deepEqual(
        calls.map((call) => call[1]),
        [2048, 1, 2, 3],
      );
      assert.equal(shadows, 0);
      artwork.render();
      assert.ok(shadows > 0);
      assert.deepEqual(game.$dataMap.data, dataBefore);
      assert.deepEqual(game.$dataTilesets[1].flags, flagsBefore);
    },
  );
}
