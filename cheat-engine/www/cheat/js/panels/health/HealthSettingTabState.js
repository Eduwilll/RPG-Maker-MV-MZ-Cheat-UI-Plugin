// @ts-check

import { clonePanelState } from "../PanelGameState.js";
import { deepFreeze } from "../../ui/StaticData.js";

export const HEALTH_SETTING_TABLE_HEADERS = deepFreeze([
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
]);

/**
 * @template T
 * @param {T} items
 * @returns {T}
 */
export function cloneHealthSettingItems(items) {
  return clonePanelState(items);
}
