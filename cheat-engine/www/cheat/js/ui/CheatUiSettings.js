import { KEY_VALUE_STORAGE } from "../storage/KeyValueStorage.js";

function parseBoolean(value, fallback) {
  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return fallback;
}

export function readBooleanSetting(key, fallback) {
  return parseBoolean(KEY_VALUE_STORAGE.getItem(key), fallback);
}

export function writeBooleanSetting(key, value) {
  KEY_VALUE_STORAGE.setItem(key, value ? "true" : "false");
}
