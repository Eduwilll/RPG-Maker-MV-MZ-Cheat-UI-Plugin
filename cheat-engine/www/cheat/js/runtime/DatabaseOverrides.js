const DATABASES = {
  enemy: "$dataEnemies",
  skill: "$dataSkills",
  class: "$dataClasses",
};
const EDITABLE = {
  enemy: ["name", "params", "exp", "gold", "actions", "traits", "dropItems"],
  skill: [
    "name",
    "description",
    "mpCost",
    "tpCost",
    "successRate",
    "repeats",
    "speed",
    "tpGain",
    "scope",
    "hitType",
    "stypeId",
    "occasion",
    "animationId",
    "damage",
    "effects",
    "message1",
    "message2",
  ],
  class: ["name", "params", "expParams", "learnings", "traits"],
};
const NUMBER_RANGES = {
  exp: [0, 999999999],
  gold: [0, 999999999],
  mpCost: [0, 999999],
  tpCost: [0, 999999],
  successRate: [0, 100],
  repeats: [1, 100],
  speed: [-99999, 99999],
  tpGain: [-99999, 99999],
  scope: [0, 14],
  hitType: [0, 2],
  stypeId: [0, 99999],
  occasion: [0, 3],
  animationId: [-1, 99999],
};

function number(value, min, max, integer) {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    String(value).trim() === ""
  ) {
    throw new Error("Enter a finite number");
  }
  const result = Number(value);
  if (
    !Number.isFinite(result) ||
    result < min ||
    result > max ||
    (integer && !Number.isInteger(result))
  ) {
    throw new Error(
      "Number must be " + min + " to " + max + (integer ? " (integer)" : ""),
    );
  }
  return result;
}

function assertSafe(value, depth) {
  if (depth > 16) throw new Error("Edit data is too deeply nested");
  if (!value || typeof value !== "object") return;
  Object.keys(value).forEach((key) => {
    if (key === "__proto__" || key === "constructor" || key === "prototype")
      throw new Error("Unsafe edit key");
    assertSafe(value[key], depth + 1);
  });
}

