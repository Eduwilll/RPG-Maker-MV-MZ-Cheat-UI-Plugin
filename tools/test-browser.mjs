import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

async function bounded(action, timeout, label) {
  let timer;
  try {
    return await Promise.race([
      action(),
      new Promise((resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(label + " timed out")),
          timeout,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function fixtureServer(root) {
  return http.createServer(async (request, response) => {
    let target;
    try {
      const relative = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      ).replace(/^\/+/, "");
      target = path.resolve(root, relative);
    } catch {
      response.writeHead(400).end();
      return;
    }
    const check = path.relative(root, target);
    if (check.startsWith("..") || path.isAbsolute(check)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const buffer = await fs.readFile(target);
      response.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".js": "application/javascript",
          ".json": "application/json",
          ".css": "text/css",
          ".woff2": "font/woff2",
        }[path.extname(target)] || "application/octet-stream",
      );
      response.setHeader("Cache-Control", "no-store");
      response.end(buffer);
    } catch {
      response.writeHead(404).end();
    }
  });
}

export async function runBrowserChecks({
  root = projectRoot,
  entry = "tests/browser/index.html",
  artifactDir = path.join(projectRoot, "tmp/browser-smoke/browser"),
  executablePath = process.env.CHEAT_TEST_BROWSER,
  timeout = 90000,
  diagnosticTimeout = 5000,
  blockExternal = false,
  afterChecks,
} = {}) {
  root = path.resolve(root);
  await fs.mkdir(artifactDir, { recursive: true });
  const server = fixtureServer(root);
  const started = Date.now();
  const logs = [];
  const pageErrors = [];
  const report = { status: "fail", entry, checks: [], errors: [] };
  if (blockExternal) report.externalRequests = [];
  async function checkpoint(phase) {
    report.phase = phase;
    await fs.writeFile(
      path.join(artifactDir, "progress.json"),
      JSON.stringify(report, null, 2),
    );
  }
  let browserServer, browser, context, page;
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    await checkpoint("launch");
    browserServer = await chromium.launchServer({
      headless: true,
      executablePath,
      host: "127.0.0.1",
    });
    await checkpoint("connect");
    browser = await chromium.connect(browserServer.wsEndpoint(), {
      timeout: 30000,
    });
    report.browser = browser.version();
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    if (blockExternal) {
      await context.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (
          /^https?:$/.test(url.protocol) &&
          !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
        ) {
          report.externalRequests.push(url.href);
          return route.abort("blockedbyclient");
        }
        return route.continue();
      });
    }
    await context.tracing.start({ screenshots: true, snapshots: true });
    page = await context.newPage();
    page.on("console", (message) =>
      logs.push({ type: message.type(), text: message.text() }),
    );
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) =>
      logs.push({
        type: "requestfailed",
        url: request.url(),
        error: request.failure(),
      }),
    );
    const url = new URL(
      entry,
      "http://127.0.0.1:" + server.address().port + "/",
    ).href;
    await checkpoint("navigate");
    await bounded(
      () => page.goto(url, { waitUntil: "load", timeout }),
      timeout,
      "Page navigation",
    );
    // Use real time and an explicit completion signal. Virtual-time DOM dumps
    // can race iframe focus, animation frames and Vuetify's lazy menus.
    await checkpoint("suite");
    await bounded(
      () =>
        page.waitForFunction(
          () => {
            const node = document.getElementById("smoke-results");
            return node && ["pass", "fail"].includes(node.dataset.status);
          },
          null,
          { timeout },
        ),
      timeout,
      "Browser suite timeout",
    );
    const result = await bounded(
      () =>
        page.locator("#smoke-results").evaluate((node) => ({
          status: node.dataset.status,
          text: node.textContent,
        })),
      diagnosticTimeout,
      "Result read",
    );
    let payload;
    try {
      payload = JSON.parse(result.text);
    } catch {
      throw new Error(
        "Browser returned invalid JSON results: " + result.text.slice(0, 300),
      );
    }
    if (
      !payload ||
      !Array.isArray(payload.checks) ||
      (result.status === "pass" && !payload.checks.length) ||
      (payload.errors !== undefined && !Array.isArray(payload.errors))
    ) {
      throw new Error("Browser returned an invalid or empty check report");
    }
    report.checks = payload.checks;
    report.errors = [...(payload.errors || []), ...pageErrors];
    if (blockExternal && report.externalRequests.length)
      throw new Error(
        "External network requests were attempted: " +
          report.externalRequests.join(", "),
      );
    if (result.status !== "pass" || payload.error || report.errors.length) {
      throw new Error(
        payload.error || report.errors.join("; ") || "Browser checks failed",
      );
    }
    if (afterChecks) {
      await bounded(
        () => afterChecks({ page, checks: report.checks }),
        timeout,
        "Browser interaction checks",
      );
      if (pageErrors.length) throw new Error(pageErrors.join("; "));
      if (blockExternal && report.externalRequests.length)
        throw new Error(
          "External network requests were attempted during interaction checks",
        );
    }
    report.status = "pass";
  } catch (error) {
    report.error = error.stack || error.message || String(error);
    report.errors = [...new Set([...report.errors, ...pageErrors])];
  } finally {
    if (page && report.status === "fail") {
      for (const [name, save] of [
        [
          "page.html",
          async () =>
            fs.writeFile(
              path.join(artifactDir, "page.html"),
              await page.content(),
            ),
        ],
        [
          "screenshot.png",
          () =>
            page.screenshot({
              path: path.join(artifactDir, "screenshot.png"),
              timeout: diagnosticTimeout,
            }),
        ],
      ]) {
        try {
          await checkpoint("capture-" + name);
          await bounded(save, diagnosticTimeout, name + " capture");
        } catch (error) {
          logs.push({ type: "artifact-error", name, text: String(error) });
        }
      }
    }
    if (context) {
      try {
        await checkpoint("capture-trace");
        await bounded(
          () =>
            context.tracing.stop(
              report.status === "fail"
                ? { path: path.join(artifactDir, "trace.zip") }
                : {},
            ),
          diagnosticTimeout,
          "Trace capture",
        );
      } catch (error) {
        logs.push({
          type: "artifact-error",
          name: "trace.zip",
          text: String(error),
        });
      }
    }
    try {
      if (browserServer) {
        await checkpoint("shutdown");
        await bounded(
          () => browserServer.close(),
          diagnosticTimeout,
          "Browser shutdown",
        );
      }
    } catch (error) {
      report.status = "fail";
      report.error = report.error || "Browser cleanup failed: " + String(error);
      logs.push({ type: "cleanup-error", text: String(error) });
      // A renderer stuck in synchronous JavaScript can also block graceful
      // shutdown. Kill only this runner's owned browser process as a fallback.
      if (browserServer) {
        await checkpoint("force-stop");
        await browserServer.kill();
      }
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    report.durationMs = Date.now() - started;
    await checkpoint("complete");
    await fs.writeFile(
      path.join(artifactDir, "console.json"),
      JSON.stringify(logs, null, 2),
    );
    await fs.writeFile(
      path.join(artifactDir, "result.json"),
      JSON.stringify(report, null, 2),
    );
  }
  return report;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const preview = process.argv.includes("--preview");
  const artifactDir = path.join(
    projectRoot,
    "tmp/browser-smoke",
    preview ? "preview" : "browser",
    `${Date.now()}-${process.pid}`,
  );
  const result = await runBrowserChecks({
    entry: preview ? "tests/browser/preview.html" : "tests/browser/index.html",
    artifactDir,
  });
  console.log(
    result.status.toUpperCase() +
      ": " +
      result.checks.length +
      " checks (" +
      result.durationMs +
      "ms), Chromium " +
      (result.browser || "not started"),
  );
  if (result.status !== "pass") {
    console.error(result.error);
    console.error("Diagnostics: " + artifactDir);
    process.exitCode = 1;
  }
}
