import test from "node:test";
import assert from "node:assert/strict";
import { SequenceTracer } from "../../cheat-engine/www/cheat/js/panels/event-analyzer/SequenceTracer.js";

/**
 * Minimal EventDatabase stand-in.
 *
 * SequenceTracer only calls getMapEvent/getCommonEvent/getBattleTroop, so a
 * plain object is a faithful double and keeps these tests free of globals.
 */
function fakeDb({ commonEvents = [], mapEvents = [], troops = [] } = {}) {
  const ce = new Map(commonEvents.map((event) => [event.id, event]));
  const maps = new Map(mapEvents.map((event) => [event.key, event]));
  const battle = new Map(troops.map((troop) => [troop.id, troop]));

  return {
    getCommonEvent: (id) => ce.get(id) || null,
    getMapEvent: (mapId, eventId) => maps.get(`${mapId}:${eventId}`) || null,
    getBattleTroop: (id) => battle.get(id) || null,
  };
}

/** @param {number} code @param {any[]} [parameters] */
const cmd = (code, parameters = []) => ({ code, parameters });

const traceCommon = (db, ceId) =>
  new SequenceTracer(db, null).traceCommonEvent(ceId);

test("a common event root carries its name, trigger and nodes", () => {
  const db = fakeDb({
    commonEvents: [
      {
        id: 1,
        name: "Intro",
        trigger: 1,
        switchId: 0,
        list: [cmd(355, ["hello"]), { code: 0, indent: 0, parameters: [] }],
      },
    ],
  });

  const root = traceCommon(db, 1);

  assert.equal(root.kind, "root");
  assert.equal(root.eventKind, "common");
  assert.equal(root.ceId, 1);
  assert.match(root.name, /Intro/);
  assert.equal(root.trigger, 1);
  assert.equal(root.nodes.length, 1);
  assert.equal(root.nodes[0].kind, "command");
});

test("a missing common event traces to null", () => {
  assert.equal(traceCommon(fakeDb(), 99), null);
});

test("a Common Event call is inlined as an event-ref", () => {
  const db = fakeDb({
    commonEvents: [
      {
        id: 1,
        name: "Outer",
        trigger: 0,
        switchId: 0,
        list: [cmd(117, [2]), { code: 0, indent: 0, parameters: [] }],
      },
      {
        id: 2,
        name: "Inner",
        trigger: 0,
        switchId: 0,
        list: [cmd(355, ["inner text"]), { code: 0, indent: 0, parameters: [] }],
      },
    ],
  });

  const root = traceCommon(db, 1);

  const ref = root.nodes[0];
  assert.equal(ref.kind, "event-ref");
  assert.equal(ref.ceId, 2);
  assert.equal(ref.resolved, true);
  assert.equal(ref.nodes.length, 1);
  assert.match(ref.nodes[0].label, /inner text/);
});

test("a Common Event call to a missing event is an unresolved ref", () => {
  const db = fakeDb({
    commonEvents: [
      {
        id: 1,
        name: "Outer",
        trigger: 0,
        switchId: 0,
        list: [cmd(117, [42]), { code: 0, indent: 0, parameters: [] }],
      },
    ],
  });

  const ref = traceCommon(db, 1).nodes[0];

  assert.equal(ref.kind, "event-ref");
  assert.equal(ref.resolved, false);
  assert.deepEqual(ref.nodes, []);
});

test("a recursive Common Event call is a cycle-ref, not infinite recursion", () => {
  const db = fakeDb({
    commonEvents: [
      {
        id: 1,
        name: "Loop",
        trigger: 0,
        switchId: 0,
        list: [cmd(117, [1]), { code: 0, indent: 0, parameters: [] }],
      },
    ],
  });

  const ref = traceCommon(db, 1).nodes[0];

  assert.equal(ref.kind, "cycle-ref");
  assert.equal(ref.ceId, 1);
  assert.match(ref.label, /CYCLE/);
});

