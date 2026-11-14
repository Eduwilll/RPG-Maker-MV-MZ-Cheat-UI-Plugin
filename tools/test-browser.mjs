import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const previewMode = process.argv.includes("--preview");
const candidates = [
  process.env.CHEAT_TEST_BROWSER,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
].filter(Boolean);
const browser = candidates.find((candidate) => fs.existsSync(candidate));
if (!browser)
  throw new Error(
    "Set CHEAT_TEST_BROWSER to an installed Chromium/Edge executable",
  );
const server = http.createServer((request, response) => {
  let relative;
  try {
    relative = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    ).replace(/^\/+/, "");
  } catch (error) {
    response.writeHead(400).end();
    return;
  }
  const target = path.resolve(root, relative);
  const check = path.relative(root, target);
  if (check.startsWith("..") || path.isAbsolute(check)) {
    response.writeHead(403).end();
    return;
  }
  fs.readFile(target, (error, buffer) => {
    if (error) {
      response.writeHead(404).end();
      return;
    }
    response.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "application/javascript",
        ".json": "application/json",
        ".css": "text/css",
      }[path.extname(target)] || "application/octet-stream",
    );
    response.setHeader("Cache-Control", "no-store");
    // Exercise the real preview bootstrap without making CDN skin loading a test dependency.
    if (previewMode && target === path.join(root, "preview", "index.html"))
      buffer = Buffer.from(
        buffer.toString().replace(/<link\b[^>]*href=["']https?:[^>]*>/gi, ""),
      );
    response.end(buffer);
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const profile = path.join(root, "tmp", "browser-smoke-" + Date.now());
fs.mkdirSync(profile, { recursive: true });
try {
  const url =
    "http://127.0.0.1:" +
    server.address().port +
    (previewMode ? "/tests/browser/preview.html" : "/tests/browser/index.html");
  const child = spawn(
    browser,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--no-first-run",
      "--no-default-browser-check",
      "--user-data-dir=" + profile,
      "--virtual-time-budget=12000",
      "--dump-dom",
      url,
    ],
    { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "",
    errors = "";
  child.stdout.on("data", (buffer) => {
    output += buffer.toString();
  });
  child.stderr.on("data", (buffer) => {
    errors += buffer.toString();
  });
  const timeout = setTimeout(() => child.kill(), 60000);
  const code = await new Promise((resolve, reject) => {
    child.on("close", resolve);
    child.on("error", reject);
  }).finally(() => clearTimeout(timeout));
  const match = output.match(
    /<pre id="smoke-results" data-status="(pass|fail)">([\s\S]*?)<\/pre>/,
  );
  if (!match) {
    console.error(
      "Browser did not finish smoke checks",
      code,
      errors.slice(-2000),
      output.slice(-2000),
    );
    process.exitCode = 1;
  } else {
    console.log(
      match[1].toUpperCase() +
        ": " +
        match[2]
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">"),
    );
    if (match[1] !== "pass") process.exitCode = 1;
  }
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  const relative = path.relative(path.join(root, "tmp"), profile);
  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
    try {
      fs.rmSync(profile, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100,
      });
    } catch (error) {
      console.warn("Browser left a locked temporary profile:", profile);
    }
  }
}
