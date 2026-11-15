// @ts-check

import { KEY_VALUE_STORAGE } from "../../storage/KeyValueStorage.js";
import { getGameWindow } from "../../runtime/FeatureRuntime.js";

export var MINIMAP_ENABLED = "minimap.enabled";
export var MINIMAP_MOVE_MODE = "minimap.moveMode";
export var MINIMAP_POSITION = "minimap.position";
export var MINIMAP_CUSTOM_X = "minimap.customX";
export var MINIMAP_CUSTOM_Y = "minimap.customY";
export var MINIMAP_SIZE = "minimap.size";
export var MINIMAP_ZOOM = "minimap.zoom";
export var MINIMAP_MODE = "minimap.mode";
export var MINIMAP_OPACITY = "minimap.opacity";
export var MINIMAP_SHOW_EVENTS = "minimap.showEvents";

export var MINIMAP_POSITIONS = [
  "top-right",
  "top-left",
  "bottom-right",
  "bottom-left",
  "custom",
];

export var MINIMAP_MODES = ["follow", "full"];

const fallbackContext = { storage: KEY_VALUE_STORAGE, snapshot: null };
const localContexts = new WeakMap();

function settingsContext() {
  const game = /** @type {any} */ (getGameWindow());
  if (!game) return fallbackContext;
  // Module instances in the game and popout must use the same storage and snapshot.
  try {
    if (!game.__cheatMinimapSettings) {
      Object.defineProperty(game, "__cheatMinimapSettings", {
        value: { storage: KEY_VALUE_STORAGE, snapshot: null },
        configurable: true,
      });
    }
    return game.__cheatMinimapSettings;
  } catch (error) {
    // Non-extensible browser hosts can still cache safely within this realm.
    if (!localContexts.has(game))
      localContexts.set(game, { storage: KEY_VALUE_STORAGE, snapshot: null });
    return localContexts.get(game);
  }
}

function readSetting(context, key, fallback) {
  let value;
  try {
    value = context.storage.getItem(key);
  } catch (error) {
    return fallback;
  }
  if (typeof fallback === "boolean") {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return fallback;
  }
  if (typeof fallback === "number") {
    if (value === null || value === undefined) return fallback;
    const number = Number(value);
    return isNaN(number) ? fallback : number;
  }
  return value ? String(value) : fallback;
}

function writeSetting(key, value) {
  const context = settingsContext();
  context.storage.setItem(key, value);
  context.snapshot = null;
}

/**
 * Full settings snapshot with old-safe defaults.
 */
export function readMinimapSettings() {
  const context = settingsContext();
  if (!context.snapshot) {
    context.snapshot = {
      enabled: readSetting(context, MINIMAP_ENABLED, false),
      moveMode: readSetting(context, MINIMAP_MOVE_MODE, false),
      position: readSetting(context, MINIMAP_POSITION, "top-right"),
      customX: readSetting(context, MINIMAP_CUSTOM_X, 8),
      customY: readSetting(context, MINIMAP_CUSTOM_Y, 8),
      size: readSetting(context, MINIMAP_SIZE, 176),
      zoom: readSetting(context, MINIMAP_ZOOM, 1),
      mode: readSetting(context, MINIMAP_MODE, "follow"),
      opacity: readSetting(context, MINIMAP_OPACITY, 0.85),
      showEvents: readSetting(context, MINIMAP_SHOW_EVENTS, true),
    };
  }
  return Object.assign({}, context.snapshot);
}

export function writeMinimapEnabled(value) {
  writeSetting(MINIMAP_ENABLED, value ? "true" : "false");
}
export function writeMinimapMoveMode(value) {
  writeSetting(MINIMAP_MOVE_MODE, value ? "true" : "false");
}

/**
 * Flip the minimap on/off (used by the toggle shortcut).
 * @returns {boolean} the new state
 */
export function toggleMinimapEnabled() {
  var next = !readMinimapSettings().enabled;
  writeMinimapEnabled(next);
  return next;
}

export function writeMinimapPosition(value) {
  writeSetting(MINIMAP_POSITION, String(value));
}

export function writeMinimapCustomX(value) {
  writeSetting(MINIMAP_CUSTOM_X, String(value));
}

export function writeMinimapCustomY(value) {
  writeSetting(MINIMAP_CUSTOM_Y, String(value));
}

export function writeMinimapSize(value) {
  writeSetting(MINIMAP_SIZE, String(value));
}

export function writeMinimapZoom(value) {
  writeSetting(MINIMAP_ZOOM, String(value));
}

export function writeMinimapMode(value) {
  writeSetting(MINIMAP_MODE, String(value));
}

export function writeMinimapOpacity(value) {
  writeSetting(MINIMAP_OPACITY, String(value));
}

export function writeMinimapShowEvents(value) {
  writeSetting(MINIMAP_SHOW_EVENTS, value ? "true" : "false");
}