/** Owns only explicitly edited database fields, never the whole database. */
export function createDatabaseOverrides(game) {
  const json = game.JSON || JSON;
  const changes = new Map();
  let installed = false;
  const clone = (value) =>
    value === undefined ? undefined : json.parse(json.stringify(value));
  const keyFor = (kind, id) => kind + ":" + id;
  const record = (kind, id) => {
    const table = Object.prototype.hasOwnProperty.call(DATABASES, kind)
      ? game[DATABASES[kind]]
      : null;
    if (
      !Number.isInteger(Number(id)) ||
      Number(id) <= 0 ||
      !table ||
      !table[Number(id)]
    )
      throw new Error("Database entry not available");
    return table[Number(id)];
  };
  const array = (value, max) => {
    if (!Array.isArray(value) || value.length > max)
      throw new Error("Invalid edit list");
    return value;
  };
  const reference = (tableName, id, allowZero) => {
    id = number(id, allowZero ? 0 : 1, 99999, true);
    if (id !== 0 && (!game[tableName] || !game[tableName][id]))
      throw new Error("Referenced entry not found: " + id);
    return id;
  };

  function validate(kind, field, value, current) {
    if (NUMBER_RANGES[field])
      return number(
        value,
        NUMBER_RANGES[field][0],
        NUMBER_RANGES[field][1],
        true,
      );
    if (["name", "description", "message1", "message2"].includes(field)) {
      if (typeof value !== "string" || value.length > 8192)
        throw new Error("Text is too long or invalid");
      return value;
    }
    if (field === "params") {
      if (array(value, 8).length !== 8)
        throw new Error("All eight parameters are required");
      return kind === "class"
        ? value.map((curve, index) => {
            if (
              array(curve, 1001).length < 2 ||
              !current.params ||
              !current.params[index] ||
              curve.length !== current.params[index].length
            )
              throw new Error(
                "Parameter curves must retain all existing levels",
              );
            return curve.map((v) => number(v, 0, 99999999, true));
          })
        : value.map((v) => number(v, 0, 99999999, true));
    }
    if (field === "expParams") {
      if (array(value, 4).length !== 4)
        throw new Error("Four EXP parameters are required");
      return value.map((v) => number(v, 0, 999999, true));
    }
    if (field === "damage") {
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("Invalid damage definition");
      const result = clone(value);
      result.type = number(value.type, 0, 6, true);
      result.elementId = number(value.elementId, -1, 99999, true);
      if (
        result.elementId > 0 &&
        (!game.$dataSystem || !game.$dataSystem.elements[result.elementId])
      )
        throw new Error("Element not found");
      result.variance = number(value.variance, 0, 100, true);
      if (
        typeof value.formula !== "string" ||
        value.formula.length > 8192 ||
        typeof value.critical !== "boolean"
      )
        throw new Error("Invalid damage formula or critical flag");
      return result;
    }
    if (field === "learnings")
      return array(value, 512).map((row) => {
        if (!row || typeof row !== "object")
          throw new Error("Invalid learning row");
        return Object.assign(clone(row), {
          level: number(row.level, 1, 1000, true),
          skillId: reference("$dataSkills", row.skillId, false),
        });
      });
    if (field === "actions")
      return array(value, 128).map((row) => {
        if (!row || typeof row !== "object")
          throw new Error("Invalid action row");
        return Object.assign(clone(row), {
          skillId: reference("$dataSkills", row.skillId, false),
          rating: number(row.rating, 1, 9, true),
          conditionType: number(row.conditionType, 0, 6, true),
          conditionParam1: number(row.conditionParam1, 0, 999999, false),
          conditionParam2: number(row.conditionParam2, 0, 999999, false),
        });
      });
    if (field === "traits")
      return array(value, 256).map((row) => {
        if (!row || typeof row !== "object")
          throw new Error("Invalid trait row");
        return Object.assign(clone(row), {
          code: number(row.code, 1, 99999, true),
          dataId: number(row.dataId, 0, 99999, true),
          value: number(row.value, -999999, 999999, false),
        });
      });
    if (field === "effects")
      return array(value, 256).map((row) => {
        if (!row || typeof row !== "object")
          throw new Error("Invalid effect row");
        return Object.assign(clone(row), {
          code: number(row.code, 1, 99999, true),
          dataId: number(row.dataId, 0, 99999, true),
          value1: number(row.value1, -999999, 999999, false),
          value2: number(row.value2, -999999, 999999, false),
        });
      });
    if (field === "dropItems")
      return array(value, 16).map((row) => {
        if (!row || typeof row !== "object")
          throw new Error("Invalid drop row");
        const dropKind = number(row.kind, 0, 3, true);
        const dataId = dropKind
          ? reference(
              [null, "$dataItems", "$dataWeapons", "$dataArmors"][dropKind],
              row.dataId,
              false,
            )
          : 0;
        return Object.assign(clone(row), {
          kind: dropKind,
          dataId,
          denominator: number(row.denominator, 1, 999999, true),
        });
      });
    throw new Error("Unsupported field: " + field);
  }

  function refresh(kind, id) {
    let battlers = [];
    if (
      kind === "class" &&
      game.$gameActors &&
      Array.isArray(game.$gameActors._data)
    ) {
      battlers = game.$gameActors._data.filter(
        (actor) => actor && actor._classId === Number(id),
      );
    } else if (kind === "enemy" && game.$gameTroop && game.$gameTroop.members) {
      battlers = game.$gameTroop
        .members()
        .filter(
          (enemy) => enemy && enemy.enemyId && enemy.enemyId() === Number(id),
        );
    }
    battlers.forEach((battler) => {
      if (typeof battler.refresh === "function") battler.refresh();
    });
  }

  function apply(kind, id, patch, shouldRefresh) {
    const target = record(kind, id);
    if (!patch || typeof patch !== "object" || Array.isArray(patch))
      throw new Error("Invalid database edit");
    assertSafe(patch, 0);
    const serialized = json.stringify(patch);
    if (serialized.length > 2000000) throw new Error("Edit is too large");
    const fields = Object.keys(patch);
    const validated = {};
    fields.forEach((field) => {
      if (!EDITABLE[kind].includes(field))
        throw new Error("Field cannot be edited: " + field);
      validated[field] = validate(kind, field, patch[field], target);
    });
    if (!fields.length) return clone(target);
    const key = keyFor(kind, Number(id));
    const entry = changes.get(key) || {
      kind,
      id: Number(id),
      baseline: {},
      patch: {},
    };
    fields.forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(entry.baseline, field))
        entry.baseline[field] = {
          present: Object.prototype.hasOwnProperty.call(target, field),
          value: clone(target[field]),
        };
      target[field] = clone(validated[field]);
      entry.patch[field] = clone(validated[field]);
    });
    changes.set(key, entry);
    if (shouldRefresh !== false) refresh(kind, id);
    return clone(target);
  }

  function reset(kind, id, shouldRefresh) {
    const key = keyFor(kind, Number(id));
    const entry = changes.get(key);
    if (!entry) return;
    let target;
    try {
      target = record(kind, id);
    } catch (error) {
      changes.delete(key);
      return;
    }
    Object.keys(entry.baseline).forEach((field) => {
      const original = entry.baseline[field];
      if (original.present) target[field] = clone(original.value);
      else delete target[field];
    });
    changes.delete(key);
    if (shouldRefresh !== false) refresh(kind, id);
  }

  function resetAll(shouldRefresh) {
    Array.from(changes.values()).forEach((entry) =>
      reset(entry.kind, entry.id, shouldRefresh),
    );
  }

  function exportSave() {
    return clone({
      version: 1,
      entries: Array.from(changes.values()).map((entry) => ({
        kind: entry.kind,
        id: entry.id,
        patch: entry.patch,
      })),
    });
  }

  function importSave(payload) {
    if (
      !payload ||
      payload.version !== 1 ||
      !Array.isArray(payload.entries) ||
      payload.entries.length > 10000
    )
      return;
    payload.entries.forEach((entry) => {
      try {
        if (entry) apply(entry.kind, entry.id, entry.patch, false);
      } catch (error) {
        if (game.console)
          game.console.warn(
            "[Cheat] Skipped invalid save edit:",
            error.message,
          );
      }
    });
  }

  function sessionChanged() {
    const features = game.__cheatFeatures;
    if (features && features.history) features.history.clear();
    if (features && features.locks) features.locks.reconcile();
  }

  function install() {
    if (installed || !game.DataManager) return;
    installed = true;
    const manager = game.DataManager;
    const make = manager.makeSaveContents;
    if (typeof make === "function")
      manager.makeSaveContents = function () {
        const contents = make.apply(this, arguments);
        contents.cheatDatabaseOverrides = exportSave();
        return contents;
      };
    const extract = manager.extractSaveContents;
    if (typeof extract === "function")
      manager.extractSaveContents = function (contents) {
        const previous = exportSave();
        resetAll(false);
        importSave(contents && contents.cheatDatabaseOverrides);
        try {
          const result = extract.apply(this, arguments);
          sessionChanged();
          return result;
        } catch (error) {
          resetAll(false);
          importSave(previous);
          throw error;
        }
      };
    const setup = manager.setupNewGame;
    if (typeof setup === "function")
      manager.setupNewGame = function () {
        const previous = exportSave();
        resetAll(false);
        try {
          const result = setup.apply(this, arguments);
          sessionChanged();
          return result;
        } catch (error) {
          resetAll(false);
          importSave(previous);
          throw error;
        }
      };
  }

  return {
    list(kind) {
      const table = Object.prototype.hasOwnProperty.call(DATABASES, kind)
        ? game[DATABASES[kind]]
        : null;
      return table
        ? table
            .filter((row) => row && row.id > 0)
            .map((row) => ({
              id: row.id,
              name: row.name || "#" + row.id,
              edited: changes.has(keyFor(kind, row.id)),
            }))
        : [];
    },
    read(kind, id) {
      return clone(record(kind, id));
    },
    apply,
    reset,
    resetAll,
    install,
    isEdited(kind, id) {
      return changes.has(keyFor(kind, Number(id)));
    },
  };
}
