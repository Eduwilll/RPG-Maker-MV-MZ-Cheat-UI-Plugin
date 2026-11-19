// @ts-check

/**
 * Reads and compares the packaged cheat version.
 *
 * The version file is written by `deploy/main.py` at packaging time, so it only
 * exists in an installed game. The file system is injected instead of imported
 * because `require("fs")` is an NW.js runtime global and unit tests run in Node
 * without a game folder.
 */

/**
 * @typedef {object} VersionFileSystem
 * @property {(filePath: string, encoding: string) => string} readFileSync
 */

/**
 * Path of the version file relative to the game root.
 *
 * MV keeps the cheat under `www/`; MZ keeps it next to the engine files.
 *
 * @param {string} [rpgMakerName]
 * @returns {string}
 */
export function versionFilePath(rpgMakerName) {
  const root = rpgMakerName === "MV" ? "www" : ".";
  return root + "/cheat-version-description.json";
}

/**
 * Compare two dotted version strings.
 *
 * Release tags carry a `v` prefix while packaged files do not, and plain string
 * comparison reports `"1.10.0" < "1.9.0"`. Comparing numeric segments fixes
 * both. Missing or non-numeric segments count as zero, so `1.2` equals `1.2.0`.
 *
 * @param {string} left
 * @param {string} right
 * @returns {number} negative when `left` is older, positive when newer, 0 when equal
 */
export function compareVersions(left, right) {
  const toParts = (value) =>
    String(value == null ? "" : value)
      .trim()
      .replace(/^v/i, "")
      .split(".");

  const leftParts = toParts(left);
  const rightParts = toParts(right);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = parseInt(leftParts[index] || "0", 10);
    const rightPart = parseInt(rightParts[index] || "0", 10);
    const leftValue = Number.isFinite(leftPart) ? leftPart : 0;
    const rightValue = Number.isFinite(rightPart) ? rightPart : 0;

    if (leftValue < rightValue) return -1;
    if (leftValue > rightValue) return 1;
  }

  return 0;
}

/**
 * Read the packaged version, or `null` when the file is missing or malformed.
 *
 * @param {{ fileSystem?: VersionFileSystem, rpgMakerName?: string }} [options]
 * @returns {string | null}
 */
export function readCheatVersion(options) {
  const settings = options || {};
  const fileSystem = settings.fileSystem;

  if (!fileSystem || typeof fileSystem.readFileSync !== "function") {
    return null;
  }

  try {
    const description = JSON.parse(
      fileSystem.readFileSync(versionFilePath(settings.rpgMakerName), "utf-8"),
    );
    const version = description && description.version;
    return typeof version === "string" && version ? version : null;
  } catch (error) {
    return null;
  }
}
