// @ts-check

/**
 * Shared Vue shell for every cheat surface.
 *
 * The overlay mounts `MainComponent` and the separate window mounts
 * `CheatModal` directly, but both need the same Vuetify instance, theme and
 * root-level options. Owning that here means a new surface (or a root-level
 * `provide`) cannot drift between the two entry points.
 */

import { createVuetifyTheme } from "./CheatTheme.js";

/**
 * Build the `provide` object for the feature runtime.
 *
 * The root exists before MainComponent installs the runtime. Vue 2.7 preserves
 * provider property descriptors, so a getter lets descendants resolve it when
 * they inject it, without observing live game objects or providing it again at
 * every component. Explicit root/subtree providers can still override it.
 *
 * @param {() => any} resolveRuntime
 * @param {Record<string, any> | ((this: any) => Record<string, any>)} [extraProvide]
 * @returns {() => Record<string, any>}
 */
export function createFeatureRuntimeProvide(resolveRuntime, extraProvide) {
  return function () {
    const provided = {
      ...(typeof extraProvide === "function"
        ? extraProvide.call(this)
        : extraProvide),
    };
    if (!Object.prototype.hasOwnProperty.call(provided, "cheatRuntime")) {
      Object.defineProperty(provided, "cheatRuntime", {
        enumerable: true,
        get: resolveRuntime,
      });
    }
    return provided;
  };
}

/**
 * Create the root Vue instance without mounting it.
 *
 * `Vue` and `Vuetify` are parameters because the overlay imports the vendored
 * builds for their side effects while the pop-out reads them from the host
 * page. Tests pass plain constructors.
 *
 * The runtime is provided only at this root. Consumers declare `inject`, and
 * independent roots sharing the same Vue constructor remain isolated.
 *
 * @param {object} settings
 * @param {any} settings.Vue Vue constructor from the host page
 * @param {any} settings.Vuetify Vuetify constructor from the host page
 * @param {Record<string, any>} [settings.components] root component registry
 * @param {Record<string, any>} [settings.options] extra root options
 *   (`el`, `data`, lifecycle hooks). `vuetify` and `components` are owned here.
 * @param {() => any} [settings.resolveRuntime] lazy feature runtime provider
 * @returns {any} the unmounted Vue instance
 */
export function createCheatApp(settings) {
  const Vue = settings.Vue;
  const Vuetify = settings.Vuetify;
  const components = settings.components || {};
  const options = settings.options || {};

  /** @type {Record<string, any>} */
  const appOptions = {
    ...options,
    vuetify: new Vuetify({ theme: createVuetifyTheme() }),
    components: { ...components, ...(options.components || {}) },
  };
  if (typeof settings.resolveRuntime === "function") {
    appOptions.beforeCreate = [].concat(
      options.beforeCreate || [],
      function () {
        // Wrap after Vue merges mixins: its provide merge eagerly reads getters.
        this.$options.provide = createFeatureRuntimeProvide(
          settings.resolveRuntime,
          this.$options.provide,
        );
      },
    );
  }
  return new Vue(appOptions);
}
