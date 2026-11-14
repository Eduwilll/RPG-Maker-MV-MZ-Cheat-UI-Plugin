import {
  encodeSettingsProfile,
  parseSettingsProfile,
  normalizeProfileShortcut,
} from "../storage/SettingsProfile.js";

const STANDARD = [
  "alwaysDash",
  "commandRemember",
  "bgmVolume",
  "bgsVolume",
  "meVolume",
  "seVolume",
];
const LABELS = {
  alwaysDash: "Always Dash",
  commandRemember: "Remember Commands",
  bgmVolume: "Music (BGM)",
  bgsVolume: "Ambient (BGS)",
  meVolume: "Fanfares (ME)",
  seVolume: "Sound Effects (SE)",
};
const PREFERENCES = {
  windowOpacity: "cheatModal.windowOpacity",
  isDarkMode: "cheatModal.themeDarkMode",
  primaryColor: "cheatModal.themePrimaryColor",
  sidebarVisible: "cheatModal.sidebarVisible",
};
const CHANGED_KEY = "game-options-changed-v1";

export function createGameOptions(game, storage, dependencies) {
  const changed = {};
  const shortcuts = dependencies && dependencies.shortcuts;
  function readStorage(key) {
    try {
      return storage && storage.getItem(key);
    } catch (error) {
      return undefined;
    }
  }
  function writeStorage(key, value) {
    if (storage) storage.setItem(key, value);
  }
  try {
    const saved = readStorage(CHANGED_KEY);
    if (saved) Object.assign(changed, parseSettingsProfile(saved).options);
  } catch (error) {
    /* Corrupt preference files must not prevent startup. */
  }
  function persist() {
    try {
      writeStorage(CHANGED_KEY, encodeSettingsProfile({ options: changed }));
    } catch (error) {
      if (game.console)
        game.console.warn(
          "[Cheat] Option profile was not saved",
          error.message,
        );
    }
  }
  function withWindow(callback) {
    let win = null;
    try {
      if (typeof game.Window_Options === "function") {
        if (game.Utils && game.Utils.RPGMAKER_NAME === "MZ" && game.Rectangle)
          win = new game.Window_Options(
            new game.Rectangle(-10000, -10000, 480, 400),
          );
        else win = new game.Window_Options();
        win.x = -10000;
        win.visible = false;
        if (win.deactivate) win.deactivate();
      }
    } catch (error) {
      win = null;
    }
    try {
      return callback(win);
    } finally {
      if (win && typeof win.destroy === "function") {
        try {
          win.destroy(
            (game.JSON || JSON).parse(
              '{"children":true,"texture":false,"baseTexture":false}',
            ),
          );
        } catch (error) {
          /* Do not destroy shared game textures. */
        }
      }
    }
  }
  function rows(win) {
    const commands = win && Array.isArray(win._list) ? win._list : [];
    const custom = commands.filter(
      (row) =>
        row && typeof row.symbol === "string" && !STANDARD.includes(row.symbol),
    );
    const ordered = custom.concat(
      STANDARD.map(
        (symbol) =>
          commands.find((row) => row.symbol === symbol) || {
            symbol,
            name:
              (game.TextManager && game.TextManager[symbol]) || LABELS[symbol],
            enabled: true,
          },
      ),
    );
    const seen = new Set();
    return ordered
      .filter((command) => {
        if (
          !/^[A-Za-z][A-Za-z0-9_]*$/.test(command.symbol) ||
          ["constructor", "prototype", "__proto__", "save", "load"].includes(
            command.symbol,
          ) ||
          seen.has(command.symbol)
        )
          return false;
        seen.add(command.symbol);
        return true;
      })
      .map((command) => {
        const symbol = command.symbol;
        let value;
        try {
          value =
            win && win.getConfigValue
              ? win.getConfigValue(symbol)
              : game.ConfigManager && game.ConfigManager[symbol];
        } catch (error) {
          value = null;
        }
        const boolean = typeof value === "boolean";
        const numeric = typeof value === "number" && Number.isFinite(value);
        const ext =
          command.ext && typeof command.ext === "object" ? command.ext : {};
        const volume = STANDARD.includes(symbol) && /Volume$/.test(symbol);
        const ranged =
          numeric &&
          ((Number.isFinite(ext.min) &&
            Number.isFinite(ext.max) &&
            ext.min <= ext.max) ||
            volume);
        const supported =
          !!game.ConfigManager &&
          command.enabled !== false &&
          (boolean || ranged);
        return {
          symbol,
          label: String(command.name || LABELS[symbol] || symbol),
          value: boolean || numeric ? value : null,
          type: boolean ? "boolean" : numeric ? "number" : "unsupported",
          min: volume ? 0 : ext.min,
          max: volume ? 100 : ext.max,
          step: volume
            ? 1
            : Number.isFinite(ext.step) && ext.step > 0
              ? ext.step
              : 1,
          supported,
          reason: supported
            ? ""
            : command.enabled === false
              ? "Disabled by the game"
              : "Unsupported or complex game option; no safe editor available",
          custom: !STANDARD.includes(symbol),
          included: Object.prototype.hasOwnProperty.call(changed, symbol),
        };
      });
  }
  function normalize(row, value) {
    if (!row || !row.supported)
      throw new Error("Option is not available for editing");
    if (row.type === "boolean") {
      if (typeof value !== "boolean")
        throw new Error("Expected a boolean option");
      return value;
    }
    if (typeof value !== "number" || !Number.isFinite(value))
      throw new Error("Expected a finite numeric option");
    const clamped = Math.min(row.max, Math.max(row.min, value));
    return Math.max(
      row.min,
      Math.min(
        row.max,
        row.min + Math.round((clamped - row.min) / row.step) * row.step,
      ),
    );
  }
  function set(symbol, value) {
    return withWindow((win) => {
      const row = rows(win).find((option) => option.symbol === symbol);
      const next = normalize(row, value);
      if (win && typeof win.changeValue === "function")
        win.changeValue(symbol, next);
      else if (STANDARD.includes(symbol)) game.ConfigManager[symbol] = next;
      else throw new Error("Custom option has no safe setter");
      const saved = game.ConfigManager.save && game.ConfigManager.save();
      if (saved && typeof saved.catch === "function")
        saved.catch((error) => {
          if (game.console)
            game.console.warn("[Cheat] Game option save failed", error);
        });
      const updated = rows(win).find((option) => option.symbol === symbol);
      changed[symbol] = updated.value;
      persist();
      return updated;
    });
  }
  function appearance() {
    const result = {};
    Object.keys(PREFERENCES).forEach((key) => {
      const value = readStorage(PREFERENCES[key]);
      if (value === undefined || value === null) return;
      try {
        const parsed =
          key === "windowOpacity"
            ? Number(value)
            : ["isDarkMode", "sidebarVisible"].includes(key)
              ? value === "true"
                ? true
                : value === "false"
                  ? false
                  : value
              : value;
        Object.assign(
          result,
          parseSettingsProfile(
            JSON.stringify({ version: 1, appearance: { [key]: parsed } }),
          ).appearance,
        );
      } catch (error) {
        /* Invalid existing preferences are not exported. */
      }
    });
    return result;
  }
  function exportProfile() {
    const bindings = shortcuts ? shortcuts.read() : {};
    const valid = {};
    Object.keys(bindings || {}).forEach((key) => {
      if (!bindings[key]) return;
      try {
        Object.assign(
          valid,
          parseSettingsProfile(
            JSON.stringify({ version: 1, shortcuts: { [key]: bindings[key] } }),
          ).shortcuts,
        );
      } catch (error) {
        /* Export supported, valid bindings only. */
      }
    });
    return encodeSettingsProfile({
      options: changed,
      appearance: appearance(),
      shortcuts: valid,
    });
  }
  function previewProfile(text) {
    const profile = parseSettingsProfile(text);
    const available = withWindow(rows);
    const changes = [];
    const ignored = [];
    Object.keys(profile.options).forEach((symbol) => {
      const row = available.find((value) => value.symbol === symbol);
      if (!row || !row.supported)
        ignored.push({ symbol, reason: "Unavailable in this game" });
      else
        changes.push({
          section: "options",
          symbol,
          label: row.label,
          value: normalize(row, profile.options[symbol]),
        });
    });
    Object.keys(profile.appearance).forEach((symbol) =>
      changes.push({
        section: "appearance",
        symbol,
        label: symbol,
        value: profile.appearance[symbol],
      }),
    );
    if (Object.keys(profile.shortcuts).length) {
      if (!shortcuts)
        Object.keys(profile.shortcuts).forEach((symbol) =>
          ignored.push({ symbol, reason: "Shortcut import unavailable" }),
        );
      else {
        const merged = Object.assign({}, shortcuts.read(), profile.shortcuts);
        const used = new Map();
        Object.keys(merged).forEach((id) => {
          if (!merged[id]) return;
          const value = normalizeProfileShortcut(merged[id]);
          if (used.has(value))
            throw new Error(
              "Shortcut conflict: " + id + " / " + used.get(value),
            );
          used.set(value, id);
        });
        Object.keys(profile.shortcuts).forEach((symbol) =>
          changes.push({
            section: "shortcuts",
            symbol,
            label: symbol,
            value: profile.shortcuts[symbol],
          }),
        );
      }
    }
    return { changes, ignored };
  }
  function importProfile(text) {
    const preview = previewProfile(text);
    const result = { applied: [], ignored: preview.ignored, errors: [] };
    const bindings = {};
    preview.changes.forEach((change) => {
      try {
        if (change.section === "options") set(change.symbol, change.value);
        else if (change.section === "appearance")
          writeStorage(PREFERENCES[change.symbol], String(change.value));
        else {
          bindings[change.symbol] = change.value;
          return;
        }
        result.applied.push(change);
      } catch (error) {
        result.errors.push({ symbol: change.symbol, reason: error.message });
      }
    });
    if (Object.keys(bindings).length) {
      try {
        shortcuts.write(bindings);
        preview.changes
          .filter((row) => row.section === "shortcuts")
          .forEach((row) => result.applied.push(row));
      } catch (error) {
        result.errors.push({ symbol: "shortcuts", reason: error.message });
      }
    }
    if (game.dispatchEvent && game.CustomEvent)
      game.dispatchEvent(new game.CustomEvent("cheat-profile-change"));
    return result;
  }
  return {
    list() {
      return withWindow(rows);
    },
    set,
    exportProfile,
    previewProfile,
    importProfile,
    removeFromProfile(symbol) {
      const had = Object.prototype.hasOwnProperty.call(changed, symbol);
      delete changed[symbol];
      persist();
      return had;
    },
  };
}
