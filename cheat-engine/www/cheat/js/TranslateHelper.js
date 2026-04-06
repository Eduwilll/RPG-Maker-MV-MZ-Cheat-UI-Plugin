// @ts-check

import { Alert } from "./AlertHelper.js";
import {
  BATCH_TRANSLATION,
  DEFAULT_END_POINTS,
  END_POINT_URL_PATTERN_TEXT_SYMBOL,
  MAX_CHUNK_SIZE,
  MAX_PARALLEL_REQUESTS,
  RECOMMEND_CHUNK_SIZE,
} from "./TranslationConfig.js";
import { collectTranslationTargets } from "./TranslationExtractors.js";
import { TRANSLATE_PROGRESS } from "./TranslateProgress.js";
import { TRANSLATE_SETTINGS } from "./TranslateSettings.js";
import { TRANSLATION_BANK, TRANSLATION_METRICS } from "./TranslationBank.js";

export {
  BATCH_TRANSLATION,
  DEFAULT_END_POINTS,
  END_POINT_URL_PATTERN_TEXT_SYMBOL,
  MAX_CHUNK_SIZE,
  MAX_PARALLEL_REQUESTS,
  RECOMMEND_CHUNK_SIZE,
} from "./TranslationConfig.js";
export { TRANSLATE_PROGRESS } from "./TranslateProgress.js";
export { TRANSLATE_SETTINGS } from "./TranslateSettings.js";
export { TRANSLATION_BANK, TRANSLATION_METRICS } from "./TranslationBank.js";

class Translator {
  /**
   * @param {import("./TranslateSettings.js").TranslateSettings} settings
   */
  constructor(settings) {
    /** @type {import("./TranslateSettings.js").TranslateSettings} */
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

    // For Lingva API, try multiple endpoints with fallbacks
    if (epData.isLingva) {
      return await this.__translateLingva(text);
    }

    // For LLM APIs (Ollama, OpenAI, custom)
    if (epData.isLLM) {
      return await this.__translateLLM(text);
    }

    // For other APIs, use the original logic
    let encodedText = encodeURI(text);
    const realUrl = epData.urlPattern.replace(
      END_POINT_URL_PATTERN_TEXT_SYMBOL,
      encodedText,
    );

    let response;
    try {
      if (epData.method === "get") {
        response = (await axios.get(realUrl)).data;
      } else if (epData.method === "post") {
        const body = epData.body ? epData.body : "";
        response = (
          await axios.post(
            realUrl,
            body.replace(END_POINT_URL_PATTERN_TEXT_SYMBOL, text),
          )
        ).data;
      } else {
        return text;
      }
    } catch (error) {
      console.warn("Translation request failed:", error.message);
      return text;
    }

    return response || text;
  }

