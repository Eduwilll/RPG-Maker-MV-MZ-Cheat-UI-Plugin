import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../../cheat-engine/www/cheat/panels/TeleportPanel.js", import.meta.url),
  "utf8",
);
const toolbar = source.slice(
  source.indexOf("<v-card"),
  source.indexOf("<v-data-table"),
);

test("Teleport coordinates share one wrapping flex row instead of responsive columns", () => {
  const row = toolbar.match(/<div\b[^>]*class="teleport-coordinates"[^>]*>/);
  assert.ok(row, "coordinates need a dedicated compact row");
  assert.match(row[0], /display:\s*flex/);
  assert.match(row[0], /flex-wrap:\s*wrap/);
  assert.match(row[0], /align-items:\s*center/);
  assert.doesNotMatch(toolbar, /<v-(?:row|col)\b/);
});

test("Teleport X and Y stay compact numeric outlined dense fields", () => {
  const fields = [...toolbar.matchAll(/<v-text-field\b[^>]*>/g)].map(
    (match) => match[0],
  );
  assert.equal(fields.length, 2);
  for (const [index, axis] of ["X", "Y"].entries()) {
    const field = fields[index];
    assert.ok(field.includes(`v-model="input${axis}"`));
    assert.ok(field.includes(`label="${axis}"`));
    assert.match(field, /type="number"/);
    assert.match(field, /\soutlined(?:\s|>)/);
    assert.match(field, /\sdense(?:\s|>)/);
    assert.match(field, /\shide-details(?:\s|>)/);
    assert.match(field, /flex:\s*0 0 80px/);
    assert.match(field, /(?:[;"\s])width:\s*80px/);
    assert.match(field, /min-width:\s*0/);
    assert.match(field, /max-width:\s*80px/);
    assert.ok(field.includes('@keydown.self.stop'));
    assert.ok(field.includes('@focus="$event.target.select()"'));
  }
});

test("Reload follows X/Y at the right and retains its tooltip and refresh action", () => {
  const button = toolbar.match(/<v-btn\b[^>]*>/);
  assert.ok(button);
  assert.ok(toolbar.indexOf(button[0]) > toolbar.indexOf('v-model="inputY"'));
  assert.match(button[0], /class="[^"]*\bcheat-reload\b[^"]*\bml-auto\b/);
  assert.match(button[0], /flex:\s*0 0 auto/);
  assert.ok(button[0].includes('@click="manualRefresh"'));
  assert.ok(button[0].includes('aria-label="Reload maps and translations"'));
  assert.ok(button[0].includes('v-bind="attrs"'));
  assert.ok(button[0].includes('v-on="on"'));
  assert.ok(toolbar.includes("<span>Reload maps and translations</span>"));
});
