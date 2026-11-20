import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { runBrowserChecks } from "../tools/test-browser.mjs";

const temporaryRoot = path.resolve("tmp");

async function fixture(t, content) {
  await fs.mkdir(temporaryRoot, { recursive: true });
  const root = await fs.mkdtemp(
    path.join(temporaryRoot, "browser-runner-test-"),
  );
  await fs.writeFile(path.join(root, "index.html"), content);
  t.after(async () => {
    const relative = path.relative(temporaryRoot, root);
    assert.ok(
      relative && !relative.startsWith("..") && !path.isAbsolute(relative),
    );
    await fs.rm(root, { recursive: true, force: true });
  });
  return {
    root,
    entry: "index.html",
    artifactDir: path.join(
      temporaryRoot,
      "browser-smoke/runner-contract",
      path.basename(root),
    ),
    timeout: 10000,
  };
}

test("browser runner waits for async completion instead of dumping the initial DOM", async (t) => {
  const options = await fixture(
    t,
    `<pre id="smoke-results" data-status="running"></pre>
    <script>setTimeout(() => {
      const node = document.getElementById('smoke-results');
      node.textContent = JSON.stringify({checks:['async check'],errors:[]});
      node.dataset.status = 'pass';
    }, 150);</script>`,
  );
  const result = await runBrowserChecks(options);
  assert.equal(result.status, "pass");
  assert.deepEqual(result.checks, ["async check"]);
});

test("a failed browser assertion retains its error and diagnostic artifacts", async (t) => {
  const options = await fixture(
    t,
    `<pre id="smoke-results" data-status="fail">{"checks":["before failure"],"errors":[],"error":"dropdown is obscured"}</pre>`,
  );
  const result = await runBrowserChecks(options);
  assert.equal(result.status, "fail");
  assert.match(result.error, /dropdown is obscured/);
  assert.deepEqual(result.checks, ["before failure"]);
  for (const name of [
    "result.json",
    "console.json",
    "page.html",
    "screenshot.png",
    "trace.zip",
  ]) {
    assert.ok(
      (await fs.stat(path.join(options.artifactDir, name))).size > 0,
      name,
    );
  }
});

test("a stalled page fails rather than being accepted as an empty successful run", async (t) => {
  const options = await fixture(
    t,
    '<pre id="smoke-results" data-status="running">Still running</pre>',
  );
  const result = await runBrowserChecks({ ...options, timeout: 250 });
  assert.equal(result.status, "fail");
  assert.match(result.error, /timeout/i);
  assert.ok(
    (await fs.stat(path.join(options.artifactDir, "page.html"))).size > 0,
  );
});

test("a bootstrap failure before the first check retains the original error", async (t) => {
  const options = await fixture(
    t,
    '<pre id="smoke-results" data-status="fail">{"checks":[],"errors":[],"error":"bootstrap failed"}</pre>',
  );
  const result = await runBrowserChecks(options);
  assert.equal(result.status, "fail");
  assert.match(result.error, /bootstrap failed/);
});

test("an empty successful report does not count as a passing suite", async (t) => {
  const options = await fixture(
    t,
    '<pre id="smoke-results" data-status="pass">{"checks":[],"errors":[]}</pre>',
  );
  const result = await runBrowserChecks(options);
  assert.equal(result.status, "fail");
  assert.match(result.error, /empty/i);
});

test("malformed completed results cannot pass", async (t) => {
  const options = await fixture(
    t,
    '<pre id="smoke-results" data-status="pass">not json</pre>',
  );
  const result = await runBrowserChecks(options);
  assert.equal(result.status, "fail");
  assert.match(result.error, /JSON/i);
});

test("uncaught page errors fail even if the page reports success", async (t) => {
  const options = await fixture(
    t,
    `<pre id="smoke-results" data-status="running"></pre>
    <script>setTimeout(() => { throw Error('unhandled fixture error'); }, 0);
    setTimeout(() => { const node = document.getElementById('smoke-results');
      node.textContent = JSON.stringify({checks:['done'],errors:[]}); node.dataset.status='pass';
    }, 50);</script>`,
  );
  const result = await runBrowserChecks(options);
  assert.equal(result.status, "fail");
  assert.match(result.error, /unhandled fixture error/);
});

test("launch failures still produce a readable result artifact", async (t) => {
  const options = await fixture(t, "<p>never opened</p>");
  const result = await runBrowserChecks({
    ...options,
    executablePath: path.join(options.root, "missing-browser.exe"),
  });
  assert.equal(result.status, "fail");
  const saved = JSON.parse(
    await fs.readFile(path.join(options.artifactDir, "result.json"), "utf8"),
  );
  assert.equal(saved.status, "fail");
  assert.ok(saved.error.length > 0);
});

test("a stuck renderer cannot prevent failure reporting and process cleanup", async (t) => {
  const options = await fixture(
    t,
    `<pre id="smoke-results" data-status="running">stuck</pre>
    <script>setTimeout(() => { while (true) {} }, 50);</script>`,
  );
  const code = `import { runBrowserChecks } from './tools/test-browser.mjs';
    const result = await runBrowserChecks(${JSON.stringify({ ...options, timeout: 300, diagnosticTimeout: 250 })});
    console.log(JSON.stringify(result));`;
  const result = await new Promise((resolve) => {
    execFile(
      process.execPath,
      ["--input-type=module", "-e", code],
      { timeout: 15000, windowsHide: true },
      (error, stdout, stderr) => resolve({ error, stdout, stderr }),
    );
  });
  assert.equal(result.error, null, result.stderr);
  const report = JSON.parse(result.stdout.trim());
  assert.equal(report.status, "fail");
  assert.match(report.error, /timeout/i);
  assert.equal(
    JSON.parse(
      await fs.readFile(path.join(options.artifactDir, "result.json"), "utf8"),
    ).status,
    "fail",
  );
});
