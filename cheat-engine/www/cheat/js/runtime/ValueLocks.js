const KINDS = [
  "item",
  "weapon",
  "armor",
  "gold",
  "variable",
  "switch",
  "state",
  "timer",
];
const TABLES = {
  item: "$dataItems",
  weapon: "$dataWeapons",
  armor: "$dataArmors",
  state: "$dataStates",
};
const STORAGE_KEY = "locks-and-favorites-v1";

export function createValueLocks(game, storage) {
  const entries = new Map();
  const patches = [];
  const json = game.JSON || JSON;
  const copy = (value) => json.parse(json.stringify(value));
  let busy = false;
  let installed = false;
  let interval = null;
  let cursor = 0;
  function targetOf(target) {
    if (!target || !KINDS.includes(target.kind))
      throw new Error("Invalid lock kind");
    const result = { kind: target.kind };
    if (!["gold", "timer"].includes(target.kind)) {
      if (!Number.isInteger(target.id) || target.id < 1)
        throw new Error("Invalid target ID");
      result.id = target.id;
    }
    if (target.kind === "state") {
      if (!Number.isInteger(target.actorId) || target.actorId < 1)
        throw new Error("Invalid actor ID");
      result.actorId = target.actorId;
    }
    return result;
  }
  function key(target) {
    return target.kind + ":" + (target.actorId || 0) + ":" + (target.id || 0);
  }
  function active() {
    return (
      !!game.$gameSystem &&
      !(
        game.Scene_Title &&
        game.SceneManager &&
        game.SceneManager._scene instanceof game.Scene_Title
      )
    );
  }
  function resolve(target) {
    const table = TABLES[target.kind] ? game[TABLES[target.kind]] : null;
    if (table && !table[target.id])
      throw new Error("Target is missing or unavailable");
    if (TABLES[target.kind] && !table)
      throw new Error("Database is unavailable");
    if (target.kind === "variable" || target.kind === "switch") {
      const names =
        game.$dataSystem &&
        game.$dataSystem[target.kind === "variable" ? "variables" : "switches"];
      if (!names || target.id >= names.length)
        throw new Error("Target ID is missing");
    }
    let actor = null;
    if (target.kind === "state") {
      if (!game.$dataActors || !game.$dataActors[target.actorId])
        throw new Error("Actor is missing");
      actor = game.$gameActors && game.$gameActors.actor(target.actorId);
      if (!actor) throw new Error("Actor is unavailable");
    }
    return { item: table && table[target.id], actor };
  }
  function normalized(target, value) {
    if (["switch", "state"].includes(target.kind)) {
      if (typeof value !== "boolean") throw new Error("Use a boolean value");
      return value;
    }
    if (target.kind === "timer") {
      if (
        !value ||
        !Number.isInteger(value.frames) ||
        value.frames < 0 ||
        value.frames > 2147483647 ||
        typeof value.working !== "boolean"
      )
        throw new Error("Invalid timer value");
      return { frames: value.frames, working: value.working };
    }
    if (target.kind === "variable") {
      if (
        !["number", "string", "boolean"].includes(typeof value) ||
        (typeof value === "number" && !Number.isFinite(value)) ||
        (typeof value === "string" && value.length > 8192)
      )
        throw new Error("Use a finite primitive variable value");
      return typeof value === "number" ? Math.floor(value) : value;
    }
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
      throw new Error("Use a non-negative number");
    const party = game.$gameParty;
    const max =
      target.kind === "gold"
        ? party && party.maxGold
          ? party.maxGold()
          : 99999999
        : party && party.maxItems
          ? party.maxItems(resolve(target).item)
          : 99;
    return Math.max(0, Math.min(Math.floor(value), max));
  }
  function persist() {
    if (!storage) return;
    try {
      storage.setItem(
        STORAGE_KEY,
        json.stringify({ version: 1, entries: Array.from(entries.values()) }),
      );
    } catch (error) {
      if (game.console)
        game.console.warn(
          "[Cheat] Could not save locks/favorites",
          error.message,
        );
    }
  }
  function disabled(entry, error) {
    if (!entry.enabled) return;
    entry.enabled = false;
    entry.reason = String(error.message || error);
    if (game.console)
      game.console.warn(
        "[Cheat] Disabled lock " + key(entry.target) + ": " + entry.reason,
      );
  }
  function locked(target) {
    const entry = entries.get(key(target));
    return entry && entry.locked && entry.enabled !== false ? entry : null;
  }
  function guard(action) {
    const before = busy;
    busy = true;
    try {
      return action();
    } finally {
      busy = before;
    }
  }
  function enforce(entry) {
    if (!active() || !entry.locked || !entry.enabled || busy) return;
    try {
      const target = entry.target;
      const resolved = resolve(target);
      if (["item", "weapon", "armor", "gold"].includes(target.kind)) {
        const effective = normalized(target, entry.value);
        if (effective !== entry.value) {
          entry.value = effective;
          persist();
        }
      }
      guard(() => {
        const value = entry.value;
        const party = game.$gameParty;
        if (["item", "weapon", "armor"].includes(target.kind)) {
          if (!party || !party.numItems || !party.gainItem)
            throw new Error("Inventory unavailable");
          const delta = value - party.numItems(resolved.item);
          if (delta) party.gainItem(resolved.item, delta, false);
        } else if (target.kind === "gold") {
          if (!party || !party.gold || !party.gainGold)
            throw new Error("Gold unavailable");
          const delta = value - party.gold();
          if (delta) party.gainGold(delta);
        } else if (target.kind === "variable") {
          const variables = game.$gameVariables;
          if (!variables || !variables.setValue)
            throw new Error("Variables unavailable");
          const current = variables._data
            ? variables._data[target.id]
            : variables.value(target.id);
          if (current !== value) variables.setValue(target.id, value);
        } else if (target.kind === "switch") {
          const switches = game.$gameSwitches;
          if (!switches || !switches.setValue)
            throw new Error("Switches unavailable");
          if (switches.value(target.id) !== value)
            switches.setValue(target.id, value);
        } else if (target.kind === "state") {
          const actor = resolved.actor;
          if (actor.isStateAffected(target.id) !== value) {
            if (value) actor.addState(target.id);
            else actor.removeState(target.id);
          }
        } else if (target.kind === "timer") {
          if (!game.$gameTimer) throw new Error("Timer unavailable");
          game.$gameTimer._frames = value.frames;
          game.$gameTimer._working = value.working;
        }
      });
    } catch (error) {
      disabled(entry, error);
    }
  }
  function reconcile() {
    if (!active() || busy || !entries.size) return;
    const rows = Array.from(entries.values()).filter(
      (row) => row.locked && row.enabled,
    );
    for (let i = 0, count = Math.min(64, rows.length); i < count; i++)
      enforce(rows[(cursor + i) % rows.length]);
    if (rows.length)
      cursor = (cursor + Math.min(64, rows.length)) % rows.length;
  }
  function wrap(object, name, callback) {
    if (!object || typeof object[name] !== "function") return;
    const original = object[name];
    const wrapper = function () {
      return callback.call(
        this,
        original,
        Array.prototype.slice.call(arguments),
      );
    };
    object[name] = wrapper;
    patches.push({ object, name, original, wrapper });
  }
  function owner(className, globalName) {
    return game[className] ? game[className].prototype : game[globalName];
  }
  function install() {
    if (installed) return;
    installed = true;
    const party = owner("Game_Party", "$gameParty");
    wrap(party, "gainItem", function (original, args) {
      if (active() && !busy && this === game.$gameParty) {
        const item = args[0];
        const kind = ["item", "weapon", "armor"].find(
          (k) => game[TABLES[k]] && item && game[TABLES[k]][item.id] === item,
        );
        const entry = kind && locked({ kind, id: item.id });
        if (entry) {
          args[1] = entry.value - this.numItems(item);
          args[2] = false;
        }
      }
      return original.apply(this, args);
    });
    wrap(party, "gainGold", function (original, args) {
      const entry = locked({ kind: "gold" });
      if (entry && active() && !busy && this === game.$gameParty)
        args[0] = entry.value - this.gold();
      return original.apply(this, args);
    });
    [
      ["Game_Variables", "$gameVariables", "variable"],
      ["Game_Switches", "$gameSwitches", "switch"],
    ].forEach((spec) => {
      wrap(owner(spec[0], spec[1]), "setValue", function (original, args) {
        const entry = locked({ kind: spec[2], id: Number(args[0]) });
        if (entry && active() && !busy && this === game[spec[1]])
          args[1] = entry.value;
        return original.apply(this, args);
      });
    });
    const actorProto = game.Game_Actor ? game.Game_Actor.prototype : null;
    ["addState", "removeState", "eraseState", "clearStates", "refresh"].forEach(
      (method) =>
        wrap(actorProto, method, function (original, args) {
          const result = original.apply(this, args);
          if (
            entries.size > 0 &&
            active() &&
            !busy &&
            typeof this.actorId === "function" &&
            game.$gameActors &&
            game.$gameActors._data &&
            // actor(id) lazily constructs actors. Calling it from setup's
            // clearStates/refresh hooks recursively starts the constructor.
            game.$gameActors._data[this.actorId()] === this
          ) {
            const id = this.actorId();
            entries.forEach((entry) => {
              if (entry.target.kind === "state" && entry.target.actorId === id)
                enforce(entry);
            });
          }
          return result;
        }),
    );
    const timer = owner("Game_Timer", "$gameTimer");
    wrap(timer, "update", function (original, args) {
      const entry = locked({ kind: "timer" });
      if (!entry || !active() || this !== game.$gameTimer || busy)
        return original.apply(this, args);
      this._working = false;
      try {
        return original.apply(this, args);
      } finally {
        enforce(entry);
      }
    });
    ["start", "stop"].forEach((method) =>
      wrap(timer, method, function (original, args) {
        const result = original.apply(this, args);
        const entry = locked({ kind: "timer" });
        if (entry && this === game.$gameTimer) enforce(entry);
        return result;
      }),
    );
    wrap(game.DataManager, "extractSaveContents", function (original, args) {
      const result = original.apply(this, args);
      reconcile();
      return result;
    });
    if (game.setInterval) {
      interval = game.setInterval(reconcile, 250);
      if (interval && interval.unref) interval.unref();
    }
  }
  function list() {
    return Array.from(entries.values()).map((entry) => {
      const row = copy(entry);
      row.active = active() && row.locked && row.enabled;
      row.label =
        row.target.kind +
        (row.target.id ? " #" + row.target.id : "") +
        (row.target.actorId ? " / actor #" + row.target.actorId : "");
      try {
        const value = resolve(row.target);
        if (value.item && value.item.name) row.label += " " + value.item.name;
        else if (["variable", "switch"].includes(row.target.kind))
          row.label +=
            " " +
            game.$dataSystem[
              row.target.kind === "variable" ? "variables" : "switches"
            ][row.target.id];
      } catch (error) {
        /* Missing targets remain removable from this list. */
      }
      return row;
    });
  }
  function set(target, value) {
    target = targetOf(target);
    resolve(target);
    const previous = entries.get(key(target));
    const entry = {
      target,
      value: normalized(target, value),
      locked: true,
      enabled: true,
      reason: "",
      favorite: !!(previous && previous.favorite),
    };
    if (target.kind === "state") {
      const actor = resolve(target).actor;
      if (actor.deathStateId && target.id === actor.deathStateId())
        entry.warning =
          "Locking the death state can prevent recovery or keep an actor dead.";
    }
    entries.set(key(target), entry);
    enforce(entry);
    persist();
    return copy(entry);
  }
  function remove(target) {
    const entry = entries.get(key(target));
    if (!entry) return;
    if (entry.favorite) {
      entry.locked = false;
      entry.value = null;
    } else entries.delete(key(target));
    persist();
  }
  function setFavorite(target, enabled) {
    target = targetOf(target);
    let entry = entries.get(key(target));
    if (!entry && enabled) {
      resolve(target);
      entry = {
        target,
        favorite: true,
        locked: false,
        enabled: true,
        value: null,
        reason: "",
      };
      entries.set(key(target), entry);
    }
    if (entry) {
      entry.favorite = !!enabled;
      if (!entry.favorite && !entry.locked) entries.delete(key(target));
    }
    persist();
  }
  try {
    const raw = storage && storage.getItem(STORAGE_KEY);
    const saved = raw ? json.parse(raw) : null;
    if (
      saved &&
      saved.version === 1 &&
      Array.isArray(saved.entries) &&
      saved.entries.length <= 5000
    )
      saved.entries.forEach((row) => {
        try {
          const target = targetOf(row.target);
          let value = row.locked ? normalized(target, row.value) : null;
          if (
            row.locked &&
            ["item", "weapon", "armor", "gold"].includes(target.kind)
          ) {
            if (
              typeof row.value !== "number" ||
              !Number.isFinite(row.value) ||
              row.value < 0
            )
              throw new Error("Invalid persisted amount");
            value = Math.floor(row.value);
          }
          entries.set(key(target), {
            target,
            value,
            locked: !!row.locked,
            favorite: !!row.favorite,
            enabled: row.enabled !== false,
            reason: String(row.reason || ""),
          });
        } catch (error) {
          /* Discard malformed persistence, never fail boot. */
        }
      });
  } catch (error) {
    /* First use and damaged settings both fall back to an empty list. */
  }
  return {
    install,
    list,
    set,
    remove,
    setFavorite,
    reconcile,
    isLocked(target) {
      return !!locked(target);
    },
    isFavorite(target) {
      const entry = entries.get(key(target));
      return !!(entry && entry.favorite);
    },
    sortFavorites(rows, targetForRow) {
      return rows
        .filter((row) => {
          const entry = entries.get(key(targetForRow(row)));
          return entry && entry.favorite;
        })
        .concat(
          rows.filter((row) => {
            const entry = entries.get(key(targetForRow(row)));
            return !entry || !entry.favorite;
          }),
        );
    },
    dispose() {
      if (interval !== null && game.clearInterval) game.clearInterval(interval);
      patches.reverse().forEach((patch) => {
        if (patch.object[patch.name] === patch.wrapper)
          patch.object[patch.name] = patch.original;
      });
      patches.length = 0;
      interval = null;
      installed = false;
    },
  };
}
