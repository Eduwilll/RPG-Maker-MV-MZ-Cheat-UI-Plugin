// @ts-check

import { buildTranslatedNameDescRow } from "../PanelTranslation.js";

/**
 * @template T
 * @param {Array<T> | null | undefined} items
 * @returns {Array<T>}
 */
export function readInventoryPanelItems(items) {
  return Array.isArray(items) ? items.slice() : [];
}

/**
 * @param {BaseData} item
 * @param {boolean} isTranslated
 */
export function buildInventoryTableRow(item, isTranslated) {
  return buildTranslatedNameDescRow(item, isTranslated);
}
