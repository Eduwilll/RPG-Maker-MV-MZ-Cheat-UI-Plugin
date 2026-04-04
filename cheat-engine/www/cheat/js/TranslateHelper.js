import { KeyValueStorage } from "./KeyValueStorage.js";
import { Alert } from "./AlertHelper.js";

// Translation Bank for caching translations
class TranslationBank {
  constructor() {
    this.storage = new KeyValueStorage(
      "./www/cheat-settings/translation-bank.json",
    );
    this.cache = this.loadCache();
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

  // Debounced save: batches all writes into one disk operation
  // This prevents 13,000+ synchronous writeFileSync calls during bulk translation
  debouncedSave() {
    this._dirty = true;
    if (this._saveTimer) return; // Already scheduled
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      if (this._dirty) {
        this.saveCache();
        this._dirty = false;
      }
    }, 5000); // Save at most once every 5 seconds
  }

  // Force immediate save (call at end of bulk translation)
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

  // Get cached translation
  get(originalText) {
    if (!originalText || typeof originalText !== "string") return null;
    const key = this.createKey(originalText);
    return this.cache[key] || null;
  }

  // Store successful translation
  set(originalText, translatedText) {
    if (!originalText || !translatedText || typeof originalText !== "string")
      return;
    if (originalText === translatedText) return; // Don't cache unchanged text

    const key = this.createKey(originalText);
    this.cache[key] = {
      original: originalText,
      translated: translatedText,
      timestamp: Date.now(),
      source: "lingva",
    };
    this.debouncedSave(); // Batched disk write instead of per-string
  }

  // Create consistent cache key
  createKey(text) {
    if (!text || typeof text !== "string") return "";
    // Normalize whitespace and newlines for consistent lookup
    return text.trim().toLowerCase().replace(/\s+/g, " ");
  }

  // Get cache statistics
  getStats() {
    const entries = Object.values(this.cache);
    return {
      totalEntries: entries.length,
      oldestEntry:
        entries.length > 0
          ? Math.min(...entries.map((e) => e.timestamp))
          : null,
      newestEntry:
        entries.length > 0
          ? Math.max(...entries.map((e) => e.timestamp))
          : null,
    };
  }

  // Clear old entries (optional maintenance)
  clearOldEntries(maxAge = 30 * 24 * 60 * 60 * 1000) {
    // 30 days default
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
      console.log(`Cleaned translation bank: ${oldSize} → ${newSize} entries`);
    }
  }

  // Export/import for backup
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

// Global translation bank instance
export const TRANSLATION_BANK = new TranslationBank();

// ============================================================================
// Translation Metrics — measures where time is actually spent
// ============================================================================
class TranslationMetrics {
  constructor() {
    this.reset();
  }

  reset() {
    this.startTime = Date.now();
    this.requestLatencies = []; // ms per HTTP request
    this.batchSizes = []; // items per batch
    this.batchCharLens = []; // raw chars per batch
    this.requestsPerNode = {}; // count per domain
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

    console.log(`\n${"═".repeat(60)}`);
    console.log(`  TRANSLATION METRICS REPORT`);
    console.log(`${"═".repeat(60)}`);
    console.log(`  Total wall-clock time:   ${elapsedStr}`);
    console.log(
      `  Strings translated:      ${this.totalStrings.toLocaleString()}`,
    );
    console.log(
      `  Cache hits (skipped):    ${this.cacheHits.toLocaleString()}`,
    );
    console.log(`  Throughput:              ${throughput} strings/second`);
    console.log(`  ─────────────────────────────────────────`);
    console.log(`  HTTP Requests made:      ${this.requestLatencies.length}`);
    console.log(`  Total batches:           ${this.totalBatches}`);
    console.log(
      `  Avg batch size:          ${avgBatchSize} items, ${avgBatchChars} chars`,
    );
    console.log(`  ─────────────────────────────────────────`);
    console.log(
      `  Latency (min/avg/p50/p95/max): ${minLatency}/${avgLatency}/${p50}/${p95}/${maxLatency} ms`,
    );
    console.log(`  ─────────────────────────────────────────`);
    console.log(
      `  Errors:  timeout=${this.errors.timeout}  429=${this.errors.http429}  431=${this.errors.http431}  404=${this.errors.http404}  500=${this.errors.http500}  other=${this.errors.other}`,
    );
    console.log(`  ─────────────────────────────────────────`);
    console.log(`  Requests per node:`);
    for (const [domain, count] of Object.entries(this.requestsPerNode)) {
      console.log(`    ${domain}: ${count} requests`);
    }
    console.log(`${"═".repeat(60)}\n`);
  }
}

export const TRANSLATION_METRICS = new TranslationMetrics();

export const END_POINT_URL_PATTERN_TEXT_SYMBOL = "${TEXT}";

