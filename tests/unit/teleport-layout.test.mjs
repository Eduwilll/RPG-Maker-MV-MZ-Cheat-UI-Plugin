import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(
  new URL(
    "../../cheat-engine/www/cheat/panels/TeleportPanel.js",
    import.meta.url,
  ),
  "utf8",
);
test("Teleport presents a searchable list and inline destination inspector, not per-row action buttons", () => {
  assert.match(source, /destination-rail/);
  assert.match(source, /destination-inspector/);
  assert.doesNotMatch(source, /<v-data-table/);
  assert.match(source, /label="Find a map"/);
  assert.match(source, /@click="selectMap\(item\)"/);
});
test("Coordinates remain compact numeric fields associated with the selected destination", () => {
  for (const axis of ["X", "Y"]) {
    const fields = [...source.matchAll(/<v-text-field\b[^>]*>/g)].map(
      (match) => match[0],
    );
    const field = fields.find((row) =>
      row.includes('v-model="input' + axis + '"'),
    );
    assert.ok(field);
    assert.match(field, /type="number"/);
    assert.match(field, /cheat-field-w80/);
    assert.match(field, /@keydown.self.stop/);
  }
  assert.match(source, /!validDestination/);
  assert.match(source, /selectMapCenter/);
});
test("Reload remains accessible, while the map and save form have separate roles", () => {
  assert.match(source, /aria-label="Reload maps and translations"/);
  assert.match(source, /@click="manualRefresh"/);
  assert.match(source, /<map-preview[^>]*interactive/);
  assert.match(source, /<save-map-point/);
  assert.match(source, /Teleport here/);
});
