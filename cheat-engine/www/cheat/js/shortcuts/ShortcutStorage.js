// @ts-check

import { Alert } from "../AlertHelper.js";
import { isDesktopRuntime } from "../runtime/RuntimeEnv.js";

export class ShortcutStorage {
  /**
   * @param {string} settingsFile
   * @param {Record<string, any>} defaultSettings
   */
  constructor(settingsFile, defaultSettings) {
    this.settingsFile = settingsFile;
    this.defaultSettings = defaultSettings;
  }

  readRawSettings() {
    if (isDesktopRuntime()) {
      const fs = require("fs");
      const path = require("path");

      try {
        return JSON.parse(fs.readFileSync(this.settingsFile, "utf-8"));
      } catch (error) {
        try {
          this.writeRawSettings(this.defaultSettings);
          return JSON.parse(fs.readFileSync(this.settingsFile, "utf-8"));
        } catch (fileWriteError) {
          Alert.warn(
            "Can't initialize shortcut settings file. Use internal data instead.\n(You can use cheat plugin anyway)",
            error,
          );
          return this.defaultSettings;
        }
      }
    }

    console.warn("[cheat plugin warn] Use default settings");
    return this.defaultSettings;
  }

  /**
   * @param {Record<string, any>} shortcutSettings
   * @returns {void}
   */
  writeRawSettings(shortcutSettings) {
    if (isDesktopRuntime()) {
      const fs = require("fs");
      const path = require("path");

      try {
        fs.unlinkSync(this.settingsFile);
      } catch (error) {}

      const parentDir = path.dirname(this.settingsFile);

      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      fs.writeFileSync(
        this.settingsFile,
        JSON.stringify(shortcutSettings, null, 2),
      );
    }
  }

  restoreDefaults() {
    if (isDesktopRuntime()) {
      try {
        require("fs").unlinkSync(this.settingsFile);
      } catch (error) {}
    }
  }
}
