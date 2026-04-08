// @ts-check

const DIAGNOSTICS_MAX_ENTRIES = 200;
const DIAGNOSTICS_MAX_FILE_BYTES = 256 * 1024;
const DIAGNOSTICS_LOG_PATH = "./www/cheat-settings/cheat-diagnostics.log";

/**
 * @typedef {"debug" | "info" | "warn" | "error"} DiagnosticsLevel
 */

/**
 * @typedef {object} DiagnosticsEntry
 * @property {string} timestamp
 * @property {string} sessionId
 * @property {string} context
 * @property {DiagnosticsLevel} level
 * @property {string} message
 */

class CheatDiagnostics {
  constructor() {
    /** @type {DiagnosticsEntry[]} */
    this.entries = [];
    /** @type {Record<string, Function> | null} */
    this.originalConsole = null;
    /** @type {string} */
    this.sessionId = this.createSessionId();
    /** @type {boolean} */
    this.initialized = false;
    /** @type {string} */
    this.context = "overlay";
    /** @type {boolean} */
    this.isRecordingConsole = false;
  }

  /**
   * @param {string} context
   * @returns {void}
   */
  initialize(context = "overlay") {
    if (this.initialized) {
      this.record("info", "diagnostics", "Diagnostics already initialized");
      return;
    }

    this.context = context;
    this.initialized = true;
    this.installConsoleProxy();
    this.installGlobalErrorHandlers();
    this.record(
      "info",
      "diagnostics",
      "Diagnostics initialized (" + context + ")",
    );
    this.record("info", "diagnostics", this.buildEnvironmentLine());

    try {
      window.CHEAT_DIAGNOSTICS = this;
    } catch (error) {
      // no-op
    }
  }

  /**
   * @param {DiagnosticsLevel} level
   * @param {string} source
   * @param {...any} values
   * @returns {void}
   */
  log(level, source, ...values) {
    this.record(level, source, this.formatValues(values));
  }

  /**
   * @param {DiagnosticsLevel} level
   * @param {string} source
   * @param {string} message
   * @returns {void}
   */
  record(level, source, message) {
    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      context: source,
      level,
      message: String(message || ""),
    };

    this.entries.push(entry);
    if (this.entries.length > DIAGNOSTICS_MAX_ENTRIES) {
      this.entries.shift();
    }

