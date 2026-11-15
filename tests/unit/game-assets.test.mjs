import test from "node:test";
import assert from "node:assert/strict";
const load = () =>
  import("../../cheat-engine/www/cheat/js/runtime/GameAssets.js");
test("game asset descriptors are detached and use live actor identity without creating actors", async () => {
  const { createGameAssets, assetFrame } = await load();
  const game = {
    $dataActors: [null, { name: "Ada", faceName: "Actor1", faceIndex: 2 }],
    $gameActors: {
      _data: [],
      actor() {
        throw Error("created");
      },
    },
    $dataItems: [null, { iconIndex: 17 }],
    ImageManager: {},
  };
  const assets = createGameAssets(game);
  assert.deepEqual(assets.describe("actor", 1), {
    type: "face",
    name: "Actor1",
    index: 2,
    actorId: 1,
  });
  assert.equal(assets.describe("item", 1).index, 17);
  assert.deepEqual(
    assetFrame(assets.describe("actor", 1), { width: 576, height: 288 }, {}),
    { x: 288, y: 0, width: 144, height: 144 },
  );
  assert.deepEqual(
    assetFrame({ type: "icon", index: 17 }, { width: 512, height: 512 }, {}),
    { x: 32, y: 32, width: 32, height: 32 },
  );
  assert.deepEqual(
    assetFrame(
      { type: "character", name: "$Hero", index: 0 },
      { width: 144, height: 192 },
      {},
    ),
    { x: 48, y: 0, width: 48, height: 48 },
  );
});
test("optional asset requests cache once, contain failures and paint without observing engine objects", async () => {
  const { createGameAssets } = await load();
  let loads = 0;
  const draws = [];
  const bitmap = { isReady: () => true, canvas: { width: 576, height: 288 } };
  const assets = createGameAssets({ ImageManager: {} }, () => {
    loads++;
    return Promise.resolve(bitmap);
  });
  const canvas = {
    width: 56,
    height: 56,
    getContext: () => ({
      clearRect() {},
      drawImage(...args) {
        draws.push(args);
      },
    }),
  };
  await assets.paint(canvas, { type: "face", name: "Actor1", index: 2 });
  await assets.paint(canvas, { type: "face", name: "Actor1", index: 0 });
  assert.equal(loads, 1);
  assert.equal(draws[0][1], 288);
  const broken = createGameAssets({}, () => Promise.reject(Error("missing")));
  assert.equal(
    await broken.paint(canvas, { type: "face", name: "Missing", index: 0 }),
    false,
  );
});

test("private MV bitmap loading installs a local error handler before requesting encrypted-capable engine images", async () => {
  const { loadOptionalBitmap } = await load();
  let requested = "",
    handled = 0;
  function Bitmap() {}
  Bitmap.prototype.initialize = function () {};
  Bitmap.prototype._requestImage = function (url) {
    assert.equal(typeof this._loader, "function");
    requested = url;
    this._loader();
  };
  Bitmap.prototype._onError = () => handled++;
  Bitmap.prototype.isReady = () => true;
  const game = { Bitmap, location: { href: "file:///game/www/index.html" } };
  await loadOptionalBitmap(game, { type: "face", name: "Actor One" });
  assert.match(requested, /game\/www\/img\/faces\/Actor%20One.png$/);
  assert.equal(handled, 1);
  await assert.rejects(
    loadOptionalBitmap(game, { type: "face", name: "../outside" }),
    /Invalid/,
  );
});

test("stale image requests cannot repaint a reused canvas, and cache entries are bounded", async () => {
  const { createGameAssets } = await load();
  let calls = 0,
    draws = 0;
  const assets = createGameAssets({}, async () => {
    calls++;
    return { canvas: { width: 48, height: 48 } };
  });
  const canvas = {
    width: 48,
    height: 48,
    getContext: () => ({
      clearRect() {},
      drawImage() {
        draws++;
      },
    }),
  };
  assert.equal(
    await assets.paint(canvas, { type: "enemy", name: "Enemy" }, () => false),
    false,
  );
  assert.equal(draws, 0);
  for (let i = 0; i < 70; i++)
    await assets.paint(canvas, { type: "enemy", name: "Enemy" + i });
  const before = calls;
  await assets.paint(canvas, { type: "enemy", name: "Enemy0" });
  assert.equal(calls, before + 1);
});

for (const engine of ["MV", "MZ"])
  test(
    engine +
      " optional encrypted image failures stay inside their request callback",
    async () => {
      const { loadOptionalBitmap } = await load();
      function Bitmap() {}
      Bitmap.prototype.initialize = function () {};
      Bitmap.prototype._requestImage = function () {
        throw Error("must not delegate encrypted image callbacks");
      };
      Bitmap.load = () => {
        throw Error("must not delegate encrypted image callbacks");
      };
      const decrypt = () => {
        throw Error("Header is wrong");
      };
      const game = {
        Bitmap,
        location: { href: "file:///game/index.html" },
        XMLHttpRequest: class {
          open() {}
          send() {
            this.status = 200;
            this.response = new ArrayBuffer(8);
            queueMicrotask(() => this.onload());
          }
        },
      };
      if (engine === "MV")
        game.Decrypter = {
          hasEncryptedImages: true,
          checkImgIgnore: () => false,
          extToEncryptExt: (url) => url.replace(/png$/, "rpgmvp"),
          decryptArrayBuffer: decrypt,
        };
      else
        game.Utils = {
          hasEncryptedImages: () => true,
          decryptArrayBuffer: decrypt,
        };
      await assert.rejects(
        loadOptionalBitmap(game, { type: "face", name: "Damaged" }),
        /Header is wrong/,
      );
    },
  );

for (const engine of ["MV", "MZ"])
  test(
    engine +
      " decrypted optional images copy into a private bitmap and release blob URLs",
    async () => {
      const { loadOptionalBitmap } = await load();
      let copied = 0,
        revoked = 0,
        hue = 0;
      function Bitmap(width, height) {
        this._canvas = { width, height };
        this._context = {
          drawImage() {
            copied++;
          },
        };
      }
      Bitmap.prototype.rotateHue = (value) => {
        hue = value;
      };
      const game = {
        Bitmap,
        location: { href: "file:///game/index.html" },
        URL: {
          createObjectURL: () => "blob:optional",
          revokeObjectURL: () => revoked++,
        },
        Image: class {
          constructor() {
            this.width = this.height = 16;
          }
          set src(value) {
            queueMicrotask(() => this.onload());
          }
        },
        XMLHttpRequest: class {
          open() {}
          send() {
            this.status = 200;
            this.response = new ArrayBuffer(32);
            queueMicrotask(() => this.onload());
          }
        },
      };
      if (engine === "MV")
        game.Decrypter = {
          hasEncryptedImages: true,
          checkImgIgnore: () => false,
          extToEncryptExt: (url) => url + ".rpgmvp",
          decryptArrayBuffer: (data) => data,
        };
      else
        game.Utils = {
          hasEncryptedImages: () => true,
          decryptArrayBuffer: (data) => data,
        };
      const bitmap = await loadOptionalBitmap(game, {
        type: "enemy",
        name: "Slime",
        hue: 120,
      });
      assert.equal(copied, 1);
      assert.equal(revoked, 1);
      assert.equal(hue, 120);
      assert.equal(bitmap._canvas.width, 16);
    },
  );
