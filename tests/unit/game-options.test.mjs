import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

const load = () =>
  import("../../cheat-engine/www/cheat/js/runtime/GameOptions.js");
const standard = [
  "alwaysDash",
  "commandRemember",
  "bgmVolume",
  "bgsVolume",
  "meVolume",
  "seVolume",
];
function storage() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  };
}
function gameFixture(mz = false) {
  const game = {
    JSON,
    Utils: { RPGMAKER_NAME: mz ? "MZ" : "MV" },
    ConfigManager: {
      alwaysDash: false,
      commandRemember: true,
      bgmVolume: 80,
      bgsVolume: 70,
      meVolume: 60,
      seVolume: 50,
      untouched: "keep",
      save() {
        game.saved++;
      },
    },
    saved: 0,
    disposed: 0,
    constructed: 0,
    invoked: 0,
    custom: false,
    number: 2,
    TextManager: { alwaysDash: "Sprint" },
    Rectangle: class Rectangle {
      constructor(x, y, width, height) {
        Object.assign(this, { x, y, width, height });
      }
    },
  };
  game.Window_Options = class {
    constructor(...args) {
      if (mz) {
        assert.equal(args.length, 1);
        assert.ok(args[0] instanceof game.Rectangle);
        assert.ok(args[0].x < 0);
      } else assert.equal(args.length, 0);
      game.constructed++;
      this._list = [
        { name: "Plugin switch", symbol: "pluginToggle", enabled: true },
        {
          name: "Difficulty",
          symbol: "difficulty",
          enabled: true,
          ext: { min: 1, max: 5, step: 1 },
        },
        { name: "Open credits", symbol: "credits", enabled: true },
        { name: "Disabled", symbol: "disabled", enabled: false },
        ...standard.map((symbol) => ({ name: symbol, symbol, enabled: true })),
      ];
    }
    getConfigValue(symbol) {
      if (symbol === "pluginToggle") return game.custom;
      if (symbol === "difficulty") return game.number;
      if (symbol === "credits") return { complex: true };
      if (symbol === "disabled") return true;
      return game.ConfigManager[symbol];
    }
    changeValue(symbol, value) {
      assert.equal(this.visible, false);
      assert.ok(this.x < 0);
      if (symbol === "pluginToggle") game.custom = value;
      else if (symbol === "difficulty") game.number = Math.round(value);
      else game.ConfigManager[symbol] = value;
    }
    processOk() {
      game.invoked++;
      throw Error("must not probe commands");
    }
    cursorRight() {
      throw Error("must not probe cursor");
    }
    deactivate() {}
    destroy() {
      game.disposed++;
    }
  };
  return game;
}

test("discovers custom controls first, preserves labels, and never executes unknown commands", async () => {
  const { createGameOptions } = await load();
  const game = gameFixture();
  const options = createGameOptions(game, storage());
  const rows = options.list();
  assert.deepEqual(
    rows.slice(0, 4).map((row) => row.symbol),
    ["pluginToggle", "difficulty", "credits", "disabled"],
  );
  assert.deepEqual(
    rows.slice(-6).map((row) => row.symbol),
    standard,
  );
  assert.equal(rows[0].label, "Plugin switch");
  assert.equal(rows[0].type, "boolean");
  assert.equal(rows[1].max, 5);
  assert.equal(rows[2].supported, false);
  assert.match(rows[2].reason, /unsupported|complex/i);
  assert.equal(rows[3].supported, false);
  assert.equal(game.invoked, 0);
  assert.equal(game.saved, 0);
  assert.equal(game.constructed, game.disposed);
  rows[0].value = "not live";
  assert.equal(options.list()[0].value, false);
});

for (const mz of [false, true])
  test(`uses ${mz ? "MZ Rectangle" : "MV no-argument"} construction and real setters`, async () => {
    const { createGameOptions } = await load();
    const game = gameFixture(mz);
    const store = storage();
    const options = createGameOptions(game, store);
    assert.equal(options.set("pluginToggle", true).value, true);
    assert.equal(game.custom, true);
    assert.equal(game.ConfigManager.pluginToggle, undefined);
    assert.equal(options.set("difficulty", 99).value, 5);
    assert.equal(options.set("bgmVolume", -10).value, 0);
    assert.equal(game.saved, 3);
    assert.deepEqual(JSON.parse(options.exportProfile()).options, {
      pluginToggle: true,
      difficulty: 5,
      bgmVolume: 0,
    });
    assert.equal(game.ConfigManager.untouched, "keep");
    assert.equal(game.constructed, game.disposed);
    assert.equal(options.removeFromProfile("difficulty"), true);
    assert.equal(game.number, 5);
    assert.equal(
      JSON.parse(options.exportProfile()).options.difficulty,
      undefined,
    );
    assert.equal(
      JSON.parse(createGameOptions(game, store).exportProfile()).options
        .pluginToggle,
      true,
    );
  });

