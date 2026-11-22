import { SAVED_LOCATIONS } from "../js/runtime/SavedLocations.js";
import { LOCATION_TAGS } from "../js/panels/map/SavedLocationState.js";
import {
  getGameWindow,
  getFeatureRuntime,
} from "../js/runtime/FeatureRuntime.js";
export default {
  name: "SaveMapPoint",
  props: { point: Object },
  data() {
    return { name: "", flags: [], error: "", busy: false, tags: LOCATION_TAGS };
  },
  template: `<form v-if="point" class="save-map-point" @submit.prevent="save" @keydown.stop>
    <div class="caption">Save point · Map {{point.mapId}} · X {{point.x}}, Y {{point.y}}</div>
    <v-text-field v-model="name" label="Point name" dense outlined hide-details maxlength="120"/>
    <div class="cheat-chip-row"><v-chip v-for="tag in tags" :key="tag.value" small :outlined="flags.indexOf(tag.value) < 0" :color="flags.indexOf(tag.value) >= 0 ? tag.color : undefined" @click="toggle(tag.value)"><v-icon left small>{{tag.icon}}</v-icon>{{tag.value}}</v-chip></div>
    <v-combobox v-model="flags" :items="tags.map(t => t.value)" label="Tags (or type your own)" multiple small-chips dense outlined hide-details/>
    <div class="cheat-inline"><v-btn type="submit" small color="primary" :loading="busy" :disabled="busy">Save point</v-btn><v-btn type="button" small text @click="$emit('cancel')">Cancel</v-btn><span class="caption error--text" role="alert">{{error}}</span></div>
  </form>`,
  watch: {
    point() {
      this.reset();
    },
  },
  created() {
    this.reset();
  },
  beforeDestroy() {
    this._saveRequest = null;
  },
  methods: {
    reset() {
      this._saveRequest = null;
      this.busy = false;
      this.name =
        this.point && this.point.name !== "Selected location"
          ? String(this.point.name || "")
          : "";
      this.flags =
        this.point && Array.isArray(this.point.flags)
          ? this.point.flags.slice()
          : [];
      this.error = "";
    },
    toggle(value) {
      this.flags = this.flags.includes(value)
        ? this.flags.filter((f) => f !== value)
        : this.flags.concat([value]);
    },
    async save() {
      if (this.busy) return;
      const request = {};
      this._saveRequest = request;
      this.busy = true;
      this.error = "";
      try {
        const point = Object.assign({}, this.point, {
          name: String(this.name || "").trim() || "Saved point",
          flags: this.flags.slice(),
        });
        const game = getGameWindow();
        const dimensions =
          game.$gameMap &&
          game.$gameMap.mapId() === point.mapId &&
          game.$dataMap
            ? game.$dataMap
            : await getFeatureRuntime().previews.load(point.mapId);
        if (this._saveRequest !== request) return;
        const saved = SAVED_LOCATIONS.add(point, dimensions);
        this.$emit("saved", saved);
      } catch (error) {
        if (this._saveRequest === request) this.error = error.message;
      } finally {
        if (this._saveRequest === request) this.busy = false;
      }
    },
  },
};
