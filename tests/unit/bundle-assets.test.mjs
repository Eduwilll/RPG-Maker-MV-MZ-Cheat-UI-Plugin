import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  BUNDLE_PATH,
  MANIFEST_PATH,
  ROOT,
  WINDOW_BUNDLE_PATH,
  bundleFiles,
  sha256Text,
  sourcesFingerprint,
} from "../../tools/vendor/bundle-files.mjs";

const packageJson = JSON.parse(
  readFileSync(path.join(ROOT, "package.json"), "utf8"),
);
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const bundle = readFileSync(BUNDLE_PATH, "utf8");
const popoutBundle = readFileSync(WINDOW_BUNDLE_PATH, "utf8");

test("the bundles are rebuilt after runtime changes", () => {
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
const runtimeRequire = (moduleName) =>
  new RegExp(`[A-Za-z_$][\\w$]*\\(["']${escapeRegExp(moduleName)}["']\\)`);

function assertNoRemoteAssets(text) {
  assert.ok(
    !/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|unpkg\.com)/.test(text),
    "the bundle must not load remote assets",
  );
}

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
      runtimeRequire(name),
      `NW.js runtime require("${name}") call was rewritten`,
    );
  }
  assert.ok(!bundle.includes("import.meta"));
  assertNoRemoteAssets(bundle);
  assert.ok(
    bundle.length < 800_000,
    "Vue/Vuetify were probably bundled instead of left external",
  );
});

test("the shipped pop-out bundle is one self-contained ES module", () => {
  // window-init.js imports the UI after bridging the game globals. A leftover
  // import() would point at a source module that bundle-only installs omit.
  assert.ok(
    !/\bimport\s*\(\s*["']\.{1,2}\//.test(popoutBundle),
    "dynamic imports must be inlined into the single pop-out file",
  );
  assert.ok(
    !popoutBundle.includes("../libs/"),
    "the pop-out must reuse the host page's Vue/Vuetify globals",
  );
  assert.ok(
    !popoutBundle.includes("__vite-browser-external"),
    "Node builtins must remain runtime require() calls",
  );
  assert.match(
    popoutBundle,
    /typeof require/,
    "runtime require() interop was removed",
  );
  for (const name of ["fs", "path", "nw.gui"]) {
    assert.match(
      popoutBundle,
      runtimeRequire(name),
      `NW.js runtime require("${name}") call was rewritten`,
    );
  }
  assert.ok(popoutBundle.includes("__cheatOpener"));
  assert.ok(!popoutBundle.includes("import.meta"));
  assertNoRemoteAssets(popoutBundle);
  assert.ok(
    popoutBundle.length > 200_000 && popoutBundle.length < 800_000,
    `unexpected pop-out bundle size ${popoutBundle.length} bytes`,
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

test("the pop-out page loads the generated bundle", () => {
  const windowHtml = readFileSync(
    path.join(ROOT, "cheat-engine/www/cheat/window.html"),
    "utf8",
  );
  assert.match(
    windowHtml,
    /<script type="module" src="\.\/js\/window-init\.bundle\.js"><\/script>/,
  );
  assert.ok(
    !/<script[^>]+src="\.\/js\/window-init\.js"/.test(windowHtml),
    "window.html must not load the source entry",
  );
});
