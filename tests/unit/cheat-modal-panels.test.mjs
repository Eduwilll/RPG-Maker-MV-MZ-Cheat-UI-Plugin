import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../../cheat-engine/www/cheat/CheatModal.js", import.meta.url),
  "utf8",
);

/** Panels imported by the shell, e.g. "teleport-panel" -> "TeleportPanel". */
const importedPanels = [
  ...source.matchAll(/^import\s+(\w+)\s+from\s+"\.\/panels\/(\w+)\.js";/gm),
].map((match) => ({ identifier: match[1], file: match[2] }));

function block(startMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `missing ${startMarker}`);
  return source.slice(start, source.indexOf("};", start) === -1 ? undefined : source.indexOf("};", start));
}

const vueComponents = source.slice(
  source.indexOf("components: {"),
  source.indexOf("},", source.indexOf("components: {")),
);
const panelRegistry = block("const components = {");

test("CheatModal imports the panel collection", () => {
  assert.ok(importedPanels.length >= 20, "sanity check on the import scan");
});

test("every imported panel is registered as a Vue component of the shell", () => {
  const missing = importedPanels
    .filter(({ identifier }) => !new RegExp(`\\b${identifier}\\b`).test(vueComponents))
    .map(({ file }) => `${file}.js`);
  assert.deepEqual(
    missing,
    [],
    "unregistered panels render as <unknown-element> with no content",
  );
});

test("every imported panel is available to the dynamic panel registry", () => {
  const missing = importedPanels
    .filter(({ identifier }) => !new RegExp(`\\b${identifier}\\b`).test(panelRegistry))
    .map(({ file }) => `${file}.js`);
  assert.deepEqual(missing, []);
});

test("nav entries point at registered panels", () => {
  const navComponents = [
    ...source.matchAll(/component:\s*"([a-z0-9-]+)"/g),
  ].map((match) => match[1]);
  const registered = importedPanels.map(({ identifier }) =>
    identifier
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
      .toLowerCase(),
  );
  const databaseEditors = [
    "enemy-editor-panel",
    "skill-editor-panel",
    "class-editor-panel",
  ];
  const unknown = navComponents.filter(
    (name) =>
      !registered.includes(name) &&
      !databaseEditors.includes(name) &&
      name !== "minimap-panel",
  );
  assert.deepEqual(unknown, [], "navigation must not target a missing panel");
});
