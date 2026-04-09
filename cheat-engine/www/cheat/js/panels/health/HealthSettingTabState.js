// @ts-check

import { clonePanelState } from "../PanelGameState.js";

export const HEALTH_SETTING_TABLE_HEADERS = [
  {
    text: "Name",
    value: "name",
  },
  {
    text: "Hp",
    value: "hp",
  },
  {
    text: "Mp",
    value: "mp",
  },
];

/**
 * @template T
 * @param {T} items
 * @returns {T}
 */
export function cloneHealthSettingItems(items) {
  return clonePanelState(items);
}
