import { canonicalAssets, validateManifest } from "./DependencyManifest.js";

export function rewriteDependencyCss(css, name, fontUrls) {
  if (/@import\b/i.test(css))
    throw new Error("Dependency CSS cannot import external files");
  return css.replace(/url\(["']?([^)'"\s]+)["']?\)/g, (match, value) => {
    if (value.indexOf("data:image/png;base64,") === 0) return match;
    const parts = name.split("/");
    parts.pop();
    value
      .split("?")[0]
      .split("/")
      .forEach((part) => {
        if (part === "..") parts.pop();
        else if (part && part !== ".") parts.push(part);
      });
    const url = fontUrls[parts.join("/")];
    if (!url || !/^(blob:|data:font\/)/.test(url))
      throw new Error("Unknown dependency font: " + value);
    return 'url("' + url + '")';
  });
}

export async function verifyBrowserDependencies(view, manifest, assets) {
  validateManifest(manifest);
  const hex = async (bytes) => {
    const hash = new Uint8Array(
      await view.crypto.subtle.digest("SHA-256", bytes),
    );
    return Array.from(hash)
      .map((byte) => (byte + 256).toString(16).slice(1))
      .join("");
  };
  if (
    (await hex(
      new view.TextEncoder().encode(canonicalAssets(manifest.assets)),
    )) !== manifest.id
  )
    throw new Error("Dependency manifest identity mismatch");
  for (const asset of manifest.assets) {
    const bytes = assets[asset.path];
    if (
      !bytes ||
      bytes.byteLength !== asset.size ||
      (await hex(bytes)) !== asset.sha256
    )
      throw new Error("Dependency integrity check failed: " + asset.path);
  }
  return assets;
}

export function installDependencyStyles(view, manifest, assets, before) {
  const fonts = Object.create(null);
  const urls = [];
  manifest.assets
    .filter((asset) => asset.kind === "font")
    .forEach((asset) => {
      const url = view.URL.createObjectURL(
        new view.Blob([assets[asset.path]], { type: "font/woff2" }),
      );
      fonts[asset.path] = url;
      urls.push(url);
    });
  const text = (name) =>
    new view.TextDecoder("utf-8", { fatal: true }).decode(assets[name]);
  for (const name of [
    "roboto.css",
    "mdi/materialdesignicons.min.css",
    "vuetify.min.css",
  ]) {
    const style = view.document.createElement("style");
    style.textContent = rewriteDependencyCss(text(name), name, fonts);
    view.document.head.insertBefore(style, before);
  }
  view.addEventListener(
    "unload",
    () => urls.forEach((url) => view.URL.revokeObjectURL(url)),
    { once: true },
  );
  return ["vue.js", "vuetify.js", "axios.min.js"].map(text);
}
