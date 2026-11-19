import test from "node:test";
import assert from "node:assert/strict";
import {
  compareVersions,
  readCheatVersion,
  versionFilePath,
} from "../../cheat-engine/www/cheat/js/runtime/CheatVersion.js";

const readFrom = (contents) => (filePath) => {
  if (contents[filePath] === undefined) {
    throw new Error("ENOENT");
  }
  return contents[filePath];
};

test("MV reads the version file under www, MZ at the game root", () => {
  assert.equal(versionFilePath("MV"), "www/cheat-version-description.json");
  assert.equal(versionFilePath("MZ"), "./cheat-version-description.json");
  assert.equal(versionFilePath(), "./cheat-version-description.json");
});

test("numeric segments compare, so 1.10 is newer than 1.9", () => {
  assert.equal(compareVersions("1.9.0", "1.10.0"), -1);
  assert.equal(compareVersions("1.10.0", "1.9.0"), 1);
});

test("the release tag prefix is ignored", () => {
  assert.equal(compareVersions("1.8.0", "v1.8.0"), 0);
  assert.equal(compareVersions("v1.8.0", "1.9.0"), -1);
  assert.equal(compareVersions("1.8.0", "v1.9.0"), -1);
});

test("missing segments count as zero", () => {
  assert.equal(compareVersions("1.2", "1.2.0"), 0);
  assert.equal(compareVersions("1.2", "1.2.1"), -1);
  assert.equal(compareVersions("2", "1.9.9"), 1);
});

test("non-numeric garbage never reports a newer installed version", () => {
  assert.equal(compareVersions("unknown", "1.0.0"), -1);
  assert.equal(compareVersions("1.0.0", "unknown"), 1);
  assert.equal(compareVersions("", ""), 0);
});

test("a packaged file is read for the right engine root", () => {
  const fileSystem = {
    readFileSync: readFrom({
      "www/cheat-version-description.json": '{"version":"1.8.0"}',
    }),
  };

  assert.equal(
    readCheatVersion({ fileSystem, rpgMakerName: "MV" }),
    "1.8.0",
  );
  assert.equal(
    readCheatVersion({ fileSystem, rpgMakerName: "MZ" }),
    null,
    "MZ looks at a different path",
  );
});

test("missing, empty and malformed files resolve to null", () => {
  assert.equal(
    readCheatVersion({
      fileSystem: { readFileSync: readFrom({}) },
      rpgMakerName: "MZ",
    }),
    null,
  );
  assert.equal(
    readCheatVersion({
      fileSystem: { readFileSync: () => "{ not json" },
      rpgMakerName: "MZ",
    }),
    null,
  );
  assert.equal(
    readCheatVersion({
      fileSystem: { readFileSync: () => '{"version":""}' },
      rpgMakerName: "MZ",
    }),
    null,
  );
});

test("a caller without a file system degrades to null", () => {
  assert.equal(readCheatVersion(), null);
  assert.equal(readCheatVersion({}), null);
  assert.equal(readCheatVersion({ fileSystem: {} }), null);
});

test("the engine writes a plain version, and the comparison uses it", () => {
  // deploy/main.py writes {"version": "<tag without v>"}, so a current
  // install must not warn about its own release tag.
  const fileSystem = {
    readFileSync: () => '{"version":"1.8.0"}',
  };
  const current = readCheatVersion({ fileSystem, rpgMakerName: "MV" });

  assert.equal(compareVersions(current, "v1.8.0"), 0);
  assert.equal(compareVersions(current, "v1.7.0"), 1);
});