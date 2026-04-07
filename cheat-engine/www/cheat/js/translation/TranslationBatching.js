// @ts-check

import {
  BATCH_TRANSLATION,
  MAX_CHUNK_SIZE,
  MAX_PARALLEL_REQUESTS,
} from "./TranslationConfig.js";
import { TRANSLATE_PROGRESS } from "./TranslateProgress.js";
import { TRANSLATION_BANK, TRANSLATION_METRICS } from "./TranslationBank.js";

/**
 * @param {boolean} isLingva
 * @param {number} requestedSize
 * @param {string} endPointId
 * @returns {number}
 */
export function getAdaptiveChunkSize(isLingva, requestedSize, endPointId) {
  if (isLingva) {
    return 999999;
  }

  const maxSafe = MAX_CHUNK_SIZE[endPointId] || 50;

  if (requestedSize <= maxSafe) {
    return requestedSize;
  }

  console.warn(
    `Chunk size ${requestedSize} too large for ${endPointId}. Using safe limit: ${maxSafe}`,
  );
  return maxSafe;
}

/**
 * @param {string[]} texts
 * @param {number} chunkSize
 * @param {(chunk: string[]) => Promise<string[]>} translateBulkChunk
 * @returns {Promise<string[]>}
 */
export async function translateBulkOriginal(
  texts,
  chunkSize,
  translateBulkChunk,
) {
  console.log(`Using original translation method for ${texts.length} texts`);

  const textChunks = [];

  for (let i = 0; i < texts.length; i += chunkSize) {
    const chunk = texts.slice(i, Math.min(texts.length, i + chunkSize));
    console.log(
      `Processing chunk ${Math.floor(i / chunkSize) + 1}: ${chunk.length} items`,
    );
    textChunks.push(await translateBulkChunk(chunk));
  }

  const result = [].concat(...textChunks);
  console.log(
    `Original translation completed. Input: ${texts.length}, Output: ${result.length}`,
  );
  return result;
}

/**
 * @param {string[]} texts
 * @param {string} endPointId
 * @returns {string[][]}
 */
export function createBatches(texts, endPointId) {
  const config = BATCH_TRANSLATION;
  const maxLength = config.maxBatchLength[endPointId] || 1000;
  const maxEncodedLength = config.maxBatchEncodedLength?.[endPointId] || null;
  const maxItems = config.maxBatchItems[endPointId] || 20;
  const delimiter = config.delimiter;
  const encodedDelimiterLength = encodeURIComponent(delimiter).length;

  const batches = [];
  let currentBatch = [];
  let currentLength = 0;
  let currentEncodedLength = 0;

  for (const text of texts) {
    if (!text || !text.trim()) {
      currentBatch.push("");
      continue;
    }

    // Lingva-style GET endpoints are constrained by encoded URL length, not raw character count.
    // Japanese text expands significantly under encodeURIComponent, so batch sizing must use the
    // encoded payload size or local proxies/load balancers will drop the request.
    const textLength = text.length + delimiter.length;
    const encodedTextLength =
      encodeURIComponent(text).length + encodedDelimiterLength;

    if (
      currentBatch.length > 0 &&
      (currentLength + textLength > maxLength ||
        (maxEncodedLength !== null &&
          currentEncodedLength + encodedTextLength > maxEncodedLength) ||
        currentBatch.length >= maxItems)
    ) {
      batches.push(currentBatch);
      currentBatch = [text];
      currentLength = text.length;
      currentEncodedLength = encodeURIComponent(text).length;
    } else {
      currentBatch.push(text);
      currentLength += textLength;
      currentEncodedLength += encodedTextLength;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * @param {string[]} batch
 * @param {(text: string) => Promise<string>} translateText
 * @returns {Promise<string[]>}
 */
export async function translateBatch(batch, translateText) {
  const delimiter = BATCH_TRANSLATION.delimiter;
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
    return batch;
  }

  const combinedText = nonEmptyTexts.join(delimiter);

  try {
    const translatedCombined = await translateText(combinedText);
    const translatedParts = translatedCombined.split(delimiter);
    const results = new Array(batch.length);

    textMap.forEach((mapping) => {
      const originalStr = batch[mapping.originalIndex];

      if (
        mapping.batchIndex >= 0 &&
        mapping.batchIndex < translatedParts.length
      ) {
        const translatedStr = translatedParts[mapping.batchIndex].trim();
        results[mapping.originalIndex] = translatedStr;
        TRANSLATION_BANK.set(originalStr, translatedStr);
      } else {
        results[mapping.originalIndex] = batch[mapping.originalIndex] || "";
      }
    });

    return results;
  } catch (error) {
    const isTooLarge =
      error.message &&
      (error.message.includes("431") || error.message.includes("414"));
    const isServerError = error.message && error.message.includes("500");
    const isTimeout = error.message && error.message.includes("timeout");

    if (isTooLarge) {
      console.warn("Batch too large (431/414): splitting in half");
    } else if (isServerError) {
      console.warn("Server error (500): splitting in half");
    } else if (isTimeout) {
      console.warn("Batch timeout: splitting in half");
    } else {
      console.warn("Batch failed, splitting in half:", error.message);
    }

    if (nonEmptyTexts.length <= 1) {
      const results = new Array(batch.length);
      batch.forEach((text, index) => {
        results[index] = text || "";
      });
      return results;
    }

    const mid = Math.floor(nonEmptyTexts.length / 2);
    const leftBatch = batch.slice(0, mid);
    const rightBatch = batch.slice(mid);

    const [leftResults, rightResults] = await Promise.all([
      translateBatch(leftBatch, translateText),
      translateBatch(rightBatch, translateText),
    ]);

    return [...leftResults, ...rightResults];
  }
}

/**
 * @param {string[]} chunk
 * @param {string} endPointId
 * @param {(batch: string[]) => Promise<string[]>} translateBatchFn
 * @returns {Promise<string[]>}
 */
export async function translateLingvaChunk(
  chunk,
  endPointId,
  translateBatchFn,
) {
  const batches = createBatches(chunk, endPointId);
  const delimiter = BATCH_TRANSLATION.delimiter;

  for (const batch of batches) {
    const nonEmpty = batch.filter((text) => text && text.trim());
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
      const index = currentIndex++;
      const batch = batches[index];

      try {
        allResults[index] = await translateBatchFn(batch);
        completedStrings += batch.length;

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
        allResults[index] = batch;
      }
    }
  };

  const workers = [];
  for (let i = 0; i < Math.min(maxParallel, batches.length); i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return allResults.flat();
}
