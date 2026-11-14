import { CHAR_TO_CODE } from "../shortcuts/KeyCodes.js";

const APPEARANCE = [
  "windowOpacity",
  "isDarkMode",
  "primaryColor",
  "sidebarVisible",
];
const SHORTCUTS = [
  "toggleCheatModal",
  "toggleCheatModalToSaveLocationComponent",
  "toggleCheatModalToMapEventComponent",
  "toggleMinimap",
  "quickSave",
  "quickLoad",
  "openSaveScene",
  "openLoadScene",
  "gotoTitle",
  "forceVictory",
  "forceDefeat",
  "forceEscape",
  "toggleNoClip",
  "toggleMouseTeleport",
  "enemyWound",
  "enemyRecovery",
  "partyWound",
  "partyRecovery",
  "skipMessage",
  "openDevTool",
  "openFeatureFinder",
  "openMessageLog",
].concat([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => "setSpeed" + n));
const FORBIDDEN = [
  "__proto__",
  "constructor",
  "prototype",
  "save",
  "load",
  "applyData",
  "makeData",
];
const isRecord = (value) =>
  !!value && typeof value === "object" && !Array.isArray(value);

export function normalizeProfileShortcut(value) {
  if (typeof value !== "string" || value.length > 80)
    throw new Error("Invalid shortcut");
  const keys = value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const known = Object.keys(CHAR_TO_CODE)
    .map((key) => key.toLowerCase())
    .concat(["meta"]);
  if (
    !keys.length ||
    keys.some((key) => !known.includes(key)) ||
    new Set(keys).size !== keys.length ||
    keys.filter((key) => !["ctrl", "alt", "shift", "meta"].includes(key))
      .length > 1
  )
    throw new Error("Invalid shortcut keys");
  const modifiers = ["ctrl", "alt", "shift", "meta"].filter((key) =>
    keys.includes(key),
  );
  return modifiers
    .concat(keys.filter((key) => !modifiers.includes(key)))
    .join(" ");
}

function validate(value) {
  if (!isRecord(value) || value.version !== 1)
    throw new Error("Unsupported settings profile version");
  Object.keys(value).forEach((key) => {
    if (!["version", "options", "appearance", "shortcuts"].includes(key))
      throw new Error("Unsupported profile section: " + key);
  });
  const result = { version: 1, options: {}, appearance: {}, shortcuts: {} };
  ["options", "appearance", "shortcuts"].forEach((section) => {
    const data = value[section] === undefined ? {} : value[section];
    if (!isRecord(data) || Object.keys(data).length > 512)
      throw new Error("Invalid profile section");
    Object.keys(data).forEach((key) => {
      if (FORBIDDEN.includes(key) || !/^[A-Za-z][A-Za-z0-9_]*$/.test(key))
        throw new Error("Invalid profile key");
      const item = data[key];
      if (section === "options") {
        if (
          !(
            typeof item === "boolean" ||
            (typeof item === "number" && Number.isFinite(item))
          )
        )
          throw new Error(
            "Option values must be boolean or finite numeric values",
          );
      } else if (section === "appearance") {
        if (!APPEARANCE.includes(key))
          throw new Error("Unsupported appearance preference");
        if (
          key === "windowOpacity" &&
          (typeof item !== "number" ||
            !Number.isFinite(item) ||
            item < 0.1 ||
            item > 1)
        )
          throw new Error("Invalid opacity");
        if (
          ["isDarkMode", "sidebarVisible"].includes(key) &&
          typeof item !== "boolean"
        )
          throw new Error("Invalid boolean appearance preference");
        if (
          key === "primaryColor" &&
          (typeof item !== "string" || !/^#[0-9a-f]{6}$/i.test(item))
        )
          throw new Error("Invalid accent color");
      } else {
        if (!SHORTCUTS.includes(key)) throw new Error("Unsupported shortcut");
        result.shortcuts[key] = normalizeProfileShortcut(item);
        return;
      }
      result[section][key] = item;
    });
  });
  return result;
}

export function parseSettingsProfile(text) {
  if (typeof text !== "string") throw new Error("Profile must be JSON text");
  const bytes =
    typeof TextEncoder !== "undefined"
      ? new TextEncoder().encode(text).length
      : encodeURIComponent(text).replace(/%[A-F\d]{2}/gi, "x").length;
  if (bytes > 1048576) throw new Error("Profile is too large (maximum 1 MiB)");
  return validate(JSON.parse(text));
}
export function encodeSettingsProfile(profile) {
  const payload = Object.assign({ version: 1 }, profile);
  const value = validate(payload);
  const text = JSON.stringify(value, null, 2);
  parseSettingsProfile(text);
  return text;
}
