// @ts-check

import {
  DEFAULT_END_POINTS,
  TRANSLATE_SETTINGS,
  TRANSLATION_BANK,
} from "../TranslateHelper.js";
import {
  getCheatRootDir,
  getCheatVersionFilePath,
  getGameDataDir,
  getGameRootDir,
  isDesktopRuntime,
  isMvProject,
} from "../runtime/RuntimeEnv.js";
import { CHEAT_DIAGNOSTICS } from "../runtime/CheatDiagnostics.js";

/**
 * @typedef {object} AboutPanelState
 * @property {string} cheatVersion
 * @property {string} gameTitle
 * @property {string} engineName
 * @property {string} viewMode
 * @property {string} runtimeMode
 * @property {string} currentScene
 * @property {string} currentMapText
 * @property {number | null} currentMapId
 * @property {string} currentMapName
 * @property {boolean} isPlaytest
 * @property {string} language
 * @property {string} userAgent
 * @property {string} nwjsVersion
 * @property {string} chromiumVersion
 * @property {string} nodeVersion
 * @property {string} executablePath
 * @property {string} workingDirectory
 * @property {string} cheatRootDir
 * @property {string} gameRootDir
 * @property {string} gameDataDir
 * @property {string} cheatVersionPath
 * @property {string} settingsDir
 * @property {string} translateSettingsPath
 * @property {string} translationBankPath
 * @property {string} shortcutSettingsPath
 * @property {boolean} translationEnabled
 * @property {string} translationEndpointSelection
 * @property {string} translationEndpointName
 * @property {number} translationChunkSize
 * @property {number} translationBankEntries
 * @property {string[]} enabledTranslationTargets
 * @property {string} diagnosticsLogPath
 * @property {number} diagnosticsEntryCount
 * @property {string} diagnosticsSessionId
 * @property {string} latestDiagnosticsError
 * @property {string} recentDiagnosticsText
 */

const ABOUT_PANEL_PATHS = {
  settingsDir: "./www/cheat-settings",
  translateSettings: "./www/cheat-settings/translate.json",
  translationBank: "./www/cheat-settings/translation-bank.json",
  shortcuts: "./www/cheat-settings/shortcuts.json",
};

/**
 * @returns {string | null}
 */
function readCheatVersion() {
  if (!isDesktopRuntime()) {
    return null;
  }

  try {
    const fs = require("fs");
    const raw = fs.readFileSync(getCheatVersionFilePath(), "utf-8");
    const description = JSON.parse(raw);
    return description.version || null;
  } catch (error) {
    return null;
  }
}

/**
 * @param {string} relativePath
 * @returns {string}
 */
function resolveDesktopPath(relativePath) {
  if (!isDesktopRuntime()) {
    return "Browser localStorage";
  }

  try {
    const path = require("path");
    return path.resolve(relativePath);
  } catch (error) {
    return relativePath;
  }
}

/**
 * @param {string} key
 * @returns {string}
 */
function readProcessVersion(key) {
  try {
    if (typeof process !== "object" || !process || !process.versions) {
      return "Unavailable";
    }

    return process.versions[key] || "Unavailable";
  } catch (error) {
    return "Unavailable";
  }
}

/**
 * @returns {string}
 */
function readExecutablePath() {
  try {
    if (typeof process !== "object" || !process || !process.execPath) {
      return "Unavailable";
    }

    return process.execPath;
  } catch (error) {
    return "Unavailable";
  }
}

/**
 * @returns {string}
 */
function readWorkingDirectory() {
  try {
    if (
      typeof process !== "object" ||
      !process ||
      typeof process.cwd !== "function"
    ) {
      return "Unavailable";
    }

    return process.cwd();
  } catch (error) {
    return "Unavailable";
  }
}

/**
 * @returns {string}
 */
function readGameTitle() {
  try {
    if (typeof $dataSystem === "undefined" || !$dataSystem) {
      return "Unavailable";
    }

    return $dataSystem.gameTitle || "Untitled Game";
  } catch (error) {
    return "Unavailable";
  }
}

/**
 * @returns {string}
 */
function readCurrentSceneName() {
  try {
    const rawSceneManager = /** @type {any} */ (SceneManager);
    const scene = rawSceneManager._scene;
    if (!scene || !scene.constructor) {
      return "Unavailable";
    }

    return scene.constructor.name || "Unknown Scene";
  } catch (error) {
    return "Unavailable";
  }
}

/**
 * @returns {{ id: number | null, name: string, text: string }}
 */
function readCurrentMapInfo() {
  try {
    if (typeof $gameMap === "undefined" || !$gameMap) {
      return { id: null, name: "Unavailable", text: "Unavailable" };
    }

    const mapId = $gameMap.mapId();
    if (!mapId) {
      return { id: mapId, name: "Not on map", text: "Not on map" };
    }

    let mapName = "Unknown Map";
    if (
      typeof $dataMapInfos !== "undefined" &&
      $dataMapInfos &&
      $dataMapInfos[mapId]
    ) {
      mapName = $dataMapInfos[mapId].name || mapName;
    }

    return {
      id: mapId,
      name: mapName,
      text: "#" + mapId + " " + mapName,
    };
  } catch (error) {
    return { id: null, name: "Unavailable", text: "Unavailable" };
  }
}

/**
 * @returns {boolean}
 */
function isPlaytestRuntime() {
  try {
    return (
      typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test")
    );
  } catch (error) {
    return false;
  }
}

/**
 * @param {string} selection
 * @returns {string}
 */
