import test from "node:test";
import assert from "node:assert/strict";
import { loadVue } from "../helpers/vue.mjs";

async function createShell(t, panel, isWindow = false) {
  const Vue = loadVue();
  const errors = [];
  Vue.config.errorHandler = (error) => errors.push(error);
  const view = Object.assign(new EventTarget(), {
    Vue,
    innerWidth: 1000,
    innerHeight: 800,
  });
  const globals = {
    window: view,
    Utils: { RPGMAKER_NAME: "MV", isNwjs: () => false },
    localStorage: { getItem: () => null, setItem() {} },
    setInterval: () => 0,
    clearInterval() {},
  };
  const previous = Object.keys(globals).map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key),
  ]);
  let shell;
  t.after(() => {
    try {
      if (shell) shell.$destroy();
      assert.deepEqual(errors, [], "the shell lifecycle must not throw");
    } finally {
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    }
  });
  Object.assign(globalThis, globals);
  const { default: component } =
    await import("../../cheat-engine/www/cheat/CheatModal.js");
  shell = new Vue({
    ...component,
    propsData: { currentComponentName: panel, isWindow },
  });
  shell.$vuetify = {
    theme: { dark: true, themes: { dark: {}, light: {} } },
  };
  shell.$el = {
    style: { setProperty() {}, removeProperty() {} },
    classList: { toggle() {} },
    closest: () => null,
    setAttribute() {},
  };
  const changes = [];
  shell.$on("change", (value) => changes.push(value));
  component.mounted.call(shell);
  return { shell, changes, Vue };
}

for (const isWindow of [false, true]) {
  test(`initial minimap selection preserves the requested panel (${isWindow ? "window" : "overlay"})`, async (t) => {
    const { shell, changes } = await createShell(t, "minimap-panel", isWindow);
    assert.equal(shell.panelRegistry.getActiveComponent(), "minimap-panel");
    assert.equal(shell.navigation.getActiveItem().component, "map-event-panel");
    assert.deepEqual(changes, []);
  });
}

test("an unknown initial panel falls back to General and updates the parent", async (t) => {
  const { shell, changes } = await createShell(t, "unknown-panel");
  assert.equal(shell.panelRegistry.getActiveComponent(), "general-panel");
  assert.deepEqual(changes, ["general-panel"]);
});

test("the shell keeps database-editor props while switching to the minimap", async (t) => {
  const { shell, Vue } = await createShell(t, "enemy-editor-panel");
  assert.equal(
    shell.panelRegistry.getActiveComponent(),
    "database-editor-panel",
  );
  assert.deepEqual(shell.panelRegistry.getActiveProps(), { kind: "enemy" });

  shell.currentComponentName = "minimap-panel";
  await Vue.nextTick();
  assert.equal(shell.panelRegistry.getActiveComponent(), "minimap-panel");
  assert.deepEqual(shell.panelRegistry.getActiveProps(), {});
  assert.equal(shell.navigation.getActiveItem().component, "map-event-panel");
});
