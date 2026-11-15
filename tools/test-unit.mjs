import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function unitTestArgs(major, files, extra = []) {
  const isolation =
    major >= 24
      ? "--test-isolation=none"
      : "--experimental-test-isolation=none";
  return [isolation, "--test", ...extra, ...files];
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const files = readdirSync(path.join(root, "tests/unit"))
    .filter((name) => name.endsWith(".test.mjs"))
    .sort()
    .map((name) => path.join(root, "tests/unit", name));
  const result = spawnSync(
    process.execPath,
    unitTestArgs(
      Number(process.versions.node.split(".")[0]),
      files,
      process.argv.slice(2),
    ),
    { cwd: root, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status === null ? 1 : result.status;
}
