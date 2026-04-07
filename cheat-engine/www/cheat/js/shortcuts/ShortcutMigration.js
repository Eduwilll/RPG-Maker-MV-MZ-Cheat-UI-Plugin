// @ts-check

import { Key } from "../KeyCodes.js";
import {
  defaultShortcutSettings,
  parseStringToKeyObject,
} from "./ShortcutConfig.js";

/**
 * @param {Record<string, any>} shortcutSettings
 * @param {Record<string, any>} shortcutConfigMap
 * @returns {{ migrated: boolean, shortcutSettings: Record<string, any> }}
 */
export function migrateShortcutSettings(shortcutSettings, shortcutConfigMap) {
  let migrated = false;
  let defaultSettings = null;

  const assignedKeys = new Set(
    Object.values(shortcutSettings).map((setting) =>
      setting.shortcut.asString(),
    ),
  );

  for (const shortcutConfig of Object.values(shortcutConfigMap)) {
    if (!Object.hasOwnProperty.call(shortcutSettings, shortcutConfig.id)) {
      if (!defaultSettings) {
        defaultSettings = parseStringToKeyObject(defaultShortcutSettings);
      }

      const defaultSetting = defaultSettings[shortcutConfig.id];
      if (
        !defaultSetting.shortcut.isEmpty() &&
        assignedKeys.has(defaultSetting.shortcut.asString())
      ) {
        console.warn(
          `key conflicts while migrating : ${shortcutConfig.name} - ${defaultSetting.shortcut.asString()}`,
        );
        defaultSetting.shortcut = Key.createEmpty();
      }

      assignedKeys.add(defaultSetting.shortcut.asString());
      shortcutSettings[shortcutConfig.id] = defaultSettings[shortcutConfig.id];
      migrated = true;
    }
  }

  return { migrated, shortcutSettings };
}
