import test from "node:test";
import assert from "node:assert/strict";
test("encounters expose the authored root and retain all limbs, hidden members and variants", async () => {
  const { readEnemyEncounters } =
    await import("../../cheat-engine/www/cheat/js/panels/database/EnemyEncounters.js");
  const game = {
    $dataEnemies: [
      null,
      { id: 1, name: "Woodsman [torso]" },
      { id: 2, name: "Woodsman [head]" },
      { id: 3, name: "Woodsman [arm]" },
    ],
    $dataTroops: [
      null,
      {
        id: 1,
        name: "Woodsman1",
        members: [
          { enemyId: 1, x: 0, y: 0 },
          { enemyId: 2, x: 1, y: 1 },
          { enemyId: 3, x: 2, y: 2, hidden: true },
        ],
        pages: [{}],
      },
      { id: 2, name: "Woodsman2", members: [{ enemyId: 1 }], pages: [] },
    ],
  };
  const rows = readEnemyEncounters(game);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "Woodsman1");
  assert.equal(rows[0].parts.length, 3);
  assert.equal(rows[0].parts[2].hidden, true);
  assert.equal(rows[0].primaryId, 1);
  assert.equal(rows[0].troopId, 1);
  game.$dataEnemies = [
    null,
    { name: "Leg", note: "<cgmzencyclopediahide>" },
    { name: "Tall Man" },
  ];
  game.$dataTroops = [
    null,
    {
      id: 53,
      name: "LegR, ArmR, Head",
      members: [{ enemyId: 1 }, { enemyId: 2, hidden: true }],
      pages: [],
    },
  ];
  assert.equal(readEnemyEncounters(game)[0].rootName, "Tall Man");
  assert.equal(readEnemyEncounters(game)[0].primaryId, 2);
});

test("encounter snapshots preserve member order, coordinates and plugin data without live references", async () => {
  const { readEnemyEncounters } =
    await import("../../cheat-engine/www/cheat/js/panels/database/EnemyEncounters.js");
  const members = [
    { enemyId: 2, hidden: false, x: 20, y: 40 },
    { enemyId: 1, hidden: true, x: 0, y: -10, plugin: { layer: 3 } },
    { enemyId: 2, hidden: true, x: 60, y: 70 },
  ];
  const game = {
    $dataEnemies: [null, { name: "Root [torso]" }, { name: "Root [head]" }],
    $dataTroops: [
      null,
      { id: 1, name: "  Exact variant  ", members, pages: [{ list: [] }, {}] },
    ],
  };
  const row = readEnemyEncounters(game)[0];
  assert.equal(row.name, "  Exact variant  ");
  assert.equal(row.rootName, "Root");
  assert.equal(row.primaryId, 1);
  assert.equal(row.pageCount, 2);
  assert.deepEqual(
    row.parts.map((part) => [part.enemyId, part.x, part.y, part.hidden]),
    [
      [2, 20, 40, false],
      [1, 0, -10, true],
      [2, 60, 70, true],
    ],
  );
  row.parts[1].plugin.layer = 9;
  row.parts[0].name = "Changed";
  assert.equal(members[1].plugin.layer, 3);
  assert.equal(game.$dataEnemies[2].name, "Root [head]");
});

test("member-bearing unnamed troops get a display fallback, but empty placeholders do not become encounters", async () => {
  const { readEnemyEncounters } =
    await import("../../cheat-engine/www/cheat/js/panels/database/EnemyEncounters.js");
  const game = {
    $dataEnemies: [
      null,
      { name: "Soul Swarm" },
      { name: "Arms", note: "<CGMZEncyclopediaHide>\n<doesntcount>" },
    ],
    $dataTroops: [
      null,
      { id: 1, name: "", members: [], pages: [] },
      {
        id: 2,
        name: "",
        members: [{ enemyId: 2 }, { enemyId: 1, hidden: true }],
      },
      { id: 3, name: "Empty named troop", members: [] },
    ],
  };
  const rows = readEnemyEncounters(game);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "");
  assert.ok(rows[0].displayName.includes("Soul Swarm"));
  assert.equal(rows[0].primaryId, 1);
  assert.equal(rows[0].parts.length, 2);
  assert.equal(rows[0].parts[0].encyclopediaHidden, true);
  assert.equal(rows[0].parts[0].doesntCount, true);
  assert.deepEqual(readEnemyEncounters(null), []);
});

