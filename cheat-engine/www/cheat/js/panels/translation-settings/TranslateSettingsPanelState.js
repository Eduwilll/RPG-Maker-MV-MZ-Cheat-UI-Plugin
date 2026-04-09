// @ts-check

import {
  DEFAULT_END_POINTS,
  MAX_CHUNK_SIZE,
  RECOMMEND_CHUNK_SIZE,
  TRANSLATE_SETTINGS,
  TRANSLATION_BANK,
} from "../../TranslateHelper.js";
import { IN_GAME_TRANSLATOR } from "../../InGameTranslator.js";

export const TRANSLATE_SETTINGS_REST_API_METHODS = [
  { name: "GET", value: "get" },
  { name: "POST", value: "post" },
];

export function readTranslationBankStats() {
  const stats = TRANSLATION_BANK.getStats();
  const bankStats = {
    totalEntries: stats.totalEntries,
    ageText: "No data",
  };

  if (stats.newestEntry) {
    const age = Date.now() - stats.newestEntry;
    const days = Math.floor(age / (24 * 60 * 60 * 1000));
    bankStats.ageText = days > 0 ? `${days} days old` : "Recent";
  }

  return bankStats;
}

export function buildChunkSizeWarning(chunkSize, endPointSelection) {
  const numericChunkSize = Number(chunkSize);
  const maxSafe = MAX_CHUNK_SIZE[endPointSelection] || 50;

  if (numericChunkSize <= 0) {
    return {
      message: "Chunk size must be greater than 0",
      class: "caption font-weight-bold red--text",
    };
  }

  if (numericChunkSize > maxSafe) {
    return {
      message: `Large chunk size (${numericChunkSize}) may cause issues with ${endPointSelection}. Recommended max: ${maxSafe}`,
      class: "caption font-weight-bold orange--text",
    };
  }

  if (numericChunkSize > 100) {
    return {
      message: "Large chunk size may be slower due to rate limiting",
      class: "caption font-weight-bold amber--text",
    };
  }

  return {
    message: "Good chunk size for reliable translation",
    class: "caption font-weight-bold green--text",
  };
}

export function buildTranslateEndPointList() {
  const ret = Object.values(DEFAULT_END_POINTS).map((ep) => ({
    id: ep.id,
    name: ep.name,
  }));
  ret.push({ id: "custom", name: "Custom" });

  return ret;
}

export function isCustomTranslateEndPoint(endPointSelection) {
  return endPointSelection === "custom";
}

export function isLlmTranslateEndPoint(endPointSelection) {
  const ep = DEFAULT_END_POINTS[endPointSelection];
  return !!(ep && ep.data && ep.data.isLLM);
}

export function getSelectedDefaultTranslateEndPoint(endPointSelection) {
  return DEFAULT_END_POINTS[endPointSelection];
}

export function getRecommendedChunkSizeDescription(endPointSelection) {
  if (
    isCustomTranslateEndPoint(endPointSelection) ||
    !RECOMMEND_CHUNK_SIZE[endPointSelection]
  ) {
    return null;
  }

  const selected = getSelectedDefaultTranslateEndPoint(endPointSelection);
  return `Recommended chunk size for ${selected.name} : ${RECOMMEND_CHUNK_SIZE[endPointSelection]}`;
}

export function isJpToKrTranslateEndPoint(endPointSelection) {
  return (
    endPointSelection === "ezTransWeb" || endPointSelection === "ezTransServer"
  );
}

export function readTranslateSettingsPanelState() {
  const endPointSelection = TRANSLATE_SETTINGS.getEndPointSelection();

  return {
    enabled: TRANSLATE_SETTINGS.isEnabled(),
    targets: TRANSLATE_SETTINGS.getTargets(),
    endPointSelection,
    customEndPointData: TRANSLATE_SETTINGS.getCustomEndPointData(),
    llmConfig: TRANSLATE_SETTINGS.getLLMConfig(),
    bulkTranslateChunkSize: TRANSLATE_SETTINGS.getBulkTranslateChunkSize(),
    useBatchTranslation:
      localStorage.getItem("useBatchTranslation") !== "false",
    bankStats: readTranslationBankStats(),
    chunkSizeWarning: buildChunkSizeWarning(
      TRANSLATE_SETTINGS.getBulkTranslateChunkSize(),
      endPointSelection,
    ),
    isDataPatched: IN_GAME_TRANSLATOR.isDataPatched(),
    inGamePatchCount: /** @type {any} */ (IN_GAME_TRANSLATOR).patchCount || 0,
  };
}
