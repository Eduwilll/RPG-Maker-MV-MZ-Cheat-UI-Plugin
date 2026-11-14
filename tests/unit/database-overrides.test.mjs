import test from "node:test";
import assert from "node:assert/strict";

const modulePath =
  "../../cheat-engine/www/cheat/js/runtime/DatabaseOverrides.js";
const load = () => import(modulePath);

function makeGame() {
  const game = {
    JSON,
    console: { warn() {} },
    $dataEnemies: [
      null,
      {
        id: 1,
        name: "Slime",
        params: [10, 2, 3, 4, 5, 6, 7, 8],
        gold: 5,
        exp: 2,
        actions: [],
        traits: [],
        plugin: { keep: true },
      },
    ],
    $dataSkills: [
      null,
      {
        id: 1,
        name: "Fire",
        mpCost: 4,
        tpCost: 0,
        successRate: 100,
        damage: {
          type: 1,
          elementId: 1,
          formula: "a.mat * 2",
          variance: 20,
          critical: false,
        },
        effects: [],
      },
    ],
    $dataClasses: [
      null,
      {
        id: 1,
        name: "Mage",
        params: Array.from({ length: 8 }, () => [0, 10, 20]),
        expParams: [30, 20, 30, 30],
        learnings: [],
        traits: [],
      },
    ],
    $dataStates: [null, { id: 1, name: "Death" }],
    $dataSystem: {
      elements: ["", "Fire"],
      skillTypes: ["", "Magic"],
      weaponTypes: [""],
      armorTypes: [""],
    },
    DataManager: {
      makeSaveContents() {
        return { ordinary: 42 };
      },
      extractSaveContents(contents) {
        game.loadedCost = game.$dataSkills[1].mpCost;
        game.loaded = contents.ordinary;
      },
      setupNewGame() {
        game.startedCost = game.$dataSkills[1].mpCost;
      },
    },
  };
  return game;
}

test("save overrides round-trip, reset between slots, and leave original records intact", async () => {
  const { createDatabaseOverrides } = await load();
  const game = makeGame();
  const original = game.$dataEnemies[1];
  const edits = createDatabaseOverrides(game);
  edits.install();
  edits.install();
  edits.apply("enemy", 1, { gold: 99 });
  edits.apply("skill", 1, { mpCost: 0 });
  const slotA = game.DataManager.makeSaveContents();
  assert.equal(slotA.ordinary, 42);
  assert.equal(game.$dataEnemies[1], original);
  assert.deepEqual(original.plugin, { keep: true });
  game.DataManager.extractSaveContents({ ordinary: 7 });
  assert.equal(game.loadedCost, 4);
  assert.equal(original.gold, 5);
  assert.equal(edits.isEdited("enemy", 1), false);
  game.DataManager.extractSaveContents(slotA);
  assert.equal(game.loadedCost, 0);
  assert.equal(original.gold, 99);
  game.DataManager.setupNewGame();
  assert.equal(original.gold, 5);
  assert.equal(game.startedCost, 4);
});

test("applying editor snapshots never changes unedited plugin metadata", async () => {
  const { createDatabaseOverrides } = await load();
  const game = makeGame();
  const edits = createDatabaseOverrides(game);
  const copy = edits.read("enemy", 1);
  copy.params[0] = 100;
  assert.equal(game.$dataEnemies[1].params[0], 10);
  edits.apply("enemy", 1, { params: copy.params });
  game.$dataEnemies[1].plugin.keep = "updated by plugin";
  edits.reset("enemy", 1);
  assert.equal(game.$dataEnemies[1].params[0], 10);
  assert.equal(game.$dataEnemies[1].plugin.keep, "updated by plugin");
});

test("invalid patches are atomic and formulas are stored without executing them", async () => {
  const { createDatabaseOverrides } = await load();
  const game = makeGame();
  const edits = createDatabaseOverrides(game);
  assert.throws(() => edits.apply("enemy", 1, { gold: 88, params: [1] }));
  assert.equal(game.$dataEnemies[1].gold, 5);
  assert.throws(() => edits.apply("enemy", 1, { id: 100 }));
  assert.throws(() => edits.apply("skill", 1, { mpCost: NaN }));
  assert.throws(() =>
    edits.apply("class", 1, { learnings: [{ level: 2, skillId: 999 }] }),
  );
  assert.throws(() =>
    edits.apply("class", 1, { params: Array.from({ length: 8 }, () => [0]) }),
  );
  const damage = {
    type: 1,
    elementId: 1,
    formula: "throw new Error('must not run')",
    variance: 0,
    critical: false,
  };
  edits.apply("skill", 1, { damage });
  assert.equal(game.$dataSkills[1].damage.formula, damage.formula);
  assert.throws(() =>
    edits.apply("enemy", 1, JSON.parse('{"__proto__":{"polluted":true}}')),
  );
  assert.equal({}.polluted, undefined);
});

test("corrupt or unsupported save override fields do not prevent loading old saves", async () => {
  const { createDatabaseOverrides } = await load();
  const game = makeGame();
  const edits = createDatabaseOverrides(game);
  edits.install();
  edits.apply("enemy", 1, { gold: 99 });
  game.DataManager.extractSaveContents({
    ordinary: 8,
    cheatDatabaseOverrides: { version: 900, entries: [] },
  });
  assert.equal(game.loaded, 8);
  assert.equal(game.$dataEnemies[1].gold, 5);
  assert.doesNotThrow(() =>
    game.DataManager.extractSaveContents({
      ordinary: 9,
      cheatDatabaseOverrides: {
        version: 1,
        entries: [
          { kind: "enemy", id: 1, patch: { gold: -10 } },
          { kind: "class", id: 999, patch: {} },
        ],
      },
    }),
  );
  assert.equal(game.loaded, 9);
});

test("a failed extraction restores the previous edits rather than losing them", async () => {
  const { createDatabaseOverrides } = await load();
  const game = makeGame();
  game.DataManager.extractSaveContents = () => {
    throw new Error("plugin load failed");
  };
  const edits = createDatabaseOverrides(game);
  edits.install();
  edits.apply("skill", 1, { mpCost: 1 });
  assert.throws(
    () => game.DataManager.extractSaveContents({}),
    /plugin load failed/,
  );
  assert.equal(game.$dataSkills[1].mpCost, 1);
});
test("a failed new-game plugin hook does not discard the current save's edits", async () => {
  const { createDatabaseOverrides } = await load();
  const game = makeGame();
  game.DataManager.setupNewGame = () => {
    throw new Error("new game blocked");
  };
  const edits = createDatabaseOverrides(game);
  edits.install();
  edits.apply("enemy", 1, { gold: 75 });
  assert.throws(() => game.DataManager.setupNewGame(), /new game blocked/);
  assert.equal(game.$dataEnemies[1].gold, 75);
});
