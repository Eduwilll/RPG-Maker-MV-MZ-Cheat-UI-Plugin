import test from "node:test";
import assert from "node:assert/strict";
import {
  createCheatApp,
  createFeatureRuntimeProvide,
} from "../../cheat-engine/www/cheat/js/ui/CheatApp.js";

function makeHarness() {
  const calls = { Vue: [], Vuetify: [], mixins: [] };

  class Vue {
    constructor(options) {
      calls.Vue.push(options);
    }
  }

  Vue.mixin = (mixin) => calls.mixins.push(mixin);

  class Vuetify {
    constructor(options) {
      calls.Vuetify.push(options);
    }
  }

  return { calls, Vue, Vuetify };
}

test("the root instance receives the shared Vuetify theme", () => {
  const { calls, Vue, Vuetify } = makeHarness();
  createCheatApp({ Vue, Vuetify });

  assert.equal(calls.Vuetify.length, 1);
  const theme = calls.Vuetify[0].theme;
  assert.ok(theme.themes.dark, "a dark theme is configured");
  assert.ok(theme.themes.light, "a light theme is configured");
  assert.ok(
    theme.themes.dark.primary,
    "the primary color comes from the shared palette",
  );
});

test("components are merged onto the root", () => {
  const { calls, Vue, Vuetify } = makeHarness();
  const CheatModal = { name: "CheatModal" };

  createCheatApp({ Vue, Vuetify, components: { CheatModal } });

  assert.equal(calls.Vue[0].components.CheatModal, CheatModal);
});

test("extra root options survive, including lifecycle hooks", () => {
  const { calls, Vue, Vuetify } = makeHarness();
  const mounted = () => {};

  createCheatApp({ Vue, Vuetify, options: { el: "#app", mounted } });

  assert.equal(calls.Vue[0].el, "#app");
  assert.equal(calls.Vue[0].mounted, mounted);
});

test("the factory cannot override the theme it owns", () => {
  const { calls, Vue, Vuetify } = makeHarness();
  const bogusVuetify = { bogus: true };

  createCheatApp({
    Vue,
    Vuetify,
    options: { vuetify: bogusVuetify, components: { Extra: {} } },
  });

  assert.notEqual(calls.Vue[0].vuetify, bogusVuetify);
  assert.equal(
    calls.Vuetify.length,
    1,
    "the factory still created its own Vuetify",
  );
  assert.ok(calls.Vuetify[0].theme.themes.dark, "the theme was passed in");
  assert.ok(calls.Vue[0].components.Extra, "extra components are kept");
});

test("the overlay and the pop-out share the same theme source", () => {
  // The two entry points pass different component maps; only the theme and
  // component merging differ, so the shell cannot drift.
  const overlayHarness = makeHarness();
  const popupHarness = makeHarness();

  createCheatApp({
    Vue: overlayHarness.Vue,
    Vuetify: overlayHarness.Vuetify,
    components: { MainComponent: {} },
  });
  createCheatApp({
    Vue: popupHarness.Vue,
    Vuetify: popupHarness.Vuetify,
    components: { CheatModal: {} },
  });

  assert.deepEqual(
    overlayHarness.calls.Vuetify[0].theme,
    popupHarness.calls.Vuetify[0].theme,
  );
});

test("resolveRuntime registers a provider mixin on the Vue constructor", () => {
  const { calls, Vue, Vuetify } = makeHarness();

  createCheatApp({ Vue, Vuetify, resolveRuntime: () => "runtime" });

  assert.equal(calls.mixins.length, 1);
  assert.equal(typeof calls.mixins[0].provide, "function");
});

test("the provider resolves the runtime when a component is created", () => {
  const runtime = { database: {} };
  const provide = createFeatureRuntimeProvide(() => runtime);

  assert.deepEqual(provide(), { cheatRuntime: runtime });
});

test("the provider is lazy, so a runtime built after app creation is seen", () => {
  // MainComponent's created() hook installs the runtime after createCheatApp
  // has already run, so the provider must not capture a value eagerly.
  let runtime = null;
  const provide = createFeatureRuntimeProvide(() => runtime);

  assert.deepEqual(provide(), { cheatRuntime: null });

  runtime = { database: {} };
  assert.deepEqual(provide(), { cheatRuntime: runtime });
});

test("no mixin is registered without resolveRuntime", () => {
  const { calls, Vue, Vuetify } = makeHarness();

  createCheatApp({ Vue, Vuetify });

  assert.equal(calls.mixins.length, 0);
});