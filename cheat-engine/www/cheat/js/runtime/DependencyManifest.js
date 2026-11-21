export const DEPENDENCY_REPOSITORY = "Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin";
const BASE = "cheat-engine/www/cheat/libs/";
export const MAX_MANIFEST_BYTES = 128 * 1024;

export function assetUrls(revision, path) {
  return [
    "https://cdn.jsdelivr.net/gh/" +
      DEPENDENCY_REPOSITORY +
      "@" +
      revision +
      "/" +
      BASE +
      path,
    "https://raw.githubusercontent.com/" +
      DEPENDENCY_REPOSITORY +
      "/" +
      revision +
      "/" +
      BASE +
      path,
  ];
}

export function canonicalAssets(assets) {
  return JSON.stringify(
    assets
      .slice()
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
      .map((a) => [a.path, a.kind, a.size, a.sha256]),
  );
}

export function validateManifest(manifest) {
  const fail = () => {
    throw new Error("Invalid dependency manifest");
  };
  if (
    !manifest ||
    manifest.schema !== 1 ||
    !/^[a-f0-9]{64}$/.test(manifest.id) ||
    !/^[a-f0-9]{40}$/.test(manifest.revision) ||
    !Array.isArray(manifest.assets) ||
    !manifest.assets.length ||
    manifest.assets.length > 64 ||
    JSON.stringify(manifest).length > MAX_MANIFEST_BYTES
  )
    fail();
  const seen = [];
  let total = 0;
  manifest.assets.forEach((asset) => {
    if (
      !asset ||
      typeof asset.path !== "string" ||
      asset.path.length > 180 ||
      !/^[A-Za-z0-9_./-]+$/.test(asset.path)
    )
      fail();
    const parts = asset.path.split("/");
    if (
      parts.some(
        (part) =>
          !part ||
          part === "." ||
          part === ".." ||
          /[.]$/.test(part) ||
          /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
      )
    )
      fail();
    const lower = asset.path.toLowerCase();
    if (
      seen.some(
        (path) =>
          path === lower ||
          path.indexOf(lower + "/") === 0 ||
          lower.indexOf(path + "/") === 0,
      )
    )
      fail();
    seen.push(lower);
    const extension = { script: ".js", style: ".css", font: ".woff2" }[
      asset.kind
    ];
    if (
      !extension ||
      !lower.endsWith(extension) ||
      !Number.isSafeInteger(asset.size) ||
      asset.size <= 0 ||
      asset.size > 32 * 1024 * 1024 ||
      !/^[a-f0-9]{64}$/.test(asset.sha256) ||
      !Array.isArray(asset.urls) ||
      !asset.urls.length ||
      asset.urls.length > 2
    )
      fail();
    const allowed = assetUrls(manifest.revision, asset.path);
    if (asset.urls.some((url) => allowed.indexOf(url) === -1)) fail();
    total += asset.size;
  });
  if (total > 64 * 1024 * 1024) fail();
  return manifest;
}
