import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assetUrls,
  canonicalAssets,
  validateManifest,
} from "../../cheat-engine/www/cheat/js/runtime/DependencyManifest.js";

export const vendorRoot = fileURLToPath(
  new URL("../../cheat-engine/www/cheat/libs/", import.meta.url),
);
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");

export function generateManifest({ revision, assets }) {
  const entries = assets
    .map(({ path, kind, bytes }) => ({
      path,
      kind,
      size: bytes.length,
      sha256: sha256(bytes),
      urls: assetUrls(revision, path),
    }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return validateManifest({
    schema: 1,
    revision,
    id: sha256(canonicalAssets(entries)),
    assets: entries,
  });
}

export function shippedDependencies() {
  const { revision } = JSON.parse(
    readFileSync(new URL("./dependency-sources.json", import.meta.url), "utf8"),
  );
  const assets = [];
  function visit(directory, prefix = "") {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relative = prefix + entry.name;
      if (entry.isDirectory())
        visit(path.join(directory, entry.name), relative + "/");
      else if (/\.(js|css|woff2)$/.test(relative)) {
        const raw = readFileSync(path.join(vendorRoot, relative));
        // Text assets in Git/CDNs use LF; Windows checkouts can use CRLF.
        // Canonicalize build input first, then hash the exact bytes we ship/cache.
        const bytes = /\.(js|css)$/.test(relative)
          ? Buffer.from(raw.toString("utf8").replace(/\r\n/g, "\n"))
          : raw;
        assets.push({
          path: relative,
          kind: relative.endsWith(".js")
            ? "script"
            : relative.endsWith(".css")
              ? "style"
              : "font",
          bytes,
        });
      }
    }
  }
  visit(vendorRoot);
  return { manifest: generateManifest({ revision, assets }), assets };
}
