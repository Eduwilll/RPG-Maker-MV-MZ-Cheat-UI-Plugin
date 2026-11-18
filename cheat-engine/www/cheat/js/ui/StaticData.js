// @ts-check

/**
 * Freeze shipped, read-only configuration before it is placed in a component's
 * data(). Vue 2 skips observing frozen objects, so shared table headers and
 * lookup tables do not get an observer per panel instance.
 *
 * Never pass live RPG Maker game objects here: freezing them would break the
 * engine. Use only for static UI data.
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  Object.keys(value).forEach(function (key) {
    deepFreeze(value[key]);
  });

  return Object.freeze(value);
}
