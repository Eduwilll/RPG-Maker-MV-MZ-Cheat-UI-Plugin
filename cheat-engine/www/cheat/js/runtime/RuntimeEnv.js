// @ts-check

/**
 * @returns {boolean}
 */
export function isDesktopRuntime() {
  return Utils.isNwjs();
}

/**
 * @returns {boolean}
 */
export function isMvProject() {
  return Utils.RPGMAKER_NAME === "MV";
}

/**
 * Returns the game root relative to the injected cheat runtime.
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
