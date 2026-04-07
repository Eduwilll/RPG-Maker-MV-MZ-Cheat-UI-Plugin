// @ts-check

import { Key } from "../KeyCodes.js";

/**
 * @param {Record<string, any> | undefined} paramSettings
 * @returns {Record<string, { id: string, value: any }>}
 */
export function buildShortcutParamState(paramSettings) {
  const param = /** @type {Record<string, { id: string, value: any }>} */ ({});

  if (!paramSettings) {
    return param;
  }

  for (const paramName of Object.keys(paramSettings)) {
    param[paramName] = {
      id: paramName,
      value: paramSettings[paramName],
    };
  }

  return param;
}

/**
 * @param {string} shortcutId
 * @param {{ shortcut: Key, param?: Record<string, any> }} settings
 * @param {{
 *   name?: string,
 *   desc?: string,
 *   necessary?: boolean,
 *   combiningKeyAlone?: boolean,
 *   param?: Record<string, any>
 * }} config
 * @returns {{
 *   id: string,
 *   name: string,
 *   desc: string,
 *   necessary: boolean,
 *   combiningKeyAlone: boolean,
 *   paramDesc: Record<string, any>,
 *   shortcut: Key,
 *   param: Record<string, { id: string, value: any }>
 * }}
 */
export function buildShortcutPanelItem(shortcutId, settings, config) {
  return {
    id: shortcutId,
    name: config.name || "",
    desc: config.desc || "",
    necessary: !!config.necessary,
    combiningKeyAlone: !!config.combiningKeyAlone,
    paramDesc: config.param || {},
    shortcut: Key.fromKey(settings.shortcut),
    param: buildShortcutParamState(settings.param),
  };
}

/**
 * @param {Record<string, any>} shortcutSettings
 * @param {Record<string, any>} shortcutConfig
 * @returns {ReturnType<typeof buildShortcutPanelItem>[]}
 */
export function buildShortcutPanelItems(shortcutSettings, shortcutConfig) {
  return Object.keys(shortcutConfig).map((shortcutId) =>
    buildShortcutPanelItem(
      shortcutId,
      shortcutSettings[shortcutId],
      shortcutConfig[shortcutId],
    ),
  );
}
