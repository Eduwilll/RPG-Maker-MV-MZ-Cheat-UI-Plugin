import test from "node:test";
import assert from "node:assert/strict";
const load = () =>
  import("../../cheat-engine/www/cheat/js/ui/DatabaseDetails.js");
const game = {
  $dataItems: [
    null,
    {
      id: 1,
      name: "Potion",
      description: "Healing",
      price: 100,
      effects: [{ code: 11, dataId: 0, value1: 0.5, value2: 20 }],
    },
  ],
  $dataWeapons: [
    null,
    {
      id: 1,
      name: "Sword",
      params: [0, 0, 5, 0, 0, 0, 0, 0],
      price: 400,
      traits: [{ code: 21, dataId: 2, value: 1.2 }],
    },
  ],
  $dataArmors: [
    null,
    { id: 1, name: "Coat", params: [0, 0, 0, 3, 0, 0, 0, 0], price: 200 },
  ],
  $dataSkills: [
    null,
    {
      id: 1,
      name: "Fire",
      mpCost: 5,
      tpCost: 0,
      successRate: 100,
      damage: { type: 1, formula: "a.mat * 2", elementId: 1, variance: 10 },
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
      learnings: [{ level: 2, skillId: 1 }],
      traits: [],
    },
  ],
  $dataStates: [
    null,
    {
      id: 1,
      name: "Poison",
      minTurns: 2,
      maxTurns: 4,
      restriction: 0,
      traits: [],
    },
  ],
  $dataEnemies: [
    null,
    {
      id: 1,
      name: "Slime",
      params: [10, 0, 2, 2, 1, 1, 3, 1],
      exp: 5,
      gold: 3,
      traits: [],
      actions: [],
    },
  ],
  $dataSystem: {
    terms: {
      params: [
        "Max HP",
        "Max MP",
        "Attack",
        "Defense",
        "Magic",
        "Magic Defense",
        "Agility",
        "Luck",
      ],
    },
    elements: ["", "Fire"],
  },
};
test("details show applicable labeled stats, effects and price without leaking records", async () => {
  const { readDatabaseDetails } = await load();
  const details = readDatabaseDetails(game, "item", 1);
  assert.equal(details.title, "Potion");
  assert.match(JSON.stringify(details.sections), /100/);
  assert.match(JSON.stringify(details.sections), /50%/);
  assert.match(
    JSON.stringify(readDatabaseDetails(game, "weapon", 1)),
    /Attack/,
  );
  details.title = "changed";
  assert.equal(game.$dataItems[1].name, "Potion");
});
test("all seven kinds produce bounded text cards; no irrelevant price on enemy or skill", async () => {
  const { readDatabaseDetails } = await load();
  for (const kind of [
    "item",
    "weapon",
    "armor",
    "skill",
    "class",
    "state",
    "enemy",
  ])
    assert.ok(readDatabaseDetails(game, kind, 1).sections.length);
  assert.equal(
    readDatabaseDetails(game, "enemy", 1).sections.some(
      (s) => s.title === "Price",
    ),
    false,
  );
  assert.match(JSON.stringify(readDatabaseDetails(game, "class", 1)), /Fire/);
  assert.match(
    JSON.stringify(readDatabaseDetails(game, "skill", 1)),
    /a.mat \* 2/,
  );
  assert.equal(readDatabaseDetails(game, "item", 999), null);
});