test("a mutual cycle (A calls B, B calls A) is also cut", () => {
  const db = fakeDb({
    commonEvents: [
      {
        id: 1,
        name: "A",
        trigger: 0,
        switchId: 0,
        list: [cmd(117, [2]), { code: 0, indent: 0, parameters: [] }],
      },
      {
        id: 2,
        name: "B",
        trigger: 0,
        switchId: 0,
        list: [cmd(117, [1]), { code: 0, indent: 0, parameters: [] }],
      },
    ],
  });

  const root = traceCommon(db, 1);
  const b = root.nodes[0];
  assert.equal(b.kind, "event-ref");
  assert.equal(b.ceId, 2);
  assert.equal(b.nodes[0].kind, "cycle-ref", "B's call back to A is a cycle");
});

test("a self-recursive call inside a branch is still cut", () => {
  // The cycle stack must survive the branch descent, not just the top level.
  const db = fakeDb({
    commonEvents: [
      {
        id: 1,
        name: "Loop",
        trigger: 0,
        switchId: 0,
        list: [
          { code: 111, indent: 0, parameters: [0, 1, 0] },
          cmd(117, [1]),
          { code: 412, indent: 0, parameters: [] },
          { code: 0, indent: 0, parameters: [] },
        ],
      },
    ],
  });

  const branch = traceCommon(db, 1).nodes[0];
  assert.equal(branch.kind, "branch");
  assert.equal(branch.trueNodes[0].kind, "cycle-ref");
});

test("a non-recursive repeat call resolves again in a sibling position", () => {
  // The cycle stack is scoped to the path, so calling the same CE twice from
  // the same parent inlines it twice instead of reporting a cycle.
  const db = fakeDb({
    commonEvents: [
      {
        id: 1,
        name: "Outer",
        trigger: 0,
        switchId: 0,
        list: [cmd(117, [2]), cmd(117, [2]), { code: 0, indent: 0, parameters: [] }],
      },
      {
        id: 2,
        name: "Inner",
        trigger: 0,
        switchId: 0,
        list: [cmd(355, ["x"]), { code: 0, indent: 0, parameters: [] }],
      },
    ],
  });

  const nodes = traceCommon(db, 1).nodes;

  assert.equal(nodes.length, 2);
  assert.ok(
    nodes.every((n) => n.kind === "event-ref" && n.resolved),
    "both calls resolve",
  );
});

test("Battle Processing (301) becomes a battle node with the troop id", () => {
  const db = fakeDb({
    troops: [{ id: 5, name: "Slime Troop", pages: [] }],
    commonEvents: [
      {
        id: 1,
        name: "Fight",
        trigger: 0,
        switchId: 0,
        list: [cmd(301, [0, 5]), { code: 0, indent: 0, parameters: [] }],
      },
    ],
  });

  const node = traceCommon(db, 1).nodes[0];

  assert.equal(node.kind, "battle");
  assert.equal(node.troopId, 5);
  assert.match(node.label, /Slime Troop/);
});

test("a random-encounter Battle Processing has no troop id", () => {
  const db = fakeDb({
    commonEvents: [
      {
        id: 1,
        name: "Random",
        trigger: 0,
        switchId: 0,
        list: [cmd(301, [1, 0]), { code: 0, indent: 0, parameters: [] }],
      },
    ],
  });

  const node = traceCommon(db, 1).nodes[0];

  assert.equal(node.kind, "battle");
  assert.equal(node.troopId, null);
  assert.match(node.label, /Random Encounter/);
});

test("Battle Processing keeps each outcome section and its commands", () => {
  const db = fakeDb({
    troops: [{ id: 5, name: "Slime Troop", pages: [] }],
    commonEvents: [
      {
        id: 1,
        name: "Fight",
        trigger: 0,
        switchId: 0,
        list: [
          { code: 301, indent: 0, parameters: [0, 5] },
          { code: 601, indent: 0, parameters: [] },
          { code: 111, indent: 1, parameters: [0, 1, 0] },
          cmd(355, ["victory branch"]),
          { code: 411, indent: 1, parameters: [] },
          cmd(355, ["defeat branch"]),
          { code: 412, indent: 1, parameters: [] },
          { code: 0, indent: 1, parameters: [] },
          { code: 602, indent: 0, parameters: [] },
          cmd(355, ["escaped"]),
          { code: 0, indent: 1, parameters: [] },
          { code: 604, indent: 0, parameters: [] },
          cmd(355, ["after battle"]),
          { code: 0, indent: 0, parameters: [] },
        ],
      },
    ],
  });

  const nodes = traceCommon(db, 1).nodes;

  assert.equal(nodes.length, 2, "the battle node and the command after it");
  const battle = nodes[0];
  assert.equal(battle.kind, "battle");
  assert.deepEqual(
    battle.sections.map((s) => s.label),
    ["Win", "Escape"],
    "both outcome sections are kept",
  );
  assert.equal(battle.sections[0].nodes[0].kind, "branch");
  assert.equal(nodes[1].label, "Script: after battle");
});

