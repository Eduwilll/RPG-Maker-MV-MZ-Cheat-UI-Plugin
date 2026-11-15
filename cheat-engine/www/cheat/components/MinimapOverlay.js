import {
  readMinimapSettings,
  writeMinimapMoveMode,
  writeMinimapPosition,
  writeMinimapCustomX,
  writeMinimapCustomY,
} from "../js/panels/minimap/MinimapPanelState.js";
import { boundedPosition, startPointerDrag } from "../js/ui/LayoutGeometry.js";
import { getMinimapStatus } from "../js/panels/minimap/MinimapRenderer.js";
import { CHEAT_DIAGNOSTICS } from "../js/runtime/CheatDiagnostics.js";
import { getGameWindow } from "../js/runtime/FeatureRuntime.js";
import { startMapFrames } from "../js/panels/map/MapFrames.js";
import InteractiveMap from "./InteractiveMap.js";

export default {
  name: "MinimapOverlay",
  components: { InteractiveMap },

  template: `
<div v-show="visible" :style="canvasStyle" @pointerdown.stop.prevent @mousedown.stop.prevent @mouseup.stop.prevent @touchstart.stop.prevent @touchend.stop.prevent @click.stop @contextmenu.stop.prevent>
<interactive-map ref="view" compact :active="visible" @tools-open="configuring = $event; tick()"/>
<button v-if="moveMode" type="button" class="minimap-move-handle" aria-label="Move minimap; arrow keys move, Escape finishes" title="Drag to move. Arrow keys move, Escape finishes." @pointerdown="startMove" @mousedown.stop.prevent @touchstart.stop @click.stop @keydown="moveKey">Move minimap · Esc to finish</button>
</div>
    `,

  data() {
    return {
      visible: false,
      moveMode: false,
      configuring: false,
      canvasSize: 176,
      canvasStyle: "",
      lastLoggedStage: "",
    };
  },

  mounted() {
    this.tick();
    this._stopFrames = startMapFrames(window, () => this.tick());
  },

  beforeDestroy() {
    if (this._stopDrag) this._stopDrag();
    if (this._stopFrames) this._stopFrames();
  },

  methods: {
    startMove(event) {
      if (this._stopDrag) this._stopDrag();
      const rect = this.$el.getBoundingClientRect();
      this._dragPosition = { x: rect.left, y: rect.top };
      this._stopDrag = startPointerDrag(
        event,
        (dx, dy) => {
          this._dragPosition = boundedPosition(
            rect.left + dx,
            rect.top + dy,
            this.canvasSize,
            window.innerWidth,
            window.innerHeight,
          );
          this.canvasStyle = this.positionStyle(readMinimapSettings());
        },
        () => {
          this.savePosition(this._dragPosition);
          this._dragPosition = null;
        },
      );
    },
    savePosition(pos) {
      if (!pos) return;
      writeMinimapPosition("custom");
      writeMinimapCustomX(pos.x);
      writeMinimapCustomY(pos.y);
      this.tick();
    },
    moveKey(event) {
      event.stopPropagation();
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        writeMinimapMoveMode(false);
        this.tick();
        return;
      }
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      const rect = this.$el.getBoundingClientRect();
      this.savePosition(
        boundedPosition(
          rect.left +
            (event.key === "ArrowRight"
              ? 8
              : event.key === "ArrowLeft"
                ? -8
                : 0),
          rect.top +
            (event.key === "ArrowDown" ? 8 : event.key === "ArrowUp" ? -8 : 0),
          this.canvasSize,
          window.innerWidth,
          window.innerHeight,
        ),
      );
    },
    positionStyle(settings) {
      const displaySize = this.canvasSize;
      var base =
        "position: fixed; z-index: 8; pointer-events: " +
        (this.moveMode ? "auto" : "none") +
        "; " +
        "border: 1px solid rgba(255,255,255,0.18); border-radius: 6px; " +
        "opacity: " +
        settings.opacity +
        ";";
      var size = "width: " + displaySize + "px; height: " + displaySize + "px;";
      var pos = settings.position || "top-right";
      const x =
        pos === "custom"
          ? settings.customX
          : pos.indexOf("left") >= 0
            ? 8
            : window.innerWidth - displaySize - 8;
      const y =
        pos === "custom"
          ? settings.customY
          : pos.indexOf("bottom") >= 0
            ? window.innerHeight - displaySize - 8
            : 8;
      const point =
        this._dragPosition ||
        boundedPosition(
          x,
          y,
          displaySize,
          window.innerWidth,
          window.innerHeight,
        );
      return base + size + "left:" + point.x + "px;top:" + point.y + "px;";
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
      this.moveMode = settings.moveMode;

      const game = getGameWindow();
      if (
        !game ||
        !game.Scene_Map ||
        !(
          game.SceneManager &&
          game.SceneManager._scene instanceof game.Scene_Map
        )
      ) {
        this.visible = false;
        return;
      }
      const nextSize = this.configuring
        ? Math.max(
            96,
            Math.min(360, window.innerWidth - 16, window.innerHeight - 16),
          )
        : settings.size;
      if (nextSize !== this.canvasSize) {
        this.canvasSize = nextSize;
        this.$nextTick(() => {
          if (this.$refs.view) this.$refs.view.measure();
        });
      }
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
