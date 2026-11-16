// @ts-check

/**
 * Shared Vuetify theme for every cheat surface: the in-game overlay, the
 * pop-out cheat window and the standalone preview.
 *
 * Keeping the palette in one module means the three entry points cannot drift
 * apart, and new panels can rely on the semantic colors being present.
 */

import { readBooleanSetting } from "./CheatUiSettings.js";
import { KEY_VALUE_STORAGE } from "../storage/KeyValueStorage.js";

export const DEFAULT_PRIMARY_COLOR = "#1976D2";
export const THEME_DARK_MODE = "cheatModal.themeDarkMode";
export const THEME_PRIMARY_COLOR = "cheatModal.themePrimaryColor";
export const THEME_STYLE = "cheatModal.themeStyle";

export function readThemeStyle() {
  try {
    return KEY_VALUE_STORAGE.getItem(THEME_STYLE) === "legacy"
      ? "legacy"
      : "current";
  } catch (error) {
    return "current";
  }
}

function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function parseHexColor(value) {
  if (!isHexColor(value)) return null;
  const numeric = parseInt(value.slice(1), 16);
  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
}

function channelLuminance(channel) {
  const value = channel / 255;
  return value <= 0.03928
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb) {
  return (
    0.2126 * channelLuminance(rgb.r) +
    0.7152 * channelLuminance(rgb.g) +
    0.0722 * channelLuminance(rgb.b)
  );
}

function mixChannel(channel, target, amount) {
  return Math.round(channel + (target - channel) * amount);
}

function mixColor(rgb, target, amount) {
  return {
    r: mixChannel(rgb.r, target.r, amount),
    g: mixChannel(rgb.g, target.g, amount),
    b: mixChannel(rgb.b, target.b, amount),
  };
}

function rgba(rgb, alpha) {
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

/**
 * Derive the focus ring variables from the user's accent. The accent itself is
 * tuned for filled buttons, so dark accents are lightened on dark surfaces and
 * pale accents are darkened on light surfaces to keep focus visible.
 */
export function accentFocusColor(color, dark) {
  const rgb = parseHexColor(color);
  if (!rgb) return null;
  const luminance = relativeLuminance(rgb);
  let focus = color;
  if (dark && luminance < 0.3) {
    const lifted = mixColor(rgb, { r: 255, g: 255, b: 255 }, 0.45);
    focus =
      "#" +
      lifted.r.toString(16).padStart(2, "0") +
      lifted.g.toString(16).padStart(2, "0") +
      lifted.b.toString(16).padStart(2, "0");
  } else if (!dark && luminance > 0.32) {
    const deepened = mixColor(rgb, { r: 0, g: 0, b: 0 }, 0.3);
    focus =
      "#" +
      deepened.r.toString(16).padStart(2, "0") +
      deepened.g.toString(16).padStart(2, "0") +
      deepened.b.toString(16).padStart(2, "0");
  }
  const focusRgb = parseHexColor(focus) || rgb;
  return {
    primary: color,
    primarySoft: rgba(rgb, 0.16),
    focus: focus,
    focusSoft: rgba(focusRgb, 0.2),
  };
}

/**
 * Semantic colors tuned for the slate surfaces in `css/main.css`. Vuetify uses
 * these for chips, alerts, switches and validation states, so they need enough
 * contrast on dark slate without turning the UI into a rainbow.
 */
export const THEME_PALETTE = {
  secondary: "#64748b",
  accent: "#38bdf8",
  error: "#f87171",
  info: "#60a5fa",
  success: "#34d399",
  warning: "#fbbf24",
  anchor: "#8ab4ff",
};

// Match the bundled Vuetify defaults used before the slate redesign.
const LEGACY_PALETTE = {
  secondary: "#424242",
  error: "#FF5252",
  info: "#2196F3",
  success: "#4CAF50",
  warning: "#FB8C00",
  anchor: "#1976D2",
};

function colorPalette(style, dark) {
  return style === "legacy"
    ? Object.assign({}, LEGACY_PALETTE, {
        accent: dark ? "#FF4081" : "#82B1FF",
        anchor: dark ? "#2196F3" : "#1976D2",
      })
    : Object.assign({}, THEME_PALETTE);
}

/** Apply at the app root so detached Vuetify menus/dialogs inherit the style. */
export function applyThemeStyle(vuetify, root, style) {
  const selected = style === "legacy" ? "legacy" : "current";
  if (root) root.setAttribute("data-cheat-theme", selected);
  Object.assign(vuetify.theme.themes.dark, colorPalette(selected, true));
  Object.assign(vuetify.theme.themes.light, colorPalette(selected, false));
}

/**
 * Read the stored Appearance choices, falling back to the shipped defaults.
 * Storage is best effort: a broken profile must never stop the UI mounting.
 *
 * Keep saved accents, including colors no longer offered by the picker.
 */
export function readThemeSelection() {
  let dark = true;
  let primary = null;
  try {
    dark = readBooleanSetting(THEME_DARK_MODE, true);
    const stored = KEY_VALUE_STORAGE.getItem(THEME_PRIMARY_COLOR);
    if (isHexColor(stored)) {
      primary = stored.toUpperCase();
    } else if (stored === null || stored === undefined) {
      primary = DEFAULT_PRIMARY_COLOR;
      KEY_VALUE_STORAGE.setItem(THEME_PRIMARY_COLOR, primary);
    }
  } catch (error) {
    // Ignore: use the defaults below.
  }
  return { dark: dark, primary: primary || DEFAULT_PRIMARY_COLOR };
}

/**
 * Build a Vuetify `theme` option. Both themes share the palette so switching
 * dark mode never changes the user's accent color.
 */
export function createVuetifyTheme(selection) {
  const choice = selection || readThemeSelection();
  const primary = choice.primary || DEFAULT_PRIMARY_COLOR;
  const style = readThemeStyle();
  return {
    dark: choice.dark !== false,
    themes: {
      dark: Object.assign(colorPalette(style, true), { primary: primary }),
      light: Object.assign(colorPalette(style, false), { primary: primary }),
    },
  };
}

/**
 * The released default followed by the modern accent swatches.
 */
export const ACCENT_COLOR_OPTIONS = [
  { text: "Default", value: DEFAULT_PRIMARY_COLOR, isDefault: true },
  { text: "Blue", value: "#3B82F6" },
  { text: "Sky", value: "#0EA5E9" },
  { text: "Teal", value: "#14B8A6" },
  { text: "Green", value: "#22C55E" },
  { text: "Amber", value: "#F59E0B" },
  { text: "Orange", value: "#F97316" },
  { text: "Red", value: "#EF4444" },
  { text: "Pink", value: "#EC4899" },
  { text: "Purple", value: "#A855F7" },
  { text: "Indigo", value: "#6366F1" },
  { text: "Slate", value: "#94A3B8" },
];
