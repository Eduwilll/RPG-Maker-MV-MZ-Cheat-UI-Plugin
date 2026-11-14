import { getFeatureRuntime } from "../../runtime/FeatureRuntime.js";
import { MESSAGE_LOG_DEFAULTS } from "./MessageLogPreferences.js";
export function readMessageLog(query) {
  const runtime = getFeatureRuntime();
  return runtime ? runtime.history.list(query) : [];
}
export function readMessageLogPreferences() {
  const runtime = getFeatureRuntime();
  return runtime && runtime.messageLogPreferences
    ? runtime.messageLogPreferences.read()
    : Object.assign({}, MESSAGE_LOG_DEFAULTS);
}
export function messageLogPreferenceRevision() {
  const runtime = getFeatureRuntime();
  return runtime && runtime.messageLogPreferences
    ? runtime.messageLogPreferences.revision()
    : 0;
}
export function writeMessageLogPreferences(patch) {
  const runtime = getFeatureRuntime();
  if (runtime && runtime.messageLogPreferences)
    runtime.messageLogPreferences.write(patch);
}
export function resetMessageLogPreferences() {
  const runtime = getFeatureRuntime();
  if (runtime && runtime.messageLogPreferences)
    runtime.messageLogPreferences.reset();
}
