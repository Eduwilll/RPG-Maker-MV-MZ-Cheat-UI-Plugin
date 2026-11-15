const fields = {
  enemy: ["params", "exp", "gold", "traits", "actions"],
  skill: [
    "mpCost",
    "tpCost",
    "successRate",
    "repeats",
    "speed",
    "tpGain",
    "scope",
    "hitType",
    "damage",
    "effects",
    "traits",
  ],
  class: ["params", "expParams", "learnings", "traits"],
};

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}
function number(value, label, min, max, integer) {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    String(value).trim() === ""
  )
    throw new Error(label + ": enter a number.");
  const n = Number(value);
  if (
    !Number.isFinite(n) ||
    n < min ||
    n > max ||
    (integer && Math.floor(n) !== n)
  )
    throw new Error(label + ": invalid number or range.");
  return n;
}
function integer(value, label, min, max) {
  return number(
    value,
    label,
    min === undefined ? 0 : min,
    max === undefined ? 99999999 : max,
    true,
  );
}
function array(value, label, length) {
  if (
    !Array.isArray(value) ||
    (length !== undefined && value.length !== length)
  )
    throw new Error(label + ": invalid array shape.");
  return value;
}
function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(label + ": invalid row.");
  return Object.assign({}, value);
}
function reference(value, label, rows, allowZero) {
  const id = integer(value, label, allowZero ? 0 : 1);
  if (id === 0 && allowZero) return id;
  if (rows && !rows.some((row) => row.id === id))
    throw new Error(label + ": database reference not found.");
  return id;
}
function rowReference(row, refs, kind, allowZero) {
  row.dataId = reference(
    row.dataId,
    "dataId (" + kind + ")",
    refs[kind],
    allowZero,
  );
}
function normalizeRows(key, value, refs) {
  return array(value, key).map((source, index) => {
    const label = key + " row " + (index + 1);
    const row = object(source, label);
    if (key === "actions") {
      row.skillId = reference(row.skillId, label + " skill", refs.skills);
      row.rating = integer(row.rating, label + " rating", 1, 9);
      row.conditionType = integer(
        row.conditionType,
        label + " condition",
        0,
        6,
      );
      const ratio = row.conditionType === 2 || row.conditionType === 3;
      row.conditionParam1 = number(
        row.conditionParam1,
        label + " condition lower / first",
        0,
        ratio ? 1 : 99999999,
        !ratio,
      );
      row.conditionParam2 = number(
        row.conditionParam2,
        label + " condition upper / interval",
        0,
        ratio ? 1 : 99999999,
        !ratio,
      );
      if (ratio && row.conditionParam1 > row.conditionParam2)
        throw new Error(label + " condition: lower must not exceed upper.");
      if (row.conditionType === 4)
        row.conditionParam1 = reference(
          row.conditionParam1,
          label + " condition state",
          refs.states,
        );
      if (row.conditionType === 5)
        row.conditionParam1 = integer(
          row.conditionParam1,
          label + " condition party level",
          1,
        );
      if (row.conditionType === 6)
        row.conditionParam1 = reference(
          row.conditionParam1,
          label + " condition switch",
          refs.switches,
        );
    } else if (key === "learnings") {
      row.level = integer(row.level, label + " level", 1, 1000);
      row.skillId = reference(row.skillId, label + " skill", refs.skills);
    } else {
      row.code = integer(row.code, label + " code");
      row.dataId = integer(row.dataId, label + " dataId");
      if (key === "traits") {
        row.value = number(
          row.value,
          label + " value",
          -99999999,
          99999999,
          false,
        );
        const kinds = {
          11: "elements",
          13: "states",
          14: "states",
          31: "elements",
          32: "states",
          41: "skillTypes",
          42: "skillTypes",
          43: "skills",
          44: "skills",
          51: "weaponTypes",
          52: "armorTypes",
          53: "equipTypes",
          54: "equipTypes",
        };
        if (kinds[row.code]) rowReference(row, refs, kinds[row.code], false);
        if ([12, 21].indexOf(row.code) >= 0)
          row.dataId = integer(row.dataId, label + " parameter", 0, 7);
        if ([22, 23].indexOf(row.code) >= 0)
          row.dataId = integer(row.dataId, label + " parameter", 0, 9);
      } else {
        row.value1 = number(
          row.value1,
          label + " value1",
          -99999999,
          99999999,
          false,
        );
        row.value2 = number(
          row.value2,
          label + " value2",
          -99999999,
          99999999,
          false,
        );
        if ([21, 22].indexOf(row.code) >= 0)
          rowReference(row, refs, "states", row.code === 21);
        if (row.code === 43) rowReference(row, refs, "skills", false);
        if (row.code === 44) rowReference(row, refs, "commonEvents", false);
        if ([31, 32, 33, 34, 42].indexOf(row.code) >= 0)
          row.dataId = integer(row.dataId, label + " parameter", 0, 7);
      }
    }
    return row;
  });
}

