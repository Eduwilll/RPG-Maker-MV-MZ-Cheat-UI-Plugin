// @ts-check

import { TRANSLATION_BANK } from "../TranslateHelper.js";

/**
 * @param {string | undefined} text
 * @returns {string}
 */
export function getCachedTranslatedText(text) {
  if (!text || !text.trim()) {
    return text || "";
  }

  const cached = TRANSLATION_BANK.get(text);
  return cached ? cached.translated : text;
}

/**
 * @param {string | undefined} text
 * @param {boolean} translateEnabled
 * @returns {string}
 */
export function getTranslatedPanelText(text, translateEnabled) {
  if (!translateEnabled) {
    return text || "";
  }

  return getCachedTranslatedText(text);
}

/**
 * @param {{ name?: string, description?: string }} item
 * @param {boolean} translateEnabled
 * @returns {{ name: string, desc: string | undefined }}
 */
export function buildTranslatedNameDescRow(item, translateEnabled) {
  if (!translateEnabled) {
    return {
      name: item.name || "",
      desc: item.description,
    };
  }

  return {
    name: getCachedTranslatedText(item.name),
    desc: getCachedTranslatedText(item.description),
  };
}

/**
 * @param {{
 *   initializeVariables?: () => any,
 *   _translateListener?: ((...args: any[]) => void) | null
 * }} panel
 * @param {() => boolean} shouldRefresh
 * @returns {void}
 */
export function attachTranslateRefresh(panel, shouldRefresh) {
  panel._translateListener = () => {
    if (shouldRefresh() && typeof panel.initializeVariables === "function") {
      panel.initializeVariables();
    }
  };
  window.addEventListener("cheat-translate-finish", panel._translateListener);
}

/**
 * @param {{ _translateListener?: ((...args: any[]) => void) | null }} panel
 * @returns {void}
 */
export function detachTranslateRefresh(panel) {
  if (panel._translateListener) {
    window.removeEventListener(
      "cheat-translate-finish",
      panel._translateListener,
    );
    panel._translateListener = null;
  }
}
