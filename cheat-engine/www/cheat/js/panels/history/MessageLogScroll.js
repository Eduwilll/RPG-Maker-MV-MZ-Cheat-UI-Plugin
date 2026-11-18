// @ts-check

/**
 * MessageLogScroll - owns where the dialogue log is scrolled.
 *
 * Two behaviours live here so the panel stays a thin view:
 *  - "follow latest" chat pinning (only while the reader is at the bottom)
 *  - remembering the reading position across panel switches, because the
 *    shell destroys and recreates panels when the nav changes
 */

const DEFAULT_THRESHOLD = 32;

/**
 * @typedef {{ scrollTop: number, clientHeight: number, scrollHeight: number }} ScrollMetrics
 * @typedef {{ scrollTop: number, followLatest: boolean, known: boolean }} ViewState
 */

/** @type {ViewState} */
let viewState = { scrollTop: 0, followLatest: true, known: false };

/**
 * True when the container is within `threshold` px of the bottom.
 * @param {ScrollMetrics} metrics
 * @param {number} [threshold]
 * @returns {boolean}
 */
export function isNearBottom(metrics, threshold = DEFAULT_THRESHOLD) {
  if (!metrics) return true;
  const scrollTop = Number(metrics.scrollTop) || 0;
  const clientHeight = Number(metrics.clientHeight) || 0;
  const scrollHeight = Number(metrics.scrollHeight) || 0;
  const maxScroll = scrollHeight - clientHeight;
  if (maxScroll <= 0) return true;
  return maxScroll - scrollTop <= threshold;
}

/**
 * @param {ScrollMetrics} metrics
 * @param {number} [threshold]
 * @returns {number} scrollTop that puts the newest entry in view
 */
export function bottomScrollTop(metrics, threshold = DEFAULT_THRESHOLD) {
  if (!metrics) return 0;
  const scrollHeight = Number(metrics.scrollHeight) || 0;
  const clientHeight = Number(metrics.clientHeight) || 0;
  return Math.max(0, scrollHeight - clientHeight - Math.min(threshold, 0));
}

/**
 * @returns {ViewState}
 */
export function readMessageLogViewState() {
  return { ...viewState };
}

/**
 * @param {Partial<ViewState>} patch
 * @returns {ViewState}
 */
export function writeMessageLogViewState(patch) {
  viewState = { ...viewState, ...patch, known: true };
  return { ...viewState };
}

/**
 * Record the live scroll offset and whether the reader follows the tail.
 * @param {ScrollMetrics} metrics
 * @param {number} [threshold]
 * @returns {ViewState}
 */
export function recordMessageLogScroll(metrics, threshold = DEFAULT_THRESHOLD) {
  return writeMessageLogViewState({
    scrollTop: Math.max(0, Number(metrics && metrics.scrollTop) || 0),
    followLatest: isNearBottom(metrics, threshold),
  });
}

/**
 * @returns {void}
 */
export function resetMessageLogViewState() {
  viewState = { scrollTop: 0, followLatest: true, known: false };
}

/**
 * Decide the scrollTop to apply after the rows render.
 *
 * @param {ViewState} state
 * @param {ScrollMetrics} metrics
 * @param {number} [threshold]
 * @returns {number}
 */
export function resolveMessageLogScrollTop(
  state,
  metrics,
  threshold = DEFAULT_THRESHOLD,
) {
  if (!state || !state.known || state.followLatest) {
    return bottomScrollTop(metrics, threshold);
  }
  return Math.max(0, Number(state.scrollTop) || 0);
}