export const DEFAULT_END_POINTS = {
  ezTransWeb: {
    id: "ezTransWeb",
    name: "ezTransWeb (JP → KR)",
    helpUrl: "https://github.com/HelloKS/ezTransWeb",
    data: {
      method: "get",
      urlPattern: `http://localhost:5000/translate?text=${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
    },
  },

  ezTransServer: {
    id: "ezTransServer",
    name: "eztrans-server (JP → KR)",
    helpUrl: "https://github.com/nanikit/eztrans-server",
    data: {
      method: "post",
      urlPattern: `http://localhost:8000`,
      body: END_POINT_URL_PATTERN_TEXT_SYMBOL,
    },
  },

  lingva: {
    id: "lingva",
    name: "Lingva Translate (Auto-detect → EN)",
    helpUrl: "https://github.com/thedaviddelta/lingva-translate",
    data: {
      id: "lingva",
      method: "get",
      urlPattern: `https://lingva.ml/api/v1/auto/en/${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
      isLingva: true,
      sourceLang: "auto",
    },
  },
  lingvaJa: {
    id: "lingvaJa",
    name: "Lingva Translate (JA → EN)",
    helpUrl: "https://github.com/thedaviddelta/lingva-translate",
    data: {
      id: "lingvaJa",
      method: "get",
      urlPattern: `https://lingva.ml/api/v1/ja/en/${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
      isLingva: true,
      sourceLang: "ja",
    },
  },
  lingvaLocal: {
    id: "lingvaLocal",
    name: "Local Lingva Docker (localhost:3000, JA → EN)",
    helpUrl: "https://github.com/thedaviddelta/lingva-translate",
    data: {
      id: "lingvaLocal",
      method: "get",
      urlPattern: `http://localhost:3000/api/v1/ja/en/${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
      isLingva: true,
      sourceLang: "ja",
      isLocal: true,
    },
  },
  lingvaLocalAuto: {
    id: "lingvaLocalAuto",
    name: "Local Lingva Docker (localhost:3000, Auto-detect → EN)",
    helpUrl: "https://github.com/thedaviddelta/lingva-translate",
    data: {
      id: "lingvaLocalAuto",
      method: "get",
      urlPattern: `http://localhost:3000/api/v1/auto/en/${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
      isLingva: true,
      sourceLang: "auto",
      isLocal: true,
      localDomain: "http://localhost:3000",
    },
  },
  lingvaLocalBalanced: {
    id: "lingvaLocalBalanced",
    name: "Local Lingva Docker (Ports 3000, 3001, 3002 Load Balanced, JA → EN)",
    helpUrl: "https://github.com/thedaviddelta/lingva-translate",
    data: {
      id: "lingvaLocalBalanced",
      method: "get",
      urlPattern: `http://localhost:3000/api/v1/ja/en/${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
      isLingva: true,
      sourceLang: "ja",
      isLocal: true,
      localDomain:
        "http://localhost:3000,http://localhost:3001,http://localhost:3002",
    },
  },
  lingvaLocalBalancedAuto: {
    id: "lingvaLocalBalancedAuto",
    name: "Local Lingva Docker (Ports 3000, 3001, 3002 Load Balanced, Auto → EN)",
    helpUrl: "https://github.com/thedaviddelta/lingva-translate",
    data: {
      id: "lingvaLocalBalancedAuto",
      method: "get",
      urlPattern: `http://localhost:3000/api/v1/auto/en/${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
      isLingva: true,
      sourceLang: "auto",
      isLocal: true,
      localDomain:
        "http://localhost:3000,http://localhost:3001,http://localhost:3002",
    },
  },

  // ─── LLM Endpoints ────────────────────────────────────────
  ollamaLocal: {
    id: "ollamaLocal",
    name: "🤖 Ollama Local LLM (localhost:11434, JA → EN)",
    helpUrl: "https://ollama.com",
    data: {
      id: "ollamaLocal",
      isLLM: true,
      isLocal: true,
      apiUrl: "http://localhost:11434/v1/chat/completions",
      model: "qwen3:8b",
      sourceLang: "Japanese",
      targetLang: "English",
    },
  },
  openai: {
    id: "openai",
    name: "🤖 OpenAI API (GPT-4o-mini, JA → EN)",
    helpUrl: "https://platform.openai.com/api-keys",
    data: {
      id: "openai",
      isLLM: true,
      isLocal: false,
      apiUrl: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
      sourceLang: "Japanese",
      targetLang: "English",
      requiresApiKey: true,
    },
  },
  googleGemini: {
    id: "googleGemini",
    name: "🤖 Google Gemini API (JA → EN)",
    helpUrl: "https://aistudio.google.com/app/apikey",
    data: {
      id: "googleGemini",
      isLLM: true,
      isLocal: false,
      apiUrl:
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      model: "gemini-2.0-flash",
      sourceLang: "Japanese",
      targetLang: "English",
      requiresApiKey: true,
    },
  },
  llmCustom: {
    id: "llmCustom",
    name: "🤖 Custom LLM API (OpenAI-compatible)",
    helpUrl: "https://ollama.com",
    data: {
      id: "llmCustom",
      isLLM: true,
      isLocal: true,
      apiUrl: "http://localhost:11434/v1/chat/completions",
      model: "qwen3:8b",
      sourceLang: "Japanese",
      targetLang: "English",
    },
  },
};

export const RECOMMEND_CHUNK_SIZE = {
  ezTransWeb: 500,
  ezTransServer: 100,
  lingva: 10,
  lingvaJa: 10,
  lingvaLocal: 50,
  lingvaLocalAuto: 50,
  lingvaLocalBalanced: 100,
  lingvaLocalBalancedAuto: 100,
  ollamaLocal: 100,
  openai: 100,
  googleGemini: 100,
  llmCustom: 100,
};

// Maximum safe chunk sizes for different services
export const MAX_CHUNK_SIZE = {
  ezTransWeb: 1000,
  ezTransServer: 500,
  lingva: 20,
  lingvaJa: 20,
  lingvaLocal: 100,
  lingvaLocalAuto: 100,
  lingvaLocalBalanced: 200,
  lingvaLocalBalancedAuto: 200,
  ollamaLocal: 200,
  openai: 200,
  googleGemini: 200,
  llmCustom: 200,
};

// Optimal parallel request limits
export const MAX_PARALLEL_REQUESTS = {
  ezTransWeb: 50,
  ezTransServer: 20,
  lingva: 1,
  lingvaJa: 1,
  lingvaLocal: 30,
  lingvaLocalAuto: 30,
  lingvaLocalBalanced: 30,
  lingvaLocalBalancedAuto: 30,
  ollamaLocal: 3, // Local LLM — limited by GPU inference speed
  openai: 10, // Cloud API — generous rate limits
  googleGemini: 10,
  llmCustom: 3,
};

// Batch translation settings
export const BATCH_TRANSLATION = {
  // Delimiter to separate multiple texts in one request
  delimiter: " ⟨SEP⟩ ",

  // Maximum characters per batch request
  maxBatchLength: {
    lingva: 500,
    lingvaJa: 500,
    lingvaLocal: 800,
    lingvaLocalAuto: 800,
    lingvaLocalBalanced: 800,
    lingvaLocalBalancedAuto: 800,
    ollamaLocal: 3000, // LLMs use POST — no URL length limit
    openai: 4000,
    googleGemini: 4000,
    llmCustom: 3000,
  },

  // Maximum items per batch
  maxBatchItems: {
    lingva: 20,
    lingvaJa: 20,
    lingvaLocal: 40,
    lingvaLocalAuto: 40,
    lingvaLocalBalanced: 50,
    lingvaLocalBalancedAuto: 50,
    ollamaLocal: 50,
    openai: 80,
    googleGemini: 80,
    llmCustom: 50,
  },

  // Services that should NOT use batch translation
  excludeFromBatch: ["ezTransWeb", "ezTransServer"],
};

