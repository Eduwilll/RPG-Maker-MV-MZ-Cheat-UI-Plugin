// @ts-check

/**
 * @param {Array<{ type: string, list: any[] }>} targets
 * @param {TranslationBankLike} translationBank
 * @returns {{ uncachedSets: Map<string, string[]>, finalPool: string[], totalUncached: number }}
 */
export function buildUncachedTranslationPool(targets, translationBank) {
  /** @type {string[]} */
  const totalUncachedStrings = [];
  /** @type {Map<string, string[]>} */
  const uncachedSets = new Map();

  targets.forEach((target) => {
    const uncachedSet = new Set();

    target.list.forEach((item) => {
      if (item && typeof item === "string" && item.trim()) {
        if (!translationBank.get(item)) {
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

  const finalPool = Array.from(new Set(totalUncachedStrings));

  return {
    uncachedSets,
    finalPool,
    totalUncached: finalPool.length,
  };
}
