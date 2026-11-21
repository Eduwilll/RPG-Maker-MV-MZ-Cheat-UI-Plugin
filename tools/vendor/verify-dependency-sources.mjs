import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import https from "node:https";
import os from "node:os";
import { shippedDependencies, sha256 } from "./dependency-manifest.mjs";
import { downloadDependency } from "../../cheat-engine/www/cheat/js/runtime/DependencyCache.js";

const { manifest } = shippedDependencies();
const node = { fs, path, crypto, https, os };
const deadline = Date.now() + 90000;
let index = 0;
async function worker() {
  while (index < manifest.assets.length) {
    const asset = manifest.assets[index++];
    let failure;
    let valid = false;
    for (const url of asset.urls) {
      try {
        const bytes = await downloadDependency(node, url, asset, deadline);
        if (bytes.length !== asset.size || sha256(bytes) !== asset.sha256)
          throw new Error("Source differs from release bytes");
        valid = true;
        console.log("Verified " + asset.path);
        break;
      } catch (error) {
        failure = error;
      }
    }
    if (!valid) throw new Error(asset.path + ": " + failure.message);
  }
}
await Promise.all([worker(), worker(), worker()]);
console.log("Verified immutable dependency set " + manifest.id);
