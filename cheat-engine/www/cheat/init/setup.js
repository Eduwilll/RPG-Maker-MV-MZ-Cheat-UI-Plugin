// RPG MV API : https://kinoar.github.io/rmmv-doc-web/index.html

// import 'https://cdn.jsdelivr.net/npm/vue@2.x/dist/vue.js'
// import 'https://cdn.jsdelivr.net/npm/vuetify@2.x/dist/vuetify.js'

import "../libs/vue.js";
import "../libs/vuetify.js";

import { initializeCheatDiagnostics } from "../js/runtime/CheatDiagnostics.js";
import { readBooleanSetting } from "../js/ui/CheatUiSettings.js";
import { KEY_VALUE_STORAGE } from "../js/storage/KeyValueStorage.js";
import MainComponent from "../MainComponent.js";

function markCheatStarted() {
  try {
    if (typeof window !== "undefined") {
      window.__cheatStarted = true;
      if (window.__cheatBoot) {
        window.__cheatBoot.started = true;
        window.__cheatBoot.phase = "started";
      }
      var banner = document.getElementById("cheat-boot-warning");
      if (banner && banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
    }
  } catch (e) {
    // ignore - flagging start is best effort
  }

  try {
    if (typeof console !== "undefined" && console.log) {
      console.log("[Cheat] cheat UI started");
    }
  } catch (e) {
    // ignore
  }
}

function reportCheatStartFailure(error) {
  var message = "cheat UI failed to mount";
  try {
    message = (error && (error.stack || error.message)) || String(error);
  } catch (e) {
    // ignore
  }

  try {
    if (typeof console !== "undefined" && console.error) {
      console.error("[Cheat] " + message);
    }
  } catch (e) {
    // ignore
  }

  try {
    if (typeof window !== "undefined" && window.__cheatBoot) {
      window.__cheatBoot.error = String(message);
    }
  } catch (e) {
    // ignore
  }
}

initializeCheatDiagnostics("overlay");

// Match the old version's dark look by default (pop-out + preview use dark:true).
// Saved Appearance settings win when present; fresh installs fall back to dark.
var isDarkMode = true;
var primaryColor = "#1976D2";
try {
  isDarkMode = readBooleanSetting("cheatModal.themeDarkMode", true);
  var storedColor = KEY_VALUE_STORAGE.getItem("cheatModal.themePrimaryColor");
  if (storedColor) {
    primaryColor = storedColor;
  }
} catch (e) {
  // ignore - fall back to old-version defaults
}

// initialize vue
try {
  new Vue({
    vuetify: new Vuetify({
      theme: {
        dark: isDarkMode,
        themes: {
          dark: { primary: primaryColor },
          light: { primary: primaryColor },
        },
      },
    }),
    components: { MainComponent },
  }).$mount("#app");
  markCheatStarted();
} catch (e) {
  reportCheatStartFailure(e);
  throw e;
}