async function browserFixture(run) {
  const { default: component } =
    await import("../../cheat-engine/www/cheat/components/EncounterBrowser.js");
  const previous = globalThis.window;
  const calls = [];
  const reference = {
    mapId: 4,
    eventId: 7,
    pageIndex: 0,
    troopId: 2,
    troopIds: [2],
    signature: "a",
    name: "Woodsman event",
  };
  globalThis.window = {
    $dataEnemies: [
      null,
      { name: "Woodsman [torso]" },
      { name: "Woodsman [head]" },
    ],
    $dataTroops: [
      null,
      {
        id: 2,
        name: "Woodsman1",
        members: [{ enemyId: 1 }, { enemyId: 2, hidden: true }],
        pages: [{}],
      },
    ],
    __cheatFeatures: {
      battle: {
        availability: () => ({ start: { allowed: true, reason: "" } }),
        mapEventsForTroop: (id) => {
          calls.push(["lookup", id]);
          return [reference];
        },
        startTroop: (id) => calls.push(["troop", id]),
        startMapEvent: (row) => calls.push(["event", row]),
      },
    },
    CustomEvent: class {
      constructor(type) {
        this.type = type;
      }
    },
    dispatchEvent() {},
    focus() {},
  };
  try {
    const vm = Object.assign(component.data(), {
      $emit: (name, id) => calls.push([name, id]),
    });
    Object.keys(component.methods).forEach((key) => {
      vm[key] = component.methods[key].bind(vm);
    });
    Object.keys(component.computed).forEach((key) => {
      Object.defineProperty(vm, key, {
        get: () => component.computed[key].call(vm),
      });
    });
    component.created.call(vm);
    await run(vm, calls, component);
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
}

test("encounter browser searches roots and parts and emits edit IDs without passing engine records", async () => {
  await browserFixture((vm, calls, component) => {
    assert.equal(component.name, "EncounterBrowser");
    assert.ok(!component.props || !Object.keys(component.props).length);
    assert.equal(vm.selected.troopId, 2);
    vm.search = "head";
    assert.equal(vm.rows.length, 1);
    vm.search = "missing";
    assert.equal(vm.rows.length, 0);
    vm.editPart(2);
    assert.deepEqual(calls[calls.length - 1], ["edit", 2]);
    assert.equal(vm.selected.parts[1].hidden, true);
    assert.ok(component.components.GameAsset);
    assert.ok(component.components.DatabaseTooltip);
  });
});

test("encounter and original-map-event actions require confirmation and use the selected troop ID", async () => {
  await browserFixture((vm, calls) => {
    vm.confirmEncounter();
    assert.match(vm.confirmation, /troop battle events.*story/i);
    assert.match(vm.confirmation, /map event.*not run/i);
    assert.ok(!calls.some((call) => call[0] === "troop"));
    vm.proceed();
    assert.deepEqual(
      calls.find((call) => call[0] === "troop"),
      ["troop", 2],
    );
    assert.ok(calls.some((call) => call[0] === "lookup" && call[1] === 2));
    vm.selectedEvent = 7;
    vm.confirmMapEvent();
    assert.match(vm.confirmation, /story|quests|flags/i);
    assert.ok(!calls.some((call) => call[0] === "event"));
    vm.proceed();
    assert.equal(calls.find((call) => call[0] === "event")[1].troopId, 2);
  });
});

test("canceling or changing encounters cannot start a battle, and confirmation is consumed once", async () => {
  await browserFixture((vm, calls) => {
    vm.confirmEncounter();
    vm.cancel();
    vm.proceed();
    assert.ok(!calls.some((call) => call[0] === "troop"));
    vm.confirmEncounter();
    vm.choose(2);
    vm.proceed();
    assert.ok(!calls.some((call) => call[0] === "troop"));
    vm.confirmEncounter();
    vm.proceed();
    vm.proceed();
    assert.equal(calls.filter((call) => call[0] === "troop").length, 1);
  });
});

test("pop-out encounters use the opener's runtime and keep database records detached", async () => {
  await browserFixture((vm, calls) => {
    const game = globalThis.window;
    const events = [];
    globalThis.window = {
      __cheatOpener: game,
      CustomEvent: game.CustomEvent,
      dispatchEvent: (event) => events.push(event.type),
      $dataTroops: [],
    };
    vm.reload();
    assert.equal(vm.selected.primaryId, 1);
    vm.selected.parts[0].name = "Detached";
    assert.equal(game.$dataEnemies[1].name, "Woodsman [torso]");
    vm.confirmEncounter();
    vm.proceed();
    assert.deepEqual(
      calls.find((call) => call[0] === "troop"),
      ["troop", 2],
    );
    assert.deepEqual(events, ["cheat-return-to-game"]);
  });
});

test("encounter browser surfaces runtime rejection without leaving an executable confirmation", async () => {
  await browserFixture((vm, calls) => {
    vm.confirmEncounter();
    globalThis.window.__cheatFeatures.battle.startTroop = () => {
      throw new Error("The map is busy now.");
    };
    vm.proceed();
    assert.match(vm.error, /map is busy/);
    assert.equal(vm.pending, null);
    assert.equal(vm.confirmation, "");
    assert.ok(!calls.some((call) => call[0] === "troop"));
  });
});
