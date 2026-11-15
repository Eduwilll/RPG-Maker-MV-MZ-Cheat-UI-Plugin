import test from "node:test";
import assert from "node:assert/strict";
import { unitTestArgs } from "../../tools/test-unit.mjs";

test("unit runner supports local Node 22 and CI Node 24 without the removed default-type flag", () => {
  assert.deepEqual(unitTestArgs(22, ["one.test.mjs"]), [
    "--experimental-test-isolation=none",
    "--test",
    "one.test.mjs",
  ]);
  assert.deepEqual(
    unitTestArgs(24, ["one.test.mjs"], ["--test-reporter=dot"]),
    ["--test-isolation=none", "--test", "--test-reporter=dot", "one.test.mjs"],
  );
  assert.ok(!unitTestArgs(26, []).some((arg) => arg.includes("default-type")));
});