  async __translateLingva(text) {
    const epData = this.settings.getEndPointData();
    const sourceLang = epData.sourceLang || "auto";
    const domains = epData.isLocal
      ? (epData.localDomain || "http://localhost:3000").split(",")
      : ["https://lingva.ml"];

    if (typeof this._rrIndex === "undefined") this._rrIndex = 0;

    const maxAttempts = epData.isLocal ? 2 : 4;

    // Rate limiter for public endpoints (Cloudflare enforces ~1 req/sec)
    if (!epData.isLocal) {
      const now = Date.now();
      const minGap = 1500; // 1.5 seconds between requests
      if (typeof Translator._lastPublicReq === "undefined")
        Translator._lastPublicReq = 0;
      const elapsed = now - Translator._lastPublicReq;
      if (elapsed < minGap) {
        await new Promise((resolve) => setTimeout(resolve, minGap - elapsed));
      }
      Translator._lastPublicReq = Date.now();
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const baseDomain = domains[this._rrIndex % domains.length].trim();
      this._rrIndex++;

      const endpoint = `${baseDomain}/api/v1/${sourceLang}/en/${encodeURIComponent(text)}`;
      const reqStart = Date.now();

      try {
        const response = await axios.get(endpoint, {
          timeout: 30000,
          headers: { Accept: "application/json" },
        });

        TRANSLATION_METRICS.recordRequest(baseDomain, Date.now() - reqStart);

        if (
          response.data &&
          response.data.translation &&
          response.data.translation !== text
        ) {
          return response.data.translation;
        }
        break;
      } catch (error) {
        const latency = Date.now() - reqStart;
        TRANSLATION_METRICS.recordRequest(baseDomain, latency);

        const msg = error.message || "";
        const isTimeout = msg.includes("timeout");
        const isRateLimit = msg.includes("429");

        if (isRateLimit) TRANSLATION_METRICS.recordError("429");
        else if (msg.includes("431") || msg.includes("414"))
          TRANSLATION_METRICS.recordError("431");
        else if (msg.includes("404")) TRANSLATION_METRICS.recordError("404");
        else if (msg.includes("500")) TRANSLATION_METRICS.recordError("500");
        else if (isTimeout) TRANSLATION_METRICS.recordError("timeout");
        else TRANSLATION_METRICS.recordError("other");

        // 429 Rate Limited: strong exponential backoff for Cloudflare
        if (isRateLimit && attempt < maxAttempts - 1) {
          const backoff = Math.min(5000 * Math.pow(2, attempt), 30000); // 5s, 10s, 20s, 30s
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }

        // Local timeout: retry on next node
        if (isTimeout && epData.isLocal && attempt === 0) {
          continue;
        }

        // Local: no external fallback
        if (epData.isLocal) return text;

        // Public endpoint: try plausibility cloud fallback
        try {
          const fbEndpoint = `https://translate.plausibility.cloud/api/v1/${sourceLang}/en/${encodeURIComponent(text)}`;
          const fbResp = await axios.get(fbEndpoint, {
            timeout: 10000,
            headers: { Accept: "application/json" },
          });
          if (
            fbResp.data &&
            fbResp.data.translation &&
            fbResp.data.translation !== text
          ) {
            return fbResp.data.translation;
          }
        } catch (fbErr) {
          /* fallback failed too */
        }
        break;
      }
    }

    return text;
  }

