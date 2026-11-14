import { getFeatureRuntime } from "../js/runtime/FeatureRuntime.js";
import { requestActorNavigation } from "../js/ui/RecordNavigation.js";
export default {
  name: "GameAsset",
  props: {
    kind: String,
    recordId: Number,
    descriptor: Object,
    label: String,
    size: { type: Number, default: 32 },
    navigate: { type: Boolean, default: true },
  },
  data() {
    return { ready: false };
  },
  computed: {
    asset() {
      const runtime = getFeatureRuntime();
      return (
        this.descriptor ||
        (runtime && runtime.assets.describe(this.kind, this.recordId))
      );
    },
    actorId() {
      return (this.navigate && this.asset && this.asset.actorId) || 0;
    },
  },
  template: `<span class="game-asset" :role="actorId ? 'button' : 'img'" :tabindex="actorId ? 0 : null" :aria-label="actorId ? 'Open stats for ' + (label || 'actor ' + actorId) : (label || kind || 'Game artwork')" :title="actorId ? 'Open actor stats' : label" :style="{width:size+'px',height:size+'px',display:'inline-flex',flex:'0 0 '+size+'px',verticalAlign:'middle',alignItems:'center',justifyContent:'center',cursor:actorId?'pointer':'default'}" @click="openActor" @keydown.enter.stop.prevent="openActor" @keydown.space.stop.prevent="openActor">
    <canvas ref="image" v-show="ready" :width="size" :height="size" :style="{width:size+'px',height:size+'px'}"/>
    <v-icon v-if="!ready" :size="Math.min(size,24)" aria-hidden="true">{{ kind === 'actor' || (asset && asset.actorId) ? 'mdi-account' : 'mdi-image-outline' }}</v-icon>
  </span>`,
  watch: {
    asset: {
      deep: true,
      handler() {
        this.draw();
      },
    },
  },
  mounted() {
    this._visible = true;
    if (typeof IntersectionObserver !== "undefined") {
      this._visible = false;
      this._observer = new IntersectionObserver(
        (entries) => {
          this._visible = entries.some((entry) => entry.isIntersecting);
          if (this._visible && !this.ready) this.draw();
        },
        { rootMargin: "64px" },
      );
      this._observer.observe(this.$el);
    } else this.draw();
  },
  beforeDestroy() {
    this._request = null;
    if (this._observer) this._observer.disconnect();
  },
  methods: {
    openActor(event) {
      if (this.actorId) {
        if (event) event.stopPropagation();
        requestActorNavigation(this.actorId);
      }
    },
    async draw() {
      const request = {};
      this._request = request;
      this.ready = false;
      if (!this._visible) return;
      const runtime = getFeatureRuntime();
      if (!runtime || !this.$refs.image) return;
      const current = () => this._request === request;
      let ready = await runtime.assets.paint(
        this.$refs.image,
        this.asset,
        current,
      );
      if (!ready && this.asset && this.asset.actorId && current())
        ready = await runtime.assets.paint(
          this.$refs.image,
          runtime.assets.describe("actorSprite", this.asset.actorId),
          current,
        );
      if (current()) this.ready = ready;
    },
  },
};
