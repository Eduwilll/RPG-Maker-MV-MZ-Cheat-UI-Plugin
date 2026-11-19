import { getFeatureRuntime } from "../../runtime/FeatureRuntime.js";

/** @param {any} [runtime] the feature runtime; defaults to the locator */
export function readGameOptionsState(runtime = getFeatureRuntime()) {
  return runtime ? runtime.options.list() : [];
}
