// @ts-check

/**
 * RPG Maker publishes `Utils` once its core scripts run. The separate cheat
 * window evaluates modules before its opener globals are bridged, so fall back
 * to the document location instead of throwing.
 *
 * @returns {boolean}
 */
function isMvDocument() {
  try {
    if (typeof window === "undefined" || !window || !window.location) {
      return false;
    }
    const pathname = String(window.location.pathname || "");
    return /(^|\/)www\/cheat(\/|$)/.test(pathname);
  } catch (error) {
    return false;
  }
}

/**
 * @returns {boolean}
 */
export function isDesktopRuntime() {
  try {
    return (
      typeof Utils !== "undefined" &&
      !!Utils &&
      typeof Utils.isNwjs === "function" &&
      Utils.isNwjs()
    );
  } catch (error) {
    return false;
  }
}

/**
 * @returns {boolean}
 */
export function isMvProject() {
  try {
    if (typeof Utils !== "undefined" && Utils && Utils.RPGMAKER_NAME) {
      return Utils.RPGMAKER_NAME === "MV";
    }
  } catch (error) {
    // Fall through to the document check.
  }

  return isMvDocument();
}

/**
 * Returns the game root relative to the injected cheat runtime.
 * MV keeps its game files in www/, so settings and logs live there too.
 *
 * @returns {string}
 */
export function getGameRootDir() {
  return isMvProject() ? "www" : ".";
}

/**
 * Returns the cheat asset root relative to the game root.
 *
 * @returns {string}
 */
export function getCheatRootDir() {
  return isMvProject() ? "www/cheat/" : "cheat/";
}

/**
 * @returns {string}
 */
export function getCheatVersionFilePath() {
  return `${getGameRootDir()}/cheat-version-description.json`;
}

/**
 * @returns {string}
 */
export function getGameDataDir() {
  return `${getGameRootDir()}/data`;
}
