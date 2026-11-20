import test from "node:test";
import assert from "node:assert/strict";
import { loadVue } from "../helpers/vue.mjs";
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

test("the provider exposes the runtime to consumers", () => {
  const runtime = { database: {} };
  const provide = createFeatureRuntimeProvide(() => runtime);

  assert.deepEqual(provide(), { cheatRuntime: runtime });
});

test("the provider is lazy, so a runtime built after app creation is seen", () => {
  // MainComponent's created() hook installs the runtime after createCheatApp
  // has already run, so the provider must not capture a value eagerly.
  let runtime = null;
  const provide = createFeatureRuntimeProvide(() => runtime);
  const provided = provide();

  assert.equal(provided.cheatRuntime, null);

  runtime = { database: {} };
  assert.equal(provided.cheatRuntime, runtime);
});

test("no mixin is registered without resolveRuntime", () => {
  const { calls, Vue, Vuetify } = makeHarness();

  createCheatApp({ Vue, Vuetify });

  assert.equal(calls.mixins.length, 0);
});

test("nested components inherit an explicit root runtime override", (t) => {
  const Vue = loadVue();
  const supplied = { name: "supplied" };
  const root = createCheatApp({
    Vue,
    Vuetify: class {},
    resolveRuntime: () => ({ name: "global" }),
    options: { provide: { cheatRuntime: supplied, extra: "kept" } },
  });
  t.after(() => root.$destroy());
  const middle = new Vue({ parent: root });
  const leaf = new Vue({ parent: middle, inject: ["cheatRuntime", "extra"] });

  assert.equal(leaf.cheatRuntime, supplied);
  assert.equal(leaf.extra, "kept");
  assert.equal(Object.hasOwn(supplied, "__ob__"), false);
});

test("a subtree runtime override reaches its nested consumers", (t) => {
  const Vue = loadVue();
  const supplied = { name: "subtree" };
  const root = createCheatApp({
    Vue,
    Vuetify: class {},
    resolveRuntime: () => ({ name: "root" }),
  });
  t.after(() => root.$destroy());
  const subtree = new Vue({
    parent: root,
    provide: { cheatRuntime: supplied },
  });
  const middle = new Vue({ parent: subtree });
  const leaf = new Vue({ parent: middle, inject: ["cheatRuntime"] });

  assert.equal(leaf.cheatRuntime, supplied);
});

test("each app keeps its own runtime on a shared Vue constructor", (t) => {
  const Vue = loadVue();
  const firstRuntime = { name: "first" };
  const secondRuntime = { name: "second" };
  const first = createCheatApp({
    Vue,
    Vuetify: class {},
    resolveRuntime: () => firstRuntime,
  });
  const second = createCheatApp({
    Vue,
    Vuetify: class {},
    resolveRuntime: () => secondRuntime,
  });
  const unrelated = new Vue();
  t.after(() => {
    first.$destroy();
    second.$destroy();
    unrelated.$destroy();
  });

  const firstChild = new Vue({ parent: first, inject: ["cheatRuntime"] });
  const secondChild = new Vue({ parent: second, inject: ["cheatRuntime"] });
  const unrelatedChild = new Vue({
    parent: unrelated,
    inject: { cheatRuntime: { default: null } },
  });
  assert.equal(firstChild.cheatRuntime, firstRuntime);
  assert.equal(secondChild.cheatRuntime, secondRuntime);
  assert.equal(unrelatedChild.cheatRuntime, null);
});

test("panels receive a runtime installed by MainComponent after root creation", (t) => {
  const Vue = loadVue();
  let runtime = null;
  const root = createCheatApp({
    Vue,
    Vuetify: class {},
    resolveRuntime: () => runtime,
    options: {
      data: () => ({ label: "root option" }),
      provide() {
        return { label: this.label };
      },
    },
  });
  t.after(() => root.$destroy());
  const main = new Vue({
    parent: root,
    created() {
      runtime = { name: "installed during startup" };
    },
  });
  const shell = new Vue({ parent: main });
  const panel = new Vue({ parent: shell, inject: ["cheatRuntime", "label"] });

  assert.equal(panel.cheatRuntime, runtime);
  assert.equal(panel.label, "root option");
  assert.equal(Object.hasOwn(runtime, "__ob__"), false);
});

test("root mixin providers do not freeze the runtime before MainComponent starts", (t) => {
  const Vue = loadVue();
  let runtime = null;
  const root = createCheatApp({
    Vue,
    Vuetify: class {},
    resolveRuntime: () => runtime,
    options: {
      data: () => ({ label: "root" }),
      mixins: [{ provide: () => ({ otherDependency: 123 }) }],
      beforeCreate() {
        this.originalHookRan = true;
      },
      provide() {
        return { label: this.label };
      },
    },
  });
  t.after(() => root.$destroy());
  const main = new Vue({
    parent: root,
    created() {
      runtime = { name: "ready" };
    },
  });
  const shell = new Vue({ parent: main });
  const panel = new Vue({
    parent: shell,
    inject: ["cheatRuntime", "otherDependency", "label"],
  });

  assert.equal(panel.cheatRuntime, runtime);
  assert.equal(panel.otherDependency, 123);
  assert.equal(panel.label, "root");
  assert.equal(root.originalHookRan, true);
});