/** Only changed, supported fields are sent; unknown plugin keys remain in nested rows. */
export function buildDatabasePatch(kind, draft, original, references) {
  if (!fields[kind]) throw new Error("Unsupported database kind.");
  const patch = {};
  const refs = references || {};
  fields[kind].forEach((key) => {
    if (
      !Object.prototype.hasOwnProperty.call(original, key) ||
      JSON.stringify(draft[key]) === JSON.stringify(original[key])
    )
      return;
    let value = draft[key];
    if (["traits", "effects", "actions", "learnings"].indexOf(key) >= 0)
      value = normalizeRows(key, value, refs);
    else if (key === "params") {
      value = array(value, "params", 8).map((entry, p) =>
        kind === "class"
          ? array(entry, "params curve " + p, original.params[p].length).map(
              (n, l) => integer(n, "params " + p + " level " + l),
            )
          : integer(entry, "params " + p),
      );
    } else if (key === "expParams")
      value = array(value, key, 4).map((n, i) => integer(n, key + " " + i));
    else if (key === "damage") {
      value = object(value, key);
      value.type = integer(value.type, "damage type", 0, 6);
      value.elementId = integer(value.elementId, "damage element", -1);
      if (value.elementId > 0)
        value.elementId = reference(
          value.elementId,
          "damage element",
          refs.elements,
        );
      value.variance = integer(value.variance, "damage variance", 0, 100);
      if (
        typeof value.formula !== "string" ||
        typeof value.critical !== "boolean"
      )
        throw new Error(
          "damage formula must be text and critical must be boolean.",
        );
    } else {
      const ranges = {
        successRate: [0, 100],
        repeats: [1, 100],
        speed: [-99999, 99999],
        scope: [0, 14],
        hitType: [0, 2],
        tpGain: [-99999, 99999],
      };
      value = integer(
        value,
        key,
        ranges[key] ? ranges[key][0] : 0,
        ranges[key] ? ranges[key][1] : undefined,
      );
    }
    if (JSON.stringify(value) !== JSON.stringify(original[key]))
      patch[key] = value;
  });
  return patch;
}

export function createDatabaseEditorState(database, kind, references) {
  if (!fields[kind]) throw new Error("Unsupported database kind.");
  return {
    kind,
    rows: database ? copy(database.list(kind)) : [],
    selectedId: null,
    draft: null,
    original: null,
    edited: false,
    references: Object.assign({}, references || {}, {
      skills: database ? copy(database.list("skill")) : [],
    }),
    error: "",
    status: "",
  };
}
export function selectDatabaseRecord(state, database, id) {
  if (!Number.isInteger(id) || !state.rows.some((row) => row.id === id))
    throw new Error("Select a valid database record.");
  const record = database.read(state.kind, id);
  if (!record) throw new Error("Database record is no longer available.");
  state.selectedId = id;
  state.original = copy(record);
  state.draft = copy(record);
  state.edited = database.isEdited(state.kind, id);
  state.error = "";
  state.status = "";
}
export function applyDatabaseDraft(state, database) {
  if (!state.draft) throw new Error("Select a database record first.");
  const patch = buildDatabasePatch(
    state.kind,
    state.draft,
    state.original,
    state.references,
  );
  const updated = database.apply(state.kind, state.selectedId, patch);
  state.original = copy(updated);
  state.draft = copy(updated);
  state.edited = database.isEdited(state.kind, state.selectedId);
  state.error = "";
  state.status = "Applied. Save the game to keep these changes.";
  return patch;
}
export function discardDatabaseDraft(state, database) {
  selectDatabaseRecord(state, database, state.selectedId);
}
export function resetDatabaseRecord(state, database) {
  if (!state.selectedId) throw new Error("Select a database record first.");
  database.reset(state.kind, state.selectedId);
  selectDatabaseRecord(state, database, state.selectedId);
  state.status = "Reset to original. Save the game to keep this reset.";
}

/** Called lazily by the view; never expose live engine records to Vue. */
export function readDatabaseReferences(game) {
  const refs = {};
  const tables = {
    skills: "$dataSkills",
    states: "$dataStates",
    commonEvents: "$dataCommonEvents",
    troops: "$dataTroops",
  };
  Object.keys(tables).forEach((key) => {
    const data = game && game[tables[key]];
    refs[key] = data
      ? Array.prototype.filter
          .call(data, (row) => row && row.id > 0)
          .map((row) => ({
            id: row.id,
            name: String(row.name || "#" + row.id),
          }))
      : [];
  });
  const system = (game && game.$dataSystem) || {};
  [
    "elements",
    "skillTypes",
    "weaponTypes",
    "armorTypes",
    "equipTypes",
    "switches",
  ].forEach((key) => {
    refs[key] = (system[key] || [])
      .map((name, id) => ({ id, name: String(name || "#" + id) }))
      .filter((row) => row.id > 0);
  });
  return copy(refs);
}
