import CheatModal from "../cheat-engine/www/cheat/CheatModal.js";
import MinimapOverlay from "../cheat-engine/www/cheat/components/MinimapOverlay.js";
import { installBrowserFixture } from "./feature-mocks.js";
import { installDemoWorld } from "./demo-world.js";
import { initializeFeatureRuntime } from "../cheat-engine/www/cheat/js/runtime/FeatureRuntime.js";
import { createFeatureCatalog } from "../cheat-engine/www/cheat/js/ui/FeatureCatalog.js";
import { handleFeatureShortcut } from "../cheat-engine/www/cheat/js/ui/FeatureShortcuts.js";
import { GLOBAL_SHORTCUT } from "../cheat-engine/www/cheat/js/shortcuts/GlobalShortcut.js";
import { KEY_VALUE_STORAGE } from "../cheat-engine/www/cheat/js/storage/KeyValueStorage.js";
import {
  drawMinimap,
  renderBaseMap,
  readMinimapFrame,
} from "../cheat-engine/www/cheat/js/panels/minimap/MinimapRenderer.js";

const params = new URLSearchParams(location.search),
  testing = params.has("testing");
KEY_VALUE_STORAGE.filePath = "./preview-settings/kv-storage.json";
installBrowserFixture(window);
const world = installDemoWorld(window);
const runtime = initializeFeatureRuntime(window);
const loadDestination = runtime.previews.load;
runtime.previews.load = (id) =>
  id === 1
    ? Promise.resolve({
        width: $dataMap.width,
        height: $dataMap.height,
        tilesetId: 1,
        scrollType: 0,
        data: $dataMap.data.slice(),
        events: [null],
      })
    : loadDestination(id);
world.seedDialogue();
const panels = createFeatureCatalog()
  .filter((row) => row.type === "panel")
  .map((row) => ({ text: row.label, value: row.panel }));
const selected = params.get("panel"),
  scene = ["map", "battle", "title"].includes(params.get("scene"))
    ? params.get("scene")
    : "map";
world.setScene(scene);
const errors = window.__previewErrors;
Vue.config.productionTip = false;
Vue.config.devtools = !testing;
Vue.config.errorHandler = (error, vm, info) => {
  errors.push(error.message + " (" + info + ")");
  console.error(error);
};
// Translation controls are visual fixtures here, not a client for real services.
if (window.axios)
  window.axios.defaults.adapter = (config) =>
    Promise.resolve({
      data: {
        translation: "[Preview translation]",
        languages: { en: "English", ja: "Japanese", pt: "Portuguese" },
      },
      status: 200,
      statusText: "Preview",
      headers: {},
      config,
    });

const app = new Vue({
  el: "#app",
  vuetify: new Vuetify({ theme: { dark: true } }),
  components: { CheatModal, MinimapOverlay },
  data: {
    activeComponentName:
      scene === "title"
        ? "general-panel"
        : panels.some((row) => row.value === selected) ||
            selected === "minimap-panel"
          ? selected
          : "general-panel",
    panels,
    scene,
    engine: Utils.RPGMAKER_NAME,
    errors,
    notice: "Demo data only. No game files are accessed.",
    reloadStatus: testing ? "Test mode" : "Checking live reload...",
  },
  template: `<v-app class="preview-shell"><header class="preview-toolbar"><strong class="preview-brand">CHEAT UI LAB</strong><label>Panel <select v-model="activeComponentName" aria-label="Preview panel"><option v-for="panel in panels" :key="panel.value" :value="panel.value">{{panel.text}}</option></select></label><label>Scene <select :value="scene" aria-label="Preview scene" @change="setScene($event.target.value)"><option value="map">Exploration</option><option value="battle">Battle</option><option value="title">Title / no save</option></select></label><label>Engine <select v-model="engine" aria-label="Preview engine" @change="changeEngine"><option>MV</option><option>MZ</option></select></label><button @click="addDialogue">Add dialogue</button><button @click="reload">Reload demo</button><span class="preview-status">{{reloadStatus}}</span></header><main class="preview-stage"><canvas ref="backdrop" class="preview-backdrop" width="640" height="640" aria-label="Original preview village artwork"/><cheat-modal class="preview-modal" :key="scene" v-model="activeComponentName"/><minimap-overlay/><div class="preview-notice">{{notice}}</div><div v-if="errors.length" class="preview-errors" role="alert"><strong>Preview errors</strong><div v-for="(error,index) in errors" :key="index">{{error}}</div></div></main></v-app>`,
  watch: {
    activeComponentName() {
      const url = new URL(location.href);
      url.searchParams.set("panel", this.activeComponentName);
      history.replaceState(null, "", url);
    },
  },
  mounted() {
    this._featureKey = (event) =>
      handleFeatureShortcut(event, GLOBAL_SHORTCUT, {
        openFeatureFinder: () =>
          window.dispatchEvent(new CustomEvent("cheat-open-finder")),
        openMessageLog: () => {
          this.activeComponentName = "message-log-panel";
        },
      });
    window.addEventListener("keydown", this._featureKey, true);
    this._tick = setInterval(() => {
      world.tick();
      if (this.scene === "map") {
        const frame = readMinimapFrame();
        drawMinimap(this.$refs.backdrop, renderBaseMap(), {
          size: 640,
          mode: "full",
          playerX: frame.playerX,
          playerY: frame.playerY,
          events: frame.events,
          layers: {
            sprites: true,
            background: true,
            npcs: true,
            enemies: true,
            treasures: true,
            events: false,
            player: true,
            markerScale: 1,
          },
        });
      }
      if (window.__previewNotice) {
        this.notice = window.__previewNotice;
        window.__previewNotice = "";
      }
    }, 300);
    if (!testing) this.watchSource();
  },
  beforeDestroy() {
    clearInterval(this._tick);
    clearTimeout(this._reloadTimer);
    window.removeEventListener("keydown", this._featureKey, true);
  },
  methods: {
    setScene(mode) {
      if (!["map", "battle", "title"].includes(mode)) return;
      world.setScene(mode);
      this.scene = mode;
      if (mode === "title") this.activeComponentName = "general-panel";
      const url = new URL(location.href);
      url.searchParams.set("scene", mode);
      history.replaceState(null, "", url);
    },
    addDialogue() {
      world.seedDialogue();
      this.notice =
        "Added portrait, narration and selected-response examples to Message Log.";
    },
    changeEngine() {
      const url = new URL(location.href);
      url.searchParams.set("engine", this.engine);
      location.assign(url);
    },
    reload() {
      location.reload();
    },
    async watchSource() {
      try {
        const response = await fetch("/__preview__/version", {
          cache: "no-store",
        });
        if (!response.ok) {
          this.reloadStatus = "Manual reload (custom server)";
          return;
        }
        const state = await response.json();
        if (!state.reload) {
          this.reloadStatus = "Auto reload off";
          return;
        }
        if (this._sourceVersion && this._sourceVersion !== state.version) {
          location.reload();
          return;
        }
        this._sourceVersion = state.version;
        this.reloadStatus = "Auto reload on save";
      } catch (error) {
        this.reloadStatus = "Reload check unavailable";
      }
      this._reloadTimer = setTimeout(() => this.watchSource(), 1200);
    },
  },
});
window.__cheatPreview = { app, panels, errors, ready: true };
