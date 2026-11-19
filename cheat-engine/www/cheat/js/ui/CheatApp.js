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
 * Create the root Vue instance without mounting it.
 *
 * `Vue` and `Vuetify` are parameters because the overlay imports the vendored
 * builds for their side effects while the pop-out reads them from the host
 * page. Tests pass plain constructors.
 *
 * @param {object} settings
 * @param {any} settings.Vue Vue constructor from the host page
 * @param {any} settings.Vuetify Vuetify constructor from the host page
 * @param {Record<string, any>} [settings.components] root component registry
 * @param {Record<string, any>} [settings.options] extra root options
 *   (`el`, `data`, lifecycle hooks). `vuetify` and `components` are owned here.
 * @returns {any} the unmounted Vue instance
 */
export function createCheatApp(settings) {
  const Vue = settings.Vue;
  const Vuetify = settings.Vuetify;
  const components = settings.components || {};
  const options = settings.options || {};

  return new Vue({
    ...options,
    vuetify: new Vuetify({ theme: createVuetifyTheme() }),
    components: { ...components, ...(options.components || {}) },
  });
}
