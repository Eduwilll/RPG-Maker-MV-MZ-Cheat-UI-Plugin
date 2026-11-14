import test from "node:test";
import assert from "node:assert/strict";
import { drawMinimap } from "../../cheat-engine/www/cheat/js/panels/minimap/MinimapRenderer.js";
import { readMapMarkers } from "../../cheat-engine/www/cheat/js/panels/map/MapMarkers.js";
import {
  assetFrame,
  createGameAssets,
  bitmapSource,
} from "../../cheat-engine/www/cheat/js/runtime/GameAssets.js";
import { createMapCharacters } from "../../cheat-engine/www/cheat/js/panels/map/MapCharacters.js";

test("public minimap renderer draws the live NPC sprite, not a replacement colored dot", () => {
  const previous = globalThis.window;
  const image = { width: 192, height: 256 },
    event = { _eventId: 1, _characterName: "People", x: 2, y: 3 };
  const sprite = {
    _character: event,
    bitmap: { canvas: image, isReady: () => true },
    _frame: { x: 32, y: 64, width: 32, height: 64 },
    visible: true,
    opacity: 255,
    anchor: { x: 0.5, y: 1 },
  };
  globalThis.window = {
    $dataMap: { width: 10, height: 10 },
    $gameMap: { tileWidth: () => 48, tileHeight: () => 48 },
    SceneManager: { _scene: { _spriteset: { _characterSprites: [sprite] } } },
  };
  try {
    const draws = [],
      dots = [];
    const ctx = {
      globalAlpha: 1,
      clearRect() {},
      fillRect() {},
      drawImage(...args) {
        draws.push(args);
      },
      beginPath() {},
      arc(...args) {
        dots.push(args);
      },
      fill() {},
      save() {},
      restore() {},
    };
    drawMinimap({ width: 100, height: 100, getContext: () => ctx }, null, {
      size: 100,
      mode: "full",
      events: [{ id: 1, kind: "npc", x: 2, y: 3, characterName: "People" }],
      layers: {
        background: false,
        player: false,
        npcs: true,
        sprites: true,
        markerScale: 1,
      },
    });
    assert.equal(draws.length, 1);
    assert.equal(dots.length, 0);
    assert.equal(draws[0][0], image);
    assert.deepEqual(draws[0].slice(1, 5), [32, 64, 32, 64]);
    assert.equal(sprite.bitmap.canvas, image);
    assert.equal(sprite.__ob__, undefined);
  } finally {
    globalThis.window = previous;
  }
});

test("event snapshots include actual sheet index, direction and pattern as primitives", () => {
  const event = {
    _eventId: 1,
    x: 2,
    y: 3,
    _characterName: "People",
    _characterIndex: 5,
    _direction: 8,
    _pattern: 2,
    _opacity: 128,
    page: () => ({
      image: { characterName: "People", characterIndex: 5 },
      list: [],
    }),
  };
  const [row] = readMapMarkers({ $gameMap: { events: () => [event] } });
  assert.equal(row.characterIndex, 5);
  assert.equal(row.pattern, 2);
  assert.equal(row.direction, 8);
  assert.equal(row.opacity, 128);
  assert.ok(
    Object.values(row).every((v) =>
      ["string", "number", "boolean"].includes(typeof v),
    ),
  );
});

test("character-sheet framing respects selected actor block, facing and current pose", () => {
  const frame = assetFrame(
    { type: "character", name: "People", index: 5, direction: 8, pattern: 2 },
    { width: 384, height: 256 },
    {},
  );
  assert.deepEqual(frame, { x: 160, y: 224, width: 32, height: 32 });
  assert.deepEqual(
    assetFrame(
      { type: "character", name: "$NPC", index: 0, direction: 4, pattern: 0 },
      { width: 96, height: 128 },
      {},
    ),
    { x: 0, y: 32, width: 32, height: 32 },
  );
});

test("sprite sources follow scene replacement and hidden characters never trigger optional requests", () => {
  const event = { _eventId: 1 },
    image = { width: 32, height: 48 },
    sprite = {
      _character: event,
      bitmap: { canvas: image },
      _frame: { x: 0, y: 0, width: 32, height: 48 },
      visible: true,
      opacity: 128,
    };
  const game = {
    SceneManager: { _scene: { _spriteset: { _characterSprites: [sprite] } } },
  };
  const painter = createMapCharacters(game, null),
    drawn = [],
    alpha = [];
  const ctx = {
    globalAlpha: 1,
    save() {},
    restore() {
      this.globalAlpha = 1;
    },
    drawImage(...args) {
      drawn.push(args);
      alpha.push(this.globalAlpha);
    },
  };
  const marker = { id: 1, x: 1, y: 1, characterName: "$NPC" },
    view = { unit: 12, ox: 0, oy: 0 };
  painter.beginFrame();
  assert.equal(painter.draw(ctx, marker, view), true);
  assert.equal(alpha[0], 128 / 255);
  sprite.visible = false;
  assert.equal(painter.draw(ctx, marker, view), true);
  assert.equal(drawn.length, 1);
  game.SceneManager._scene = { _spriteset: { _characterSprites: [] } };
  painter.beginFrame();
  assert.equal(painter.draw(ctx, marker, view), false);
  assert.equal(drawn.length, 1);
});

