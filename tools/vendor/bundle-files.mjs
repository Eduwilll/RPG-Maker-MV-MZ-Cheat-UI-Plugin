import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const CHEAT_ROOT = path.join(ROOT, "cheat-engine", "www", "cheat");
export const BUNDLE_ENTRY = path.join(CHEAT_ROOT, "init", "setup.js");
export const BUNDLE_PATH = path.join(CHEAT_ROOT, "init", "setup.bundle.js");
export const WINDOW_BUNDLE_ENTRY = path.join(CHEAT_ROOT, "js", "window-init.js");
export const WINDOW_BUNDLE_PATH = path.join(
  CHEAT_ROOT,
  "js",
  "window-init.bundle.js",
);
export const MANIFEST_PATH = path.join(
  CHEAT_ROOT,
  "init",
  "bundle-manifest.json",
);
export const BUILD_SCRIPT = path.join(
  ROOT,
  "tools",
  "vendor",
  "build-bundles.mjs",
);
export const BUILD_HELPER_SCRIPT = path.join(
  ROOT,
  "tools",
  "vendor",
  "bundle-files.mjs",
);

/** Git may check the same text out as CRLF on Windows; hashes must not care. */
export function normalizeText(text) {
  return text.replace(/\r\n/g, "\n");
}

export function sha256Text(text) {
  return createHash("sha256").update(normalizeText(text)).digest("hex");
}

export function relativePath(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

/**
 * Every runtime module is covered, not just the current entry graph, so adding
 * a dependency or forgetting to rebuild after any runtime edit is caught.
 * Vendored libraries are versioned separately by the vendor asset test.
 */
export function collectBundleSources() {
  const files = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "libs") walk(absolute);
      } else if (
        entry.isFile() &&
        entry.name.endsWith(".js") &&
        !entry.name.endsWith(".bundle.js")
      ) {
        files.push(absolute);
      }
    }
  };
  walk(CHEAT_ROOT);
  files.push(BUILD_SCRIPT, BUILD_HELPER_SCRIPT);
  return files.sort((a, b) => relativePath(a).localeCompare(relativePath(b)));
}

export function sourcesFingerprint() {
  const hash = createHash("sha256");
  for (const file of collectBundleSources()) {
    hash.update(relativePath(file));
    hash.update("\0");
    hash.update(normalizeText(readFileSync(file, "utf8")));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function bundleFiles() {
  const files = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "libs") walk(absolute);
      } else if (entry.isFile() && entry.name.endsWith(".bundle.js")) {
        files.push(relativePath(absolute));
      }
    }
  };
  walk(CHEAT_ROOT);
  return files.sort();
}
