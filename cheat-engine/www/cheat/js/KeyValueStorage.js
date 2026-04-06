// @ts-check

import { isDesktopRuntime } from "./RuntimeEnv.js";

/**
 * Small persistence wrapper that writes to JSON in NW.js and
 * falls back to browser localStorage in preview mode.
 */
export class KeyValueStorage {
  /**
   * @param {string} filePath
   */
  constructor(filePath) {
    /** @type {string} */
    this.filePath = filePath;
    /** @type {BufferEncoding} */
    this.fileEncoding = "utf-8";
    /** @type {typeof import("fs") | null} */
    this.fileSystem = null;

    if (isDesktopRuntime()) {
      // Loaded lazily so preview mode can run without Node's fs.
      this.fileSystem = require("fs");
    }
  }

  /**
   * @param {string} key
   * @returns {any}
   */
  getItem(key) {
    if (!isDesktopRuntime()) {
      return localStorage.getItem(this.filePath + ":" + key);
    }

    return this.__getItemFromFile(key);
  }

  /**
   * @param {string} key
   * @param {string} value
   * @returns {void}
   */
  setItem(key, value) {
    if (!isDesktopRuntime()) {
      localStorage.setItem(this.filePath + ":" + key, value);
      return;
    }

    this.__setItemToFile(key, value);
  }

  /**
   * @returns {Record<string, any>}
   */
  __readFile() {
    if (!this.fileSystem || !this.fileSystem.existsSync(this.filePath)) {
      return {};
    }

    return JSON.parse(
      this.fileSystem.readFileSync(this.filePath, this.fileEncoding),
    );
  }

  /**
   * @param {string} key
   * @returns {any}
   */
  __getItemFromFile(key) {
    return this.__readFile()[key];
  }

  /**
   * @param {string} key
   * @param {string} value
   * @returns {void}
   */
  __setItemToFile(key, value) {
    if (!this.fileSystem) {
      return;
    }

    const data = this.__readFile();

    data[key] = value;

    this.fileSystem.writeFileSync(this.filePath, JSON.stringify(data));
  }
}

export const KEY_VALUE_STORAGE = new KeyValueStorage(
  "./www/cheat-settings/kv-storage.json",
);
