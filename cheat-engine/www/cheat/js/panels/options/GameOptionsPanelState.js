import { getFeatureRuntime } from "../../runtime/FeatureRuntime.js";
export function readGameOptionsState() {
  const runtime = getFeatureRuntime();
  return runtime ? runtime.options.list() : [];
}
