// RPG MV API : https://kinoar.github.io/rmmv-doc-web/index.html

// import 'https://cdn.jsdelivr.net/npm/vue@2.x/dist/vue.js'
// import 'https://cdn.jsdelivr.net/npm/vuetify@2.x/dist/vuetify.js'

import "../libs/vue.js";
import "../libs/vuetify.js";

import { initializeCheatDiagnostics } from "../js/runtime/CheatDiagnostics.js";
import { readBooleanSetting } from "../js/ui/CheatUiSettings.js";
import { KEY_VALUE_STORAGE } from "../js/storage/KeyValueStorage.js";
import MainComponent from "../MainComponent.js";

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