  async __translateLLM(text) {
    const epData = this.settings.getEndPointData();
    const llmConfig = this.settings.getLLMConfig();

    // Merge endpoint defaults with user config
    const apiUrl = llmConfig.apiUrl || epData.apiUrl;
    const model = llmConfig.model || epData.model;
    const apiKey = llmConfig.apiKey || "";
    const sourceLang = epData.sourceLang || "Japanese";
    const targetLang = epData.targetLang || "English";

    const systemPrompt =
      llmConfig.systemPrompt ||
      `You are a professional RPG game translator. Translate the following ${sourceLang} game text to ${targetLang}.\n\nRules:\n- Translate ONLY the text, output NOTHING else (no explanations, no notes)\n- Preserve the delimiter ⟨SEP⟩ exactly as-is between translated segments\n- Keep game variables like \\V[123], \\N[1], %1, %2 unchanged\n- Keep newline characters (\\n) unchanged\n- Maintain the tone and personality of game dialogue\n- For RPG terms (skills, items, spells), use natural English equivalents\n- Do NOT add quotes around the translation`;

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const reqStart = Date.now();

    try {
      const response = await axios.post(
        apiUrl,
        {
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          temperature: 0.3, // Low temperature for consistent translations
          max_tokens: Math.max(text.length * 3, 500), // Generous token limit
        },
        {
          timeout: 60000, // LLMs can be slower than translation APIs
          headers: headers,
        },
      );

      TRANSLATION_METRICS.recordRequest(apiUrl, Date.now() - reqStart);

      if (response.data && response.data.choices && response.data.choices[0]) {
        const translated = response.data.choices[0].message.content.trim();
        if (translated && translated !== text) {
          return translated;
        }
      }
    } catch (error) {
      const latency = Date.now() - reqStart;
      TRANSLATION_METRICS.recordRequest(apiUrl, latency);

      const msg = error.message || "";
      if (msg.includes("429")) TRANSLATION_METRICS.recordError("429");
      else if (msg.includes("401") || msg.includes("403"))
        TRANSLATION_METRICS.recordError("other");
      else if (msg.includes("timeout"))
        TRANSLATION_METRICS.recordError("timeout");
      else TRANSLATION_METRICS.recordError("other");

      // Retry once on rate limit with backoff
      if (msg.includes("429")) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        try {
          const retryResp = await axios.post(
            apiUrl,
            {
              model: model,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text },
              ],
              temperature: 0.3,
              max_tokens: Math.max(text.length * 3, 500),
            },
            { timeout: 60000, headers },
          );

          if (
            retryResp.data &&
            retryResp.data.choices &&
            retryResp.data.choices[0]
          ) {
            return retryResp.data.choices[0].message.content.trim();
          }
        } catch (retryErr) {
          /* retry failed */
        }
      }
    }

    return text;
  }

  async __translateBulk(texts) {
    return (await this.translate(texts.join("\n"))).split("\n");
  }

  async translate(text) {
    try {
      // Check translation bank first
      const cached = TRANSLATION_BANK.get(text);
      if (cached) {
        return cached.translated;
      }

      // If not in cache, translate and store
      const translated = await this.__translate(text);

      // Store successful translation in bank
      if (translated && translated !== text) {
        TRANSLATION_BANK.set(text, translated);
      }

      return translated;
    } catch (err) {
      return text;
    }
  }

  // async translateBulk (texts) {
  //     texts = texts.map(text => text.replace('\n', ''))
  //
  //     const chunkSize = 100
  //     const textsChunk = []
  //
  //     for (let i = 0; i < texts.length; i += chunkSize) {
  //         textsChunk.push(texts.slice(i, Math.min(texts.length, i + chunkSize)))
  //     }
  //
  //     const ret = [].concat(...await Promise.all(textsChunk.map(chunk => this.__translateBulk(chunk))))
  //     return ret
  // }

  getAdaptiveChunkSize(requestedSize, endPointId) {
    // Lingva endpoints handle batching internally via translateBatch
    // We return the full length to allow the batching logic to decide the split
    if (this.settings.getEndPointData().isLingva) {
      return 999999;
    }

    const maxSafe = MAX_CHUNK_SIZE[endPointId] || 50;
    const maxParallel = MAX_PARALLEL_REQUESTS[endPointId] || 10;

    if (requestedSize <= maxSafe) {
      return requestedSize;
    }

    console.warn(
      `Chunk size ${requestedSize} too large for ${endPointId}. Using safe limit: ${maxSafe}`,
    );
    return maxSafe;
  }

  async translateBulk(texts) {
    // Handle empty or invalid input
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      console.warn("translateBulk: Invalid or empty texts array");
      return [];
    }

    // Clean up texts and preserve original indices
    const cleanedTexts = texts.map((text) => (text ? text.trim() : text));

    const epData = this.settings.getEndPointData();
    const requestedChunkSize = this.settings.getBulkTranslateChunkSize();

    // Check if this is a JP→KR endpoint (ezTrans services)
    const isJpToKr =
      epData.id === "ezTransWeb" || epData.id === "ezTransServer";

    if (isJpToKr) {
      console.log(
        `Using original translation method for JP→KR endpoint: ${epData.id}`,
      );
      return await this.translateBulkOriginal(cleanedTexts);
    }

    // For other endpoints, use the new batch system
    const safeChunkSize = this.getAdaptiveChunkSize(
      requestedChunkSize,
      epData.id || "unknown",
    );

    const textsChunk = [];

    for (let i = 0; i < cleanedTexts.length; i += safeChunkSize) {
      const chunk = cleanedTexts.slice(
        i,
        Math.min(cleanedTexts.length, i + safeChunkSize),
      );

      // For Lingva API, use controlled parallel translation
      if (epData.isLingva) {
        const translatedChunk = await this.translateLingvaChunk(chunk);
        textsChunk.push(translatedChunk);
      } else {
        // Use bulk translation for other services
        textsChunk.push(await this.__translateBulk(chunk));
      }
    }

    const result = [].concat(...textsChunk);
    return result;
  }

  async translateBulkOriginal(texts) {
    console.log(
      `🔄 Using original translation method for ${texts.length} texts`,
    );

    // Use the original repository's bulk translation logic
    const chunkSize = this.settings.getBulkTranslateChunkSize();
    const textsChunk = [];

    for (let i = 0; i < texts.length; i += chunkSize) {
      const chunk = texts.slice(i, Math.min(texts.length, i + chunkSize));
      console.log(
        `Processing chunk ${Math.floor(i / chunkSize) + 1}: ${chunk.length} items`,
      );

      // Use the original __translateBulk method
      textsChunk.push(await this.__translateBulk(chunk));
    }

    const result = [].concat(...textsChunk);
    console.log(
      `✅ Original translation completed. Input: ${texts.length}, Output: ${result.length}`,
    );
    return result;
  }

  createBatches(texts, endPointId) {
    const config = BATCH_TRANSLATION;
    const maxLength = config.maxBatchLength[endPointId] || 1000;
    const maxItems = config.maxBatchItems[endPointId] || 20;
    const delimiter = config.delimiter;

    const batches = [];
    let currentBatch = [];
    let currentLength = 0;

    for (const text of texts) {
      if (!text || !text.trim()) {
        currentBatch.push("");
        continue;
      }

      const textLength = text.length + delimiter.length;

      // Check if adding this text would exceed limits
      if (
        currentBatch.length > 0 &&
        (currentLength + textLength > maxLength ||
          currentBatch.length >= maxItems)
      ) {
        // Start new batch
        batches.push(currentBatch);
        currentBatch = [text];
        currentLength = text.length;
      } else {
        // Add to current batch
        currentBatch.push(text);
        currentLength += textLength;
      }
    }

    // Add final batch if not empty
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  async translateBatch(batch) {
    const delimiter = BATCH_TRANSLATION.delimiter;

    // Filter out empty texts but remember their positions
    const textMap = [];
    const nonEmptyTexts = [];

    batch.forEach((text, index) => {
      if (text && text.trim()) {
        textMap.push({
          originalIndex: index,
          batchIndex: nonEmptyTexts.length,
        });
        nonEmptyTexts.push(text);
      } else {
        textMap.push({ originalIndex: index, batchIndex: -1 });
      }
    });

    if (nonEmptyTexts.length === 0) {
      return batch; // All empty, return as-is
    }

    // Combine texts with delimiter
    const combinedText = nonEmptyTexts.join(delimiter);

    try {
      // Translate the combined text
      const translatedCombined = await this.translate(combinedText);

      // Split the result back
      const translatedParts = translatedCombined.split(delimiter);

      // Reconstruct the original array with translations
      const results = new Array(batch.length);
      textMap.forEach((mapping) => {
        const originalStr = batch[mapping.originalIndex];

        if (
          mapping.batchIndex >= 0 &&
          mapping.batchIndex < translatedParts.length
        ) {
          const translatedStr = translatedParts[mapping.batchIndex].trim();
          results[mapping.originalIndex] = translatedStr;

          // The core bugfix! We must cache the granular strings back into the bank so other tabs skip them
          TRANSLATION_BANK.set(originalStr, translatedStr);
        } else {
          results[mapping.originalIndex] = batch[mapping.originalIndex] || "";
        }
      });

      // Batch completed — cache individual results already done via TRANSLATION_BANK.set above
      return results;
    } catch (error) {
      const isTooLarge =
        error.message &&
        (error.message.includes("431") || error.message.includes("414"));
      const isServerError = error.message && error.message.includes("500");
      const isTimeout = error.message && error.message.includes("timeout");

      if (isTooLarge) {
        console.warn(`⚠️ Batch too large (431/414): splitting in half`);
      } else if (isServerError) {
        console.warn(`🔥 Server error (500): splitting in half`);
      } else if (isTimeout) {
        console.warn(`⏱️ Batch timeout: splitting in half`);
      } else {
        console.warn("Batch failed, splitting in half:", error.message);
      }

      // Smart fallback: split in half and retry recursively
      // This is much faster than going one-by-one (O(log n) instead of O(n))
      if (nonEmptyTexts.length <= 1) {
        // Can't split further — return originals
        const results = new Array(batch.length);
        batch.forEach((t, i) => {
          results[i] = t || "";
        });
        return results;
      }

      const mid = Math.floor(nonEmptyTexts.length / 2);
      const leftBatch = batch.slice(0, mid);
      const rightBatch = batch.slice(mid);

      const [leftResults, rightResults] = await Promise.all([
        this.translateBatch(leftBatch),
        this.translateBatch(rightBatch),
      ]);

      return [...leftResults, ...rightResults];
    }
  }

  async translateLingvaChunk(chunk) {
    const epData = this.settings.getEndPointData();
    const endPointId = epData.id || this.settings.getEndPointSelection();

    const batches = this.createBatches(chunk, endPointId);

    // Record batch stats for metrics
    const delimiter = BATCH_TRANSLATION.delimiter;
    for (const b of batches) {
      const nonEmpty = b.filter((t) => t && t.trim());
      const combinedLen = nonEmpty.join(delimiter).length;
      TRANSLATION_METRICS.recordBatch(nonEmpty.length, combinedLen);
    }
    TRANSLATION_METRICS.totalStrings = chunk.length;

    console.log(
      `[Translator] ${batches.length} batches × ${endPointId} — ${chunk.length} strings`,
    );

    const allResults = new Array(batches.length);
    const maxParallel = MAX_PARALLEL_REQUESTS[endPointId] || 5;
    let currentIndex = 0;
    let completedStrings = 0;
    const totalStrings = chunk.length;
    let lastReportedProgress = -1;

    const worker = async () => {
      while (currentIndex < batches.length) {
        const i = currentIndex++;
        const batch = batches[i];

        try {
          allResults[i] = await this.translateBatch(batch);
          completedStrings += batch.length;

          // Throttle progress: fire every 2%
          const progress = Math.min(
            Math.round((completedStrings / totalStrings) * 100),
            99,
          );
          if (progress >= lastReportedProgress + 2) {
            lastReportedProgress = progress;
            TRANSLATE_PROGRESS.update(
              true,
              progress,
              `Translating... (${completedStrings}/${totalStrings})`,
            );
          }
        } catch (error) {
          allResults[i] = batch;
        }
      }
    };

    const workers = [];
    for (let j = 0; j < Math.min(maxParallel, batches.length); j++) {
      workers.push(worker());
    }

    await Promise.all(workers);
    return allResults.flat();
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

    // === PHASE 2: Collect ALL uncached strings from ALL targets into one pool ===
    let totalUncachedStrings = [];
    let uncachedSets = new Map();

    toTranslate.forEach((target) => {
      const uncachedSet = new Set();
      target.list.forEach((item) => {
        if (item && typeof item === "string" && item.trim()) {
          if (!TRANSLATION_BANK.get(item)) {
            uncachedSet.add(item);
          }
        }
      });
      if (uncachedSet.size > 0) {
        const uniqueList = Array.from(uncachedSet);
        uncachedSets.set(target.type, uniqueList);
        totalUncachedStrings.push(...uniqueList);
      }
    });

    // Remove duplicates across categories
    const finalPool = Array.from(new Set(totalUncachedStrings));
    const totalUncached = finalPool.length;

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

    // === PHASE 3: High-Concurrency Translation of the entire pool ===
    TRANSLATE_PROGRESS.update(true, 0, `Translating Pool (0/${totalUncached})`);
    TRANSLATION_METRICS.reset();
    TRANSLATION_METRICS.totalStrings = totalUncached;

    try {
      if (epData.isLingva) {
        await this.translateBulk(finalPool);
      } else {
        let completed = 0;
        for (const [type, uncached] of uncachedSets.entries()) {
          TRANSLATE_PROGRESS.update(
            true,
            Math.round((completed / totalUncached) * 100),
            `${type} (${completed}/${totalUncached})`,
          );
          if (isJpToKr || (epData.isLingva && !useBatch)) {
            for (let i = 0; i < uncached.length; i++) {
              await this.translate(uncached[i]);
              completed++;
            }
          } else {
            for (let i = 0; i < uncached.length; i += chunkSize) {
              const chunk = uncached.slice(i, i + chunkSize);
              await this.translateBulk(chunk);
              completed += chunk.length;
            }
          }
        }
      }
    } catch (err) {
      console.error("[Translator] Global translation failed", err);
    }

    // Print comprehensive metrics report
    TRANSLATION_METRICS.printReport();

    // Flush translation cache to disk (single write instead of 13,000+)
    TRANSLATION_BANK.flushCache();

    TRANSLATE_PROGRESS.update(false, 100, "Complete — Applying to game...");
    Alert.success(
      `Translation Complete! Translated ${totalUncached} unique strings.`,
    );
    window.dispatchEvent(new CustomEvent("cheat-translate-finish"));
    setTimeout(() => TRANSLATE_PROGRESS.update(false, 0, ""), 3000);
  }
}

/** @type {number | undefined} */
Translator._lastPublicReq = undefined;

export const TRANSLATOR = new Translator(TRANSLATE_SETTINGS);

// Initialize translation bank cleanup on load
setTimeout(() => {
  TRANSLATION_BANK.clearOldEntries();
}, 1000);
