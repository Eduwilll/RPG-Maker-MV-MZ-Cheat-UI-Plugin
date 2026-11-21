import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shippedDependencies, vendorRoot } from "./dependency-manifest.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CHEAT = path.join(ROOT, "cheat-engine/www/cheat");

export function compactLoader() {
  return `(function(){
  if(window.__cheatImportExecuted)return;
  window.__cheatImportExecuted=true;
  function warn(message){
    console.error("[Cheat] "+message);
    var banner=document.createElement("div");
    banner.id="cheat-boot-warning";
    banner.style.cssText="position:fixed;bottom:8px;left:8px;max-width:420px;padding:10px;z-index:999999;background:#701e26;color:white;font:13px sans-serif";
    banner.textContent=message+" The game can continue.";
    document.body.appendChild(banner);
  }
  if(typeof process==="object"&&process.versions){
    var version=process.versions.nw||process.versions["node-webkit"];
    if(version){
      var parts=String(version).split("."),minimum=[0,26,4];
      for(var i=0;i<3;i++){
        if(Number(parts[i]||0)<minimum[i]){warn("Cheat UI requires NW.js 0.26.4 or newer.");return;}
        if(Number(parts[i]||0)>minimum[i])break;
      }
    }
  }
  window.__cheatCompactMode="overlay";
  var root=new URL("../",document.currentScript.src).href;
  window.__cheatCompactRoot=root;
  var script=document.createElement("script");
  script.onerror=function(){warn("Could not load cheat-bundle.js. Reinstall the cheat.");};
  if(typeof require==="function"&&typeof process==="object"){
    try{
      var folder=window.Utils&&Utils.RPGMAKER_NAME==="MV"?"www/cheat":"cheat";
      script.text=require("fs").readFileSync(require("path").join(process.cwd(),folder,"cheat-bundle.js"),"utf8");
    }catch(error){console.error("[Cheat] Local bundle unavailable",error);script.src=root+"cheat-bundle.js";}
  }else{script.src=root+"cheat-bundle.js";}
  script.async=false;document.body.appendChild(script);
})();\n`;
}

