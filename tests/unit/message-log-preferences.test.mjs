import test from "node:test";
import assert from "node:assert/strict";

const load = () =>
  import("../../cheat-engine/www/cheat/js/panels/history/MessageLogPreferences.js");

test("log defaults keep the game font but restore 16px regardless of captured game text size", async () => {
  const { createMessageLogPreferences, messageLogStyle } = await load();
  const prefs = createMessageLogPreferences({
    getItem: () => null,
    setItem() {},
  });
  assert.deepEqual(prefs.read(), {
    fontMode: "game",
    sizeMode: "default",
    fontSize: 16,
  });
  const style = messageLogStyle(
    JSON.stringify({
      fontFace: "GameFont",
      fontSize: 32,
      textColor: "#ffffff",
    }),
    prefs.read(),
  );
  assert.equal(style.fontFamily, "GameFont");
  assert.equal(style.fontSize, "16px");
  assert.equal(style.color, "#ffffff");
});

test("custom size and plugin font persist, with detached settings and stable revisions on no-op updates", async () => {
  const { createMessageLogPreferences, messageLogStyle, PLUGIN_LOG_FONT } =
    await load();
  const values = new Map(),
    storage = {
      getItem: (key) => values.get(key),
      setItem: (key, value) => values.set(key, value),
    };
  const prefs = createMessageLogPreferences(storage);
  const version = prefs.revision();
  prefs.write({ fontMode: "plugin", sizeMode: "custom", fontSize: "21" });
  assert.ok(prefs.revision() > version);
  const editedVersion = prefs.revision();
  prefs.write(prefs.read());
  assert.equal(prefs.revision(), editedVersion);
  const restored = createMessageLogPreferences(storage);
  assert.equal(restored.read().fontSize, 21);
  const copy = restored.read();
  copy.fontMode = "game";
  assert.equal(restored.read().fontMode, "plugin");
  const style = messageLogStyle(
    JSON.stringify({ fontFace: "BrokenGameFont", fontSize: 35 }),
    restored.read(),
  );
  assert.equal(style.fontFamily, PLUGIN_LOG_FONT);
  assert.equal(style.fontSize, "21px");
  restored.reset();
  assert.equal(restored.read().fontMode, "game");
  assert.equal(restored.read().sizeMode, "default");
});

test("malformed settings and unsafe values cannot inject CSS or break log display", async () => {
  const { createMessageLogPreferences, messageLogStyle } = await load();
  const prefs = createMessageLogPreferences({
    getItem: () => "malformed",
    setItem() {
      throw Error("no storage");
    },
  });
  assert.doesNotThrow(() =>
    prefs.write({
      fontMode: "url(bad)",
      sizeMode: "custom",
      fontSize: "Infinity",
      unknown: true,
    }),
  );
  assert.deepEqual(prefs.read(), {
    fontMode: "game",
    sizeMode: "custom",
    fontSize: 16,
  });
  prefs.write({ fontSize: 1000 });
  assert.equal(prefs.read().fontSize, 40);
  prefs.write({ fontSize: 1 });
  assert.equal(prefs.read().fontSize, 12);
  const style = messageLogStyle("not json", prefs.read());
  assert.equal(style.fontSize, "12px");
  assert.equal(style.background, undefined);
  assert.doesNotThrow(() =>
    createMessageLogPreferences({
      getItem() {
        throw Error("no storage");
      },
      setItem() {},
    }),
  );
});
