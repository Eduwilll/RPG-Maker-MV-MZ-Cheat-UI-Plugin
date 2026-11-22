import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
const url = new URL(
  "../../cheat-engine/www/cheat/js/panels/actors/SkillSwitchState.js",
  import.meta.url,
);
async function api() {
  assert.ok(existsSync(url), "skill switch state helper exists");
  return import(url);
}

test("strong learning evidence replaces early name-only matches within the bounded sample", async () => {
  const { createSkillSwitchTrace } = await api(),
    game = fixture();
  game.$dataCommonEvents = [null].concat(
    Array.from({ length: 4 }, (_, i) => ({
      id: i + 1,
      list: [command(111, [0, 1, 0])],
    })),
  );
  game.$dataMap.events = [
    {
      id: 9,
      pages: [{ list: [command(318, [0, 1, 0, 1]), command(121, [1, 1, 0])] }],
    },
  ];
  const row = createSkillSwitchTrace(game, 1)
    .result()
    .find((row) => row.id === 1);
  assert.equal(row.link, "event");
  assert.ok(row.evidence.length <= 4);
  assert.ok(
    row.evidence.some((e) => e.mapId === 8 && e.action === "Writes ON"),
  );
});

test("flags written before a nested learning branch are included, with name matches first", async () => {
  const { createSkillSwitchTrace } = await api(),
    game = fixture();
  game.$dataMap.events = [
    {
      id: 1,
      pages: [
        {
          list: [
            command(402, [0, "Learn"]),
            command(121, [4, 4, 0], 1),
            command(111, [0, 1, 0], 1),
            command(318, [0, 1, 0, 1], 2),
            command(412, [], 1),
            command(402, [1, "Other"]),
            command(121, [3, 3, 0], 1),
            command(404, []),
          ],
        },
      ],
    },
  ];
  const rows = createSkillSwitchTrace(game, 1).result();
  assert.ok(rows.find((row) => row.id === 4 && row.link === "event"));
  assert.equal(rows[0].id, 1);
  assert.equal(rows[0].nameMatch, true);
  assert.equal(
    rows.some((row) => row.id === 3),
    false,
  );
});
const command = (code, parameters, indent = 0) => ({
  code,
  parameters,
  indent,
});
function fixture() {
  const values = {},
    writes = [];
  return {
    $dataSkills: [null, { id: 1, name: "Mind read", effects: [] }],
    $dataSystem: {
      switches: [
        "",
        "SKILL_mind_read",
        "text_mind_read",
        "Mind reader",
        "Unrelated",
      ],
    },
    $dataCommonEvents: [null],
    $dataMap: { events: [] },
    $gameMap: { mapId: () => 8 },
    $gameSwitches: {
      value: (id) => !!values[id],
      setValue: (id, value) => {
        values[id] = value;
        writes.push([id, value]);
      },
    },
    writes,
  };
}
test("name matches are candidates, never automatic activations or partial-word guesses", async () => {
  const { createSkillSwitchTrace } = await api(),
    game = fixture(),
    trace = createSkillSwitchTrace(game, 1);
  const rows = trace.result();
  assert.deepEqual(
    rows.map((r) => r.id),
    [1, 2],
  );
  assert.ok(rows.every((r) => r.link === "name"));
  assert.equal(game.writes.length, 0);
});
test("learning branches include local switch writes and gates, not sibling choices", async () => {
  const { createSkillSwitchTrace } = await api(),
    game = fixture();
  game.$dataMap.events = [
    null,
    {
      id: 3,
      name: "Teacher",
      pages: [
        {
          conditions: { switch1Valid: true, switch1Id: 4 },
          list: [
            command(402, [0, "Learn"], 0),
            command(318, [0, 1, 0, 1], 1),
            command(121, [4, 4, 0], 1),
            command(402, [1, "Other"], 0),
            command(121, [3, 3, 0], 1),
            command(404, [], 0),
          ],
        },
      ],
    },
  ];
  const rows = createSkillSwitchTrace(game, 1).result();
  assert.ok(rows.some((r) => r.id === 4 && r.link === "event"));
  assert.equal(
    rows.some((r) => r.id === 3),
    false,
  );
  assert.ok(
    rows.find((r) => r.id === 4).evidence.some((e) => e.action === "Writes ON"),
  );
  assert.equal(game.writes.length, 0);
});

