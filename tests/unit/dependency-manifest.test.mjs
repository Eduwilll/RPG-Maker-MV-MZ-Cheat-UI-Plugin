import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { generateManifest } from "../../tools/vendor/dependency-manifest.mjs";
import {
  validateManifest,
  canonicalAssets,
} from "../../cheat-engine/www/cheat/js/runtime/DependencyManifest.js";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const revision = "a".repeat(40);
const make = (data = Buffer.from("one\r\ntwo")) =>
  generateManifest({
    revision,
    assets: [{ path: "vue.js", kind: "script", bytes: data }],
  });

test("manifest identity uses sorted exact asset bytes, not line-normalized text or URLs", () => {
  const manifest = make();
  assert.equal(manifest.assets[0].sha256, hash(Buffer.from("one\r\ntwo")));
  assert.notEqual(manifest.id, make(Buffer.from("one\ntwo")).id);
  assert.equal(manifest.id, hash(canonicalAssets(manifest.assets)));
  assert.equal(validateManifest(manifest), manifest);
  const reordered = generateManifest({
    revision,
    assets: [
      { path: "z.woff2", kind: "font", bytes: Buffer.from([0, 255]) },
      { path: "a.js", kind: "script", bytes: Buffer.from("a") },
    ],
  });
  assert.deepEqual(
    reordered.assets.map((a) => a.path),
    ["a.js", "z.woff2"],
  );
});

test("manifest rejects unsafe paths, collisions, unknown schema, sizes and unpinned URLs", () => {
  for (const path of [
    "../vue.js",
    "/vue.js",
    "C:/vue.js",
    "a\\vue.js",
    "a/../vue.js",
    "a/%2e.js",
    "CON.js",
    "x./vue.js",
  ]) {
    const manifest = make();
    manifest.assets[0].path = path;
    assert.throws(() => validateManifest(manifest), undefined, path);
  }
  for (const update of [
    (m) => {
      m.schema = 2;
    },
    (m) => {
      m.assets[0].size = -1;
    },
    (m) => {
      m.assets[0].size = 33554433;
    },
    (m) => {
      m.assets[0].sha256 = "oops";
    },
    (m) => {
      m.assets[0].urls = ["https://evil.example/vue.js"];
    },
    (m) => {
      m.assets[0].urls = [m.assets[0].urls[0].replace(revision, "main")];
    },
    (m) => {
      m.assets.push({ ...m.assets[0], path: "VUE.js" });
    },
  ]) {
    const manifest = make();
    update(manifest);
    assert.throws(() => validateManifest(manifest));
  }
});
