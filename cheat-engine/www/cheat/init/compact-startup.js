import { watchSaveRuntime } from "../js/runtime/EarlySaveRuntime.js";
import { waitForEngine } from "../js/runtime/GameStartup.js";
import { bridgeGlobals } from "../js/runtime/RpgMakerGlobals.js";
import { prepareDependencies } from "../js/runtime/DependencyCache.js";
import {
  installDependencyStyles,
  verifyBrowserDependencies,
} from "../js/runtime/DependencyResources.js";

function gameForView(view, mode) {
  if (mode !== "popout") return Promise.resolve(view);
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 10000;
    function check() {
      const game = view.__cheatOpener || view.opener;
      if (game) return resolve(game);
      if (Date.now() >= deadline)
        return reject(new Error("Open the cheat window from the game."));
      setTimeout(check, 20);
    }
    check();
  });
}

function vendorScript(view, text) {
  return new Promise((resolve, reject) => {
    const blob = new view.Blob(
      [
        "(function(module,exports,define){\n",
        text,
        "\n}).call(window,undefined,undefined,undefined);",
      ],
      { type: "application/javascript" },
    );
    const url = view.URL.createObjectURL(blob);
    const script = view.document.createElement("script");
    script.src = url;
    script.onload = function () {
      view.URL.revokeObjectURL(url);
      script.remove();
      resolve();
    };
    script.onerror = function () {
      view.URL.revokeObjectURL(url);
      script.remove();
      reject(new Error("Could not initialize a UI dependency."));
    };
    view.document.head.appendChild(script);
  });
}

function showFailure(view, error) {
  view.__cheatBoot.error = String((error && error.message) || error);
  view.__cheatBoot.phase = "failed";
  const message =
    "Cheat UI unavailable: " +
    view.__cheatBoot.error +
    " Reinstall Offline, or reconnect and restart to repair Online. The game can continue.";
  console.error("[Cheat] " + message);
  const banner = view.document.createElement("div");
  banner.id = "cheat-boot-warning";
  banner.style.cssText =
    "position:fixed;bottom:8px;left:8px;max-width:420px;padding:10px;z-index:999999;background:#701e26;color:white;font:13px sans-serif";
  banner.textContent = message;
  const dismiss = view.document.createElement("button");
  dismiss.textContent = "Dismiss";
  dismiss.onclick = function () {
    banner.remove();
  };
  banner.appendChild(dismiss);
  view.document.body.appendChild(banner);
}

export function startCompactView(options) {
  const view = options.view || window;
  if (view.__cheatCompactBoot) return view.__cheatCompactBoot;
  const mode = options.mode || view.__cheatCompactMode || "overlay";
  view.__cheatCompactMode = mode;
  view.__cheatBoot = { phase: "preparing", started: false, error: null };
  // This runs synchronously, before the first asynchronous dependency operation.
  if (mode === "overlay") watchSaveRuntime(view);
  view.__cheatCompactBoot = gameForView(view, mode)
    .then(async (game) => {
      if (mode === "popout") bridgeGlobals(view, game);
      watchSaveRuntime(game);
      const root =
        view.__cheatCompactRoot ||
        new URL(
          ".",
          view.document.currentScript
            ? view.document.currentScript.src
            : view.location.href,
        ).href;
      const css = view.document.createElement("link");
      css.rel = "stylesheet";
      css.href = root + "cheat-bundle.css";
      const cssReady = new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Local UI stylesheet timed out")),
          15000,
        );
        css.onload = function () {
          clearTimeout(timer);
          resolve();
        };
        css.onerror = function () {
          clearTimeout(timer);
          reject(new Error("Local UI stylesheet is missing"));
        };
      });
      cssReady.catch(function () {});
      view.document.head.appendChild(css);
      view.__cheatBoot.phase = "dependencies";
      let scripts = __cheatEmbedded;
      if (__cheatEdition === "online") {
        let assets;
        // Browser fixtures cannot access NW.js. Their local byte provider still
        // passes the same release-pinned integrity checks before execution.
        if (typeof require !== "function" && game.__cheatBrowserDependencies) {
          assets = await verifyBrowserDependencies(
            view,
            __cheatManifest,
            await game.__cheatBrowserDependencies(__cheatManifest),
          );
        } else {
          assets = await prepareDependencies(__cheatManifest, {
            log(message) {
              view.__cheatBoot.phase = "downloading";
              console.info("[Cheat] " + message);
              const status = view.document.getElementById("status-text");
              if (status) status.textContent = message;
            },
          });
        }
        scripts = installDependencyStyles(view, __cheatManifest, assets, css);
      }
      for (const text of scripts) await vendorScript(view, text);
      await cssReady;
      view.__cheatBoot.phase = "game-scripts";
      await waitForEngine(game);
      if (!view.Vue || !view.Vuetify || !view.axios)
        throw new Error("Required UI libraries are missing");
      if (!view.document.getElementById("app")) {
        const app = view.document.createElement("div");
        app.id = "app";
        app.innerHTML =
          "<v-app><v-main><main-component></main-component></v-main></v-app>";
        view.document.body.appendChild(app);
      }
      view.__cheatBoot.phase = "mounting";
      await __cheatCoreFactory().startCompactCore(mode);
      if (mode === "overlay" && !game.__cheatFeatures)
        throw new Error("Game hooks did not initialize");
      view.__cheatBoot.started = true;
      view.__cheatBoot.phase = "started";
      view.__cheatStarted = true;
    })
    .catch((error) => {
      showFailure(view, error);
      throw error;
    });
  // The owner can inspect/retry on the next launch; avoid an unhandled rejection.
  view.__cheatCompactBoot.catch(function () {});
  return view.__cheatCompactBoot;
}

startCompactView({ mode: window.__cheatCompactMode || "overlay" });