class Translator {
  constructor(settings) {
    this.settings = settings;
  }

  async isAvailable() {
    try {
      await this.__translate("test");
      return true;
    } catch (e) {
      return false;
    }
  }

  async __translate(text) {
    const epData = this.settings.getEndPointData();

    // For Lingva API, try multiple endpoints with fallbacks
    if (epData.isLingva) {
      return await this.__translateLingva(text);
    }

    // For LLM APIs (Ollama, OpenAI, custom)
    if (epData.isLLM) {
      return await this.__translateLLM(text);
    }

    // For other APIs, use the original logic
    let encodedText = encodeURI(text);
    const realUrl = epData.urlPattern.replace(
      END_POINT_URL_PATTERN_TEXT_SYMBOL,
      encodedText,
    );

    let response;
    try {
      if (epData.method === "get") {
        response = (await axios.get(realUrl)).data;
      } else if (epData.method === "post") {
        const body = epData.body ? epData.body : "";
        response = (
          await axios.post(
            realUrl,
            body.replace(END_POINT_URL_PATTERN_TEXT_SYMBOL, text),
          )
        ).data;
      } else {
        return text;
      }
    } catch (error) {
      console.warn("Translation request failed:", error.message);
      return text;
    }

    return response || text;
  }

  async __translateLingva(text) {
    const epData = this.settings.getEndPointData();
    const sourceLang = epData.sourceLang || "auto";
    const domains = epData.isLocal
      ? (epData.localDomain || "http://localhost:3000").split(",")
      : ["https://lingva.ml"];

    if (typeof this._rrIndex === "undefined") this._rrIndex = 0;

    const maxAttempts = epData.isLocal ? 2 : 4;

    // Rate limiter for public endpoints (Cloudflare enforces ~1 req/sec)
    if (!epData.isLocal) {
      const now = Date.now();
      const minGap = 1500; // 1.5 seconds between requests
      if (typeof Translator._lastPublicReq === "undefined")
        Translator._lastPublicReq = 0;
      const elapsed = now - Translator._lastPublicReq;
      if (elapsed < minGap) {
        await new Promise((resolve) => setTimeout(resolve, minGap - elapsed));
      }
      Translator._lastPublicReq = Date.now();
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const baseDomain = domains[this._rrIndex % domains.length].trim();
      this._rrIndex++;

      const endpoint = `${baseDomain}/api/v1/${sourceLang}/en/${encodeURIComponent(text)}`;
      const reqStart = Date.now();

      try {
        const response = await axios.get(endpoint, {
          timeout: 30000,
          headers: { Accept: "application/json" },
        });

        TRANSLATION_METRICS.recordRequest(baseDomain, Date.now() - reqStart);

        if (
          response.data &&
          response.data.translation &&
          response.data.translation !== text
        ) {
          return response.data.translation;
        }
        break;
      } catch (error) {
        const latency = Date.now() - reqStart;
        TRANSLATION_METRICS.recordRequest(baseDomain, latency);

        const msg = error.message || "";
        const isTimeout = msg.includes("timeout");
        const isRateLimit = msg.includes("429");

        if (isRateLimit) TRANSLATION_METRICS.recordError("429");
        else if (msg.includes("431") || msg.includes("414"))
          TRANSLATION_METRICS.recordError("431");
        else if (msg.includes("404")) TRANSLATION_METRICS.recordError("404");
        else if (msg.includes("500")) TRANSLATION_METRICS.recordError("500");
        else if (isTimeout) TRANSLATION_METRICS.recordError("timeout");
        else TRANSLATION_METRICS.recordError("other");

        // 429 Rate Limited: strong exponential backoff for Cloudflare
        if (isRateLimit && attempt < maxAttempts - 1) {
          const backoff = Math.min(5000 * Math.pow(2, attempt), 30000); // 5s, 10s, 20s, 30s
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }

        // Local timeout: retry on next node
        if (isTimeout && epData.isLocal && attempt === 0) {
          continue;
        }

        // Local: no external fallback
        if (epData.isLocal) return text;

        // Public endpoint: try plausibility cloud fallback
        try {
          const fbEndpoint = `https://translate.plausibility.cloud/api/v1/${sourceLang}/en/${encodeURIComponent(text)}`;
          const fbResp = await axios.get(fbEndpoint, {
            timeout: 10000,
            headers: { Accept: "application/json" },
          });
          if (
            fbResp.data &&
            fbResp.data.translation &&
            fbResp.data.translation !== text
          ) {
            return fbResp.data.translation;
          }
        } catch (fbErr) {
          /* fallback failed too */
        }
        break;
      }
    }

    return text;
  }

