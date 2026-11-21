/**
 * Separate Window Initialization (Fixed)
 * Connects this standalone window to the main game window context.
 */

import { initializeCheatDiagnostics } from "./runtime/CheatDiagnostics.js";
import { getFeatureRuntime } from "./runtime/FeatureRuntime.js";
import { bridgeGlobals } from "./runtime/RpgMakerGlobals.js";
import { createCheatApp } from "./ui/CheatApp.js";

// Error logging helper
function showError(msg, err) {
  const display = document.getElementById("error-display");
  const status = document.getElementById("status-text");
  const details = err && err.stack ? err.stack : err;
  if (display) {
    display.textContent = msg + (details ? "\n\nDetails: " + details : "");
    display.style.display = "block";
  }
  if (status) {
    status.textContent = "Initialization Failed";
    status.style.color = "#ff5252";
  }
}

export async function startSeparateWindow() {
  window.onerror = function (msg, url, lineNo, columnNo, error) {
    showError("Global Script Error: " + msg, error);
    return false;
  };

  const status = document.getElementById("status-text");

  // nw.Window.open does not reliably set window.opener, so the game window
  // passes an explicit reference (see MainComponent.openCheatWindow).
  const opener = window.__cheatOpener || window.opener;

  if (!opener) {
    showError(
      "Error: Game window not found. Please open the cheat from within the game.",
    );
    return;
  }

  // --- 1. Proxy RPG Maker Globals IMMEDIATELY ---
  // We do this before importing anything because the imports might
  // try to access these globals during evaluation.
  bridgeGlobals(window, opener);

  // Start file logging only once Utils is bridged: diagnostics resolve
  // cheat-settings/ from RPGMAKER_NAME, and running earlier created a stray
  // cheat-settings folder at the game root in MV projects.
  initializeCheatDiagnostics("separate-window");

  // Provide a mocked/proxied Alert system
  if (opener.GeneralCheat) {
    window.GeneralCheat = opener.GeneralCheat;
  }

  // Crucial: Load the Alert Helper from the opener or local
  // Most components use 'Alert.warn' etc.
  try {
    const { Alert } = await import("./AlertHelper.js");
    window.Alert = Alert;
  } catch (e) {
    console.warn("Could not load local AlertHelper, trying to use opener's", e);
    if (opener.Alert) window.Alert = opener.Alert;
  }

  status.textContent = "Loading Components...";

  // --- 2. Dynamic Imports ---
  // Now that globals are ready, we can load the components
  try {
    const CheatModal = (await import("../CheatModal.js")).default;
    const AlertSnackbar = (await import("../components/AlertSnackbar.js"))
      .default;
    const ConfirmDialog = (await import("../components/ConfirmDialog.js"))
      .default;
    const { GLOBAL_SHORTCUT } = await import("./shortcuts/GlobalShortcut.js");
    const { handleFeatureShortcut } = await import("./ui/FeatureShortcuts.js");

    status.textContent = "Mounting UI...";

    // --- 3. Setup Vue App ---
    createCheatApp({
      Vue,
      Vuetify,
      components: {
        CheatModal,
        AlertSnackbar,
        ConfirmDialog,
      },
      // The runtime belongs to the game window; resolve it lazily so the
      // first panel that mounts reads the opener's installed object.
      resolveRuntime: () => getFeatureRuntime(),
      options: {
        el: "#app",
        data: {
          activeComponentName: null,
        },
        mounted() {
          this._onFeatureKey = (event) =>
            handleFeatureShortcut(event, GLOBAL_SHORTCUT, {
              openFeatureFinder: () =>
                window.dispatchEvent(new CustomEvent("cheat-open-finder")),
              openMessageLog: () => {
                this.activeComponentName = "message-log-panel";
              },
            });
          window.addEventListener("keydown", this._onFeatureKey, true);
          // Show the element Vue actually rendered. Reaching for
          // document.getElementById("app") is a trap: Vue 2.7 keeps id="app" on
          // the rendered root while the original mount node survives as an
          // empty, still-hidden wrapper, so getElementById can return the stale
          // node and the window would stay hidden. Toggling the class on $el
          // (the live root) avoids that entirely.
          const overlay = document.getElementById("status-overlay");
          if (overlay) overlay.style.display = "none";
          if (this.$el && this.$el.classList)
            this.$el.classList.add("cheat-window-ready");
        },
        beforeDestroy() {
          window.removeEventListener("keydown", this._onFeatureKey, true);
        },
      },
    });
  } catch (err) {
    showError("Failed to load Vue components", err);
    throw err;
  }

  console.log("Cheat Window Initialized & Linked to Game Context");

  // Notify opener that we are ready
  if (opener.GeneralCheat) {
    opener.GeneralCheat.__cheatWindow = window;
  }
}

// Start initialization
if (!window.__cheatCompactMode)
  startSeparateWindow().catch((err) => {
    console.error("Critical Init Error:", err);
  });