test("fallback requests share private cached frames and do not paint into old canvases asynchronously", async () => {
  let resolve,
    loads = 0;
  const result = new Promise((done) => {
    resolve = done;
  });
  const painter = createMapCharacters(
    {},
    {
      readCharacterFrame() {
        loads++;
        return result;
      },
    },
  );
  const drawn = [],
    ctx = {
      globalAlpha: 1,
      save() {},
      restore() {},
      drawImage(...args) {
        drawn.push(args);
      },
    };
  const marker = {
      id: 1,
      x: 1,
      y: 1,
      characterName: "$NPC",
      characterIndex: 0,
      direction: 6,
      pattern: 1,
    },
    view = { unit: 12, ox: 0, oy: 0 };
  painter.beginFrame();
  assert.equal(painter.draw(ctx, marker, view), false);
  assert.equal(painter.draw(ctx, marker, view), false);
  await Promise.resolve();
  assert.equal(loads, 1);
  resolve({
    image: { width: 32, height: 48 },
    x: 0,
    y: 0,
    width: 32,
    height: 48,
  });
  await new Promise((done) => setImmediate(done));
  assert.equal(drawn.length, 0);
  assert.equal(
    painter.draw(ctx, Object.assign({}, marker, { x: 4 }), view),
    true,
  );
  assert.equal(drawn.length, 1);
  assert.equal(drawn[0][5], (4 + 0.5) * 12 - 8 / 2);
});

test("reading a live MV image-backed bitmap never triggers its lazy canvas conversion", () => {
  const image = { width: 32, height: 48 };
  let conversions = 0;
  const bitmap = { _image: image, isReady: () => true };
  Object.defineProperty(bitmap, "canvas", {
    get() {
      conversions++;
      this._canvas = { width: 32, height: 48 };
      return this._canvas;
    },
  });
  const sprite = {
    _character: { _eventId: 1 },
    bitmap,
    _frame: { x: 0, y: 0, width: 32, height: 48 },
  };
  const painter = createMapCharacters(
    {
      SceneManager: { _scene: { _spriteset: { _characterSprites: [sprite] } } },
    },
    null,
  );
  const drawn = [];
  painter.beginFrame();
  assert.equal(
    painter.draw(
      {
        globalAlpha: 1,
        save() {},
        restore() {},
        drawImage(...args) {
          drawn.push(args);
        },
      },
      { id: 1, characterName: "$NPC", x: 0, y: 0 },
      { unit: 12, ox: 0, oy: 0 },
    ),
    true,
  );
  assert.equal(conversions, 0);
  assert.equal(bitmap._canvas, undefined);
  assert.equal(drawn[0][0], image);
});

test("MV's inherited private canvas accessor is not invoked and existing modified canvas pixels win", () => {
  const image = { width: 32, height: 48 },
    texture = { unchanged: true };
  let conversions = 0;
  const proto = {};
  Object.defineProperty(proto, "_canvas", {
    get() {
      conversions++;
      this.__canvas = { width: 32, height: 48 };
      this.__baseTexture = { changed: true };
      return this.__canvas;
    },
  });
  const bitmap = Object.assign(Object.create(proto), {
    _image: image,
    __baseTexture: texture,
  });
  assert.equal(bitmapSource(bitmap), image);
  assert.equal(conversions, 0);
  assert.equal(bitmap.__baseTexture, texture);
  const modified = { width: 32, height: 48 };
  bitmap.__canvas = modified;
  assert.equal(bitmapSource(bitmap), modified);
  assert.equal(conversions, 0);
});

test("graphicless events retain markers, but tile-graphic events can use their valid live frame", () => {
  const sprite = {
    _character: { _eventId: 1 },
    bitmap: { _canvas: { width: 1, height: 1 } },
    _frame: { x: 0, y: 0, width: 0, height: 0 },
  };
  const painter = createMapCharacters(
    {
      SceneManager: { _scene: { _spriteset: { _characterSprites: [sprite] } } },
    },
    null,
  );
  const ctx = { globalAlpha: 1, save() {}, restore() {}, drawImage() {} };
  painter.beginFrame();
  assert.equal(
    painter.draw(
      ctx,
      { id: 1, characterName: "", tileId: 0, x: 0, y: 0 },
      { unit: 12, ox: 0, oy: 0 },
    ),
    false,
  );
  sprite.bitmap._canvas = { width: 768, height: 768 };
  sprite._frame = { x: 48, y: 48, width: 48, height: 48 };
  assert.equal(
    painter.draw(
      ctx,
      { id: 1, characterName: "", tileId: 1, x: 0, y: 0 },
      { unit: 12, ox: 0, oy: 0 },
    ),
    true,
  );
});

test("fallback composite portraits refresh after the plugin replaces the generated character bitmap", async () => {
  const before = Date.now;
  let now = 100;
  Date.now = () => now;
  try {
    const first = { width: 96, height: 128 },
      second = { width: 96, height: 128 };
    const cache = new Map([
      ["TV_$Virtual", { bitmap: { _canvas: first, isReady: () => true } }],
    ]);
    const game = {
      KCDev: {
        CompositeBitmaps: {
          tvCharLayers: { $Virtual: [{ filename: "layer", index: 0 }] },
          TOP_VIEW_PREFIX: "TV_",
          cache,
        },
      },
      ImageManager: {},
    };
    const painter = createMapCharacters(game, createGameAssets(game));
    const draws = [];
    const ctx = {
        globalAlpha: 1,
        save() {},
        restore() {},
        drawImage(image) {
          draws.push(image);
        },
      },
      marker = { id: 1, characterName: "$Virtual", x: 0, y: 0 },
      view = { unit: 12, ox: 0, oy: 0 };
    painter.beginFrame();
    painter.draw(ctx, marker, view);
    await new Promise((done) => setImmediate(done));
    painter.draw(ctx, marker, view);
    assert.equal(draws[0], first);
    cache.set("TV_$Virtual", {
      bitmap: { _canvas: second, isReady: () => true },
    });
    now = 1000;
    painter.draw(ctx, marker, view);
    await new Promise((done) => setImmediate(done));
    painter.draw(ctx, marker, view);
    assert.equal(draws[draws.length - 1], second);
  } finally {
    Date.now = before;
  }
});
