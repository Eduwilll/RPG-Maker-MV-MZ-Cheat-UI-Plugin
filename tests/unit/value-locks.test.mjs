import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourceUrl = new URL(
  "../../cheat-engine/www/cheat/js/runtime/ValueLocks.js",
  import.meta.url,
);
// Data URLs keep the browser ES module independent of the root package type.
let runtimeModule;
try {
  runtimeModule = await import(
    "data:text/javascript;base64," +
      Buffer.from(await readFile(sourceUrl, "utf8")).toString("base64")
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  runtimeModule = {};
}
const factory = (game, storage) => {
  assert.equal(
    typeof runtimeModule.createValueLocks,
    "function",
    "createValueLocks must be implemented",
  );
  return runtimeModule.createValueLocks(game, storage);
};

function fixture(t) {
  const intervals = new Map();
  const warnings = [];
  const values = new Map();
  const writes = [];
  const storage = {
    getItem: (key) => values.get(key),
    setItem(key, value) {
      values.set(key, value);
      writes.push([key, value]);
    },
  };
  const game = {
    $gameSystem: {},
    $dataItems: [null, { id: 1, name: "Potion" }],
    $dataWeapons: [null, { id: 1, name: "Sword" }],
    $dataArmors: [null, { id: 1, name: "Shield" }],
    $dataStates: [null, { id: 1, name: "Death" }, { id: 2, name: "Poison" }],
    $dataActors: [null, { id: 1, name: "Hero" }],
    $dataSystem: {
      variables: ["", "Count", "Text", "Flag"],
      switches: ["", "Door"],
    },
    console: { warn: (...args) => warnings.push(args.join(" ")) },
    setInterval(callback, delay) {
      const id = intervals.size + 1;
      intervals.set(id, { callback, delay });
      return id;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
  };
  class Party {
    constructor() {
      this._gold = 0;
      this.counts = new Map();
      this.equipped = 1;
      this.calls = 0;
    }
    maxItems() {
      return 99;
    }
    maxGold() {
      return 999;
    }
    numItems(item) {
      return this.counts.get(item) || 0;
    }
    gainItem(item, amount, includeEquip) {
      this.calls++;
      const next = this.numItems(item) + amount;
      this.counts.set(item, Math.max(0, Math.min(99, next)));
      if (includeEquip && next < 0)
        this.equipped = Math.max(0, this.equipped + next);
      return "item-hook-result";
    }
    gold() {
      return this._gold;
    }
    gainGold(amount) {
      this._gold = Math.max(0, Math.min(999, this._gold + amount));
      return "gold-hook-result";
    }
  }
  class Variables {
    constructor() {
      this._data = [];
      this.calls = 0;
    }
    value(id) {
      return this._data[id] || 0;
    }
    setValue(id, value) {
      this.calls++;
      this._data[id] = typeof value === "number" ? Math.floor(value) : value;
    }
  }
  class Switches {
    constructor() {
      this._data = [];
    }
    value(id) {
      return !!this._data[id];
    }
    setValue(id, value) {
      this._data[id] = !!value;
    }
  }
  class Actor {
    constructor() {
      this._states = [];
    }
    actorId() {
      return 1;
    }
    deathStateId() {
      return 1;
    }
    isStateAffected(id) {
      return this._states.includes(id);
    }
    addState(id) {
      if (!this.isStateAffected(id)) this._states.push(id);
      this.refresh();
    }
    removeState(id) {
      this.eraseState(id);
      this.refresh();
    }
    eraseState(id) {
      this._states = this._states.filter((entry) => entry !== id);
    }
    clearStates() {
      this._states = [];
    }
    refresh() {
      this.refreshes = (this.refreshes || 0) + 1;
    }
  }
  class Timer {
    constructor() {
      this._frames = 0;
      this._working = false;
      this.updates = 0;
      this.expires = 0;
    }
    start(frames) {
      this._frames = frames;
      this._working = true;
    }
    stop() {
      this._working = false;
    }
    isWorking() {
      return this._working;
    }
    update(active) {
      this.updates++;
      if (active && this._working && this._frames > 0 && --this._frames === 0)
        this.onExpire();
    }
    onExpire() {
      this.expires++;
    }
  }
  Object.assign(game, {
    Game_Party: Party,
    Game_Variables: Variables,
    Game_Switches: Switches,
    Game_Actor: Actor,
    Game_Timer: Timer,
  });
  const actor = new Actor();
  Object.assign(game, {
    $gameParty: new Party(),
    $gameVariables: new Variables(),
    $gameSwitches: new Switches(),
    $gameActors: {
      _data: [null, actor],
      actor: (id) => (id === 1 ? actor : null),
    },
    $gameTimer: new Timer(),
    DataManager: {
      extractSaveContents(contents) {
        game.$gameVariables = contents.variables;
        return "load-result";
      },
    },
  });
  const locks = factory(game, storage);
  t.after(() => locks.dispose());
  return { game, locks, storage, writes, warnings, intervals, actor };
}

function lazyActorsFixture(t) {
  const context = fixture(t);
  const { game } = context;
  let created = 0;
  class LazyActor {
    constructor(id) {
      // Bound the failing recursion so the regression reports a concise error.
      if (++created > 20)
        throw new RangeError("Maximum call stack size exceeded");
      this._actorId = 0;
      this.clearStates();
      this._actorId = id;
      // YEP_EquipCore calls recoverAll/refresh while setup is still running.
      this.recoverAll();
      this.refresh();
    }
    actorId() {
      return this._actorId;
    }
    clearStates() {
      this._states = [];
      return "cleared";
    }
    recoverAll() {
      this.clearStates();
    }
    refresh() {
      return "refreshed";
    }
    isStateAffected(id) {
      return this._states.includes(id);
    }
    addState(id) {
      if (!this.isStateAffected(id)) this._states.push(id);
      this.refresh();
    }
    removeState(id) {
      this._states = this._states.filter((value) => value !== id);
      this.refresh();
    }
    deathStateId() {
      return 1;
    }
  }
  game.Game_Actor = LazyActor;
  game.$gameActors = {
    _data: [],
    actor(id) {
      if (!game.$dataActors[id]) return null;
      // RPG Maker caches only after the entire constructor has returned.
      if (!this._data[id]) this._data[id] = new game.Game_Actor(id);
      return this._data[id];
    },
  };
  return { ...context, created: () => created };
}

test("installing locks does not recursively construct actors during setup even with no locks", (t) => {
  const { game, locks, created } = lazyActorsFixture(t);
  locks.install();
  let actor, failure;
  try {
    actor = game.$gameActors.actor(1);
  } catch (error) {
    failure = error;
  }
  assert.equal(failure && failure.name, undefined, failure && failure.message);
  assert.equal(created(), 1);
  assert.equal(game.$gameActors._data[1], actor);
  assert.equal(actor.clearStates(), "cleared");
});

test("persisted status locks wait until lazy actor construction finishes, then enforce normally", (t) => {
  const { game, storage, created } = lazyActorsFixture(t);
  storage.setItem(
    "locks-and-favorites-v1",
    JSON.stringify({
      version: 1,
      entries: [
        {
          target: { kind: "state", actorId: 1, id: 2 },
          value: true,
          locked: true,
          enabled: true,
        },
      ],
    }),
  );
  const locks = factory(game, storage);
  t.after(() => locks.dispose());
  locks.install();
  let actor, failure;
  try {
    actor = game.$gameActors.actor(1);
  } catch (error) {
    failure = error;
  }
  assert.equal(failure && failure.name, undefined, failure && failure.message);
  assert.equal(created(), 1);
  locks.reconcile();
  assert.equal(actor.isStateAffected(2), true);
  actor.removeState(2);
  assert.equal(actor.isStateAffected(2), true);
  assert.equal(created(), 1);
});

test("hooks on detached actors never construct replacement actors after a load or new game", (t) => {
  const { game, locks, created } = lazyActorsFixture(t);
  const oldActor = game.$gameActors.actor(1);
  locks.install();
  locks.set({ kind: "state", actorId: 1, id: 2 }, true);
  game.$gameActors = {
    _data: [],
    actor() {
      throw new Error("hook must not request an actor");
    },
  };
  assert.doesNotThrow(() => oldActor.clearStates());
  assert.equal(oldActor.isStateAffected(2), false);
  assert.equal(created(), 1);
});

test("chains setters, clamps inventory/gold and never confiscates equipment", (t) => {
  const { game, locks } = fixture(t);
  locks.install();
  const item = { kind: "item", id: 1 };
  assert.equal(locks.set(item, 999).value, 99);
  assert.equal(
    game.$gameParty.gainItem(game.$dataItems[1], -999, true),
    "item-hook-result",
  );
  assert.equal(game.$gameParty.numItems(game.$dataItems[1]), 99);
  assert.equal(game.$gameParty.equipped, 1);
  locks.set(item, 0);
  game.$gameParty.gainItem(game.$dataItems[1], -99, true);
  assert.equal(game.$gameParty.equipped, 1);
  for (const kind of ["weapon", "armor"]) {
    locks.set({ kind, id: 1 }, 3);
    const record =
      kind === "weapon" ? game.$dataWeapons[1] : game.$dataArmors[1];
    game.$gameParty.gainItem(record, -1, false);
    assert.equal(game.$gameParty.numItems(record), 3);
  }
  locks.set({ kind: "gold" }, 9999);
  assert.equal(game.$gameParty.gainGold(-10), "gold-hook-result");
  assert.equal(game.$gameParty.gold(), 999);
  locks.remove(item);
  game.$gameParty.gainItem(game.$dataItems[1], 7, false);
  assert.equal(game.$gameParty.numItems(game.$dataItems[1]), 7);
});

test("variables retain primitive types, numeric values follow engine integer semantics", (t) => {
  const { game, locks } = fixture(t);
  locks.install();
  for (const [id, value, expected] of [
    [1, 4.9, 4],
    [2, "12.5", "12.5"],
    [3, false, false],
  ]) {
    locks.set({ kind: "variable", id }, value);
    game.$gameVariables.setValue(id, "other");
    assert.equal(game.$gameVariables._data[id], expected);
  }
  locks.set({ kind: "switch", id: 1 }, false);
  game.$gameSwitches.setValue(1, true);
  assert.equal(game.$gameSwitches.value(1), false);
  for (const value of [NaN, Infinity, {}, [], null, undefined]) {
    assert.throws(() => locks.set({ kind: "variable", id: 1 }, value));
  }
  assert.throws(() => locks.set({ kind: "switch", id: 1 }, "false"));
  assert.throws(() => locks.set({ kind: "gold" }, "12"));
  assert.throws(() => locks.set({ kind: "__proto__", id: 1 }, 3));
  assert.throws(() => locks.set({ kind: "item", id: -1 }, 3));
});
test("changed engine limits clamp an existing lock once rather than retrying an impossible amount", (t) => {
  const { game, locks, writes } = fixture(t);
  const target = { kind: "item", id: 1 };
  locks.set(target, 90);
  game.$gameParty.maxItems = () => 3;
  locks.reconcile();
  assert.equal(locks.list().find((row) => row.target.kind === "item").value, 3);
  const count = writes.length;
  locks.reconcile();
  locks.reconcile();
  assert.equal(writes.length, count);
});

test("state locks enforce present and absent without recursive setter storms", (t) => {
  const { locks, actor } = fixture(t);
  locks.install();
  const target = { kind: "state", actorId: 1, id: 2 };
  locks.set(target, true);
  actor.removeState(2);
  assert.equal(actor.isStateAffected(2), true);
  actor.clearStates();
  assert.equal(actor.isStateAffected(2), true);
  locks.set(target, false);
  actor.addState(2);
  assert.equal(actor.isStateAffected(2), false);
  assert.ok(actor.refreshes < 30);
  assert.match(
    locks.set({ kind: "state", actorId: 1, id: 1 }, true).warning,
    /death/i,
  );
});

test("timer freezes exact frames and working state without triggering expiry, preserving update hooks", (t) => {
  const { game, locks } = fixture(t);
  locks.install();
  const target = { kind: "timer" };
  const input = { frames: 1, working: true };
  locks.set(target, input);
  input.frames = 999;
  for (let n = 0; n < 120; n++) game.$gameTimer.update(true);
  assert.equal(game.$gameTimer._frames, 1);
  assert.equal(game.$gameTimer.isWorking(), true);
  assert.equal(game.$gameTimer.expires, 0);
  assert.equal(game.$gameTimer.updates, 120);
  game.$gameTimer.stop();
  assert.equal(game.$gameTimer.isWorking(), true);
  locks.set(target, { frames: 80, working: false });
  game.$gameTimer.start(9);
  assert.equal(game.$gameTimer._frames, 80);
  assert.equal(game.$gameTimer.isWorking(), false);
  locks.remove(target);
  game.$gameTimer.start(2);
  game.$gameTimer.update(true);
  assert.equal(game.$gameTimer._frames, 1);
});

test("installs one game timer, reconciles only configured targets, never writes each tick", (t) => {
  const { game, locks, writes, intervals } = fixture(t);
  locks.install();
  locks.install();
  assert.equal(intervals.size, 1);
  const tick = [...intervals.values()][0];
  assert.equal(tick.delay, 250);
  locks.set({ kind: "variable", id: 1 }, 7);
  const count = writes.length;
  game.$gameVariables._data[1] = -1;
  tick.callback();
  assert.equal(game.$gameVariables.value(1), 7);
  for (let n = 0; n < 100; n++) tick.callback();
  assert.equal(writes.length, count);
  locks.dispose();
  assert.equal(intervals.size, 0);
  game.$gameVariables.setValue(1, 2);
  assert.equal(game.$gameVariables.value(1), 2);
});

test("reconciliation has a bounded budget and eventually visits every configured key", (t) => {
  const { game, locks } = fixture(t);
  game.$dataSystem.variables = Array.from({ length: 151 }, (_, id) =>
    String(id),
  );
  for (let id = 1; id <= 150; id++) locks.set({ kind: "variable", id }, 7);
  game.$gameVariables._data = Array(151).fill(0);
  game.$gameVariables.calls = 0;
  locks.reconcile();
  assert.ok(game.$gameVariables.calls > 0 && game.$gameVariables.calls <= 64);
  for (let n = 0; n < 3; n++) locks.reconcile();
  assert.equal(
    game.$gameVariables._data.slice(1).filter((value) => value === 7).length,
    150,
  );
});

test("retains game-local locks over object replacement and chains save hooks", (t) => {
  const { game, locks } = fixture(t);
  locks.install();
  locks.set({ kind: "variable", id: 1 }, 8);
  const old = game.$gameVariables;
  const fresh = new game.Game_Variables();
  assert.equal(
    game.DataManager.extractSaveContents({ variables: fresh }),
    "load-result",
  );
  locks.reconcile();
  assert.equal(fresh.value(1), 8);
  fresh.setValue(1, 0);
  assert.equal(fresh.value(1), 8);
  old.setValue(1, 2);
  assert.equal(
    old.value(1),
    2,
    "detached save objects must not remain enforced",
  );
});

test("no active session or title scene means no mutation or stale-target disable", (t) => {
  const { game, locks, warnings } = fixture(t);
  locks.install();
  game.$gameSystem = null;
  locks.set({ kind: "variable", id: 1 }, 6);
  locks.reconcile();
  assert.equal(game.$gameVariables.value(1), 0);
  assert.equal(locks.list()[0].active, false);
  assert.equal(warnings.length, 0);
  game.$gameSystem = {};
  game.Scene_Title = class {};
  game.SceneManager = { _scene: new game.Scene_Title() };
  locks.reconcile();
  assert.equal(game.$gameVariables.value(1), 0);
  game.SceneManager._scene = {};
  locks.reconcile();
  assert.equal(game.$gameVariables.value(1), 6);
});

test("stale IDs disable once with diagnostic and remain removable from review list", (t) => {
  const { game, locks, warnings } = fixture(t);
  const target = { kind: "item", id: 1 };
  locks.set(target, 6);
  locks.setFavorite(target, true);
  game.$dataItems[1] = null;
  for (let n = 0; n < 8; n++) locks.reconcile();
  const row = locks.list()[0];
  assert.equal(row.enabled, false);
  assert.equal(row.locked, true);
  assert.equal(row.favorite, true);
  assert.equal(locks.isLocked(target), false);
  assert.match(row.reason, /missing|invalid|unavailable/i);
  assert.equal(warnings.length, 1);
  locks.remove(target);
  locks.setFavorite(target, false);
  assert.deepEqual(locks.list(), []);
});

test("favorites stable-partition existing filtered sort without mutating input or leaking snapshots", (t) => {
  const { locks } = fixture(t);
  const target = { kind: "item", id: 1 };
  locks.setFavorite(target, true);
  locks.setFavorite({ kind: "variable", id: 3 }, true);
  const rows = [{ id: 2 }, { id: 1 }, { id: 3 }, { id: 4 }];
  assert.deepEqual(
    locks
      .sortFavorites(rows, (row) => ({ kind: "variable", id: row.id }))
      .map((row) => row.id),
    [3, 2, 1, 4],
  );
  assert.deepEqual(
    rows.map((row) => row.id),
    [2, 1, 3, 4],
  );
  assert.deepEqual(
    locks
      .sortFavorites(
        rows.filter((row) => row.id !== 3),
        (row) => ({ kind: "variable", id: row.id }),
      )
      .map((row) => row.id),
    [2, 1, 4],
  );
  const snapshot = locks.list();
  snapshot[0].target.id = 999;
  assert.equal(locks.isFavorite(target), true);
});

test("versioned storage reloads locks/favorites without touching save/profile objects", (t) => {
  const { game, locks, storage, writes } = fixture(t);
  locks.set({ kind: "timer" }, { frames: 60, working: false });
  locks.setFavorite({ kind: "item", id: 1 }, true);
  const next = factory(game, storage);
  t.after(() => next.dispose());
  assert.equal(next.isLocked({ kind: "timer" }), true);
  assert.equal(next.isFavorite({ kind: "item", id: 1 }), true);
  const rows = next.list();
  rows.find((row) => row.target.kind === "timer").value.frames = 2;
  assert.equal(
    next.list().find((row) => row.target.kind === "timer").value.frames,
    60,
  );
  assert.ok(writes.length > 0);
  assert.equal(new Set(writes.map(([key]) => key)).size, 1);
  assert.deepEqual(Object.keys(game.$gameSystem), []);
});

test("malformed persistence and absent optional hooks never crash boot", (t) => {
  for (const raw of [
    "invalid JSON",
    "null",
    '{"version":9,"entries":[]}',
    '{"version":1,"entries":[{"target":{"kind":"__proto__","id":1},"value":4,"locked":true}]}',
  ]) {
    const locks = factory({}, { getItem: () => raw, setItem() {} });
    assert.doesNotThrow(() => {
      locks.install();
      locks.reconcile();
      locks.list();
      locks.dispose();
    });
    assert.deepEqual(locks.list(), []);
  }
  const { game, storage } = fixture(t);
  delete game.Game_Variables;
  delete game.setInterval;
  const locks = factory(game, storage);
  t.after(() => locks.dispose());
  locks.install();
  locks.set({ kind: "variable", id: 1 }, 3);
  game.$gameVariables.setValue(1, 9);
  assert.equal(game.$gameVariables.value(1), 3);
});
