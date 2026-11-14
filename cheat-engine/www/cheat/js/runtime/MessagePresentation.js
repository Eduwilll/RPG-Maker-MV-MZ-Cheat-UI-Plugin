const FIELDS = [
  "fontFace",
  "fontSize",
  "fontBold",
  "fontItalic",
  "textColor",
  "outlineColor",
  "outlineWidth",
];

export function captureMessageStyle(messageWindow) {
  const contents = messageWindow && messageWindow.contents;
  if (!contents) return "";
  const snapshot = {};
  FIELDS.forEach((key) => {
    const value = contents[key];
    if (["string", "number", "boolean"].indexOf(typeof value) >= 0)
      snapshot[key] = value;
  });
  return JSON.stringify(snapshot);
}

function color(value) {
  return typeof value === "string" &&
    value.length <= 100 &&
    /^(?:#[\da-f]{3}|#[\da-f]{4}|#[\da-f]{6}|#[\da-f]{8}|[a-z]{1,24}|rgba?\([\d.,%\s]+\)|hsla?\([\d.,%\s]+\))$/i.test(
      value,
    )
    ? value
    : "";
}

/** Bind only a small visual allowlist; never turn arbitrary JSON into CSS. */
export function messageTextStyle(serialized) {
  try {
    if (!serialized || serialized.length > 2048) return {};
    const source = JSON.parse(serialized),
      style = {};
    if (!source || Array.isArray(source) || typeof source !== "object")
      return {};
    if (
      typeof source.fontFace === "string" &&
      source.fontFace.length <= 256 &&
      !/[;:{}()<>\\]/.test(source.fontFace)
    )
      style.fontFamily = source.fontFace;
    if (typeof source.fontSize === "number" && Number.isFinite(source.fontSize))
      style.fontSize = Math.max(12, Math.min(40, source.fontSize)) + "px";
    if (typeof source.fontBold === "boolean")
      style.fontWeight = source.fontBold ? "700" : "400";
    if (typeof source.fontItalic === "boolean")
      style.fontStyle = source.fontItalic ? "italic" : "normal";
    if (color(source.textColor)) style.color = color(source.textColor);
    const outline = color(source.outlineColor),
      width = Math.max(0, Math.min(3, Number(source.outlineWidth) / 2 || 0));
    if (outline && width)
      style.textShadow = [
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
      ]
        .map(([x, y]) => x * width + "px " + y * width + "px 0 " + outline)
        .join(",");
    return style;
  } catch (error) {
    return {};
  }
}
