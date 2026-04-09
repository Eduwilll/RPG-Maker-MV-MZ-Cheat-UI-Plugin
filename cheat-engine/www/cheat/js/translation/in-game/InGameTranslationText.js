// @ts-check

/**
 * @param {string} text
 * @returns {string}
 */
export function stripEscapeCodes(text) {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(/\\C\[\d+\]/gi, "")
    .replace(/\\I\[\d+\]/gi, "")
    .replace(/\\V\[\d+\]/gi, "")
    .replace(/\\N\[\d+\]/gi, "")
    .replace(/\\P\[\d+\]/gi, "")
    .replace(/\\G/gi, "")
    .replace(/\\{/g, "")
    .replace(/\\}/g, "")
    .replace(/\\!/g, "")
    .replace(/\\\./g, "")
    .replace(/\\\|/g, "")
    .replace(/\\>/g, "")
    .replace(/\\</g, "")
    .replace(/\\\^/g, "")
    .replace(/\x1b[A-Za-z]\[\d+\]/g, "")
    .replace(/\x1b[A-Za-z]/g, "")
    .trim();
}

/**
 * @param {string} text
 * @param {TranslationBankLike} translationBank
 * @returns {string}
 */
export function findCachedTranslatedText(text, translationBank) {
  if (!text || typeof text !== "string" || !text.trim()) {
    return text;
  }

  const plainText = stripEscapeCodes(text);
  const cached = translationBank.get(plainText);
  if (cached) {
    return cached.translated;
  }

  const cachedFull = translationBank.get(text);
  if (cachedFull) {
    return cachedFull.translated;
  }

  return text;
}