test("falls back safely when custom discovery or getters fail, and rejects arbitrary mutations", async () => {
  const { createGameOptions } = await load();
  const game = gameFixture();
  game.Window_Options = class {
    constructor() {
      throw Error("plugin requires a scene");
    }
  };
  const options = createGameOptions(game, storage());
  assert.deepEqual(
    options.list().map((row) => row.symbol),
    standard,
  );
  options.set("alwaysDash", true);
  assert.equal(game.ConfigManager.alwaysDash, true);
  for (const [symbol, value] of [
    ["untouched", 2],
    ["save", false],
    ["__proto__", 2],
    ["alwaysDash", "false"],
    ["seVolume", NaN],
  ]) {
    assert.throws(() => options.set(symbol, value));
  }
  assert.equal(game.saved, 1);
  delete game.ConfigManager;
  assert.equal(
    options.list().every((row) => !row.supported),
    true,
  );
});

test("previews imported options without mutation; skips unavailable options and preserves untouched config", async () => {
  const { createGameOptions } = await load();
  const game = gameFixture();
  const options = createGameOptions(game, storage());
  const text = JSON.stringify({
    version: 1,
    options: {
      pluginToggle: true,
      bgmVolume: 140,
      foreignPlugin: false,
      credits: true,
    },
    appearance: {},
    shortcuts: {},
  });
  const summary = options.previewProfile(text);
  assert.deepEqual(
    summary.changes.map((row) => [row.symbol, row.value]),
    [
      ["pluginToggle", true],
      ["bgmVolume", 100],
    ],
  );
  assert.equal(summary.ignored.length, 2);
  assert.equal(game.custom, false);
  assert.equal(game.saved, 0);
  assert.deepEqual(JSON.parse(options.exportProfile()).options, {});
  const imported = options.importProfile(text);
  assert.equal(imported.applied.length, 2);
  assert.equal(imported.errors.length, 0);
  assert.equal(game.custom, true);
  assert.equal(game.ConfigManager.bgmVolume, 100);
  assert.equal(game.ConfigManager.bgsVolume, 70);
  assert.equal(game.ConfigManager.untouched, "keep");
  assert.throws(() =>
    options.importProfile(
      '{"version":1,"options":{"alwaysDash":true,"seVolume":"80"}}',
    ),
  );
  assert.equal(game.ConfigManager.alwaysDash, false);
});

test("only successful edits enter profiles; broken storage and plugin setters fail safely", async () => {
  const { createGameOptions } = await load();
  const game = gameFixture();
  game.Window_Options.prototype.changeValue = function () {
    throw Error("plugin failure");
  };
  const options = createGameOptions(game, {
    getItem() {
      throw Error("disk");
    },
    setItem() {
      throw Error("disk");
    },
  });
  assert.throws(() => options.set("pluginToggle", true), /plugin failure/);
  assert.deepEqual(JSON.parse(options.exportProfile()).options, {});
  const result = options.importProfile(
    '{"version":1,"options":{"pluginToggle":true}}',
  );
  assert.equal(result.errors.length, 1);
  assert.equal(game.constructed, game.disposed);
});

test("MZ rectangles and destroy arguments belong to the game realm", async () => {
  const { createGameOptions } = await load();
  const game =
    vm.runInNewContext(`({ JSON, Object, Utils: {RPGMAKER_NAME:'MZ'}, ConfigManager: {alwaysDash:false, save(){}},
    Rectangle: class Rectangle { constructor(x,y,width,height) { Object.assign(this,{x,y,width,height}); } },
    Window_Options: class { constructor(rect) { if (Object.getPrototypeOf(rect) === Object.prototype) throw Error('wrong rectangle'); this._list=[]; }
      destroy(options) { if (Object.getPrototypeOf(options) !== Object.prototype) throw Error('foreign options'); } }
  })`);
  const options = createGameOptions(game, storage());
  assert.equal(options.set("alwaysDash", true).value, true);
});