test("a map event root reports its page and conditions", () => {
  const db = fakeDb({
    mapEvents: [
      {
        key: "3:7",
        id: 7,
        name: "Chest",
        pages: [
          { conditions: {}, list: [] },
          {
            conditions: { switch1Valid: true, switch1Id: 2 },
            list: [cmd(355, ["opened"]), { code: 0, indent: 0, parameters: [] }],
          },
        ],
      },
    ],
  });

  const root = new SequenceTracer(db, null).traceMapEvent(3, 7, 1);

  assert.equal(root.eventKind, "map");
  assert.equal(root.mapId, 3);
  assert.equal(root.eventId, 7);
  assert.equal(root.pageIndex, 1);
  assert.match(root.name, /Chest/);
  assert.equal(root.nodes.length, 1);
  assert.deepEqual(root.conditions, { switch1Valid: true, switch1Id: 2 });
});

test("a map event with no such page traces to null", () => {
  const db = fakeDb({
    mapEvents: [
      { key: "3:7", id: 7, name: "Chest", pages: [{ conditions: {}, list: [] }] },
    ],
  });

  assert.equal(new SequenceTracer(db, null).traceMapEvent(3, 7, 5), null);
});

test("a battle event root reports its troop and page", () => {
  const db = fakeDb({
    troops: [
      {
        id: 4,
        name: "Ambush",
        pages: [
          { conditions: {}, list: [] },
          {
            conditions: { switch1Valid: false },
            list: [cmd(355, ["battle start"]), { code: 0, indent: 0, parameters: [] }],
          },
        ],
      },
    ],
  });

  const root = new SequenceTracer(db, null).traceBattleEvent(4, 1);

  assert.equal(root.eventKind, "battle");
  assert.equal(root.troopId, 4);
  assert.equal(root.pageIndex, 1);
  assert.match(root.name, /Ambush/);
  assert.equal(root.nodes.length, 1);
});

test("a missing troop page traces to null", () => {
  const db = fakeDb({ troops: [{ id: 4, name: "Ambush", pages: [] }] });

  assert.equal(new SequenceTracer(db, null).traceBattleEvent(4, 0), null);
  assert.equal(new SequenceTracer(db, null).traceBattleEvent(9, 0), null);
});

test("every node carries the eventKey it came from", () => {
  const db = fakeDb({
    commonEvents: [
      {
        id: 1,
        name: "Outer",
        trigger: 0,
        switchId: 0,
        list: [cmd(117, [2]), { code: 0, indent: 0, parameters: [] }],
      },
      {
        id: 2,
        name: "Inner",
        trigger: 0,
        switchId: 0,
        list: [cmd(355, ["inner"]), { code: 0, indent: 0, parameters: [] }],
      },
    ],
  });

  const root = traceCommon(db, 1);
  assert.equal(root.nodes[0].eventKey, "common:1");
  assert.equal(
    root.nodes[0].nodes[0].eventKey,
    "common:2",
    "the inlined node reports the CE it came from",
  );
});

test("branch and loop nodes propagate the eventKey to their children", () => {
  const db = fakeDb({
    commonEvents: [
      {
        id: 1,
        name: "Branchy",
        trigger: 0,
        switchId: 0,
        list: [
          { code: 111, indent: 0, parameters: [0, 1, 0] },
          cmd(355, ["in branch"]),
          { code: 412, indent: 0, parameters: [] },
          { code: 112, indent: 0, parameters: [] },
          cmd(355, ["in loop"]),
          { code: 413, indent: 0, parameters: [] },
          { code: 0, indent: 0, parameters: [] },
        ],
      },
    ],
  });

  const nodes = traceCommon(db, 1).nodes;

  assert.equal(nodes[0].trueNodes[0].eventKey, "common:1");
  assert.equal(nodes[1].bodyNodes[0].eventKey, "common:1");
});