    this.appendToFile(entry);
  }

  /**
   * @returns {DiagnosticsEntry[]}
   */
  getEntries() {
    return this.entries.slice();
  }

  /**
   * @param {number} [limit]
   * @returns {DiagnosticsEntry[]}
   */
  getRecentEntries(limit = 40) {
    if (limit <= 0) {
      return [];
    }

    return this.entries.slice(-limit);
  }

  /**
   * @param {number} [limit]
   * @returns {string}
   */
  getRecentLogText(limit = 40) {
    return this.getRecentEntries(limit)
      .map((entry) => this.formatEntry(entry))
      .join("\n");
  }

  /**
   * @returns {string}
   */
  getLogFilePath() {
    const runtimeInfo = this.getDesktopModules();
    if (!runtimeInfo) {
      return "Browser memory only";
    }

    try {
      return runtimeInfo.path.resolve(DIAGNOSTICS_LOG_PATH);
    } catch (error) {
      return DIAGNOSTICS_LOG_PATH;
    }
  }

  /**
   * @returns {number}
   */
  getEntryCount() {
    return this.entries.length;
  }

  /**
   * @returns {string}
   */
  getLatestErrorText() {
    for (let index = this.entries.length - 1; index >= 0; index--) {
      const entry = this.entries[index];
      if (entry.level === "error") {
        return this.formatEntry(entry);
      }
    }

    return "None";
  }

  /**
   * @returns {string}
   */
  buildDiagnosticsReport() {
    const header = [
      "[Diagnostics]",
      "Session: " + this.sessionId,
      "Log Path: " + this.getLogFilePath(),
      "Entry Count: " + this.getEntryCount(),
      "Latest Error: " + this.getLatestErrorText(),
      "",
      "[Recent Entries]",
    ];

    return header
      .concat(this.getRecentEntries(50).map((entry) => this.formatEntry(entry)))
      .join("\n");
  }

  /**
   * @returns {string}
   */
  createSessionId() {
    return "diag-" + Date.now().toString(36);
  }

  /**
   * @returns {void}
   */
  installConsoleProxy() {
    if (
      typeof console !== "object" ||
      !console ||
      this.originalConsole ||
      this.isRecordingConsole
    ) {
      return;
    }

    this.originalConsole = {
      log: console.log ? console.log.bind(console) : null,
      info: console.info ? console.info.bind(console) : null,
      warn: console.warn ? console.warn.bind(console) : null,
      error: console.error ? console.error.bind(console) : null,
    };

    ["log", "info", "warn", "error"].forEach((levelName) => {
      const originalMethod = this.originalConsole
        ? this.originalConsole[levelName]
        : null;

      if (!originalMethod) {
        return;
      }

      console[levelName] = (...args) => {
        originalMethod(...args);
        if (this.isRecordingConsole) {
          return;
        }

        this.isRecordingConsole = true;
        try {
          const level = /** @type {DiagnosticsLevel} */ (
            levelName === "log" ? "info" : levelName
          );
          this.record(level, "console", this.formatValues(args));
        } finally {
          this.isRecordingConsole = false;
        }
      };
    });
  }

  /**
   * @returns {void}
   */
  installGlobalErrorHandlers() {
    if (typeof window !== "object" || !window) {
      return;
    }

    window.addEventListener("error", (event) => {
      const errorMessage =
        event.error && event.error.stack
          ? event.error.stack
          : this.formatValues([
              event.message,
              event.filename,
              event.lineno,
              event.colno,
            ]);
      this.record("error", "window.onerror", errorMessage);
    });

    window.addEventListener("unhandledrejection", (event) => {
      const reason =
        event.reason && event.reason.stack
          ? event.reason.stack
          : this.formatValues([event.reason]);
      this.record("error", "window.unhandledrejection", reason);
    });
  }

  /**
   * @param {any[]} values
   * @returns {string}
   */
  formatValues(values) {
    return values.map((value) => this.serializeValue(value)).join(" ");
  }

  /**
   * @param {any} value
   * @returns {string}
   */
  serializeValue(value) {
    if (value instanceof Error) {
      return value.stack || value.message;
    }

    if (typeof value === "string") {
      return value;
    }

    if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null ||
      typeof value === "undefined"
    ) {
      return String(value);
    }

    try {
      return JSON.stringify(value);
    } catch (error) {
      try {
        return String(value);
      } catch (stringError) {
        return "[unserializable]";
      }
    }
  }

  /**
   * @param {DiagnosticsEntry} entry
   * @returns {string}
   */
  formatEntry(entry) {
    return (
      "[" +
      entry.timestamp +
      "] [" +
      entry.level.toUpperCase() +
      "] [" +
      entry.context +
      "] " +
      entry.message
    );
  }

  /**
   * @returns {{ fs: any, path: any } | null}
   */
  getDesktopModules() {
    try {
      if (!(typeof require === "function" && typeof process === "object")) {
        return null;
      }

      return {
        fs: require("fs"),
        path: require("path"),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * @returns {string}
   */
  buildEnvironmentLine() {
    const versions =
      typeof process === "object" && process && process.versions
        ? process.versions
        : {};
    const nwjsVersion = versions["node-webkit"] || "Unavailable";
    const chromiumVersion = versions.chromium || "Unavailable";
    const nodeVersion = versions.node || "Unavailable";
    const userAgent =
      typeof navigator === "object" && navigator && navigator.userAgent
        ? navigator.userAgent
        : "Unavailable";

    return (
      "Environment: nwjs=" +
      nwjsVersion +
      ", chromium=" +
      chromiumVersion +
      ", node=" +
      nodeVersion +
      ", userAgent=" +
      userAgent
    );
  }

  /**
   * @param {DiagnosticsEntry} entry
   * @returns {void}
   */
  appendToFile(entry) {
    const runtimeInfo = this.getDesktopModules();
    if (!runtimeInfo) {
      return;
    }

    try {
      const logPath = runtimeInfo.path.resolve(DIAGNOSTICS_LOG_PATH);
      const logDir = runtimeInfo.path.dirname(logPath);

      if (!runtimeInfo.fs.existsSync(logDir)) {
        runtimeInfo.fs.mkdirSync(logDir, { recursive: true });
      }

      if (runtimeInfo.fs.existsSync(logPath)) {
        const stat = runtimeInfo.fs.statSync(logPath);
        if (stat.size > DIAGNOSTICS_MAX_FILE_BYTES) {
          runtimeInfo.fs.writeFileSync(
            logPath,
            "[Diagnostics] Log rotated for size control\n",
            "utf8",
          );
        }
      }

      runtimeInfo.fs.appendFileSync(
        logPath,
        this.formatEntry(entry) + "\n",
        "utf8",
      );
    } catch (error) {
      // best effort only
    }
  }
}

export const CHEAT_DIAGNOSTICS = new CheatDiagnostics();

/**
 * @param {string} [context]
 * @returns {CheatDiagnostics}
 */
export function initializeCheatDiagnostics(context = "overlay") {
  CHEAT_DIAGNOSTICS.initialize(context);
  return CHEAT_DIAGNOSTICS;
}
