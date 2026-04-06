// @ts-check

import { KeyValueStorage } from "./KeyValueStorage.js";

/**
 * TranslationBank caches translated strings on disk so in-game translation
 * can reuse prior results without re-calling the selected service.
 */
class TranslationBank {
  constructor() {
    /** @type {KeyValueStorage} */
    this.storage = new KeyValueStorage(
      "./www/cheat-settings/translation-bank.json",
    );
    /** @type {Record<string, TranslationCacheEntry>} */
    this.cache = this.loadCache();
    /** @type {boolean} */
    this._dirty = false;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this._saveTimer = null;
  }

  loadCache() {
    try {
      const data = this.storage.getItem("translations");
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.warn("Failed to load translation cache:", error);
      return {};
    }
  }

  saveCache() {
    try {
      this.storage.setItem("translations", JSON.stringify(this.cache));
    } catch (error) {
      console.error("Failed to save translation cache:", error);
    }
  }

  // Debounced save: batches all writes into one disk operation.
  debouncedSave() {
    this._dirty = true;
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      if (this._dirty) {
        this.saveCache();
        this._dirty = false;
      }
    }, 5000);
  }

  flushCache() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    this.saveCache();
    this._dirty = false;
    console.log(
      `Translation bank saved with ${Object.keys(this.cache).length} entries`,
    );
  }

  get(originalText) {
    if (!originalText || typeof originalText !== "string") return null;
    const key = this.createKey(originalText);
    return this.cache[key] || null;
  }

  set(originalText, translatedText) {
    if (!originalText || !translatedText || typeof originalText !== "string") {
      return;
    }
    if (originalText === translatedText) return;

    const key = this.createKey(originalText);
    this.cache[key] = {
      original: originalText,
      translated: translatedText,
      timestamp: Date.now(),
      source: "lingva",
    };
    this.debouncedSave();
  }

  createKey(text) {
    if (!text || typeof text !== "string") return "";
    return text.trim().toLowerCase().replace(/\s+/g, " ");
  }

  getStats() {
    const entries = Object.values(this.cache);
    return {
      totalEntries: entries.length,
      oldestEntry:
        entries.length > 0
          ? Math.min(...entries.map((entry) => entry.timestamp))
          : null,
      newestEntry:
        entries.length > 0
          ? Math.max(...entries.map((entry) => entry.timestamp))
          : null,
    };
  }

  clearOldEntries(maxAge = 30 * 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - maxAge;
    const oldSize = Object.keys(this.cache).length;

    Object.keys(this.cache).forEach((key) => {
      if (this.cache[key].timestamp < cutoff) {
        delete this.cache[key];
      }
    });

    const newSize = Object.keys(this.cache).length;
    if (oldSize !== newSize) {
      this.saveCache();
      console.log(`Cleaned translation bank: ${oldSize} -> ${newSize} entries`);
    }
  }

  export() {
    return JSON.stringify(this.cache, null, 2);
  }

  import(jsonData) {
    try {
      const imported = JSON.parse(jsonData);
      this.cache = { ...this.cache, ...imported };
      this.saveCache();
      return true;
    } catch (error) {
      console.error("Failed to import translation data:", error);
      return false;
    }
  }
}

class TranslationMetrics {
  constructor() {
    this.reset();
  }

  reset() {
    /** @type {number} */
    this.startTime = Date.now();
    /** @type {number[]} */
    this.requestLatencies = [];
    /** @type {number[]} */
    this.batchSizes = [];
    /** @type {number[]} */
    this.batchCharLens = [];
    /** @type {Record<string, number>} */
    this.requestsPerNode = {};
    this.errors = {
      timeout: 0,
      http429: 0,
      http431: 0,
      http404: 0,
      http500: 0,
      other: 0,
    };
    this.totalStrings = 0;
    this.totalBatches = 0;
    this.cacheHits = 0;
  }

