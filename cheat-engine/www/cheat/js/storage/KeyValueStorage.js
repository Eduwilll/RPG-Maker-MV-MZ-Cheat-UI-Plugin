import { getGameRootDir } from "../runtime/RuntimeEnv.js";

const DEFAULT_STORAGE_FILE = "cheat-settings/kv-storage.json";

export class KeyValueStorage {
  constructor(filePath) {
    // filePath is optional: when omitted it is resolved lazily on first use.
    // RPG Maker globals (Utils) do not exist yet while separate-window
    // modules are being evaluated, so nothing may touch them here.
    this.filePath = filePath || null;
    this.fileEncoding = "utf-8";
    this.fileSystem = null;
    this.path = null;
  }

  isDesktopRuntime() {
    try {
      return typeof Utils !== "undefined" && !!Utils && Utils.isNwjs();
    } catch (error) {
      return false;
    }
  }

  __resolveFilePath() {
    if (!this.filePath) {
      try {
        this.filePath = `./${getGameRootDir()}/${DEFAULT_STORAGE_FILE}`;
      } catch (error) {
        this.filePath = `./${DEFAULT_STORAGE_FILE}`;
      }
    }

    return this.filePath;
  }

  __resolveFileSystem() {
    if (!this.isDesktopRuntime()) {
      return null;
    }

    try {
      if (!this.fileSystem) {
        this.fileSystem = require("fs");
        this.path = require("path");
      }

      return this.fileSystem;
    } catch (error) {
      return null;
    }
  }

  getItem(key) {
    const filePath = this.__resolveFilePath();

    if (!this.__resolveFileSystem()) {
      return localStorage.getItem(filePath + ":" + key);
    }

    return this.__getItemFromFile(key);
  }

  setItem(key, value) {
    const filePath = this.__resolveFilePath();

    if (!this.__resolveFileSystem()) {
      localStorage.setItem(filePath + ":" + key, value);
      return;
    }

    this.__setItemToFile(key, value);
  }

  __readFile() {
    if (!this.fileSystem.existsSync(this.filePath)) {
      return {};
    }

    try {
      const text = this.fileSystem.readFileSync(
        this.filePath,
        this.fileEncoding,
      );
      return text ? JSON.parse(text) : {};
    } catch (error) {
      console.warn("[KeyValueStorage] Failed to read settings file", error);
      return {};
    }
  }

  __getItemFromFile(key) {
    return this.__readFile()[key];
  }

  __setItemToFile(key, value) {
    const data = this.__readFile();

    data[key] = value;

    const parentDir = this.path.dirname(this.filePath);
    if (!this.fileSystem.existsSync(parentDir)) {
      this.fileSystem.mkdirSync(parentDir, { recursive: true });
    }

    this.fileSystem.writeFileSync(this.filePath, JSON.stringify(data));
  }
}

export const KEY_VALUE_STORAGE = new KeyValueStorage();