function readEndpointName(selection) {
  if (selection === "custom") {
    return "Custom";
  }

  if (
    selection &&
    Object.prototype.hasOwnProperty.call(DEFAULT_END_POINTS, selection)
  ) {
    return DEFAULT_END_POINTS[selection].name;
  }

  return selection || "Unavailable";
}

/**
 * @returns {string[]}
 */
function readEnabledTranslationTargets() {
  try {
    const targets = TRANSLATE_SETTINGS.getTargets();
    return Object.keys(targets).filter((key) => targets[key]);
  } catch (error) {
    return [];
  }
}

/**
 * @returns {string}
 */
function readViewMode() {
  try {
    const pathname = String(window.location.pathname || "").toLowerCase();
    return pathname.indexOf("window.html") >= 0 ? "Separate Window" : "Overlay";
  } catch (error) {
    return "Unknown";
  }
}

/**
 * @returns {AboutPanelState}
 */
export function readAboutPanelState() {
  const mapInfo = readCurrentMapInfo();
  const translationStats = TRANSLATION_BANK.getStats();
  const endpointSelection = TRANSLATE_SETTINGS.getEndPointSelection();
  const enabledTargets = readEnabledTranslationTargets();

  return {
    cheatVersion: readCheatVersion() || "Unknown",
    gameTitle: readGameTitle(),
    engineName: isMvProject() ? "MV" : "MZ",
    viewMode: readViewMode(),
    runtimeMode: isDesktopRuntime() ? "NW.js Desktop" : "Browser",
    currentScene: readCurrentSceneName(),
    currentMapText: mapInfo.text,
    currentMapId: mapInfo.id,
    currentMapName: mapInfo.name,
    isPlaytest: isPlaytestRuntime(),
    language: navigator.language || "Unavailable",
    userAgent: navigator.userAgent || "Unavailable",
    nwjsVersion: readProcessVersion("node-webkit"),
    chromiumVersion: readProcessVersion("chromium"),
    nodeVersion: readProcessVersion("node"),
    executablePath: readExecutablePath(),
    workingDirectory: readWorkingDirectory(),
    cheatRootDir: getCheatRootDir(),
    gameRootDir: getGameRootDir(),
    gameDataDir: getGameDataDir(),
    cheatVersionPath: resolveDesktopPath(getCheatVersionFilePath()),
    settingsDir: resolveDesktopPath(ABOUT_PANEL_PATHS.settingsDir),
    translateSettingsPath: resolveDesktopPath(
      ABOUT_PANEL_PATHS.translateSettings,
    ),
    translationBankPath: resolveDesktopPath(ABOUT_PANEL_PATHS.translationBank),
    shortcutSettingsPath: resolveDesktopPath(ABOUT_PANEL_PATHS.shortcuts),
    translationEnabled: TRANSLATE_SETTINGS.isEnabled(),
    translationEndpointSelection: endpointSelection,
    translationEndpointName: readEndpointName(endpointSelection),
    translationChunkSize: TRANSLATE_SETTINGS.getBulkTranslateChunkSize(),
    translationBankEntries: translationStats.totalEntries,
    enabledTranslationTargets: enabledTargets,
    diagnosticsLogPath: CHEAT_DIAGNOSTICS.getLogFilePath(),
    diagnosticsEntryCount: CHEAT_DIAGNOSTICS.getEntryCount(),
    diagnosticsSessionId: CHEAT_DIAGNOSTICS.sessionId,
    latestDiagnosticsError: CHEAT_DIAGNOSTICS.getLatestErrorText(),
    recentDiagnosticsText: CHEAT_DIAGNOSTICS.getRecentLogText(20),
  };
}

/**
 * @param {AboutPanelState} state
 * @returns {string}
 */
export function buildAboutPanelSummary(state) {
  const lines = [
    "[Cheat]",
    "Version: " + state.cheatVersion,
    "View Mode: " + state.viewMode,
    "Runtime Mode: " + state.runtimeMode,
    "",
    "[Game]",
    "Title: " + state.gameTitle,
    "Engine: " + state.engineName,
    "Scene: " + state.currentScene,
    "Map: " + state.currentMapText,
    "Playtest: " + (state.isPlaytest ? "Yes" : "No"),
    "",
    "[Runtime]",
    "Language: " + state.language,
    "NW.js: " + state.nwjsVersion,
    "Chromium: " + state.chromiumVersion,
    "Node: " + state.nodeVersion,
    "Executable: " + state.executablePath,
    "Working Directory: " + state.workingDirectory,
    "",
    "[Translation]",
    "Enabled: " + (state.translationEnabled ? "Yes" : "No"),
    "Endpoint: " + state.translationEndpointName,
    "Chunk Size: " + state.translationChunkSize,
    "Cache Entries: " + state.translationBankEntries,
    "Targets: " + state.enabledTranslationTargets.join(", "),
    "",
    "[Diagnostics]",
    "Session: " + state.diagnosticsSessionId,
    "Log Path: " + state.diagnosticsLogPath,
    "Entry Count: " + state.diagnosticsEntryCount,
    "Latest Error: " + state.latestDiagnosticsError,
    "",
    "[Paths]",
    "Cheat Version File: " + state.cheatVersionPath,
    "Settings Directory: " + state.settingsDir,
    "Translate Settings: " + state.translateSettingsPath,
    "Translation Bank: " + state.translationBankPath,
    "Shortcuts: " + state.shortcutSettingsPath,
  ];

  return lines.join("\n");
}
