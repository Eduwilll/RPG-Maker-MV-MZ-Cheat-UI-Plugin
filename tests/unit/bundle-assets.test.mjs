import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  BUNDLE_PATH,
  MANIFEST_PATH,
  ROOT,
  bundleFiles,
  sha256Text,
  sourcesFingerprint,
} from "../../tools/vendor/bundle-files.mjs";

const packageJson = JSON.parse(
  readFileSync(path.join(ROOT, "package.json"), "utf8"),
);
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const bundle = readFileSync(BUNDLE_PATH, "utf8");

test("the overlay bundle is rebuilt after runtime changes", () => {
  assert.equal(manifest.generatedBy, "tools/vendor/build-bundles.mjs");
  assert.equal(
    manifest.vite,
    packageJson.devDependencies.vite,
    "Vite changed: run pnpm run build:cheat",
  );
  assert.equal(
    manifest.sourcesHash,
    sourcesFingerprint(),
    "Runtime sources changed: run pnpm run build:cheat",
  );
});

test("the manifest covers exactly the shipped bundles", () => {
  const shipped = bundleFiles();
  assert.deepEqual(Object.keys(manifest.bundles).sort(), shipped);
  for (const relative of shipped) {
    assert.equal(
      manifest.bundles[relative],
      sha256Text(readFileSync(path.join(ROOT, relative), "utf8")),
      `${relative} was edited or rebuilt without its manifest`,
    );
  }
});

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const externalImport = (fileName) =>
  new RegExp(`import\\s+["']\\.\\./libs/${escapeRegExp(fileName)}["']`);

test("the shipped overlay bundle keeps Vue, Vuetify and NW.js as externals", () => {
  assert.match(
    bundle,
    externalImport("vue.js"),
    "Vue must stay a separate vendored script",
  );
  assert.match(
    bundle,
    externalImport("vuetify.js"),
    "Vuetify must stay a separate vendored script",
  );
  assert.ok(
    !bundle.includes("__vite-browser-external"),
    "Node builtins must remain runtime require() calls",
  );
  assert.match(
    bundle,
    /typeof require/,
    "runtime require() interop was removed",
  );
  for (const name of ["fs", "path", "nw.gui"]) {
    assert.match(
      bundle,
      new RegExp(`[A-Za-z_$][\\w$]*\\(["']${escapeRegExp(name)}["']\\)`),
      `NW.js runtime require("${name}") call was rewritten`,
    );
  }
  assert.ok(!bundle.includes("import.meta"));
  assert.ok(
    !/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|unpkg\.com)/.test(bundle),
    "the bundle must not load remote assets",
  );
  assert.ok(
    bundle.length < 800_000,
    "Vue/Vuetify were probably bundled instead of left external",
  );
});

test("the bootstrap loads the generated overlay bundle", () => {
  const importScript = readFileSync(
    path.join(ROOT, "cheat-engine/www/cheat/init/import.js"),
    "utf8",
  );
  assert.match(
    importScript,
    /__addScript\("module", "cheat\/init\/setup\.bundle\.js"\)/,
  );
});
