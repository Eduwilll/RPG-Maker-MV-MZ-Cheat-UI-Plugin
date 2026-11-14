import test from "node:test";
import assert from "node:assert/strict";

const load = () =>
  import("../../cheat-engine/www/cheat/js/ui/FeatureCatalog.js");

test("catalog covers existing panels, new routes, and stable setting anchors", async () => {
  const { createFeatureCatalog, findFeature } = await load();
  const entries = createFeatureCatalog();
  for (const panel of [
    "general-panel",
    "actor-setting-panel",
    "health-setting-panel",
    "stats-setting-panel",
    "item-setting-panel",
    "weapon-setting-panel",
    "armor-setting-panel",
    "variable-setting-panel",
    "switch-setting-panel",
    "watcher-panel",
    "save-recall-panel",
    "map-event-panel",
    "event-analyzer-panel",
    "teleport-panel",
    "shortcut-panel",
    "appearance-panel",
    "translate-settings-panel",
    "about-panel",
    "enemy-editor-panel",
    "skill-editor-panel",
    "class-editor-panel",
    "message-log-panel",
    "locks-panel",
    "game-options-panel",
  ]) {
    assert.ok(
      entries.some((entry) => entry.panel === panel && entry.type === "panel"),
      panel,
    );
  }
  assert.equal(new Set(entries.map((entry) => entry.id)).size, entries.length);
  assert.equal(findFeature("gold", entries).anchor, "gold");
  assert.equal(findFeature("enemy-editor", entries).kind, "enemy");
  assert.equal(
    findFeature("floating-minimap", entries).panel,
    "map-event-panel",
  );
  assert.equal(
    findFeature("floating-minimap", entries).anchor,
    "floating-minimap",
  );
  assert.equal(findFeature("unknown", entries), null);
});

test("search ranks exact labels before prefixes, keywords and descriptions", async () => {
  const { searchFeatures } = await load();
  const rows = [
    {
      id: "description",
      label: "Economy",
      description: "Change gold",
      panel: "a",
    },
    { id: "keyword", label: "Currency", keywords: "gold money", panel: "b" },
    { id: "prefix", label: "Gold locks", panel: "c" },
    { id: "exact", label: "Gold", panel: "d" },
  ];
  assert.deepEqual(
    searchFeatures(" GOLD ", rows).map((row) => row.id),
    ["exact", "prefix", "keyword", "description"],
  );
  assert.deepEqual(
    searchFeatures("change economy", rows).map((row) => row.id),
    ["description"],
  );
  assert.deepEqual(searchFeatures("not a feature", rows), []);
  assert.deepEqual(
    searchFeatures("", rows, 2).map((row) => row.id),
    ["description", "keyword"],
  );
  assert.equal(searchFeatures("", Array(200).fill(rows[0]), 9999).length, 50);
  assert.equal(searchFeatures("", rows, 0).length, 0);
});

test("configured shortcut labels are live inputs, detached and searchable", async () => {
  const { createFeatureCatalog, searchFeatures, findFeature } = await load();
  const settings = {
    quickSave: {
      shortcut: {
        asString() {
          return "alt k";
        },
      },
    },
    openFeatureFinder: { shortcut: "ctrl p" },
  };
  const config = {
    quickSave: {
      name: "Quick save",
      desc: "Save to configured slot",
      enterAction() {},
    },
    openFeatureFinder: { name: "Feature Finder" },
  };
  const entries = createFeatureCatalog(settings, config);
  const result = searchFeatures("ALT+K", entries)[0];
  assert.equal(result.id, "shortcut-quickSave");
  assert.equal(result.shortcut, "alt k");
  assert.equal(result.panel, "shortcut-panel");
  assert.equal(result.anchor, "shortcut-quickSave");
  assert.equal(result.enterAction, undefined);
  result.label = "changed";
  assert.equal(config.quickSave.name, "Quick save");
  settings.quickSave.shortcut = "ctrl j";
  assert.equal(
    findFeature("shortcut-quickSave", createFeatureCatalog(settings, config))
      .shortcut,
    "ctrl j",
  );
  assert.equal(
    searchFeatures("ALT+K", createFeatureCatalog(settings, config)).length,
    0,
  );
  assert.equal(
    createFeatureCatalog({}, config).find(
      (entry) => entry.id === "shortcut-quickSave",
    ).shortcut,
    "",
  );
});

test("catalog snapshots and finder results do not mutate the shared catalog", async () => {
  const { createFeatureCatalog, searchFeatures } = await load();
  const entries = createFeatureCatalog();
  searchFeatures("gold", entries)[0].label = "changed";
  assert.equal(searchFeatures("gold", entries)[0].label, "Gold");
  entries[0].label = "changed";
  assert.notEqual(createFeatureCatalog()[0].label, "changed");
});

test("finder v-model and keyboard actions are bounded and emit only navigation", async () => {
  const { default: component } =
    await import("../../cheat-engine/www/cheat/components/FeatureFinder.js");
  const emitted = [];
  const vm = Object.assign(component.data(), {
    value: true,
    results: [
      { id: "one", panel: "general-panel", anchor: "gold" },
      { id: "two", panel: "message-log-panel" },
    ],
    $emit: (...args) => emitted.push(args),
    $nextTick: (callback) => callback(),
    $refs: {},
  });
  for (const name of Object.keys(component.methods))
    vm[name] = component.methods[name].bind(vm);
  const press = (key) =>
    vm.onKeyDown({
      key,
      preventDefault() {},
      stopPropagation() {},
      stopImmediatePropagation() {},
    });
  press("ArrowUp");
  assert.equal(vm.selectedIndex, 1);
  press("ArrowDown");
  assert.equal(vm.selectedIndex, 0);
  press("Enter");
  assert.deepEqual(emitted, [
    ["navigate", vm.results[0]],
    ["input", false],
  ]);
  emitted.length = 0;
  press("Escape");
  assert.deepEqual(emitted, [["input", false]]);
  vm.results = [];
  press("Enter");
  assert.equal(emitted.length, 1);
});
