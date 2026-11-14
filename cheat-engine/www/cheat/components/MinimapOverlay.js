import {
  readMinimapSettings,
  writeMinimapMoveMode,
  writeMinimapPosition,
  writeMinimapCustomX,
  writeMinimapCustomY,
} from "../js/panels/minimap/MinimapPanelState.js";
import { boundedPosition, startPointerDrag } from "../js/ui/LayoutGeometry.js";
import {
  renderBaseMap,
  drawMinimap,
  readMinimapFrame,
  getMinimapStatus,
} from "../js/panels/minimap/MinimapRenderer.js";
import { CHEAT_DIAGNOSTICS } from "../js/runtime/CheatDiagnostics.js";
import { readMapLayers } from "../js/panels/map/MapLayersState.js";

export default {
  name: "MinimapOverlay",

  template: `
<div v-show="visible" :style="canvasStyle" @pointerdown.stop.prevent @mousedown.stop.prevent @mouseup.stop.prevent @touchstart.stop.prevent @touchend.stop.prevent @click.stop @contextmenu.stop.prevent>
<canvas
    ref="mapCanvas"
    :width="canvasSize"
    :height="canvasSize"
    style="width:100%;height:100%;display:block;">
</canvas>
<button v-if="moveMode" type="button" aria-label="Move minimap; arrow keys move, Escape finishes" title="Drag to move. Arrow keys move, Escape finishes." style="position:absolute;top:0;left:0;width:100%;height:28px;background:#222d;color:white;cursor:move;touch-action:none;" @pointerdown="startMove" @mousedown.stop.prevent @touchstart.stop @click.stop @keydown="moveKey">Move minimap</button>
</div>
    `,

  data() {
    return {
      visible: false,
      moveMode: false,
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
    if (this._stopDrag) this._stopDrag();
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
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
      var base =
        "position: fixed; z-index: 8; pointer-events: " +
        (this.moveMode ? "auto" : "none") +
        "; " +
        "border: 1px solid rgba(255,255,255,0.18); border-radius: 6px; " +
        "opacity: " +
        settings.opacity +
        ";";
      var size =
        "width: " + settings.size + "px; height: " + settings.size + "px;";
      var pos = settings.position || "top-right";
      const x =
        pos === "custom"
          ? settings.customX
          : pos.indexOf("left") >= 0
            ? 8
            : window.innerWidth - settings.size - 8;
      const y =
        pos === "custom"
          ? settings.customY
          : pos.indexOf("bottom") >= 0
            ? window.innerHeight - settings.size - 8
            : 8;
      const point =
        this._dragPosition ||
        boundedPosition(
          x,
          y,
          settings.size,
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

      var frame = readMinimapFrame();
      if (!frame.onMap) {
        this.reportStatus();
        this.visible = false;
        return;
      }

      var base = null;
      const layers = readMapLayers();
      try {
        base = layers.background ? renderBaseMap() : null;
      } catch (e) {
        base = null;
      }
      if (!base && layers.background) {
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
          layers,
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
