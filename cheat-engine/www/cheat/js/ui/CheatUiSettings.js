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

export function readNumberSetting(key, fallback) {
  const val = KEY_VALUE_STORAGE.getItem(key);
  if (val === null || val === undefined) return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
}

export function writeNumberSetting(key, value) {
  KEY_VALUE_STORAGE.setItem(key, String(value));
}
