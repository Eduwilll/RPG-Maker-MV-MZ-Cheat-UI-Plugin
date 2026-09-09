// @ts-check

import { KEY_VALUE_STORAGE } from "../../storage/KeyValueStorage.js";
import {
  readBooleanSetting,
  writeBooleanSetting,
  readNumberSetting,
  writeNumberSetting,
} from "../../ui/CheatUiSettings.js";

export var MINIMAP_ENABLED = "minimap.enabled";
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

/**
 * Full settings snapshot with old-safe defaults.
 */
export function readMinimapSettings() {
  var position = "top-right";
  try {
    var stored = KEY_VALUE_STORAGE.getItem(MINIMAP_POSITION);
    if (stored) {
      position = String(stored);
    }
  } catch (e) {
    position = "top-right";
  }

  var mode = "follow";
  try {
    var storedMode = KEY_VALUE_STORAGE.getItem(MINIMAP_MODE);
    if (storedMode) {
      mode = String(storedMode);
    }
  } catch (e) {
    mode = "follow";
  }

  return {
    enabled: readBooleanSetting(MINIMAP_ENABLED, false),
    position: position,
    customX: readNumberSetting(MINIMAP_CUSTOM_X, 8),
    customY: readNumberSetting(MINIMAP_CUSTOM_Y, 8),
    size: readNumberSetting(MINIMAP_SIZE, 176),
    zoom: readNumberSetting(MINIMAP_ZOOM, 1),
    mode: mode,
    opacity: readNumberSetting(MINIMAP_OPACITY, 0.85),
    showEvents: readBooleanSetting(MINIMAP_SHOW_EVENTS, false),
  };
}

export function writeMinimapEnabled(value) {
  writeBooleanSetting(MINIMAP_ENABLED, value);
}

/**
 * Flip the minimap on/off (used by the toggle shortcut).
 * @returns {boolean} the new state
 */
export function toggleMinimapEnabled() {
  var next = !readBooleanSetting(MINIMAP_ENABLED, false);
  writeBooleanSetting(MINIMAP_ENABLED, next);
  return next;
}

export function writeMinimapPosition(value) {
  KEY_VALUE_STORAGE.setItem(MINIMAP_POSITION, String(value));
}

export function writeMinimapCustomX(value) {
  writeNumberSetting(MINIMAP_CUSTOM_X, value);
}

export function writeMinimapCustomY(value) {
  writeNumberSetting(MINIMAP_CUSTOM_Y, value);
}

export function writeMinimapSize(value) {
  writeNumberSetting(MINIMAP_SIZE, value);
}

export function writeMinimapZoom(value) {
  writeNumberSetting(MINIMAP_ZOOM, value);
}

export function writeMinimapMode(value) {
  KEY_VALUE_STORAGE.setItem(MINIMAP_MODE, String(value));
}

export function writeMinimapOpacity(value) {
  writeNumberSetting(MINIMAP_OPACITY, value);
}

export function writeMinimapShowEvents(value) {
  writeBooleanSetting(MINIMAP_SHOW_EVENTS, value);
}
