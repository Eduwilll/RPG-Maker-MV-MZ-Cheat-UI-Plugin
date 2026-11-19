import { MAP_LAYER_DEFAULTS } from "../../runtime/MapLayers.js";
import { getFeatureRuntime } from "../../runtime/FeatureRuntime.js";

/**
 * @param {any} [runtime] the feature runtime; defaults to the locator
 */
export function readMapLayers(runtime = getFeatureRuntime()) {
  return runtime && runtime.mapLayers
    ? runtime.mapLayers.read()
    : Object.assign({}, MAP_LAYER_DEFAULTS);
}
export function writeMapLayer(key, value, runtime = getFeatureRuntime()) {
  if (runtime && runtime.mapLayers) runtime.mapLayers.write(key, value);
}
export function resetMapLayers(runtime = getFeatureRuntime()) {
  if (runtime && runtime.mapLayers) runtime.mapLayers.reset();
}