  recordRequest(domain, latencyMs) {
    this.requestLatencies.push(latencyMs);
    this.requestsPerNode[domain] = (this.requestsPerNode[domain] || 0) + 1;
  }

  recordBatch(itemCount, charLen) {
    this.batchSizes.push(itemCount);
    this.batchCharLens.push(charLen);
    this.totalBatches++;
  }

  recordError(type) {
    if (type === "timeout") this.errors.timeout++;
    else if (type === "429") this.errors.http429++;
    else if (type === "431") this.errors.http431++;
    else if (type === "404") this.errors.http404++;
    else if (type === "500") this.errors.http500++;
    else this.errors.other++;
  }

  percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((sorted.length * p) / 100) - 1;
    return sorted[Math.max(0, idx)];
  }

  printReport() {
    const elapsed = Date.now() - this.startTime;
    const elapsedStr =
      elapsed >= 60000
        ? `${Math.floor(elapsed / 60000)}m ${Math.round((elapsed % 60000) / 1000)}s`
        : `${(elapsed / 1000).toFixed(1)}s`;

    const avgLatency =
      this.requestLatencies.length > 0
        ? Math.round(
            this.requestLatencies.reduce((a, b) => a + b, 0) /
              this.requestLatencies.length,
          )
        : 0;
    const p95 = this.percentile(this.requestLatencies, 95);
    const p50 = this.percentile(this.requestLatencies, 50);
    const minLatency =
      this.requestLatencies.length > 0 ? Math.min(...this.requestLatencies) : 0;
    const maxLatency =
      this.requestLatencies.length > 0 ? Math.max(...this.requestLatencies) : 0;

    const avgBatchSize =
      this.batchSizes.length > 0
        ? Math.round(
            this.batchSizes.reduce((a, b) => a + b, 0) / this.batchSizes.length,
          )
        : 0;
    const avgBatchChars =
      this.batchCharLens.length > 0
        ? Math.round(
            this.batchCharLens.reduce((a, b) => a + b, 0) /
              this.batchCharLens.length,
          )
        : 0;

    const throughput =
      elapsed > 0 ? (this.totalStrings / (elapsed / 1000)).toFixed(1) : "0";

    console.log(`\n${"=".repeat(60)}`);
    console.log("  TRANSLATION METRICS REPORT");
    console.log(`${"=".repeat(60)}`);
    console.log(`  Total wall-clock time:   ${elapsedStr}`);
    console.log(
      `  Strings translated:      ${this.totalStrings.toLocaleString()}`,
    );
    console.log(
      `  Cache hits (skipped):    ${this.cacheHits.toLocaleString()}`,
    );
    console.log(`  Throughput:              ${throughput} strings/second`);
    console.log(`  ${"-".repeat(41)}`);
    console.log(`  HTTP Requests made:      ${this.requestLatencies.length}`);
    console.log(`  Total batches:           ${this.totalBatches}`);
    console.log(
      `  Avg batch size:          ${avgBatchSize} items, ${avgBatchChars} chars`,
    );
    console.log(`  ${"-".repeat(41)}`);
    console.log(
      `  Latency (min/avg/p50/p95/max): ${minLatency}/${avgLatency}/${p50}/${p95}/${maxLatency} ms`,
    );
    console.log(`  ${"-".repeat(41)}`);
    console.log(
      `  Errors:  timeout=${this.errors.timeout}  429=${this.errors.http429}  431=${this.errors.http431}  404=${this.errors.http404}  500=${this.errors.http500}  other=${this.errors.other}`,
    );
    console.log(`  ${"-".repeat(41)}`);
    console.log("  Requests per node:");
    for (const [domain, count] of Object.entries(this.requestsPerNode)) {
      console.log(`    ${domain}: ${count} requests`);
    }
    console.log(`${"=".repeat(60)}\n`);
  }
}

export const TRANSLATION_BANK = new TranslationBank();
export const TRANSLATION_METRICS = new TranslationMetrics();
