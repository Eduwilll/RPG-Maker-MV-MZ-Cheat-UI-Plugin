import { getFeatureRuntime } from "../js/runtime/FeatureRuntime.js";
import { requestActorNavigation } from "../js/ui/RecordNavigation.js";
export default {
  name: "MessagePortrait",
  inject: { cheatRuntime: { default: null } },
  props: {
    faceName: String,
    faceIndex: Number,
    speaker: String,
    actorId: Number,
    pictureName: String,
  },
  data() {
    return { ready: false };
  },
  template: `<div class="message-portrait" :role="actorId ? 'button' : null" :tabindex="actorId ? 0 : null" :aria-label="actorId ? 'Open stats for ' + speaker : null" @click="openActor" @keydown.enter.stop.prevent="openActor" @keydown.space.stop.prevent="openActor">
    <canvas ref="face" width="56" height="56" v-show="ready" role="img" :aria-label="speaker ? speaker + ' portrait' : 'Dialogue portrait'"/>
    <div v-if="!ready" class="message-portrait__fallback d-flex align-center justify-center" aria-label="Portrait unavailable"><v-icon>mdi-account</v-icon></div>
  </div>`,
  watch: {
    faceName() {
      this.draw();
    },
    faceIndex() {
      this.draw();
    },
    actorId() {
      this.draw();
    },
    pictureName() {
      this.draw();
    },
  },
  mounted() {
    this.draw();
  },
  beforeDestroy() {
    this._request = null;
  },
  methods: {
    openActor() {
      if (this.actorId) requestActorNavigation(this.actorId);
    },
    async draw() {
      const request = {};
      this._request = request;
      this.ready = false;
      const runtime = this.cheatRuntime || getFeatureRuntime();
      if (!runtime || !this.$refs.face) return;
      const current = () => this._request === request;
      const asset = this.faceName
        ? { type: "face", name: this.faceName, index: this.faceIndex }
        : this.pictureName
          ? { type: "picture", name: this.pictureName }
          : runtime.assets.describe("actor", this.actorId);
      let ready = await runtime.assets.paint(this.$refs.face, asset, current);
      if (!ready && this.actorId && current())
        ready = await runtime.assets.paint(
          this.$refs.face,
          runtime.assets.describe("actorSprite", this.actorId),
          current,
        );
      if (current()) this.ready = ready;
    },
  },
};
