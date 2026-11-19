import { MESSAGE_LOG_DEFAULTS } from "./MessageLogPreferences.js";
import { getFeatureRuntime } from "../../runtime/FeatureRuntime.js";

/**
 * The runtime is an explicit parameter so panels and tests can pass the one
 * they hold (`this.cheatRuntime`) instead of reading `window.__cheatFeatures`.
 * Omitting it keeps the locator as the fallback, which is what the pop-out and
 * preview rely on.
 *
 * @param {any} [runtime]
 */
export function readMessageLog(query, runtime = getFeatureRuntime()) {
  return runtime ? runtime.history.list(query) : [];
}
export function readMessageLogPreferences(runtime = getFeatureRuntime()) {
  return runtime && runtime.messageLogPreferences
    ? runtime.messageLogPreferences.read()
    : Object.assign({}, MESSAGE_LOG_DEFAULTS);
}
export function messageLogPreferenceRevision(runtime = getFeatureRuntime()) {
  return runtime && runtime.messageLogPreferences
    ? runtime.messageLogPreferences.revision()
    : 0;
}
export function writeMessageLogPreferences(
  patch,
  runtime = getFeatureRuntime(),
) {
  if (runtime && runtime.messageLogPreferences)
    runtime.messageLogPreferences.write(patch);
}
export function resetMessageLogPreferences(runtime = getFeatureRuntime()) {
  if (runtime && runtime.messageLogPreferences)
    runtime.messageLogPreferences.reset();
}
