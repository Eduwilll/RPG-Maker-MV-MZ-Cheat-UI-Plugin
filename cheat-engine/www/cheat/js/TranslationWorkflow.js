// @ts-check

import { TRANSLATE_PROGRESS } from "./TranslateProgress.js";

/**
 * @param {Map<string, string[]>} uncachedSets
 * @param {number} totalUncached
 * @param {number} chunkSize
 * @param {boolean} isJpToKr
 * @param {boolean} useBatch
 * @param {(text: string) => Promise<string>} translateOne
 * @param {(chunk: string[]) => Promise<string[]>} translateBulk
 * @returns {Promise<void>}
 */
export async function translateUncachedSets(
  uncachedSets,
  totalUncached,
  chunkSize,
  isJpToKr,
  useBatch,
  translateOne,
  translateBulk,
) {
  let completed = 0;

  for (const [type, uncached] of uncachedSets.entries()) {
    TRANSLATE_PROGRESS.update(
      true,
      Math.round((completed / totalUncached) * 100),
      `${type} (${completed}/${totalUncached})`,
    );

    if (isJpToKr || !useBatch) {
      for (let i = 0; i < uncached.length; i++) {
        await translateOne(uncached[i]);
        completed++;
      }
      continue;
    }

    for (let i = 0; i < uncached.length; i += chunkSize) {
      const chunk = uncached.slice(i, i + chunkSize);
      await translateBulk(chunk);
      completed += chunk.length;
    }
  }
}
