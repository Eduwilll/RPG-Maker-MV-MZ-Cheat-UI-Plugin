import { readMinimapSettings } from "../js/panels/minimap/MinimapPanelState.js";
import {
  renderBaseMap,
  drawMinimap,
  readMinimapFrame,
  getMinimapStatus,
} from "../js/panels/minimap/MinimapRenderer.js";
import { CHEAT_DIAGNOSTICS } from "../js/runtime/CheatDiagnostics.js";

export default {
  name: "MinimapOverlay",

  template: `
<canvas
    v-show="visible"
    ref="mapCanvas"
    :width="canvasSize"
    :height="canvasSize"
    :style="canvasStyle">
</canvas>
    `,

  data() {
    return {
      visible: false,
      canvasSize: 176,
      canvasStyle: "",
      refreshIntervalId: null,
      refreshMs: 300,
      lastLoggedStage: "",
    };
  },

  mounted() {
    this.tick();
    this.refreshIntervalId = setInterval(() => {
      this.tick();
    }, this.refreshMs);
  },

  beforeDestroy() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  },

  methods: {
    positionStyle(settings) {
      var base =
        "position: fixed; z-index: 8; pointer-events: none; " +
        "border: 1px solid rgba(255,255,255,0.18); border-radius: 6px; " +
        "opacity: " +
        settings.opacity +
        ";";
      var size =
        "width: " + settings.size + "px; height: " + settings.size + "px;";
      var pos = settings.position || "top-right";
      if (pos === "top-left") {
        return base + size + "left: 8px; top: 8px;";
      }
      if (pos === "bottom-right") {
        return base + size + "right: 8px; bottom: 8px;";
      }
      if (pos === "bottom-left") {
        return base + size + "left: 8px; bottom: 8px;";
      }
      if (pos === "custom") {
        return (
          base +
          size +
          "left: " +
          settings.customX +
          "px; top: " +
          settings.customY +
          "px;"
        );
      }
      return base + size + "right: 8px; top: 8px;";
    },

    tick() {
      var settings = null;
      try {
        settings = readMinimapSettings();
      } catch (e) {
        this.visible = false;
        return;
      }
      if (!settings.enabled) {
        this.visible = false;
        return;
      }

      var frame = readMinimapFrame();
      if (!frame.onMap) {
        this.reportStatus();
        this.visible = false;
        return;
      }

      var base = null;
      try {
        base = renderBaseMap();
      } catch (e) {
        base = null;
      }
      if (!base) {
        // Tileset graphics still loading - retry next tick.
        this.reportStatus();
        this.visible = false;
        return;
      }

      var canvas = this.$refs.mapCanvas;
      if (!canvas) {
        return;
      }

      try {
        drawMinimap(canvas, base, {
          size: settings.size,
          mode: settings.mode,
          zoom: settings.zoom,
          playerX: frame.playerX,
          playerY: frame.playerY,
          events: settings.showEvents ? frame.events : [],
        });
      } catch (e) {
        this.visible = false;
        return;
      }

      this.canvasSize = settings.size;
      this.canvasStyle = this.positionStyle(settings);
      this.visible = true;
      this.reportStatus();
    },

    reportStatus() {
      var status = null;
      try {
        status = getMinimapStatus();
      } catch (e) {
        return;
      }
      if (!status || status.stage === this.lastLoggedStage) {
        return;
      }
      this.lastLoggedStage = status.stage;
      try {
        CHEAT_DIAGNOSTICS.log(
          "debug",
          "minimap",
          "stage: " +
            status.stage +
            (status.detail ? " - " + status.detail : ""),
        );
      } catch (e) {
        // ignore
      }
    },
  },
};
