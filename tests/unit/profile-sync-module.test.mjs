import test from "node:test";
import assert from "node:assert/strict";
import { KEY_VALUE_STORAGE } from "../../cheat-engine/www/cheat/js/storage/KeyValueStorage.js";
import {
  createProfileSyncModule,
  observeState,
} from "../../cheat-engine/www/cheat/js/ui/ProfileSyncModule.js";

function storage(t, entries = []) {
  const values = new Map(entries);
  t.mock.method(KEY_VALUE_STORAGE, "getItem", (key) => values.get(key));
  t.mock.method(KEY_VALUE_STORAGE, "setItem", (key, value) =>
    values.set(key, value),
  );
  return values;
}

/** Minimal window stub: ProfileSyncModule only needs event listeners. */
function stubWindow(t) {
  const previous = globalThis.window;
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {},
  };
  t.after(() => {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  });
  return globalThis.window;
}

function fakeVuetify() {
  return {
    theme: {
      dark: true,
      themes: { dark: { primary: "#1976D2" }, light: { primary: "#1976D2" } },
    },
  };
}

/** Vue-like observable that records the object it observed. */
function fakeVue() {
  const observed = [];
  return {
    observed,
    observable(object) {
      observed.push(object);
      return object;
    },
  };
}

function fakeRoot() {
  const attributes = {};
  return {
    style: { setProperty() {}, removeProperty() {} },
    classList: { toggle() {} },
    closest: () => null,
    setAttribute: (key, value) => {
      attributes[key] = value;
    },
    getAttribute: (key) => attributes[key],
    removeAttribute: (key) => {
      delete attributes[key];
    },
    ownerDocument: { getElementById: () => null },
  };
}

test("profile state is handed to Vue.observable so computed values invalidate", (t) => {
  stubWindow(t);
  storage(t);
  const vue = fakeVue();
  const profile = createProfileSyncModule(fakeVuetify(), fakeRoot(), { vue });

  assert.equal(vue.observed.length, 1, "state must be observed exactly once");
  assert.equal(profile.isSidebarVisible, true);
});

test("toggling the sidebar updates state and persists the new value", (t) => {
  stubWindow(t);
  const values = storage(t);
  const vue = fakeVue();
  const profile = createProfileSyncModule(fakeVuetify(), fakeRoot(), { vue });

  assert.equal(profile.toggleSidebar(), false);
  assert.equal(profile.isSidebarVisible, false);
  assert.equal(values.get("cheatModal.sidebarVisible"), "false");

  assert.equal(profile.toggleSidebar(), true);
  assert.equal(profile.isSidebarVisible, true);
  assert.equal(values.get("cheatModal.sidebarVisible"), "true");
});

test("a stored closed sidebar is restored and can be opened again", (t) => {
  stubWindow(t);
  storage(t, [["cheatModal.sidebarVisible", "false"]]);
  const profile = createProfileSyncModule(fakeVuetify(), fakeRoot(), {
    vue: fakeVue(),
  });

  assert.equal(profile.isSidebarVisible, false);
  profile.toggleSidebar();
  assert.equal(profile.isSidebarVisible, true);
});

test("observeState falls back to the plain object when Vue is unavailable", () => {
  const state = { isSidebarVisible: true };
  assert.equal(observeState(state, null), state);
  assert.equal(observeState(state, {}), state);
});

test("observeState keeps working when Vue.observable throws", () => {
  const state = { isSidebarVisible: true };
  const vue = {
    observable() {
      throw new Error("unsupported");
    },
  };
  assert.equal(observeState(state, vue), state);
});

test("hover opacity reads the live window opacity value", (t) => {
  stubWindow(t);
  storage(t, [["cheatModal.windowOpacity", "0.5"]]);
  const profile = createProfileSyncModule(fakeVuetify(), fakeRoot(), {
    vue: fakeVue(),
  });

  assert.equal(profile.getEffectiveOpacity(false), 0.5);
  assert.equal(profile.getEffectiveOpacity(true), 1);
  profile.setWindowOpacity(0.8);
  assert.equal(profile.getEffectiveOpacity(false), 0.8);
});
