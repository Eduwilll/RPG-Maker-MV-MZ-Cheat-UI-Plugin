import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../../cheat-engine/www/cheat/", import.meta.url);
const source = (path) => readFileSync(new URL(path, root), "utf8");

test("actors expose a searchable roster and focused live-edit sections", () => {
  const actor = source("panels/ActorSettingPanel.js");
  assert.match(actor, /record-workspace/);
  assert.match(actor, /label="Search actors/);
  assert.match(actor, /actorFilter/);
  assert.match(actor, /detailView/);
  assert.match(actor, /Changes apply immediately/);
  assert.match(actor, /virtual-list/);
});

test("database inspectors separate editing concerns and keep a visible draft state", () => {
  const panel = source("panels/DatabaseEditorPanel.js");
  assert.match(panel, /record-workspace/);
  assert.match(panel, /inspectorViews/);
  assert.match(panel, /hasDraftChanges/);
  assert.match(panel, /Unapplied changes/);
  assert.match(panel, /record-apply-bar/);
  assert.match(panel, /Reset to Original/);
});

test("troop inspector separates composition from original event actions", () => {
  const encounter = source("components/EncounterBrowser.js");
  assert.match(encounter, /record-workspace/);
  assert.match(encounter, /detailView/);
  assert.match(encounter, /Map events/);
  assert.match(encounter, /battle event pages/);
  assert.match(encounter, /@keydown.space.stop.prevent/);
});
