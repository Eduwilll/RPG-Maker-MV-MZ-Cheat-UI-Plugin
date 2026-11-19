import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const cheatRoot = path.join(root, "cheat-engine", "www", "cheat");
const libs = path.join(cheatRoot, "libs");

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function listFiles(directory, extension) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(absolute, extension));
    else if (entry.name.endsWith(extension)) files.push(absolute);
  }
  return files;
}

function assetUrls(cssText) {
  return [...cssText.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(
    (match) => match[1],
  );
}

test("Vue ships as the pinned production build", () => {
  const vue = readFileSync(path.join(libs, "vue.js"), "utf8");
  // 2.7's minified UMD exposes the version as a local `var`, not a
  // `version="..."` attribute, so match the version string itself.
  assert.match(vue, /Vue\.js v2\.7\.16/);
  assert.match(vue, /"2\.7\.16"/);
  assert.ok(vue.length < 200_000, "Vue dev build would be much larger");
  assert.ok(
    !vue.includes("You are running Vue in development mode"),
    "Vue dev-mode banner must not ship",
  );
});

test("Vuetify JS and CSS are the same pinned production version", () => {
  const vuetify = readFileSync(path.join(libs, "vuetify.js"), "utf8");
  const css = readFileSync(path.join(libs, "vuetify.min.css"), "utf8");
  assert.match(vuetify, /\.version="2\.6\.3"/);
  assert.match(css, /Vuetify v2\.6\.3/);
  assert.ok(
    vuetify.length < 800_000,
    "Vuetify dev build is ~1.7 MB and must not ship",
  );
});

test("every referenced Material Design Icon exists in the shipped subset", () => {
  const css = readFileSync(
    path.join(libs, "mdi", "materialdesignicons.min.css"),
    "utf8",
  );
  const available = new Set(
    [...css.matchAll(/\.mdi-([a-z0-9-]+)::before/g)].map((match) => match[1]),
  );
  const referenced = new Set();
  for (const file of listFiles(cheatRoot, ".js")) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/mdi-[a-z0-9]+(?:-[a-z0-9]+)*/g)) {
      referenced.add(match[0].slice(4));
    }
  }

  const missing = [...referenced].filter((name) => !available.has(name));
  assert.deepEqual(
    missing,
    [],
    "regenerate with tools/vendor/build-mdi-subset.py",
  );
});

test("vendored stylesheets only reference files shipped next to them", () => {
  const stylesheets = [
    ["libs/roboto.css", path.join(libs, "roboto.css")],
    [
      "libs/mdi/materialdesignicons.min.css",
      path.join(libs, "mdi", "materialdesignicons.min.css"),
    ],
  ];

  for (const [label, file] of stylesheets) {
    const base = path.dirname(file);
    const urls = assetUrls(readFileSync(file, "utf8")).filter(
      (url) => !url.startsWith("data:"),
    );
    assert.ok(urls.length > 0, `${label} should reference local font files`);
    for (const url of urls) {
      const local = path.resolve(base, url.split("?")[0]);
      assert.ok(existsSync(local), `${label} references missing ${url}`);
      assert.ok(
        !/^(https?:)?\/\//.test(url),
        `${label} must not load remote assets (${url})`,
      );
    }
  }
});

test("runtime entries reference no remote font or CDN assets", () => {
  const entries = [
    "cheat-engine/www/cheat/window.html",
    "cheat-engine/www/cheat/init/import.js",
    "preview/index.html",
  ];
  const remoteAsset =
    /(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com|unpkg\.com)/;

  for (const entry of entries) {
    const text = read(entry);
    assert.doesNotMatch(text, remoteAsset, `${entry} still loads a CDN asset`);
  }

  const windowHtml = read("cheat-engine/www/cheat/window.html");
  for (const asset of [
    "./libs/roboto.css",
    "./libs/mdi/materialdesignicons.min.css",
    "./libs/vuetify.min.css",
  ]) {
    assert.ok(windowHtml.includes(asset), `window.html should load ${asset}`);
  }
});
