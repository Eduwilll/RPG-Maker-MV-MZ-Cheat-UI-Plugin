import test from "node:test";
import assert from "node:assert/strict";
import { KEY_VALUE_STORAGE } from "../../cheat-engine/www/cheat/js/storage/KeyValueStorage.js";
import {
  ACCENT_COLOR_OPTIONS,
  DEFAULT_PRIMARY_COLOR,
  THEME_PRIMARY_COLOR,
  createVuetifyTheme,
  readThemeSelection,
  readThemeStyle,
  applyThemeStyle,
  THEME_STYLE,
} from "../../cheat-engine/www/cheat/js/ui/CheatTheme.js";

function storage(t, entries = []) {
  const values = new Map(entries);
  t.mock.method(KEY_VALUE_STORAGE, "getItem", (key) => values.get(key));
  t.mock.method(KEY_VALUE_STORAGE, "setItem", (key, value) =>
    values.set(key, value),
  );
  return values;
}

test("Default uses the released v1.8.0 accent for fresh profiles and both surfaces", (t) => {
  const values = storage(t);
  assert.equal(DEFAULT_PRIMARY_COLOR, "#1976D2");
  assert.deepEqual(readThemeSelection(), { dark: true, primary: "#1976D2" });
  assert.equal(values.get(THEME_PRIMARY_COLOR), "#1976D2");
  const theme = createVuetifyTheme();
  assert.equal(theme.themes.dark.primary, "#1976D2");
  assert.equal(theme.themes.light.primary, "#1976D2");
});

test("one palette keeps the modern swatches plus an explicit Default", () => {
  assert.equal(ACCENT_COLOR_OPTIONS.length, 12);
  assert.deepEqual(ACCENT_COLOR_OPTIONS[0], {
    text: "Default",
    value: "#1976D2",
    isDefault: true,
  });
  assert.equal(
    ACCENT_COLOR_OPTIONS.find((row) => row.text === "Blue").value,
    "#3B82F6",
  );
  assert.ok(
    ACCENT_COLOR_OPTIONS.every(
      (row) => !row.original && !row.text.includes("Original"),
    ),
  );
  assert.equal(new Set(ACCENT_COLOR_OPTIONS.map((row) => row.value)).size, 12);
});

test("saved colors, including removed legacy swatches, are never overwritten", (t) => {
  const values = storage(t, [
    [THEME_PRIMARY_COLOR, "#f44336"],
    ["cheatModal.themeDarkMode", "false"],
  ]);
  assert.deepEqual(readThemeSelection(), { dark: false, primary: "#F44336" });
  assert.equal(values.get(THEME_PRIMARY_COLOR), "#f44336");
  values.set(THEME_PRIMARY_COLOR, "#3B82F6");
  assert.equal(readThemeSelection().primary, "#3B82F6");
});

test("invalid colors and unavailable storage safely use the released default", (t) => {
  storage(t, [[THEME_PRIMARY_COLOR, "url(bad)"]]);
  assert.equal(readThemeSelection().primary, "#1976D2");
  t.mock.method(KEY_VALUE_STORAGE, "getItem", () => {
    throw Error("unavailable");
  });
  assert.equal(readThemeSelection().primary, "#1976D2");
});

test("Legacy is opt-in and invalid styles fall back without changing saved accents", (t) => {
  const values = storage(t);
  assert.equal(readThemeStyle(), "current");
  values.set(THEME_STYLE, "legacy");
  values.set(THEME_PRIMARY_COLOR, "#EC4899");
  assert.equal(readThemeStyle(), "legacy");
  const theme = createVuetifyTheme();
  assert.equal(theme.themes.dark.primary, "#EC4899");
  assert.equal(theme.themes.dark.accent, "#FF4081");
  assert.equal(theme.themes.light.accent, "#82B1FF");
  values.set(THEME_STYLE, "unexpected");
  assert.equal(readThemeStyle(), "current");
  assert.equal(createVuetifyTheme().themes.dark.accent, "#38bdf8");
});

test("switching Legacy on and off updates the app root and both palettes", (t) => {
  storage(t);
  const attributes = {};
  const root = {
    setAttribute: (key, value) => {
      attributes[key] = value;
    },
  };
  const vuetify = {
    theme: createVuetifyTheme({ dark: true, primary: "#14B8A6" }),
  };
  applyThemeStyle(vuetify, root, "legacy");
  assert.equal(attributes["data-cheat-theme"], "legacy");
  assert.equal(vuetify.theme.themes.dark.success, "#4CAF50");
  assert.equal(vuetify.theme.themes.light.primary, "#14B8A6");
  applyThemeStyle(vuetify, root, "current");
  assert.equal(attributes["data-cheat-theme"], "current");
  assert.equal(vuetify.theme.themes.dark.success, "#34d399");
  assert.equal(vuetify.theme.themes.dark.primary, "#14B8A6");
});
