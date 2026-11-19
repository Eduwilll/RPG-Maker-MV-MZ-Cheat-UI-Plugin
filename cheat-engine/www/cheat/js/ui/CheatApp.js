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
 * Vue 2 resolves `provide` when each component instance is created, and a
 * function-style provider is called at that moment. That matters here because
 * the runtime does not exist when `createCheatApp` runs: `MainComponent`'s
 * `created()` hook installs it through `customizeRPGMakerFunctions`. A lazy
 * provider lets the first panel that mounts resolve the live object instead of
 * a stale `null`.
 *
 * @param {() => any} resolveRuntime
 * @returns {() => Record<string, any>}
 */
export function createFeatureRuntimeProvide(resolveRuntime) {
  return () => ({ cheatRuntime: resolveRuntime() });
}

/**
 * Create the root Vue instance without mounting it.
 *
 * `Vue` and `Vuetify` are parameters because the overlay imports the vendored
 * builds for their side effects while the pop-out reads them from the host
 * page. Tests pass plain constructors.
 *
 * `provide` injects the feature runtime. It is registered as a mixin on the
 * Vue constructor, so every component created from it can read
 * `this.cheatRuntime` without declaring anything and without the panels being
 * re-registered globally. That is the Vue 2 equivalent of a root `provide`:
 * options merging starts at the root, but a mixin reaches components nested
 * inside `CheatModal`'s panel registry.
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

  if (typeof settings.resolveRuntime === "function") {
    Vue.mixin({
      provide: createFeatureRuntimeProvide(settings.resolveRuntime),
    });
  }

  return new Vue({
    ...options,
    vuetify: new Vuetify({ theme: createVuetifyTheme() }),
    components: { ...components, ...(options.components || {}) },
  });
}
