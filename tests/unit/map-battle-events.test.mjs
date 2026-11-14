import test from "node:test";
import assert from "node:assert/strict";
const load = () =>
  import("../../cheat-engine/www/cheat/js/runtime/MapBattleEvents.js");
function fixture() {
  let started = 0;
  const page = { list: [{ code: 117, parameters: [1] }] };
  const event = {
    _eventId: 7,
    _pageIndex: 0,
    _erased: false,
    event: () => ({ name: "Guard" }),
    page: () => page,
    start() {
      started++;
    },
  };
  const game = {
    $gameMap: {
      mapId: () => 3,
      events: () => [event],
      event: () => event,
      isEventRunning: () => false,
    },
    $gameVariables: { value: () => 2 },
    $dataTroops: [
      null,
      { members: [{ enemyId: 1 }] },
      { members: [{ enemyId: 2 }] },
    ],
    $dataCommonEvents: [
      null,
      {
        list: [
          { code: 301, parameters: [1, 4] },
          { code: 117, parameters: [1] },
        ],
      },
    ],
  };
  return { game, page, event, started: () => started };
}
test("maps active battle/common-event references without executing scripts or looping", async () => {
  const { createMapBattleEvents } = await load();
  const f = fixture();
  const actions = createMapBattleEvents(f.game, () => ({ allowed: true }));
  assert.equal(actions.list(1).length, 0);
  const rows = actions.list(2);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "Guard");
  assert.deepEqual(rows[0].troopIds, [2]);
  assert.equal(f.started(), 0);
  actions.start(rows[0]);
  assert.equal(f.started(), 1);
});
test("original-event starts reject changed maps/pages, erased events and busy sessions", async () => {
  const { createMapBattleEvents } = await load();
  const f = fixture();
  let allowed = true;
  const actions = createMapBattleEvents(f.game, () => ({
    allowed,
    reason: "Busy",
  }));
  const row = actions.list(2)[0];
  allowed = false;
  assert.throws(() => actions.start(row), /Busy/);
  allowed = true;
  f.event._pageIndex = 1;
  assert.throws(() => actions.start(row), /changed|available/i);
  f.event._pageIndex = 0;
  f.event._erased = true;
  assert.throws(() => actions.start(row), /changed|available/i);
  f.event._erased = false;
  f.game.$gameMap.mapId = () => 4;
  assert.throws(() => actions.start(row), /map/i);
  assert.equal(f.started(), 0);
});

test("changed variable troop targets invalidate confirmed event references and scripts are never evaluated", async () => {
  const { createMapBattleEvents } = await load();
  const f = fixture();
  const actions = createMapBattleEvents(f.game, () => ({ allowed: true }));
  const reference = actions.list(2)[0];
  f.game.$gameVariables.value = () => 1;
  assert.throws(() => actions.start(reference), /changed|available/);
  f.page.list = [
    { code: 355, parameters: ["throw new Error('must not execute')"] },
    { code: 301, parameters: [2, 0] },
  ];
  assert.deepEqual(actions.list(2), []);
});

test("troop-specific references do not match another variant sharing enemy membership", async () => {
  const { createMapBattleEvents } = await load();
  const f = fixture();
  f.game.$dataTroops[1].members = [{ enemyId: 2 }];
  const actions = createMapBattleEvents(f.game, () => ({ allowed: true }));
  assert.equal(actions.list(2).length, 1);
  assert.deepEqual(actions.listForTroop(1), []);
  const row = actions.listForTroop(2)[0];
  assert.equal(row.troopId, 2);
  assert.deepEqual(row.troopIds, [2]);
  actions.start(row);
  assert.equal(f.started(), 1);
  f.game.$gameVariables.value = () => 1;
  assert.equal(actions.list(2).length, 1);
  assert.throws(() => actions.start(row), /changed|available/);
  assert.equal(f.started(), 1);
  for (const id of [0, -1, 1.5, "2", null, undefined, 999])
    assert.deepEqual(actions.listForTroop(id), []);
});

test("troop refs validate the current page, nested commands, map and availability before starting", async () => {
  const { createMapBattleEvents } = await load();
  const f = fixture();
  let allowed = true;
  const actions = createMapBattleEvents(f.game, () => ({
    allowed,
    reason: "Busy",
  }));
  const row = actions.listForTroop(2)[0];
  allowed = false;
  assert.throws(() => actions.start(row), /Busy/);
  allowed = true;
  f.event._erased = true;
  assert.throws(() => actions.start(row), /changed|available/);
  f.event._erased = false;
  f.event._pageIndex++;
  assert.throws(() => actions.start(row), /changed|available/);
  f.event._pageIndex--;
  f.game.$dataCommonEvents[1].list.push({ code: 121, parameters: [1, 1, 0] });
  assert.throws(() => actions.start(row), /changed|available/);
  f.game.$dataCommonEvents[1].list.pop();
  f.game.$gameMap.mapId = () => 8;
  assert.throws(() => actions.start(row), /map/i);
  assert.equal(f.started(), 0);
});

test("battle actions expose exact troop lookup and launch the untouched authored troop", async () => {
  const { createBattleActions } =
    await import("../../cheat-engine/www/cheat/js/runtime/BattleActions.js");
  const f = fixture();
  const calls = [];
  f.game.Scene_Map = function () {};
  f.game.Scene_Battle = function () {};
  f.game.SceneManager = {
    _scene: new f.game.Scene_Map(),
    push: (scene) => calls.push(scene),
  };
  f.game.$gameParty = { inBattle: () => false };
  f.game.$gamePlayer = {};
  f.game.$gameMessage = {};
  f.game.$gameTroop = { troop: () => f.game.$dataTroops[2] };
  const troop = f.game.$dataTroops[2];
  troop.members.push({ enemyId: 2, hidden: true, x: 0, y: -4 });
  troop.pages = [{ list: [{ code: 121, parameters: [1, 1, 0] }] }];
  const before = JSON.stringify(troop);
  f.game.BattleManager = { setup: (...args) => calls.push(args) };
  const actions = createBattleActions(f.game);
  assert.equal(actions.mapEventsForTroop(2)[0].troopId, 2);
  actions.startMapEvent(actions.mapEventsForTroop(2)[0]);
  assert.equal(f.started(), 1);
  actions.startTroop(2);
  assert.deepEqual(calls[0], [2, true, false]);
  assert.equal(f.game.$dataTroops[2], troop);
  assert.equal(JSON.stringify(troop), before);
});
