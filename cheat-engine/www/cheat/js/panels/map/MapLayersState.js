import { getFeatureRuntime } from "../../runtime/FeatureRuntime.js";
import { MAP_LAYER_DEFAULTS } from "../../runtime/MapLayers.js";
export function readMapLayers() {
  const runtime = getFeatureRuntime();
  return runtime && runtime.mapLayers
    ? runtime.mapLayers.read()
    : Object.assign({}, MAP_LAYER_DEFAULTS);
}
export function writeMapLayer(key, value) {
  const runtime = getFeatureRuntime();
  if (runtime && runtime.mapLayers) runtime.mapLayers.write(key, value);
}
export function resetMapLayers() {
  const runtime = getFeatureRuntime();
  if (runtime && runtime.mapLayers) runtime.mapLayers.reset();
}
