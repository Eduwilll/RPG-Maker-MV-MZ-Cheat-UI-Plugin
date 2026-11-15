import { getFeatureRuntime } from "../js/runtime/FeatureRuntime.js";
export default {
  name: "MapPreview",
  props: { mapId: Number, x: Number, y: Number },
  data() {
    return { status: "Loading destination...", width: 0, height: 0 };
  },
  template: `<div><div class="caption" role="status">{{ status }} <span v-if="width">{{ width }} x {{ height }} tiles. Red dot: requested destination.</span></div><canvas ref="preview" width="480" height="300" style="width:100%;height:auto;max-height:300px;object-fit:contain;background:#101018;"/><p class="caption mt-1">Preview only. Dynamic events, lighting and screen effects are not executed.</p></div>`,
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
  },
  beforeDestroy() {
    this._request = null;
    clearInterval(this._timer);
  },
  methods: {
    async load() {
      const request = {};
      this._request = request;
      this._map = null;
      this.width = 0;
      this.height = 0;
      this.status = "Loading destination...";
      try {
        const data = await getFeatureRuntime().previews.load(this.mapId);
        if (this._request !== request) return;
        this._map = data;
        this.width = data.width;
        this.height = data.height;
        this.paint();
      } catch (error) {
        if (this._request === request) this.status = error.message;
      }
    },
    paint() {
      if (!this._map || !this.$refs.preview) return;
      const renderer = getFeatureRuntime().previews;
      const base = renderer.render(this._map, this.mapId);
      this.status = base ? "Destination preview." : renderer.status().detail;
      const canvas = this.$refs.preview,
        ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!base) return;
      const fit = Math.min(
        canvas.width / base.width,
        canvas.height / base.height,
      );
      const w = base.width * fit,
        h = base.height * fit,
        ox = (canvas.width - w) / 2,
        oy = (canvas.height - h) / 2;
      ctx.drawImage(base, ox, oy, w, h);
      const x = Number.isFinite(this.x) ? this.x : Math.floor(this.width / 2),
        y = Number.isFinite(this.y) ? this.y : Math.floor(this.height / 2);
      ctx.fillStyle = "#ff3344";
      ctx.beginPath();
      ctx.arc(
        ox + ((x + 0.5) * w) / this.width,
        oy + ((y + 0.5) * h) / this.height,
        4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    },
  },
};
