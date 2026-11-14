import test from "node:test";
import assert from "node:assert/strict";

const load = () =>
  import("../../cheat-engine/www/cheat/js/storage/SettingsProfile.js");
const runtime = () =>
  import("../../cheat-engine/www/cheat/js/runtime/GameOptions.js");
function setup(preferences) {
  const data = new Map([
    ["cheatModal.windowOpacity", "0.45"],
    ["cheatModal.themeDarkMode", "false"],
    ["cheatModal.themePrimaryColor", "#1976D2"],
    ["locks", "secret"],
    ["history", "dialogue"],
    ["apiKey", "private"],
  ]);
  const storage = {
    getItem: (key) => data.get(key),
    setItem: (key, value) => data.set(key, value),
  };
  const game = { ConfigManager: { alwaysDash: false, save() {} } };
  return { data, storage, game, preferences };
}

test("roundtrips only bounded primitive profile fields", async () => {
  const { encodeSettingsProfile, parseSettingsProfile } = await load();
  const text = encodeSettingsProfile({
    options: { alwaysDash: true, pluginNumber: 2 },
    appearance: {
      windowOpacity: 0.5,
      isDarkMode: false,
      primaryColor: "#F44336",
    },
    shortcuts: { toggleCheatModal: "ctrl c" },
  });
  assert.deepEqual(parseSettingsProfile(text), {
    version: 1,
    options: { alwaysDash: true, pluginNumber: 2 },
    appearance: {
      windowOpacity: 0.5,
      isDarkMode: false,
      primaryColor: "#F44336",
    },
    shortcuts: { toggleCheatModal: "ctrl c" },
  });
});

test("rejects malformed versions, arbitrary sections, executable fields, poisoned keys, and wrong primitive types", async () => {
  const { parseSettingsProfile, encodeSettingsProfile } = await load();
  const bad = [
    "null",
    "[]",
    "{}",
    '{"version":2}',
    '{"version":1,"locks":{}}',
    '{"version":1,"__proto__":{"polluted":true}}',
    '{"version":1,"options":{"__proto__":false}}',
    '{"version":1,"options":{"constructor":true}}',
    '{"version":1,"options":{"save":true}}',
    '{"version":1,"options":{"x.y":true}}',
    '{"version":1,"options":{"alwaysDash":{}}}',
    '{"version":1,"options":{"alwaysDash":"true"}}',
    '{"version":1,"options":{"x":1e999}}',
    '{"version":1,"appearance":{"windowOpacity":0}}',
    '{"version":1,"appearance":{"windowOpacity":"0.5"}}',
    '{"version":1,"appearance":{"isDarkMode":"true"}}',
    '{"version":1,"appearance":{"primaryColor":"url(javascript:alert(1))"}}',
    '{"version":1,"appearance":{"apiKey":"secret"}}',
    '{"version":1,"shortcuts":{"runCode":"ctrl c"}}',
    '{"version":1,"shortcuts":{"toggleCheatModal":""}}',
    '{"version":1,"shortcuts":{"toggleCheatModal":"ctrl madeup"}}',
    '{"version":1,"shortcuts":{"quickSave":{"shortcut":"ctrl s","param":{"slot":5}}}}',
    '{"version":1,"shortcuts":{"quickSave":"ctrl ctrl s"}}',
  ];
  for (const text of bad)
    assert.throws(() => parseSettingsProfile(text), undefined, text);
  assert.throws(() => encodeSettingsProfile({ options: { x: NaN } }));
  assert.equal({}.polluted, undefined);
});

test("enforces 1 MiB UTF-8 limit before parsing, including multi-byte labels", async () => {
  const { parseSettingsProfile } = await load();
  assert.throws(
    () => parseSettingsProfile(" ".repeat(1048577)),
    /size|large|MiB/i,
  );
  assert.throws(
    () =>
      parseSettingsProfile(
        " ".repeat(1048500) + '"' + "\u20ac".repeat(40) + '"',
      ),
    /size|large|MiB/i,
  );
});

test("exports only explicit valid appearance preferences and imports through existing storage keys", async () => {
  const { createGameOptions } = await runtime();
  const { game, storage, data } = setup();
  const options = createGameOptions(game, storage);
  const profile = JSON.parse(options.exportProfile());
  assert.deepEqual(profile.appearance, {
    windowOpacity: 0.45,
    isDarkMode: false,
    primaryColor: "#1976D2",
  });
  assert.deepEqual(profile.options, {});
  assert.equal(options.exportProfile().includes("secret"), false);
  const text =
    '{"version":1,"appearance":{"windowOpacity":0.7,"isDarkMode":true,"primaryColor":"#F44336"}}';
  assert.equal(options.previewProfile(text).changes.length, 3);
  assert.equal(data.get("cheatModal.windowOpacity"), "0.45");
  assert.equal(options.importProfile(text).applied.length, 3);
  assert.equal(data.get("cheatModal.windowOpacity"), "0.7");
  assert.equal(data.get("cheatModal.themeDarkMode"), "true");
  assert.equal(data.get("locks"), "secret");
  data.set("cheatModal.windowOpacity", "NaN");
  data.set("cheatModal.themePrimaryColor", "red;alert(1)");
  assert.deepEqual(JSON.parse(options.exportProfile()).appearance, {
    isDarkMode: true,
  });
});

test("optional shortcut adapter validates conflicts against untouched bindings and never transfers parameters", async () => {
  const { createGameOptions } = await runtime();
  let bindings = {
    toggleCheatModal: "ctrl c",
    quickSave: "ctrl s",
    quickLoad: "ctrl q",
  };
  let writes = 0;
  const dependencies = {
    shortcuts: {
      read: () => ({ ...bindings }),
      write: (value) => {
        bindings = { ...bindings, ...value };
        writes++;
      },
    },
  };
  const { game, storage } = setup();
  const options = createGameOptions(game, storage, dependencies);
  assert.deepEqual(JSON.parse(options.exportProfile()).shortcuts, bindings);
  assert.throws(
    () =>
      options.importProfile('{"version":1,"shortcuts":{"quickSave":"ctrl q"}}'),
    /conflict/i,
  );
  assert.equal(writes, 0);
  const result = options.importProfile(
    '{"version":1,"shortcuts":{"quickSave":"alt s","quickLoad":"alt q"}}',
  );
  assert.equal(result.errors.length, 0);
  assert.equal(bindings.quickSave, "alt s");
  assert.equal(writes, 1);
  const without = createGameOptions(game, storage);
  assert.equal(
    without.previewProfile('{"version":1,"shortcuts":{"quickSave":"alt s"}}')
      .ignored.length,
    1,
  );
});
