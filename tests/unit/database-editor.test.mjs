import test from "node:test";
import assert from "node:assert/strict";

const path =
  "../../cheat-engine/www/cheat/js/panels/database/DatabaseEditorState.js";
async function editor() {
  try {
    return await import(path);
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND")
      assert.fail("Database editor state is not implemented");
    throw error;
  }
}
function database() {
  const records = {
    enemy: {
      id: 1,
      name: "Slime",
      params: [10, 2, 3, 4, 5, 6, 7, 8],
      exp: 8,
      gold: 4,
      traits: [],
      actions: [
        {
          skillId: 1,
          rating: 5,
          conditionType: 0,
          conditionParam1: 0,
          conditionParam2: 0,
          plugin: "keep",
        },
      ],
      plugin: { keep: true },
    },
    skill: {
      id: 1,
      name: "Fire",
      mpCost: 3,
      tpCost: 0,
      successRate: 100,
      repeats: 1,
      speed: 0,
      tpGain: 0,
      scope: 1,
      hitType: 1,
      damage: {
        type: 1,
        elementId: 1,
        formula: "a.atk * 2",
        variance: 20,
        critical: false,
        plugin: 7,
      },
      effects: [],
    },
    class: {
      id: 1,
      name: "Mage",
      params: Array.from({ length: 8 }, () => [0, 10, 20]),
      expParams: [30, 20, 30, 30],
      learnings: [{ level: 2, skillId: 1, note: "plugin" }],
      traits: [],
    },
  };
  const edits = [];
  return {
    records,
    edits,
    list: (kind) =>
      records[kind] ? [{ id: 1, name: records[kind].name }] : [],
    read: (kind) => structuredClone(records[kind]),
    isEdited: () => edits.length > 0,
    apply(kind, id, patch) {
      edits.push(structuredClone(patch));
      Object.assign(records[kind], structuredClone(patch));
      return structuredClone(records[kind]);
    },
    reset(kind) {
      return structuredClone(records[kind]);
    },
  };
}
test("drafts are detached; apply sends changed fields and preserves plugin action metadata", async () => {
  const m = await editor();
  const db = database();
  const s = m.createDatabaseEditorState(db, "enemy");
  m.selectDatabaseRecord(s, db, 1);
  s.draft.actions[0].rating = "8";
  assert.equal(db.records.enemy.actions[0].rating, 5);
  m.applyDatabaseDraft(s, db);
  assert.deepEqual(Object.keys(db.edits[0]), ["actions"]);
  assert.equal(db.edits[0].actions[0].rating, 8);
  assert.equal(db.edits[0].actions[0].plugin, "keep");
  assert.equal(s.status, "Applied. Save the game to keep these changes.");
  s.draft.params[0] = 900;
  m.discardDatabaseDraft(s, db);
  assert.equal(s.draft.params[0], 10);
});
test("invalid numbers, condition references and array shapes never reach apply", async () => {
  const m = await editor();
  const db = database();
  const s = m.createDatabaseEditorState(db, "enemy");
  m.selectDatabaseRecord(s, db, 1);
  for (const invalid of ["", Infinity, "NaN", -1]) {
    s.draft.gold = invalid;
    assert.throws(() => m.applyDatabaseDraft(s, db), /gold/i);
  }
  m.discardDatabaseDraft(s, db);
  s.draft.params = [1];
  assert.throws(() => m.applyDatabaseDraft(s, db), /params/i);
  m.discardDatabaseDraft(s, db);
  s.draft.actions[0].skillId = 999;
  assert.throws(() => m.applyDatabaseDraft(s, db), /skill/i);
  m.discardDatabaseDraft(s, db);
  s.draft.actions[0].conditionType = 2;
  s.draft.actions[0].conditionParam1 = 1.5;
  assert.throws(() => m.applyDatabaseDraft(s, db), /condition/i);
  assert.equal(db.edits.length, 0);
});
test("skill formulas stay text, damage metadata survives, and standard skills do not gain traits", async () => {
  const m = await editor();
  const db = database();
  const s = m.createDatabaseEditorState(db, "skill");
  m.selectDatabaseRecord(s, db, 1);
  s.draft.damage.formula = 'throw new Error("do not run")';
  m.applyDatabaseDraft(s, db);
  assert.equal(
    db.records.skill.damage.formula,
    'throw new Error("do not run")',
  );
  assert.equal(db.records.skill.damage.plugin, 7);
  assert.equal("traits" in db.records.skill, false);
  s.draft.effects = [
    { code: 11, dataId: 0, value1: "0.5", value2: "20", plugin: 9 },
  ];
  m.applyDatabaseDraft(s, db);
  assert.equal(db.records.skill.effects[0].value1, 0.5);
});
test("class curves edit individual levels, validate all eight curves, and preserve learning notes", async () => {
  const m = await editor();
  const db = database();
  const s = m.createDatabaseEditorState(db, "class");
  m.selectDatabaseRecord(s, db, 1);
  s.draft.params[3][2] = "45";
  s.draft.learnings[0].level = "3";
  m.applyDatabaseDraft(s, db);
  assert.equal(db.records.class.params[3][2], 45);
  assert.equal(db.records.class.learnings[0].note, "plugin");
  s.draft.expParams[0] = "";
  assert.throws(() => m.applyDatabaseDraft(s, db), /expParams/i);
  m.discardDatabaseDraft(s, db);
  s.draft.params[0][1] = -1;
  assert.throws(() => m.applyDatabaseDraft(s, db), /params/i);
  m.resetDatabaseRecord(s, db);
  assert.equal(s.draft.params[0][1], 10);
});
test("rows helper returns copied rows and keeps unknown plugin row keys", async () => {
  const { default: rows } =
    await import("../../cheat-engine/www/cheat/components/DatabaseRowsEditor.js").catch(
      () => assert.fail("Rows editor missing"),
    );
  const input = [{ code: 11, dataId: 1, value: 1, plugin: { keep: true } }];
  let emitted;
  rows.methods.change.call(
    {
      value: input,
      $emit: (name, value) => {
        emitted = value;
      },
    },
    0,
    "value",
    "1.5",
  );
  assert.equal(input[0].value, 1);
  assert.equal(emitted[0].value, "1.5");
  assert.deepEqual(emitted[0].plugin, { keep: true });
});