export function compactWindow() {
  return readFileSync(path.join(CHEAT, "window.html"), "utf8")
    .replace(/<link\b[^>]*>/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
    .replace(
      "</body>",
      '<script>window.__cheatCompactMode="popout";window.__cheatCompactRoot=new URL(".",location.href).href;</script>\n<script src="./cheat-bundle.js"></script>\n</body>',
    );
}

export function renderEdition({ edition, core, prelude, manifest, assets }) {
  const byPath = new Map(assets.map((asset) => [asset.path, asset.bytes]));
  const scripts = ["vue.js", "vuetify.js", "axios.min.js"].map((name) =>
    byPath.get(name).toString("utf8"),
  );
  let css = readFileSync(path.join(CHEAT, "css/main.css"), "utf8");
  if (edition === "offline") {
    const vendorCss = [
      "roboto.css",
      "mdi/materialdesignicons.min.css",
      "vuetify.min.css",
    ]
      .map((name) =>
        byPath
          .get(name)
          .toString("utf8")
          .replace(/url\(["']?([^)'"\s]+)["']?\)/g, (match, url) => {
            if (url.startsWith("data:image/png;base64,")) return match;
            const assetPath = path.posix.normalize(
              path.posix.join(path.posix.dirname(name), url.split("?")[0]),
            );
            const font = byPath.get(assetPath);
            if (!font || !assetPath.endsWith(".woff2"))
              throw new Error("Unknown CSS asset: " + url);
            return (
              'url("data:font/woff2;base64,' + font.toString("base64") + '")'
            );
          }),
      )
      .join("\n");
    css = vendorCss + "\n" + css;
  }
  const js =
    "/*! RPG Maker Cheat UI compact " +
    edition +
    " - generated; edit source modules. */\n(function(){\n" +
    "var __cheatEdition=" +
    JSON.stringify(edition) +
    ";\n" +
    "var __cheatManifest=" +
    JSON.stringify(manifest) +
    ";\n" +
    "var __cheatEmbedded=" +
    JSON.stringify(edition === "offline" ? scripts : []) +
    ";\n" +
    "function __cheatCoreFactory(){\n" +
    core +
    "\nreturn CheatCore;\n}\n" +
    prelude +
    "\n})();\n";
  return { js, css };
}

async function compile(entry, name, { stripVendors = false } = {}) {
  const { build } = await import("vite");
  const result = await build({
    configFile: false,
    root: ROOT,
    logLevel: "warn",
    plugins: stripVendors
      ? [
          {
            name: "compact-vendor-globals",
            enforce: "pre",
            resolveId(id) {
              if (id === "../libs/vue.js" || id === "../libs/vuetify.js")
                return "\0compact-vendor";
            },
            load(id) {
              if (id === "\0compact-vendor") return "export {};";
            },
          },
        ]
      : [],
    build: {
      write: false,
      target: "chrome61",
      minify: true,
      sourcemap: false,
      lib: { entry: path.join(CHEAT, entry), formats: ["iife"], name },
      rollupOptions: {
        external: ["fs", "path", "nw.gui", "crypto", "https", "os", "url"],
        output: { codeSplitting: false },
      },
    },
  });
  const output = (Array.isArray(result) ? result[0] : result).output;
  if (output.length !== 1 || output[0].type !== "chunk")
    throw new Error("Compact build must emit one JS chunk");
  const code = output[0].code;
  if (
    output[0].imports.length ||
    output[0].dynamicImports.some((name) => name !== output[0].fileName)
  )
    throw new Error("Compact output retained external chunks");
  const unsafe =
    /__vite-browser-external|import\.meta|\bimport\s*\(\s*["'`]/.exec(code);
  if (unsafe)
    throw new Error(
      "Unsafe compact output " +
        name +
        ": " +
        code.slice(Math.max(0, unsafe.index - 50), unsafe.index + 100),
    );
  return code;
}

export async function buildCompact(
  outputRoot = path.join(ROOT, "output/runtime"),
) {
  const core = await compile("init/compact-core.js", "CheatCore", {
    stripVendors: true,
  });
  const prelude = await compile("init/compact-startup.js", "CheatStartup");
  const dependencies = shippedDependencies();
  for (const edition of ["offline", "online"]) {
    const directory = path.join(outputRoot, edition, "cheat");
    mkdirSync(path.join(directory, "init"), { recursive: true });
    const rendered = renderEdition({ edition, core, prelude, ...dependencies });
    writeFileSync(path.join(directory, "cheat-bundle.js"), rendered.js);
    writeFileSync(path.join(directory, "cheat-bundle.css"), rendered.css);
    writeFileSync(path.join(directory, "init/import.js"), compactLoader());
    writeFileSync(path.join(directory, "window.html"), compactWindow());
    writeFileSync(
      path.join(directory, "dependencies.json"),
      JSON.stringify(dependencies.manifest, null, 2) + "\n",
    );
    copyFileSync(
      path.join(vendorRoot, "README.md"),
      path.join(directory, "DEPENDENCIES.md"),
    );
    copyFileSync(
      path.join(vendorRoot, "LICENSES.txt"),
      path.join(directory, "LICENSES.txt"),
    );
    writeFileSync(
      path.join(outputRoot, edition, "runtime-layout.json"),
      JSON.stringify(
        {
          schema: 2,
          layout: "compact",
          edition,
          dependencySet: dependencies.manifest.id,
        },
        null,
        2,
      ),
    );
    console.log(
      "Built compact " +
        edition +
        ": " +
        Math.round(rendered.js.length / 1024) +
        " KB JS, " +
        Math.round(rendered.css.length / 1024) +
        " KB CSS",
    );
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await buildCompact();
