// @ts-check

import { Alert } from "./AlertHelper.js";
import {
  BATCH_TRANSLATION,
  DEFAULT_END_POINTS,
  END_POINT_URL_PATTERN_TEXT_SYMBOL,
  MAX_CHUNK_SIZE,
  MAX_PARALLEL_REQUESTS,
  RECOMMEND_CHUNK_SIZE,
} from "./translation/TranslationConfig.js";
import {
  createBatches as createTranslationBatches,
  getAdaptiveChunkSize as getAdaptiveTranslationChunkSize,
  translateBatch as runTranslationBatch,
  translateBulkOriginal as runOriginalBulkTranslation,
  translateLingvaChunk as runLingvaTranslationChunk,
} from "./translation/TranslationBatching.js";
import { translateWithBasicEndpoint } from "./translation/TranslationBasicRequest.js";
import { collectTranslationTargets } from "./translation/TranslationExtractors.js";
import { translateWithLingvaEndpoint } from "./translation/TranslationLingvaRequest.js";
import { translateWithLlmEndpoint } from "./translation/TranslationLlmRequest.js";
import { buildUncachedTranslationPool } from "./translation/TranslationPool.js";
import { translateUncachedSets } from "./translation/TranslationWorkflow.js";
import { TRANSLATE_PROGRESS } from "./translation/TranslateProgress.js";
import { TRANSLATE_SETTINGS } from "./translation/TranslateSettings.js";
import {
  TRANSLATION_BANK,
  TRANSLATION_METRICS,
} from "./translation/TranslationBank.js";

export {
  BATCH_TRANSLATION,
  DEFAULT_END_POINTS,
  END_POINT_URL_PATTERN_TEXT_SYMBOL,
  MAX_CHUNK_SIZE,
  MAX_PARALLEL_REQUESTS,
  RECOMMEND_CHUNK_SIZE,
} from "./translation/TranslationConfig.js";
export { TRANSLATE_PROGRESS } from "./translation/TranslateProgress.js";
export { TRANSLATE_SETTINGS } from "./translation/TranslateSettings.js";
export {
  TRANSLATION_BANK,
  TRANSLATION_METRICS,
} from "./translation/TranslationBank.js";

class Translator {
  /**
   * @param {import("./translation/TranslateSettings.js").TranslateSettings} settings
   */
  constructor(settings) {
    /** @type {import("./translation/TranslateSettings.js").TranslateSettings} */
    this.settings = settings;
  }

  async isAvailable() {
    try {
      await this.__translate("test");
      return true;
    } catch (e) {
      return false;
    }
  }

  async __translate(text) {
    const epData = this.settings.getEndPointData();

    if (epData.isLingva) {
      return await this.__translateLingva(text);
    }

    if (epData.isLLM) {
      return await this.__translateLLM(text);
    }

    return await translateWithBasicEndpoint(epData, text);
  }

  async __translateLingva(text) {
    const result = await translateWithLingvaEndpoint(
      this.settings.getEndPointData(),
      text,
      this._rrIndex,
    );
    this._rrIndex = result.rrIndex;
    return result.translated;
  }

  async __translateLLM(text) {
    return await translateWithLlmEndpoint(
      this.settings.getEndPointData(),
      this.settings.getLLMConfig(),
      text,
    );
  }

  async __translateBulk(texts) {
    return (await this.translate(texts.join("\n"))).split("\n");
  }

  async translate(text) {
    try {
      const cached = TRANSLATION_BANK.get(text);
      if (cached) {
        return cached.translated;
      }

      const translated = await this.__translate(text);

      if (translated && translated !== text) {
        TRANSLATION_BANK.set(text, translated);
      }

      return translated;
    } catch (err) {
      return text;
    }
  }

  getAdaptiveChunkSize(requestedSize, endPointId) {
    return getAdaptiveTranslationChunkSize(
      this.settings.getEndPointData().isLingva,
      requestedSize,
      endPointId,
    );
  }

  async translateBulk(texts) {
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      console.warn("translateBulk: Invalid or empty texts array");
      return [];
    }

