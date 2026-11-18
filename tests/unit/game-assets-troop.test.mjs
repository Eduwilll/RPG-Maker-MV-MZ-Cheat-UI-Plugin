import test from "node:test";
import assert from "node:assert/strict";

async function createAssets() {
  const module =
    await import("../../cheat-engine/www/cheat/js/runtime/GameAssets.js");
  return module.createGameAssets;
}

/** Minimal canvas stand-in: records drawImage calls instead of rasterising. */
function fakeCanvas(width, height) {
  const calls = [];
  const context = {
    globalAlpha: 1,
    clearRect() {},
    drawImage() {
      const args = Array.prototype.slice.call(arguments);
      calls.push({ alpha: this.globalAlpha, args: args.slice(1) });
    },
  };
  return { width, height, calls, getContext: () => context };
}

function image(width, height) {
  return { width, height };
}

function gameWith(troop, images) {
  const sheets = images || {
    Torso: image(100, 200),
    Head: image(60, 80),
    Arm: image(20, 100),
  };
  const created = [];
  const game = {
    document: {
      createElement() {
        const canvas = fakeCanvas(1, 1);
        created.push(canvas);
        return canvas;
      },
    },
    $gameSystem: { isSideView: () => false },
    $dataEnemies: {
      2: { battlerName: "Torso", battlerHue: 0 },
      3: { battlerName: "Head", battlerHue: 0 },
      4: { battlerName: "Arm", battlerHue: 0 },
      5: { battlerName: "", battlerHue: 0 },
    },
    $dataTroops: { 2: troop },
  };
  let loads = 0;
  const loader = async (g, asset) => {
    loads++;
    return { canvas: sheets[asset.name] || null, isReady: () => true };
  };
  return { game, loader, created, loads: () => loads };
}

const READY = () => true;

test("troop artwork composites every member at its authored battle position", async () => {
  const createGameAssets = await createAssets();
  const troop = {
    id: 2,
    name: "Woodsman1",
    members: [
      { enemyId: 2, x: 240, y: 320 },
      { enemyId: 3, x: 240, y: 200 },
      { enemyId: 4, x: 100, y: 300, hidden: true },
    ],
  };
  const { game, loader, created } = gameWith(troop);
  const runtime = createGameAssets(game, loader);
  const asset = runtime.describe("troop", 2);
  assert.equal(asset.type, "troop");
  assert.equal(asset.members.length, 3, "hidden members stay in the artwork");
  assert.equal(asset.members[2].hidden, true);

  const target = fakeCanvas(64, 64);
  assert.equal(await runtime.paint(target, asset, READY), true);

  const composite = created[0];
  // Bounds: x 90..290, y 120..320 (200x200) scaled to the 96 px tier.
  assert.equal(composite.width, 96);
  assert.equal(composite.height, 96);
  assert.deepEqual(
    composite.calls.map((call) => call.args),
    [
      [48, 0, 48, 96],
      [58, 0, 29, 38],
      [0, 38, 10, 48],
    ],
  );
  assert.deepEqual(
    composite.calls.map((call) => call.alpha),
    [1, 1, 0.4],
    "members that start hidden are drawn faded",
  );
  assert.deepEqual(
    target.calls.map((call) => call.args),
    [[0, 0, 64, 64]],
  );
});

test("troop compositions are cached per snapshot and size tier", async () => {
  const createGameAssets = await createAssets();
  const troop = {
    id: 2,
    members: [
      { enemyId: 2, x: 240, y: 320 },
      { enemyId: 3, x: 240, y: 200 },
    ],
  };
  const { game, loader, loads } = gameWith(troop);
  const runtime = createGameAssets(game, loader);
  const asset = runtime.describe("troop", 2);
  await runtime.paint(fakeCanvas(48, 48), asset, READY);
  assert.equal(loads(), 2);
  await runtime.paint(fakeCanvas(48, 48), asset, READY);
  assert.equal(loads(), 2, "the second paint reuses the composed canvas");
});

test("troop members without authored positions fall back to a readable row", async () => {
  const createGameAssets = await createAssets();
  const { game, loader, created } = gameWith({
    id: 2,
    members: [{ enemyId: 2 }, { enemyId: 3 }],
  });
  const runtime = createGameAssets(game, loader);
  const asset = runtime.describe("troop", 2);
  assert.ok(!Number.isFinite(asset.members[0].x));
  assert.equal(await runtime.paint(fakeCanvas(64, 64), asset, READY), true);
  const composite = created[0];
  assert.equal(composite.calls.length, 2, "both members are still drawn");
  // Bottom aligned in a row: same baseline, side by side.
  const [first, second] = composite.calls.map((call) => call.args);
  assert.equal(first[1] + first[3], second[1] + second[3]);
  assert.ok(second[0] > first[0]);
});

test("troops skip members without a battler image and unknown troop IDs", async () => {
  const createGameAssets = await createAssets();
  const { game, loader } = gameWith({
    id: 2,
    members: [
      { enemyId: 5, x: 1, y: 1 },
      { enemyId: 99, x: 2, y: 2 },
      { enemyId: 2, x: 3, y: 3 },
    ],
  });
  const runtime = createGameAssets(game, loader);
  const asset = runtime.describe("troop", 2);
  assert.equal(asset.members.length, 1);
  assert.equal(asset.members[0].name, "Torso");
  assert.equal(runtime.describe("troop", 42), null);
});

test("troop descriptors cap members per snapshot", async () => {
  const createGameAssets = await createAssets();
  const members = [];
  for (let i = 0; i < 40; i++) members.push({ enemyId: 2, x: i, y: i });
  const { game, loader } = gameWith({ id: 2, members });
  const runtime = createGameAssets(game, loader);
  assert.equal(runtime.describe("troop", 2).members.length, 32);
});
