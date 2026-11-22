import { getFeatureRuntime } from "../js/runtime/FeatureRuntime.js";
import { previewTile } from "../js/panels/map/PreviewGeometry.js";
import {
  mapCamera,
  panCamera,
  zoomCamera,
} from "../js/panels/map/MapCamera.js";
import { startPointerDrag } from "../js/ui/LayoutGeometry.js";
import { drawLocationPin } from "../js/panels/map/LocationPins.js";
export default {
  name: "MapPreview",
  inject: { cheatRuntime: { default: null } },
  props: {
    mapId: Number,
    x: Number,
    y: Number,
    interactive: Boolean,
    points: { type: Array, default: () => [] },
  },
  data() {
    return {
      status: "Loading destination...",
      width: 0,
      height: 0,
      zoom: 1,
      ready: false,
      failed: false,
    };
  },
  template: `<section class="destination-preview" :class="{'destination-preview--ready':ready}">
    <canvas ref="preview" class="map-preview__canvas" :class="{'map-preview__canvas--interactive':interactive}" width="480" height="300" :tabindex="interactive ? 0 : -1" :aria-label="interactive ? 'Destination map. Click a tile to select. Drag to pan, scroll to zoom; arrows adjust the destination.' : 'Destination map preview'" @pointerdown="startPan" @wheel.stop.prevent="wheel" @click="choose" @keydown="key"/>
    <div v-if="!ready" class="preview-state" :role="failed?'alert':'status'"><v-icon>{{failed?'mdi-map-outline':'mdi-timer-sand'}}</v-icon><strong>{{failed?'Preview unavailable':'Loading map'}}</strong><span>{{status}}</span><button v-if="failed" type="button" class="map-teleport" @click="load">Retry</button></div>
    <div v-if="ready" class="destination-preview__toolbar" role="toolbar" aria-label="Preview map controls"><button type="button" class="map-tool" title="Zoom in" aria-label="Zoom in preview" @click="zoomBy(1.5)"><v-icon small>mdi-plus</v-icon></button><button type="button" class="map-tool" title="Zoom out" aria-label="Zoom out preview" @click="zoomBy(1/1.5)"><v-icon small>mdi-minus</v-icon></button><button type="button" class="map-tool" title="Fit whole map" aria-label="Fit preview map" @click="fit"><v-icon small>mdi-fit-to-screen-outline</v-icon></button><button type="button" class="map-tool" title="Focus selected point" aria-label="Focus destination" @click="focusPoint"><v-icon small>mdi-crosshairs-gps</v-icon></button></div>
    <div v-if="ready" class="preview-hud"><span>{{width}} x {{height}} tiles <span class="preview-hud__zoom">{{Math.round(zoom*100)}}%</span></span><strong v-if="validPoint">X {{x}} &nbsp; Y {{y}}</strong></div>
    <div class="preview-help" title="Static destination artwork. Event pages, plugin lighting and screen effects are not executed."><v-icon x-small>mdi-information-outline</v-icon>{{interactive?'Click to choose · Drag to pan · Scroll to zoom':'Destination preview'}}</div>
  </section>`,
  computed: {
    validPoint() {
      return (
        Number.isInteger(this.x) &&
        Number.isInteger(this.y) &&
        this.x >= 0 &&
        this.y >= 0 &&
        this.x < this.width &&
        this.y < this.height
      );
    },
  },
  mounted() {
    this.load();
    this._timer = setInterval(this.paint, 300);
  },
  watch: {
    mapId() {
      this.load();
    },
    x() {
      this.paint();
    },
    y() {
      this.paint();
    },
    points() {
      this.paint();
    },
  },
  beforeDestroy() {
    this._request = null;
    if (this._stopPan) this._stopPan();
    clearInterval(this._timer);
  },
  methods: {
    async load() {
      const retrying = this.failed;
      if (this._stopPan) this._stopPan();
      this._stopPan = null;
      this._suppressClick = 0;
      const request = {};
      this._request = request;
      this._map = null;
      this._view = null;
      this.zoom = 1;
      this._center = null;
      this.ready = false;
      this.failed = false;
      this.width = 0;
      this.height = 0;
      this.status = "Loading destination...";
      if (this.$refs.preview)
        this.$refs.preview.getContext("2d").clearRect(0, 0, 480, 300);
      try {
        const runtime = this.cheatRuntime || getFeatureRuntime();
        if (retrying && runtime.previews.clear)
          runtime.previews.clear(this.mapId);
        const data = await runtime.previews.load(this.mapId);
        if (this._request !== request) return;
        this._map = data;
        this.width = data.width;
        this.height = data.height;
        this.$emit("loaded", {
          mapId: this.mapId,
          width: data.width,
          height: data.height,
        });
        this.paint();
      } catch (error) {
        if (this._request === request) {
          this.status = error.message;
          this.failed = true;
          this.$emit("error", error.message);
        }
      }
    },
    paint() {
      if (!this._map || !this.$refs.preview) return;
      const renderer = (this.cheatRuntime || getFeatureRuntime()).previews;
      const base = renderer.render(this._map, this.mapId);
      const state = renderer.status();
      this.status = base
        ? "Destination preview."
        : String(state.detail || "Loading map artwork...").replace(
            /; radar shown[^.]*/g,
            "",
          );
      this.ready = !!base;
      this.failed =
        !base &&
        [
          "tiles-unavailable",
          "map-too-large",
          "render-unavailable",
          "no-datamap",
        ].includes(state.stage);
      const canvas = this.$refs.preview,
        ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this._view = null;
      if (!base) return;
      this.ready = true;
      const v = mapCamera({
        width: canvas.width,
        height: canvas.height,
        mapWidth: this.width,
        mapHeight: this.height,
        x: this._center ? this._center.x : this.width / 2,
        y: this._center ? this._center.y : this.height / 2,
        zoom: this.zoom,
      });
      this._view = v;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        base,
        v.ox,
        v.oy,
        this.width * v.unit,
        this.height * v.unit,
      );
      this.points
        .filter((p) => p.mapId === this.mapId)
        .forEach((p) =>
          drawLocationPin(
            ctx,
            v.ox + (p.x + 0.5) * v.unit,
            v.oy + (p.y + 0.5) * v.unit,
            p.flags,
            1,
          ),
        );
      const x = Number.isFinite(this.x) ? this.x : Math.floor(this.width / 2),
        y = Number.isFinite(this.y) ? this.y : Math.floor(this.height / 2);
      if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.strokeRect(v.ox + x * v.unit, v.oy + y * v.unit, v.unit, v.unit);
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 1;
      ctx.strokeRect(v.ox + x * v.unit, v.oy + y * v.unit, v.unit, v.unit);
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.arc(
        v.ox + (x + 0.5) * v.unit,
        v.oy + (y + 0.5) * v.unit,
        4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    },
    choose(event) {
      if (!this.interactive || !this._view || Date.now() < this._suppressClick)
        return;
      const canvas = this.$refs.preview,
        rect = canvas.getBoundingClientRect();
      const point = previewTile(
        this._view,
        ((event.clientX - rect.left) * canvas.width) / rect.width,
        ((event.clientY - rect.top) * canvas.height) / rect.height,
      );
      if (point)
        this.$emit("select", Object.assign({ mapId: this.mapId }, point));
    },
    key(event) {
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        this.zoomBy(1.5);
        return;
      }
      if (event.key === "-") {
        event.preventDefault();
        this.zoomBy(1 / 1.5);
        return;
      }
      if (event.key === "0") {
        event.preventDefault();
        this.fit();
        return;
      }
      if (
        !this.interactive ||
        !this._view ||
        !/^Arrow(Left|Right|Up|Down)$/.test(event.key)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      const x = Number.isFinite(this.x) ? this.x : Math.floor(this.width / 2),
        y = Number.isFinite(this.y) ? this.y : Math.floor(this.height / 2);
      this.$emit("select", {
        mapId: this.mapId,
        x: Math.max(
          0,
          Math.min(
            this.width - 1,
            x +
              (event.key === "ArrowLeft"
                ? -1
                : event.key === "ArrowRight"
                  ? 1
                  : 0),
          ),
        ),
        y: Math.max(
          0,
          Math.min(
            this.height - 1,
            y +
              (event.key === "ArrowUp"
                ? -1
                : event.key === "ArrowDown"
                  ? 1
                  : 0),
          ),
        ),
      });
    },
    zoomBy(factor, point) {
      if (!this._view) return;
      const next = zoomCamera(this._view, factor, point);
      this.zoom = next.zoom;
      this._center = { x: next.x, y: next.y };
      this.paint();
    },
    fit() {
      this.zoom = 1;
      this._center = null;
      this.paint();
    },
    focusPoint() {
      if (!this.validPoint) return;
      this.zoom = Math.max(
        this.zoom,
        Math.min(32, Math.max(this.width, this.height) / 12),
      );
      this._center = { x: this.x + 0.5, y: this.y + 0.5 };
      this.paint();
    },
    wheel(event) {
      if (!this.interactive || !this._view) return;
      const rect = this.$refs.preview.getBoundingClientRect();
      this.zoomBy(event.deltaY < 0 ? 1.2 : 1 / 1.2, {
        x: ((event.clientX - rect.left) * 480) / rect.width,
        y: ((event.clientY - rect.top) * 300) / rect.height,
      });
    },
    startPan(event) {
      if (!this.interactive || !this._view || event.button !== 0) return;
      if (this._stopPan) this._stopPan();
      this.$refs.preview.focus();
      const start = this._view,
        rect = this.$refs.preview.getBoundingClientRect();
      let moved = false;
      this._stopPan = startPointerDrag(
        event,
        (dx, dy) => {
          if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
          moved = true;
          const next = panCamera(
            start,
            (dx * 480) / rect.width,
            (dy * 300) / rect.height,
          );
          this._center = { x: next.x, y: next.y };
          this.paint();
        },
        () => {
          if (moved) this._suppressClick = Date.now() + 250;
        },
      );
    },
  },
};