test("native actor skill checks retain outer OFF gates but exclude the else branch", async () => {
  const { createSkillSwitchTrace } = await api(),
    game = fixture();
  game.$dataSystem.switches.push("Else-only flag");
  game.$dataMap.events = [
    {
      id: 1,
      pages: [
        {
          list: [
            command(111, [0, 4, 1]),
            command(111, [4, 1, 3, 1], 1),
            command(121, [3, 3, 0], 2),
            command(411, [], 1),
            command(121, [5, 5, 0], 2),
            command(412, [], 1),
            command(412, []),
          ],
        },
      ],
    },
  ];
  const rows = createSkillSwitchTrace(game, 1).result();
  assert.ok(
    rows
      .find((row) => row.id === 4)
      .evidence.some((e) => e.action === "Learning path checks OFF"),
  );
  assert.ok(rows.find((row) => row.id === 3).link === "event");
  assert.equal(
    rows.some((row) => row.id === 5),
    false,
  );
});

test("forgetting another skill is not a learning reference to skill one", async () => {
  const { createSkillSwitchTrace } = await api(),
    game = fixture();
  game.$dataMap.events = [
    {
      id: 1,
      pages: [{ list: [command(318, [0, 0, 1, 5]), command(121, [4, 4, 0])] }],
    },
  ];
  assert.equal(
    createSkillSwitchTrace(game, 1)
      .result()
      .some((row) => row.id === 4),
    false,
  );
});

test("explicit skill common-event calls do not require an automatic trigger switch", async () => {
  const { createSkillSwitchTrace } = await api(),
    game = fixture();
  game.$dataSkills[1].effects = [{ code: 44, dataId: 1 }];
  game.$dataCommonEvents = [
    null,
    {
      id: 1,
      name: "Read",
      trigger: 2,
      switchId: 4,
      list: [command(121, [3, 3, 0])],
    },
  ];
  const rows = createSkillSwitchTrace(game, 1).result();
  assert.ok(rows.find((row) => row.id === 3).link === "event");
  assert.equal(
    rows.some((row) => row.id === 4),
    false,
  );
});
test("skill common-event chains are cycle-safe and preserve OFF requirements", async () => {
  const { createSkillSwitchTrace } = await api(),
    game = fixture();
  game.$dataSkills[1].effects = [{ code: 44, dataId: 1 }];
  game.$dataCommonEvents = [
    null,
    { id: 1, name: "Read", list: [command(117, [2])] },
    {
      id: 2,
      name: "Nested",
      list: [
        command(111, [0, 4, 1]),
        command(121, [3, 3, 1], 1),
        command(412, []),
        command(117, [1]),
      ],
    },
  ];
  const rows = createSkillSwitchTrace(game, 1).result();
  assert.ok(
    rows
      .find((r) => r.id === 4)
      .evidence.some((e) => e.action === "Checks OFF"),
  );
  assert.ok(
    rows
      .find((r) => r.id === 3)
      .evidence.some((e) => e.action === "Writes OFF"),
  );
  assert.equal(game.writes.length, 0);
});
test("external map scans return bounded plain evidence without touching live map or evaluating scripts", async () => {
  const { createSkillSwitchTrace } = await api(),
    game = fixture(),
    original = game.$dataMap;
  const trace = createSkillSwitchTrace(game, 1);
  const data = {
    events: Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: "NPC",
      pages: [
        {
          list: [
            command(111, [0, 1, 0]),
            command(355, ['throw Error("must not execute")']),
          ],
        },
      ],
    })),
  };
  trace.scanMap(data, 9);
  const row = trace.result().find((r) => r.id === 1);
  assert.ok(row.evidence.length <= 4);
  assert.ok(row.references >= 20);
  assert.equal(game.$dataMap, original);
  assert.equal(game.writes.length, 0);
  assert.equal(row.__ob__, undefined);
  trace.scanMap(data, 9);
  assert.equal(
    trace.result().find((row) => row.id === 1).references,
    20,
    "rescanning a map must not inflate evidence counts",
  );
});

test("deep common-event chains stop safely and disclose limited results", async () => {
  const { createSkillSwitchTrace } = await api(),
    game = fixture();
  game.$dataSkills[1].effects = [{ code: 44, dataId: 1 }];
  game.$dataCommonEvents = [null].concat(
    Array.from({ length: 60 }, (_, i) => ({
      id: i + 1,
      list: [command(117, [i + 2])],
    })),
  );
  const trace = createSkillSwitchTrace(game, 1);
  assert.equal(trace.isLimited(), true);
});
test("switch edits require booleans, valid IDs and a fresh expected value", async () => {
  const { setSkillSwitchValue } = await api(),
    game = fixture();
  assert.throws(() => setSkillSwitchValue(game, 1, "true", false));
  assert.throws(() => setSkillSwitchValue(game, 999, true, false));
  assert.equal(setSkillSwitchValue(game, 1, true, false), true);
  assert.throws(() => setSkillSwitchValue(game, 1, false, false), /changed/i);
  assert.deepEqual(game.writes, [[1, true]]);
});
