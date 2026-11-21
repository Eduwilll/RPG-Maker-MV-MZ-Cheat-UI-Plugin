import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import https from "node:https";
import { EventEmitter } from "node:events";
import {
  prepareDependencies,
  downloadDependency,
} from "../../cheat-engine/www/cheat/js/runtime/DependencyCache.js";

const manifest = JSON.parse(
  fs.readFileSync(
    new URL("../fixtures/dependencies/manifest.json", import.meta.url),
  ),
);
const node = { fs, path, crypto, os, https };
test("HTTPS uses the two-argument options API supported by Node 9 and rejects untrusted redirects", async () => {
  const asset = manifest.assets[0];
  for (const redirect of [false, true]) {
    const fake = {
      ...node,
      https: {
        get(options, listener) {
          assert.equal(
            arguments.length,
            2,
            "Node 9 has no get(url, options, callback) overload",
          );
          assert.equal(typeof options, "object");
          assert.equal(typeof listener, "function");
          const request = new EventEmitter();
          request.destroy = function () {};
          setTimeout(() => {
            const response = new EventEmitter();
            response.statusCode = redirect ? 302 : 200;
            response.headers = redirect
              ? { location: "https://evil.example/asset" }
              : {};
            response.resume = response.destroy = function () {};
            listener(response);
            if (!redirect) {
              response.emit("data", Buffer.from("hello"));
              response.emit("end");
            }
          }, 0);
          return request;
        },
      },
    };
    if (redirect)
      await assert.rejects(
        downloadDependency(fake, asset.urls[0], asset, Date.now() + 1000),
        /Untrusted/,
      );
    else
      assert.equal(
        (
          await downloadDependency(
            fake,
            asset.urls[0],
            asset,
            Date.now() + 1000,
          )
        ).toString(),
        "hello",
      );
  }
});
function fixture(t) {
  const base = new URL("../../tmp/cache-tests/", import.meta.url);
  fs.mkdirSync(base, { recursive: true });
  const root = fs.mkdtempSync(
    path.join(base.pathname.replace(/^\/([A-Za-z]:)/, "$1"), "node-"),
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test("cold, warm and corrupt cache use exact verified bytes and no warm network", async (t) => {
  const cacheRoot = fixture(t);
  let downloads = 0;
  const download = async () => {
    downloads++;
    return Buffer.from("hello");
  };
  const options = { node, cacheRoot, download };
  assert.equal(
    (await prepareDependencies(manifest, options))["vue.js"].toString(),
    "hello",
  );
  await prepareDependencies(manifest, {
    ...options,
    download() {
      throw new Error("offline");
    },
  });
  assert.equal(downloads, 1);
  fs.writeFileSync(path.join(cacheRoot, manifest.id, "vue.js"), "wrong");
  await prepareDependencies(manifest, options);
  assert.equal(downloads, 2);
  assert.deepEqual(fs.readdirSync(path.join(cacheRoot, manifest.id)), [
    "vue.js",
  ]);
});

test("bad or interrupted downloads never publish executable cache entries", async (t) => {
  const cacheRoot = fixture(t);
  for (const download of [
    async () => Buffer.from("wrong"),
    async () => Buffer.from("too long"),
    async () => {
      throw new Error("interrupted");
    },
  ]) {
    await assert.rejects(
      prepareDependencies(manifest, { node, cacheRoot, download }),
    );
    assert.equal(
      fs.existsSync(path.join(cacheRoot, manifest.id, "vue.js")),
      false,
    );
  }
  await assert.rejects(
    prepareDependencies(
      { ...manifest, id: "b".repeat(64) },
      { node, cacheRoot, download: async () => Buffer.from("hello") },
    ),
  );
});

test("concurrent cache users publish complete files and remove only their own temporary files", async (t) => {
  const cacheRoot = fixture(t);
  const options = {
    node,
    cacheRoot,
    download: async () => {
      await new Promise((r) => setTimeout(r, 15));
      return Buffer.from("hello");
    },
  };
  const results = await Promise.all([
    prepareDependencies(manifest, options),
    prepareDependencies(manifest, options),
  ]);
  assert.ok(results.every((r) => r["vue.js"].toString() === "hello"));
  assert.deepEqual(fs.readdirSync(path.join(cacheRoot, manifest.id)), [
    "vue.js",
  ]);
});

test("blocked cache directory and bounded stalled downloads fail clearly", async (t) => {
  const cacheRoot = fixture(t);
  const blocked = path.join(cacheRoot, "not-a-folder");
  fs.writeFileSync(blocked, "do not touch");
  await assert.rejects(
    prepareDependencies(manifest, {
      node,
      cacheRoot: blocked,
      download: async () => Buffer.from("hello"),
    }),
  );
  const started = Date.now();
  await assert.rejects(
    prepareDependencies(manifest, {
      node,
      cacheRoot,
      timeout: 30,
      download: () => new Promise(() => {}),
    }),
    /timed out/,
  );
  assert.ok(Date.now() - started < 1000);
});
