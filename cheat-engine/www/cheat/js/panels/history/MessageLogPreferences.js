import { messageTextStyle } from "../../runtime/MessagePresentation.js";

export const PLUGIN_LOG_FONT = '"Roboto", sans-serif';
export const MESSAGE_LOG_DEFAULTS = {
  fontMode: "game",
  sizeMode: "default",
  fontSize: 16,
};

function normalize(value) {
  const source = value && typeof value === "object" ? value : {};
  const numeric =
    typeof source.fontSize === "number" ||
    (typeof source.fontSize === "string" && source.fontSize.trim() !== "")
      ? Number(source.fontSize)
      : NaN;
  return {
    fontMode: source.fontMode === "plugin" ? "plugin" : "game",
    sizeMode: source.sizeMode === "custom" ? "custom" : "default",
    fontSize: Number.isFinite(numeric)
      ? Math.round(Math.max(12, Math.min(40, numeric)))
      : 16,
  };
}

export function createMessageLogPreferences(storage) {
  let value = normalize(null),
    revision = 0;
  try {
    value = normalize(
      JSON.parse(storage.getItem("messageLog.appearance") || "null"),
    );
  } catch (error) {
    /* Keep readable defaults. */
  }
  function write(patch) {
    const next = normalize(Object.assign({}, value, patch));
    if (JSON.stringify(next) === JSON.stringify(value)) return;
    value = next;
    revision++;
    try {
      storage.setItem("messageLog.appearance", JSON.stringify(value));
    } catch (error) {
      /* The session can still use its display preferences. */
    }
  }
  return {
    read: () => Object.assign({}, value),
    revision: () => revision,
    write,
    reset: () => write(MESSAGE_LOG_DEFAULTS),
  };
}

export function messageLogStyle(serialized, preferences) {
  const prefs = normalize(preferences),
    style = messageTextStyle(serialized);
  // Font source and readable UI size are independent of the game's window scale.
  style.fontSize = (prefs.sizeMode === "custom" ? prefs.fontSize : 16) + "px";
  if (prefs.fontMode === "plugin") style.fontFamily = PLUGIN_LOG_FONT;
  return style;
}