  async __translateLLM(text) {
    const epData = this.settings.getEndPointData();
    const llmConfig = this.settings.getLLMConfig();

    // Merge endpoint defaults with user config
    const apiUrl = llmConfig.apiUrl || epData.apiUrl;
    const model = llmConfig.model || epData.model;
    const apiKey = llmConfig.apiKey || "";
    const sourceLang = epData.sourceLang || "Japanese";
    const targetLang = epData.targetLang || "English";

    const systemPrompt =
      llmConfig.systemPrompt ||
      `You are a professional RPG game translator. Translate the following ${sourceLang} game text to ${targetLang}.\n\nRules:\n- Translate ONLY the text, output NOTHING else (no explanations, no notes)\n- Preserve the delimiter ⟨SEP⟩ exactly as-is between translated segments\n- Keep game variables like \\V[123], \\N[1], %1, %2 unchanged\n- Keep newline characters (\\n) unchanged\n- Maintain the tone and personality of game dialogue\n- For RPG terms (skills, items, spells), use natural English equivalents\n- Do NOT add quotes around the translation`;

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const reqStart = Date.now();

    try {
      const response = await axios.post(
        apiUrl,
        {
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          temperature: 0.3, // Low temperature for consistent translations
          max_tokens: Math.max(text.length * 3, 500), // Generous token limit
        },
        {
          timeout: 60000, // LLMs can be slower than translation APIs
          headers: headers,
        },
      );

      TRANSLATION_METRICS.recordRequest(apiUrl, Date.now() - reqStart);

      if (response.data && response.data.choices && response.data.choices[0]) {
        const translated = response.data.choices[0].message.content.trim();
        if (translated && translated !== text) {
          return translated;
        }
      }
    } catch (error) {
      const latency = Date.now() - reqStart;
      TRANSLATION_METRICS.recordRequest(apiUrl, latency);

      const msg = error.message || "";
      if (msg.includes("429")) TRANSLATION_METRICS.recordError("429");
      else if (msg.includes("401") || msg.includes("403"))
        TRANSLATION_METRICS.recordError("other");
      else if (msg.includes("timeout"))
        TRANSLATION_METRICS.recordError("timeout");
      else TRANSLATION_METRICS.recordError("other");

      // Retry once on rate limit with backoff
      if (msg.includes("429")) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        try {
          const retryResp = await axios.post(
            apiUrl,
            {
              model: model,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text },
              ],
              temperature: 0.3,
              max_tokens: Math.max(text.length * 3, 500),
            },
            { timeout: 60000, headers },
          );

          if (
            retryResp.data &&
            retryResp.data.choices &&
            retryResp.data.choices[0]
          ) {
            return retryResp.data.choices[0].message.content.trim();
          }
        } catch (retryErr) {
          /* retry failed */
        }
      }
    }

    return text;
  }

  async __translateBulk(texts) {
    return (await this.translate(texts.join("\n"))).split("\n");
  }

  async translate(text) {
    try {
      // Check translation bank first
      const cached = TRANSLATION_BANK.get(text);
      if (cached) {
        return cached.translated;
      }

      // If not in cache, translate and store
      const translated = await this.__translate(text);

      // Store successful translation in bank
      if (translated && translated !== text) {
        TRANSLATION_BANK.set(text, translated);
      }

      return translated;
    } catch (err) {
      return text;
    }
  }

  // async translateBulk (texts) {
  //     texts = texts.map(text => text.replace('\n', ''))
  //
  //     const chunkSize = 100
  //     const textsChunk = []
  //
  //     for (let i = 0; i < texts.length; i += chunkSize) {
  //         textsChunk.push(texts.slice(i, Math.min(texts.length, i + chunkSize)))
  //     }
  //
  //     const ret = [].concat(...await Promise.all(textsChunk.map(chunk => this.__translateBulk(chunk))))
  //     return ret
  // }

  getAdaptiveChunkSize(requestedSize, endPointId) {
    // Lingva endpoints handle batching internally via translateBatch
    // We return the full length to allow the batching logic to decide the split
    if (this.settings.getEndPointData().isLingva) {
      return 999999;
    }

    const maxSafe = MAX_CHUNK_SIZE[endPointId] || 50;
    const maxParallel = MAX_PARALLEL_REQUESTS[endPointId] || 10;

    if (requestedSize <= maxSafe) {
      return requestedSize;
    }

    console.warn(
      `Chunk size ${requestedSize} too large for ${endPointId}. Using safe limit: ${maxSafe}`,
    );
    return maxSafe;
  }

  async translateBulk(texts) {
    // Handle empty or invalid input
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      console.warn("translateBulk: Invalid or empty texts array");
      return [];
    }

    // Clean up texts and preserve original indices
    const cleanedTexts = texts.map((text) => (text ? text.trim() : text));

    const epData = this.settings.getEndPointData();
    const requestedChunkSize = this.settings.getBulkTranslateChunkSize();

    // Check if this is a JP→KR endpoint (ezTrans services)
    const isJpToKr =
      epData.id === "ezTransWeb" || epData.id === "ezTransServer";

    if (isJpToKr) {
      console.log(
        `Using original translation method for JP→KR endpoint: ${epData.id}`,
      );
      return await this.translateBulkOriginal(cleanedTexts);
    }

    // For other endpoints, use the new batch system
    const safeChunkSize = this.getAdaptiveChunkSize(
      requestedChunkSize,
      epData.id || "unknown",
    );

    const textsChunk = [];

    for (let i = 0; i < cleanedTexts.length; i += safeChunkSize) {
      const chunk = cleanedTexts.slice(
        i,
        Math.min(cleanedTexts.length, i + safeChunkSize),
      );

      // For Lingva API, use controlled parallel translation
      if (epData.isLingva) {
        const translatedChunk = await this.translateLingvaChunk(chunk);
        textsChunk.push(translatedChunk);
      } else {
        // Use bulk translation for other services
        textsChunk.push(await this.__translateBulk(chunk));
      }
    }

    const result = [].concat(...textsChunk);
    return result;
  }

  async translateBulkOriginal(texts) {
    console.log(
      `🔄 Using original translation method for ${texts.length} texts`,
    );

    // Use the original repository's bulk translation logic
    const chunkSize = this.settings.getBulkTranslateChunkSize();
    const textsChunk = [];

    for (let i = 0; i < texts.length; i += chunkSize) {
      const chunk = texts.slice(i, Math.min(texts.length, i + chunkSize));
      console.log(
        `Processing chunk ${Math.floor(i / chunkSize) + 1}: ${chunk.length} items`,
      );

      // Use the original __translateBulk method
      textsChunk.push(await this.__translateBulk(chunk));
    }

    const result = [].concat(...textsChunk);
    console.log(
      `✅ Original translation completed. Input: ${texts.length}, Output: ${result.length}`,
    );
    return result;
  }

  createBatches(texts, endPointId) {
    const config = BATCH_TRANSLATION;
    const maxLength = config.maxBatchLength[endPointId] || 1000;
    const maxItems = config.maxBatchItems[endPointId] || 20;
    const delimiter = config.delimiter;

    const batches = [];
    let currentBatch = [];
    let currentLength = 0;

    for (const text of texts) {
      if (!text || !text.trim()) {
        currentBatch.push("");
        continue;
      }

      const textLength = text.length + delimiter.length;

      // Check if adding this text would exceed limits
      if (
        currentBatch.length > 0 &&
        (currentLength + textLength > maxLength ||
          currentBatch.length >= maxItems)
      ) {
        // Start new batch
        batches.push(currentBatch);
        currentBatch = [text];
        currentLength = text.length;
      } else {
        // Add to current batch
        currentBatch.push(text);
        currentLength += textLength;
      }
    }

    // Add final batch if not empty
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  async translateBatch(batch) {
    const delimiter = BATCH_TRANSLATION.delimiter;

    // Filter out empty texts but remember their positions
    const textMap = [];
    const nonEmptyTexts = [];

    batch.forEach((text, index) => {
      if (text && text.trim()) {
        textMap.push({
          originalIndex: index,
          batchIndex: nonEmptyTexts.length,
        });
        nonEmptyTexts.push(text);
      } else {
        textMap.push({ originalIndex: index, batchIndex: -1 });
      }
    });

    if (nonEmptyTexts.length === 0) {
      return batch; // All empty, return as-is
    }

    // Combine texts with delimiter
    const combinedText = nonEmptyTexts.join(delimiter);

    try {
      // Translate the combined text
      const translatedCombined = await this.translate(combinedText);

      // Split the result back
      const translatedParts = translatedCombined.split(delimiter);

      // Reconstruct the original array with translations
      const results = new Array(batch.length);
      textMap.forEach((mapping) => {
        const originalStr = batch[mapping.originalIndex];

        if (
          mapping.batchIndex >= 0 &&
          mapping.batchIndex < translatedParts.length
        ) {
          const translatedStr = translatedParts[mapping.batchIndex].trim();
          results[mapping.originalIndex] = translatedStr;

          // The core bugfix! We must cache the granular strings back into the bank so other tabs skip them
          TRANSLATION_BANK.set(originalStr, translatedStr);
        } else {
          results[mapping.originalIndex] = batch[mapping.originalIndex] || "";
        }
      });

      // Batch completed — cache individual results already done via TRANSLATION_BANK.set above
      return results;
    } catch (error) {
      const isTooLarge =
        error.message &&
        (error.message.includes("431") || error.message.includes("414"));
      const isServerError = error.message && error.message.includes("500");
      const isTimeout = error.message && error.message.includes("timeout");

      if (isTooLarge) {
        console.warn(`⚠️ Batch too large (431/414): splitting in half`);
      } else if (isServerError) {
        console.warn(`🔥 Server error (500): splitting in half`);
      } else if (isTimeout) {
        console.warn(`⏱️ Batch timeout: splitting in half`);
      } else {
        console.warn("Batch failed, splitting in half:", error.message);
      }

      // Smart fallback: split in half and retry recursively
      // This is much faster than going one-by-one (O(log n) instead of O(n))
      if (nonEmptyTexts.length <= 1) {
        // Can't split further — return originals
        const results = new Array(batch.length);
        batch.forEach((t, i) => {
          results[i] = t || "";
        });
        return results;
      }

      const mid = Math.floor(nonEmptyTexts.length / 2);
      const leftBatch = batch.slice(0, mid);
      const rightBatch = batch.slice(mid);

      const [leftResults, rightResults] = await Promise.all([
        this.translateBatch(leftBatch),
        this.translateBatch(rightBatch),
      ]);

      return [...leftResults, ...rightResults];
    }
  }

  async translateLingvaChunk(chunk) {
    const epData = this.settings.getEndPointData();
    const endPointId = epData.id || this.settings.getEndPointSelection();

    const batches = this.createBatches(chunk, endPointId);

    // Record batch stats for metrics
    const delimiter = BATCH_TRANSLATION.delimiter;
    for (const b of batches) {
      const nonEmpty = b.filter((t) => t && t.trim());
      const combinedLen = nonEmpty.join(delimiter).length;
      TRANSLATION_METRICS.recordBatch(nonEmpty.length, combinedLen);
    }
    TRANSLATION_METRICS.totalStrings = chunk.length;

    console.log(
      `[Translator] ${batches.length} batches × ${endPointId} — ${chunk.length} strings`,
    );

    const allResults = new Array(batches.length);
    const maxParallel = MAX_PARALLEL_REQUESTS[endPointId] || 5;
    let currentIndex = 0;
    let completedStrings = 0;
    const totalStrings = chunk.length;
    let lastReportedProgress = -1;

    const worker = async () => {
      while (currentIndex < batches.length) {
        const i = currentIndex++;
        const batch = batches[i];

        try {
          allResults[i] = await this.translateBatch(batch);
          completedStrings += batch.length;

          // Throttle progress: fire every 2%
          const progress = Math.min(
            Math.round((completedStrings / totalStrings) * 100),
            99,
          );
          if (progress >= lastReportedProgress + 2) {
            lastReportedProgress = progress;
            TRANSLATE_PROGRESS.update(
              true,
              progress,
              `Translating... (${completedStrings}/${totalStrings})`,
            );
          }
        } catch (error) {
          allResults[i] = batch;
        }
      }
    };

    const workers = [];
    for (let j = 0; j < Math.min(maxParallel, batches.length); j++) {
      workers.push(worker());
    }

    await Promise.all(workers);
    return allResults.flat();
  }

  async translateAllGlobals() {
    const targets = this.settings.getTargets();
    const epData = this.settings.getEndPointData();
    const isJpToKr =
      epData.id === "ezTransWeb" || epData.id === "ezTransServer";
    const chunkSize = this.settings.getBulkTranslateChunkSize();
    const useBatch = localStorage.getItem("useBatchTranslation") !== "false";

    let toTranslate = [];

    if (
      targets.variables &&
      window.$dataSystem &&
      window.$dataSystem.variables
    ) {
      toTranslate.push({
        type: "Variables",
        list: window.$dataSystem.variables.slice(),
      });
    }
    if (targets.switches && window.$dataSystem && window.$dataSystem.switches) {
      toTranslate.push({
        type: "Switches",
        list: window.$dataSystem.switches.slice(),
      });
    }
    if (targets.maps && window.$dataMapInfos) {
      const rawNames = window.$dataMapInfos.map((m) => (m ? m.name : ""));
      toTranslate.push({ type: "Maps", list: rawNames });
    }

    // Comprehensive Database Extraction
    const extractText = (arr) =>
      arr
        .filter((i) => i)
        .flatMap((i) => [i.name, i.description].filter(Boolean));

    // Extended extraction: name, description, nickname, profile, messages
    const extractTextFull = (arr) =>
      arr
        .filter((i) => i)
        .flatMap((i) => {
          const texts = [i.name, i.description, i.nickname, i.profile];
          for (let m = 1; m <= 4; m++) {
            if (i[`message${m}`]) texts.push(i[`message${m}`]);
          }
          return texts.filter(Boolean);
        });

    if (targets.items && window.$dataItems) {
      toTranslate.push({ type: "Items", list: extractText(window.$dataItems) });
    }
    if (targets.weapons && window.$dataWeapons) {
      toTranslate.push({
        type: "Weapons",
        list: extractText(window.$dataWeapons),
      });
    }
    if (targets.armors && window.$dataArmors) {
      toTranslate.push({
        type: "Armors",
        list: extractText(window.$dataArmors),
      });
    }
    if (targets.skills && window.$dataSkills) {
      toTranslate.push({
        type: "Skills",
        list: extractTextFull(window.$dataSkills),
      });
    }
    if (targets.states && window.$dataStates) {
      toTranslate.push({
        type: "States",
        list: extractTextFull(window.$dataStates),
      });
    }
    if (targets.classes && window.$dataClasses) {
      toTranslate.push({
        type: "Classes",
        list: extractText(window.$dataClasses),
      });
    }
    if (targets.enemies && window.$dataEnemies) {
      toTranslate.push({
        type: "Enemies",
        list: extractText(window.$dataEnemies),
      });
    }

    // === NEW: Actors (names, nicknames, profiles) ===
    if (targets.actors && window.$dataActors) {
      toTranslate.push({
        type: "Actors",
        list: extractTextFull(window.$dataActors),
      });
    }

    // === NEW: System Terms (menu commands, battle messages, params, etc.) ===
    if (targets.system && window.$dataSystem) {
      const systemTexts = this.extractSystemTerms();
      if (systemTexts.length > 0) {
        toTranslate.push({ type: "System Terms", list: systemTexts });
      }
    }

    // === NEW: Event Dialogues from ALL maps ===
    if (targets.dialogues) {
      TRANSLATE_PROGRESS.update(true, 0, "Scanning map files...");
      const dialogueTexts = await this.extractAllEventDialogues();
      if (dialogueTexts.length > 0) {
        toTranslate.push({ type: "Dialogues", list: dialogueTexts });
      }
    }

    // === NEW: Common Events ===
    if (targets.dialogues && window.$dataCommonEvents) {
      const commonEventTexts = this.extractCommonEventTexts();
      if (commonEventTexts.length > 0) {
        toTranslate.push({ type: "Common Events", list: commonEventTexts });
      }
    }

    // === PHASE 2: Collect ALL uncached strings from ALL targets into one pool ===
    let totalUncachedStrings = [];
    let uncachedSets = new Map();

    toTranslate.forEach((target) => {
      const uncachedSet = new Set();
      target.list.forEach((item) => {
        if (item && typeof item === "string" && item.trim()) {
          if (!TRANSLATION_BANK.get(item)) {
            uncachedSet.add(item);
          }
        }
      });
      if (uncachedSet.size > 0) {
        const uniqueList = Array.from(uncachedSet);
        uncachedSets.set(target.type, uniqueList);
        totalUncachedStrings.push(...uniqueList);
      }
    });

    // Remove duplicates across categories
    const finalPool = Array.from(new Set(totalUncachedStrings));
    const totalUncached = finalPool.length;

    if (totalUncached === 0) {
      TRANSLATE_PROGRESS.update(false, 100, "All Cached");
      Alert.success("All text already translated! Applying to game...");
      window.dispatchEvent(new CustomEvent("cheat-translate-finish"));
      setTimeout(() => TRANSLATE_PROGRESS.update(false, 0, ""), 2000);
      return;
    }

    console.log(
      `[Translator] Total unique strings to translate: ${totalUncached}`,
    );
    uncachedSets.forEach((list, type) => {
      console.log(`  ${type}: ${list.length} strings`);
    });

    // === PHASE 3: High-Concurrency Translation of the entire pool ===
    TRANSLATE_PROGRESS.update(true, 0, `Translating Pool (0/${totalUncached})`);
    TRANSLATION_METRICS.reset();
    TRANSLATION_METRICS.totalStrings = totalUncached;

    try {
      if (epData.isLingva) {
        await this.translateBulk(finalPool);
      } else {
        let completed = 0;
        for (const [type, uncached] of uncachedSets.entries()) {
          TRANSLATE_PROGRESS.update(
            true,
            Math.round((completed / totalUncached) * 100),
            `${type} (${completed}/${totalUncached})`,
          );
          if (isJpToKr || (epData.isLingva && !useBatch)) {
            for (let i = 0; i < uncached.length; i++) {
              await this.translate(uncached[i]);
              completed++;
            }
          } else {
            for (let i = 0; i < uncached.length; i += chunkSize) {
              const chunk = uncached.slice(i, i + chunkSize);
              await this.translateBulk(chunk);
              completed += chunk.length;
            }
          }
        }
      }
    } catch (err) {
      console.error("[Translator] Global translation failed", err);
    }

    // Print comprehensive metrics report
    TRANSLATION_METRICS.printReport();

    // Flush translation cache to disk (single write instead of 13,000+)
    TRANSLATION_BANK.flushCache();

    TRANSLATE_PROGRESS.update(false, 100, "Complete — Applying to game...");
    Alert.success(
      `Translation Complete! Translated ${totalUncached} unique strings.`,
    );
    window.dispatchEvent(new CustomEvent("cheat-translate-finish"));
    setTimeout(() => TRANSLATE_PROGRESS.update(false, 0, ""), 3000);
  }

  /**
   * Extract all system terms for translation:
   * basic terms, commands, params, messages, type names
   */
  extractSystemTerms() {
    const texts = [];
    const sys = window.$dataSystem;
    if (!sys) return texts;

    // Basic terms (Level, HP, MP, etc.)
    if (sys.terms && sys.terms.basic) {
      texts.push(
        ...sys.terms.basic.filter(
          (t) => t && typeof t === "string" && t.trim(),
        ),
      );
    }

    // Commands (Fight, Escape, Item, Skill, etc.)
    if (sys.terms && sys.terms.commands) {
      texts.push(
        ...sys.terms.commands.filter(
          (t) => t && typeof t === "string" && t.trim(),
        ),
      );
    }

    // Params (Max HP, Max MP, Attack, Defense, etc.)
    if (sys.terms && sys.terms.params) {
      texts.push(
        ...sys.terms.params.filter(
          (t) => t && typeof t === "string" && t.trim(),
        ),
      );
    }

    // Messages (battle messages like "%1 attacks!", etc.)
    if (sys.terms && sys.terms.messages) {
      for (const key in sys.terms.messages) {
        const text = sys.terms.messages[key];
        if (text && typeof text === "string" && text.trim()) {
          texts.push(text);
        }
      }
    }

    // Type names
    const typeArrays = ["armorTypes", "weaponTypes", "skillTypes", "elements"];
    for (const arrayName of typeArrays) {
      if (sys[arrayName]) {
        texts.push(
          ...sys[arrayName].filter(
            (t) => t && typeof t === "string" && t.trim(),
          ),
        );
      }
    }

    // Game title
    if (sys.gameTitle) texts.push(sys.gameTitle);

    return texts;
  }

  /**
   * Extract event dialogue text from a single event's command list.
   * RPG Maker event commands:
   *   Code 101 = Show Text header (face, position, background)
   *   Code 401 = Show Text content line
   *   Code 102 = Show Choices
   *   Code 355 = Script (first line)
   *   Code 655 = Script (continuation)
   *   Code 105 = Show Scrolling Text header
   *   Code 405 = Show Scrolling Text content line
   *   Code 320 = Change Actor Name
   *   Code 324 = Change Actor Nickname
   *   Code 325 = Change Profile
   */
  extractEventCommandTexts(commands) {
    const texts = [];
    if (!commands || !Array.isArray(commands)) return texts;

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      if (!cmd || !cmd.parameters) continue;

      switch (cmd.code) {
        case 401: // Show Text content line
        case 405: // Show Scrolling Text content line
          if (
            cmd.parameters[0] &&
            typeof cmd.parameters[0] === "string" &&
            cmd.parameters[0].trim()
          ) {
            texts.push(cmd.parameters[0]);
          }
          break;

        case 102: // Show Choices
          if (Array.isArray(cmd.parameters[0])) {
            for (const choice of cmd.parameters[0]) {
              if (choice && typeof choice === "string" && choice.trim()) {
                texts.push(choice);
              }
            }
          }
          break;

        case 320: // Change Actor Name
        case 324: // Change Actor Nickname
          if (
            cmd.parameters[1] &&
            typeof cmd.parameters[1] === "string" &&
            cmd.parameters[1].trim()
          ) {
            texts.push(cmd.parameters[1]);
          }
          break;

        case 325: // Change Profile
          if (
            cmd.parameters[1] &&
            typeof cmd.parameters[1] === "string" &&
            cmd.parameters[1].trim()
          ) {
            texts.push(cmd.parameters[1]);
          }
          break;

        case 356: // Plugin Command (some games store text here)
          // Skip — plugin-specific, too variable
          break;
      }
    }

    return texts;
  }

  /**
   * Extract dialogue text from Common Events.
   */
  extractCommonEventTexts() {
    const texts = [];
    if (!window.$dataCommonEvents) return texts;

    for (const event of window.$dataCommonEvents) {
      if (!event || !event.list) continue;
      texts.push(...this.extractEventCommandTexts(event.list));

      // Also translate the common event name
      if (event.name && typeof event.name === "string" && event.name.trim()) {
        texts.push(event.name);
      }
    }

    console.log(
      `[Translator] Extracted ${texts.length} strings from Common Events`,
    );
    return texts;
  }

  /**
   * Extract dialogue text from ALL map JSON files.
   * Reads MapXXX.json files from the game's data directory.
   */
  async extractAllEventDialogues() {
    const allTexts = [];

    // Only works in NW.js (desktop) environment
    if (!Utils.isNwjs()) {
      console.warn(
        "[Translator] Event dialogue extraction requires NW.js (desktop game)",
      );
      return allTexts;
    }

    try {
      const fs = require("fs");
      const path = require("path");

      // Determine the data directory
      const isMV = Utils.RPGMAKER_NAME === "MV";
      const baseDir = isMV ? "www" : ".";
      const dataDir = path.join(baseDir, "data");

      if (!fs.existsSync(dataDir)) {
        console.warn(`[Translator] Data directory not found: ${dataDir}`);
        return allTexts;
      }

      // Find all MapXXX.json files
      const files = fs.readdirSync(dataDir);
      const mapFiles = files.filter((f) => /^Map\d+\.json$/i.test(f));

      console.log(`[Translator] Found ${mapFiles.length} map files to scan`);

      for (let fileIdx = 0; fileIdx < mapFiles.length; fileIdx++) {
        const mapFile = mapFiles[fileIdx];
        TRANSLATE_PROGRESS.update(
          true,
          0,
          `Scanning ${mapFile} (${fileIdx + 1}/${mapFiles.length})...`,
        );

        try {
          const filePath = path.join(dataDir, mapFile);
          const mapData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

          // Map display name
          if (
            mapData.displayName &&
            typeof mapData.displayName === "string" &&
            mapData.displayName.trim()
          ) {
            allTexts.push(mapData.displayName);
          }

          // Extract from all events on this map
          if (mapData.events) {
            for (const event of mapData.events) {
              if (!event || !event.pages) continue;

              // Event name (sometimes used for display)
              // if (event.name && event.name.trim()) allTexts.push(event.name)

              for (const page of event.pages) {
                if (!page || !page.list) continue;
                allTexts.push(...this.extractEventCommandTexts(page.list));
              }
            }
          }
        } catch (err) {
          console.warn(`[Translator] Failed to read ${mapFile}:`, err.message);
        }
      }

      // Also extract from Troops (battle events)
      try {
        const troopsPath = path.join(dataDir, "Troops.json");
        if (fs.existsSync(troopsPath)) {
          const troopsData = JSON.parse(fs.readFileSync(troopsPath, "utf-8"));
          for (const troop of troopsData) {
            if (!troop || !troop.pages) continue;
            for (const page of troop.pages) {
              if (!page || !page.list) continue;
              allTexts.push(...this.extractEventCommandTexts(page.list));
            }
          }
          console.log(
            `[Translator] Also scanned Troops.json for battle events`,
          );
        }
      } catch (err) {
        console.warn("[Translator] Failed to scan Troops.json:", err.message);
      }

      console.log(
        `[Translator] Extracted ${allTexts.length} dialogue strings from ${mapFiles.length} maps`,
      );
    } catch (err) {
      console.error("[Translator] Failed to scan map files:", err);
    }

    return allTexts;
  }
}