    const cleanedTexts = texts.map((text) => (text ? text.trim() : text));
    const epData = this.settings.getEndPointData();
    const requestedChunkSize = this.settings.getBulkTranslateChunkSize();
    const isJpToKr =
      epData.id === "ezTransWeb" || epData.id === "ezTransServer";

    if (isJpToKr) {
      console.log(
        `Using original translation method for JP->KR endpoint: ${epData.id}`,
      );
      return await this.translateBulkOriginal(cleanedTexts);
    }

    const safeChunkSize = this.getAdaptiveChunkSize(
      requestedChunkSize,
      epData.id || "unknown",
    );

    const translatedChunks = [];

    for (let i = 0; i < cleanedTexts.length; i += safeChunkSize) {
      const chunk = cleanedTexts.slice(
        i,
        Math.min(cleanedTexts.length, i + safeChunkSize),
      );

      if (epData.isLingva) {
        translatedChunks.push(await this.translateLingvaChunk(chunk));
      } else {
        translatedChunks.push(await this.__translateBulk(chunk));
      }
    }

    return [].concat(...translatedChunks);
  }

  async translateBulkOriginal(texts) {
    return await runOriginalBulkTranslation(
      texts,
      this.settings.getBulkTranslateChunkSize(),
      async (chunk) => this.__translateBulk(chunk),
    );
  }

  createBatches(texts, endPointId) {
    return createTranslationBatches(texts, endPointId);
  }

  async translateBatch(batch) {
    return await runTranslationBatch(batch, async (text) =>
      this.translate(text),
    );
  }

  async translateLingvaChunk(chunk) {
    const epData = this.settings.getEndPointData();
    const endPointId = epData.id || this.settings.getEndPointSelection();

    return await runLingvaTranslationChunk(chunk, endPointId, async (batch) =>
      this.translateBatch(batch),
    );
  }

  async translateAllGlobals() {
    const targets = this.settings.getTargets();
    const epData = this.settings.getEndPointData();
    const isJpToKr =
      epData.id === "ezTransWeb" || epData.id === "ezTransServer";
    const chunkSize = this.settings.getBulkTranslateChunkSize();
    const useBatch = localStorage.getItem("useBatchTranslation") !== "false";

    const toTranslate = await collectTranslationTargets(
      targets,
      TRANSLATE_PROGRESS,
    );

    const { uncachedSets, finalPool, totalUncached } =
      buildUncachedTranslationPool(toTranslate, TRANSLATION_BANK);

    if (totalUncached === 0) {
      TRANSLATE_PROGRESS.update(false, 100, "All Cached");
      Alert.success("All text already translated! Applying to game...");
      window.dispatchEvent(new CustomEvent("cheat-translate-finish"));
      setTimeout(() => TRANSLATE_PROGRESS.update(false, 0, ""), 2000);
      return;
    }

    console.log(
      `[Translator] Total unique strings to translate: ${totalUncached}`,
    );
    uncachedSets.forEach((list, type) => {
      console.log(`  ${type}: ${list.length} strings`);
    });

    TRANSLATE_PROGRESS.update(true, 0, `Translating Pool (0/${totalUncached})`);
    TRANSLATION_METRICS.reset();
    TRANSLATION_METRICS.totalStrings = totalUncached;

    try {
      if (epData.isLingva) {
        await this.translateBulk(finalPool);
      } else {
        await translateUncachedSets(
          uncachedSets,
          totalUncached,
          chunkSize,
          isJpToKr,
          useBatch,
          async (text) => this.translate(text),
          async (chunk) => this.translateBulk(chunk),
        );
      }
    } catch (err) {
      console.error("[Translator] Global translation failed", err);
    }

    TRANSLATION_METRICS.printReport();
    TRANSLATION_BANK.flushCache();

    TRANSLATE_PROGRESS.update(false, 100, "Complete - Applying to game...");
    Alert.success(
      `Translation Complete! Translated ${totalUncached} unique strings.`,
    );
    window.dispatchEvent(new CustomEvent("cheat-translate-finish"));
    setTimeout(() => TRANSLATE_PROGRESS.update(false, 0, ""), 3000);
  }
}

export const TRANSLATOR = new Translator(TRANSLATE_SETTINGS);

setTimeout(() => {
  TRANSLATION_BANK.clearOldEntries();
}, 1000);
