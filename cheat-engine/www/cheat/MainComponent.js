import CheatModal from "./CheatModal.js";
import { GLOBAL_SHORTCUT } from "./js/shortcuts/GlobalShortcut.js";
import { GeneralCheat } from "./js/cheats/GeneralCheat.js";
import AlertSnackbar from "./components/AlertSnackbar.js";
import ConfirmDialog from "./components/ConfirmDialog.js";
import WatcherOverlay from "./components/WatcherOverlay.js";
import MinimapOverlay from "./components/MinimapOverlay.js";
import { customizeRPGMakerFunctions } from "./init/customize_functions.js";
import { Key } from "./js/shortcuts/KeyCodes.js";
import { Alert } from "./js/AlertHelper.js";
import { CHEAT_DIAGNOSTICS } from "./js/runtime/CheatDiagnostics.js";
import { handleFeatureShortcut } from "./js/ui/FeatureShortcuts.js";
import {
  readNumberSetting,
  writeNumberSetting,
} from "./js/ui/CheatUiSettings.js";

export default {
  name: "MainComponent",
  components: {
    CheatModal,
    AlertSnackbar,
    ConfirmDialog,
    WatcherOverlay,
    MinimapOverlay,
  },
  template: `
<div 
    class="pa-2"
    ref="rootDiv">
    <v-fade-transition leave-absolute>
        <cheat-modal
            id="cheat-modal"
            class="opaque-on-mouseover"
            v-model="currentComponentName"
            v-if="show"
            >
        </cheat-modal>
    </v-fade-transition>
    <alert-snackbar></alert-snackbar>
    <confirm-dialog></confirm-dialog>
    <watcher-overlay :hide-while-modal="show"></watcher-overlay>
    <minimap-overlay></minimap-overlay>
</div>`,

  style: `
    #cheat-modal: {
        opacity: 0.7;
    }
    `,

  data() {
    return {
      currentKey: Key.createEmpty(),
      show: false,
      currentComponentName: null,
    };
  },

  created() {
    const self = this;

    customizeRPGMakerFunctions(self);
    CHEAT_DIAGNOSTICS.log("info", "overlay", "MainComponent created");

    try {
      // Exposed for the separate cheat window (nw.Window.open does not
      // reliably set window.opener, so the popup reads this instead).
      window.GeneralCheat = GeneralCheat;
    } catch (error) {
      // no-op
    }

    GeneralCheat.toggleCheatModal = (componentName = null) => {
      this.toggleCheatModal(componentName);
    };

    GeneralCheat.openCheatModal = (componentName = null) => {
      this.openCheatModal(componentName);
    };

    GeneralCheat.openCheatWindow = (componentName = null) => {
      this.openCheatWindow(componentName);
    };

    GeneralCheat.openFeatureFinder = () => {
      this.openCheatModal();
      this.$nextTick(() =>
        window.dispatchEvent(new CustomEvent("cheat-open-finder")),
      );
    };

    window.addEventListener("keydown", this.onGlobalKeyDown);
    window.addEventListener("keyup", this.onGlobalKeyUp);
    window.addEventListener("keydown", this.onFeatureKeyDown, true);
    this._returnToGame = () => {
      this.show = false;
    };
    window.addEventListener("cheat-return-to-game", this._returnToGame);

    this.checkVersion();
  },

  beforeDestroy() {
    window.removeEventListener("cheat-return-to-game", this._returnToGame);
    window.removeEventListener("keydown", this.onGlobalKeyDown);
    window.removeEventListener("keyup", this.onGlobalKeyUp);
    window.removeEventListener("keydown", this.onFeatureKeyDown, true);
  },

  watch: {
    show: {
      immediate: true,
      handler(value) {},
    },
  },

  methods: {
    onFeatureKeyDown(event) {
      handleFeatureShortcut(event, GLOBAL_SHORTCUT, {
        openFeatureFinder: () => GeneralCheat.openFeatureFinder(),
        openMessageLog: () => this.openCheatModal("message-log-panel"),
      });
    },
    onGlobalKeyDown(e) {
      if (e.repeat) {
        GLOBAL_SHORTCUT.runKeyRepeatEvent(e, Key.fromKey(this.currentKey));
      } else {
        GLOBAL_SHORTCUT.runKeyLeaveEvent(e, Key.fromKey(this.currentKey));
        this.currentKey.add(e.keyCode);
        this.currentKey.adjustCombiningKey(e);
        const key = Key.fromKey(this.currentKey);
        const handled = GLOBAL_SHORTCUT.runKeyEnterEvent(e, key);
        if (!handled) {
          this.runOverlayShortcutFallback(e, key);
        }
      }
    },

    onGlobalKeyUp(e) {
      GLOBAL_SHORTCUT.runKeyLeaveEvent(e, Key.fromKey(this.currentKey));
      this.currentKey.remove(e.keyCode);
      GLOBAL_SHORTCUT.runKeyEnterEvent(e, Key.fromKey(this.currentKey));
    },

    runOverlayShortcutFallback(e, key) {
      const fallbackShortcuts = [
        {
          id: "toggleCheatModal",
          action: () => this.toggleCheatModal(),
        },
        {
          id: "toggleCheatModalToSaveLocationComponent",
          action: () => this.toggleCheatModal("save-recall-panel"),
        },
        {
          id: "toggleCheatModalToMapEventComponent",
          action: () => this.toggleCheatModal("map-event-panel"),
        },
      ];

      for (const shortcut of fallbackShortcuts) {
        try {
          const configuredKey = GLOBAL_SHORTCUT.getShortcut(shortcut.id);
          if (configuredKey && configuredKey.equals(key)) {
            shortcut.action();
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
            return true;
          }
        } catch (error) {}
      }

      return false;
    },

    openCheatModal(componentName) {
      if (componentName) {
        this.currentComponentName = componentName;
      }

      this.show = true;
      CHEAT_DIAGNOSTICS.log(
        "info",
        "overlay",
        "Overlay opened",
        componentName || "default",
      );
    },

    toggleCheatModal(componentName) {
      const prevComponentName = this.currentComponentName;

      if (componentName) {
        this.currentComponentName = componentName;
      }

      // close
      if (this.show) {
        // hide modal if only componentName unchanged
        if (!componentName || componentName === prevComponentName) {
          this.show = false;
          CHEAT_DIAGNOSTICS.log("info", "overlay", "Overlay closed");
        }
        return;
      }

      // open
      this.show = true;
      CHEAT_DIAGNOSTICS.log(
        "info",
        "overlay",
        "Overlay toggled open",
        this.currentComponentName || "default",
      );
    },

    openCheatWindow(componentName = null) {
      if (!Utils.isNwjs()) {
        Alert.error("Separate window mode only works in NW.js (PC version).");
        this.openCheatModal(componentName);
        return;
      }

      if (GeneralCheat.__cheatWindow && !GeneralCheat.__cheatWindow.closed) {
        GeneralCheat.__cheatWindow.focus();
        return;
      }

      // Hide the overlay if it was open
      this.show = false;
      CHEAT_DIAGNOSTICS.log(
        "info",
        "overlay",
        "Opening separate cheat window",
        componentName || "default",
      );

      const targetDir = Utils.RPGMAKER_NAME === "MV" ? "www/cheat/" : "cheat/";

      nw.Window.open(
        targetDir + "window.html",
        {
          title: "RPG Maker Cheat Engine",
          width: Math.max(
            320,
            Math.min(
              window.screen.availWidth,
              readNumberSetting("cheatWindow.width", 700),
            ),
          ),
          height: Math.max(
            240,
            Math.min(
              window.screen.availHeight,
              readNumberSetting("cheatWindow.height", 800),
            ),
          ),
          resizable: true,
          frame: true,
          focus: true,
          always_on_top: false,
        },
        (win) => {
          let resizeTimer;
          win.on("resize", (width, height) => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
              if (width >= 320 && height >= 240) {
                writeNumberSetting("cheatWindow.width", width);
                writeNumberSetting("cheatWindow.height", height);
              }
            }, 250);
          });
          GeneralCheat.__cheatWindow = win.window;
          try {
            // Explicit opener reference: window.opener is not reliable here.
            win.window.__cheatOpener = window;
          } catch (error) {
            // no-op
          }
          win.on("closed", () => {
            clearTimeout(resizeTimer);
            GeneralCheat.__cheatWindow = null;
          });
        },
      );
    },

    async checkVersion() {
      if (!Utils.isNwjs()) {
        return;
      }

      try {
        const releaseInfo = (
          await axios.get(
            "https://api.github.com/repos/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/releases/latest",
          )
        ).data;

        const currentCheatVersion = this.getCurrentCheatVersion();

        if (!currentCheatVersion) {
          return;
        }

        if (currentCheatVersion < releaseInfo.tag_name) {
          Alert.warn(
            `New cheat version has been released : ${currentCheatVersion} → ${releaseInfo.tag_name}`,
            null,
            3000,
          );
        }
      } catch (err) {}
    },

    getCurrentCheatVersion() {
      try {
        const targetDir = Utils.RPGMAKER_NAME === "MV" ? "www" : ".";

        const description = JSON.parse(
          require("fs").readFileSync(
            targetDir + "/cheat-version-description.json",
            "utf-8",
          ),
        );

        return description.version;
      } catch (err) {
        return null;
      }
    },
  },
};