class TranslateSettings {
  constructor() {
    this.kvStorage = new KeyValueStorage("./www/cheat-settings/translate.json");
    this.__readSettings();
  }

  __readSettings() {
    const json = this.kvStorage.getItem("data");

    if (!json) {
      this.data = {
        enabled: false,

        endPointSelection: "lingva",

        customEndPointData: {
          method: "get",
          urlPattern: `http://localhost:5000/translate?text=${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
          body: "",
        },

        targets: {
          items: true,
          weapons: true,
          armors: true,
          skills: true,
          states: true,
          classes: true,
          enemies: true,
          variables: true,
          switches: true,
          maps: true,
          actors: true,
          system: true,
          dialogues: true,
        },

        bulkTranslateChunkSize: 10,

        llmConfig: {
          apiKey: "",
          model: "",
          apiUrl: "",
          systemPrompt: "",
        },
      };
      return;
    }

    this.data = JSON.parse(json);

    // Backwards compatibility: add new target keys if missing from old settings
    if (this.data.targets) {
      if (this.data.targets.actors === undefined)
        this.data.targets.actors = true;
      if (this.data.targets.system === undefined)
        this.data.targets.system = true;
      if (this.data.targets.dialogues === undefined)
        this.data.targets.dialogues = true;
    }
    // Backwards compatibility: add LLM config if missing
    if (!this.data.llmConfig) {
      this.data.llmConfig = {
        apiKey: "",
        model: "",
        apiUrl: "",
        systemPrompt: "",
      };
    }
  }

  __writeSettings() {
    this.kvStorage.setItem("data", JSON.stringify(this.data));
  }

  getEndPointData() {
    if (this.getEndPointSelection() === "custom") {
      return this.getCustomEndPointData();
    }

    const epData = DEFAULT_END_POINTS[this.getEndPointSelection()].data;

    // For LLM endpoints, merge user config (model, apiUrl, apiKey)
    if (epData.isLLM) {
      const llm = this.getLLMConfig();
      return {
        ...epData,
        model: llm.model || epData.model,
        apiUrl: llm.apiUrl || epData.apiUrl,
        apiKey: llm.apiKey || "",
      };
    }

    return epData;
  }

  setEnabled(flag) {
    this.data.enabled = flag;
    this.__writeSettings();
  }

  isEnabled() {
    return this.data.enabled;
  }

  getEndPointSelection() {
    return this.data.endPointSelection;
  }

  setEndPointSelection(endPointId) {
    this.data.endPointSelection = endPointId;
    this.__writeSettings();
  }

  getCustomEndPointData() {
    return this.data.customEndPointData;
  }

  setCustomEndPointMethod(method) {
    this.data.customEndPointData.method = method;
    this.__writeSettings();
  }

  setCustomEndPointUrlPattern(urlPattern) {
    this.data.customEndPointData.urlPattern = urlPattern;
    this.__writeSettings();
  }

  setCustomEndPointBody(body) {
    this.data.customEndPointData.body = body;
    this.__writeSettings();
  }

  getLLMConfig() {
    return (
      this.data.llmConfig || {
        apiKey: "",
        model: "",
        apiUrl: "",
        systemPrompt: "",
      }
    );
  }

  setLLMConfig(config) {
    this.data.llmConfig = { ...this.data.llmConfig, ...config };
    this.__writeSettings();
  }

  getBulkTranslateChunkSize() {
    return this.data.bulkTranslateChunkSize;
  }

  setBulkTranslateChunkSize(chunkSize) {
    this.data.bulkTranslateChunkSize = chunkSize;
    this.__writeSettings();
  }

  getTargets() {
    return this.data.targets;
  }

  setTargets(targets) {
    this.data.targets = targets;
    this.__writeSettings();
  }

  isItemTranslateEnabled() {
    return this.isEnabled() && this.getTargets().items;
  }

  isWeaponTranslateEnabled() {
    return this.isEnabled() && this.getTargets().weapons;
  }

  isArmorTranslateEnabled() {
    return this.isEnabled() && this.getTargets().armors;
  }

  isSkillTranslateEnabled() {
    return this.isEnabled() && this.getTargets().skills;
  }

  isStateTranslateEnabled() {
    return this.isEnabled() && this.getTargets().states;
  }

  isClassTranslateEnabled() {
    return this.isEnabled() && this.getTargets().classes;
  }

  isEnemyTranslateEnabled() {
    return this.isEnabled() && this.getTargets().enemies;
  }

  isVariableTranslateEnabled() {
    return this.isEnabled() && this.getTargets().variables;
  }

  isSwitchTranslateEnabled() {
    return this.isEnabled() && this.getTargets().switches;
  }

  isMapTranslateEnabled() {
    return this.isEnabled() && this.getTargets().maps;
  }

  isActorTranslateEnabled() {
    return this.isEnabled() && this.getTargets().actors;
  }

  isSystemTranslateEnabled() {
    return this.isEnabled() && this.getTargets().system;
  }

  isDialogueTranslateEnabled() {
    return this.isEnabled() && this.getTargets().dialogues;
  }
}

export const TRANSLATE_PROGRESS = {
  isTranslating: false,
  progress: 0,
  text: "",
  callbacks: [],

  update(isTranslating, progress, text) {
    this.isTranslating = isTranslating;
    this.progress = progress;
    this.text = text;
    this.callbacks.forEach((cb) => cb(this));
  },

  subscribe(cb) {
    this.callbacks.push(cb);
  },

  unsubscribe(cb) {
    this.callbacks = this.callbacks.filter((c) => c !== cb);
  },
};

export const TRANSLATE_SETTINGS = new TranslateSettings();
export const TRANSLATOR = new Translator(TRANSLATE_SETTINGS);

// Initialize translation bank cleanup on load
setTimeout(() => {
  TRANSLATION_BANK.clearOldEntries();
}, 1000);
