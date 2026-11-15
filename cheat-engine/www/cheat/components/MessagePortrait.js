import { getFeatureRuntime } from "../js/runtime/FeatureRuntime.js";
import { requestActorNavigation } from "../js/ui/RecordNavigation.js";
export default {
  name: "MessagePortrait",
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
  template: `<div :role="actorId ? 'button' : null" :tabindex="actorId ? 0 : null" :aria-label="actorId ? 'Open stats for ' + speaker : null" @click="openActor" @keydown.enter.stop.prevent="openActor" @keydown.space.stop.prevent="openActor" style="width:56px;height:56px;flex:0 0 56px;margin-right:10px;border-radius:4px;overflow:hidden;background:#7772;">
    <canvas ref="face" width="56" height="56" v-show="ready" role="img" :aria-label="speaker ? speaker + ' portrait' : 'Dialogue portrait'" style="width:56px;height:56px;"/>
    <div v-if="!ready" class="d-flex align-center justify-center" style="height:100%;" aria-label="Portrait unavailable"><v-icon>mdi-account</v-icon></div>
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
      const runtime = getFeatureRuntime();
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
