import { getGameRootDir } from "../runtime/RuntimeEnv.js";

export class KeyValueStorage {
  constructor(filePath) {
    this.filePath = filePath;

    if (Utils.isNwjs()) {
      this.fileEncoding = "utf-8";
      this.fileSystem = require("fs");
      this.path = require("path");
    }
  }

  getItem(key) {
    if (!Utils.isNwjs()) {
      return localStorage.getItem(this.filePath + ":" + key);
    }

    return this.__getItemFromFile(key);
  }

  setItem(key, value) {
    if (!Utils.isNwjs()) {
      localStorage.setItem(this.filePath + ":" + key, value);
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

export const KEY_VALUE_STORAGE = new KeyValueStorage(
  `./${getGameRootDir()}/cheat-settings/kv-storage.json`,
);
