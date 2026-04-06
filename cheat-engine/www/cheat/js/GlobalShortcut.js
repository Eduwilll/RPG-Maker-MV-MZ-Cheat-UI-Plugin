// @ts-check

import { Alert } from "./AlertHelper.js";
import { Key } from "./KeyCodes.js";
import { ShortcutMap } from "./ShortcutHelper.js";
import { migrateShortcutSettings } from "./ShortcutMigration.js";
import { ShortcutStorage } from "./ShortcutStorage.js";
import {
  defaultShortcutSettings,
  parseKeyObjectToString,
  parseStringToKeyObject,
  shortcutConfig,
  ShortcutConfig,
} from "./ShortcutConfig.js";

class GlobalShortcut {
  constructor() {
    this.initialize();
  }

  initialize() {
    console.log("__global shortcut initialized");

    this.shortcutSettingsFile = "./www/cheat-settings/shortcuts.json";
    this.storage = new ShortcutStorage(
      this.shortcutSettingsFile,
      defaultShortcutSettings,
    );

    // initialize shortcut settings
    this.shortcutSettings = {};
    this.readShortcutSettings();

    // initialize shortcut config
    this.shortcutConfig = {};
    this.initializeShortcutConfig();

    // migrate if settings file is old version
    this.migrateShortcutSettings();

    // initialize shortcut map
    this.shortcutMap = new ShortcutMap();
    this.initializeShortcutMap();
  }

  initializeShortcutConfig() {
    this.shortcutConfig = {};

    for (const key of Object.keys(shortcutConfig)) {
      this.shortcutConfig[key] = new ShortcutConfig(key, shortcutConfig[key]);
    }
  }

  migrateShortcutSettings() {
    const migration = migrateShortcutSettings(
      this.shortcutSettings,
      this.shortcutConfig,
    );
    this.shortcutSettings = migration.shortcutSettings;

    if (migration.migrated) {
      console.warn("__settings migrated");
      this.writeShortcutSettings();
    }
  }

  initializeShortcutMap() {
    for (const shortcutConfig of Object.values(this.shortcutConfig)) {
      const shortcutSetting = this.shortcutSettings[shortcutConfig.id];

      this.shortcutMap.register(
        shortcutSetting.shortcut,
        shortcutConfig,
        shortcutConfig.getEnterAction(shortcutSetting),
        shortcutConfig.getRepeatAction(shortcutSetting),
        shortcutConfig.getLeaveAction(shortcutSetting),
      );
    }
  }

  runKeyEnterEvent(e, key) {
    if (this.shortcutMap.runEnterAction(key)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
    }
  }

  runKeyRepeatEvent(e, key) {
    if (this.shortcutMap.runRepeatAction(key)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
    }
  }

  runKeyLeaveEvent(e, key) {
    if (this.shortcutMap.runLeaveAction(key)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
    }
  }

  /**
   * read raw shortcut settings
   *
   */
  readRawShortcutSettings() {
    return this.storage.readRawSettings();
  }

  /**
   * read and parse shortcut settings
   */
  readShortcutSettings() {
    const rawSettings = this.readRawShortcutSettings();
    this.shortcutSettings = {};

    try {
      this.shortcutSettings = parseStringToKeyObject(rawSettings);
    } catch (err) {
      Alert.warn(
        "Can't parse shortcut settings. Use default settings instead.\n(You can use cheat plugin anyway)",
        err,
      );

      try {
        this.shortcutSettings = parseStringToKeyObject(defaultShortcutSettings);
      } catch (err) {
        Alert.error(
          "Can't parse shortcut settings. Cheat plugin will not work properly",
          err,
        );
      }
    }
  }

  writeRawShortcutSettings(shortcutSettings) {
    this.storage.writeRawSettings(shortcutSettings);
  }

  writeShortcutSettings() {
    this.writeRawShortcutSettings(
      parseKeyObjectToString(this.shortcutSettings),
    );
  }

  restoreDefaultSettings() {
    this.storage.restoreDefaults();
    this.initialize();
  }

  getSettings(shortcutId) {
    return this.shortcutSettings[shortcutId];
  }

  getConfig(shortcutId) {
    return this.shortcutConfig[shortcutId];
  }

  getParamConfig(shortcutId, paramId) {
    return this.getConfig(shortcutId).param[paramId];
  }

  getParam(shortcutId, paramId) {
    return this.getSettings(shortcutId).param[paramId];
  }

  getShortcut(shortcutId) {
    return this.getSettings(shortcutId).shortcut;
  }

  setShortcut(shortcutId, newKey) {
    // not need to change shortcut
    const prevKey = this.getShortcut(shortcutId);
    if (prevKey.equals(newKey)) {
      return;
    }

    const existingValue = this.shortcutMap.getValue(newKey);
    if (existingValue) {
      throw Error(
        `Conflict with existing shortcut : [${newKey.asDisplayString()}] ${existingValue.name}`,
      );
    }

    // remove prev key binding if prev key exists
    this.shortcutMap.remove(prevKey);

    // bind key
    const currValue = this.getConfig(shortcutId);
    const currSettings = this.getSettings(shortcutId);
    this.shortcutMap.register(
      newKey,
      currValue,
      currValue.getEnterAction(currSettings),
      currValue.getRepeatAction(currSettings),
      currValue.getLeaveAction(currSettings),
    );

    // change settings
    currSettings.shortcut = newKey;

    // write changed settings
    this.writeShortcutSettings();
  }

  setParam(shortcutId, paramId, newValue) {
    const paramConfig = this.getParamConfig(shortcutId, paramId);

    const invalidMsg = paramConfig.isInvalidValue(newValue);

    if (invalidMsg) {
      throw Error(invalidMsg);
    }

    this.getSettings(shortcutId).param[paramId] =
      paramConfig.convertValue(newValue);

    this.writeShortcutSettings();
  }
}

export const GLOBAL_SHORTCUT = new GlobalShortcut();
