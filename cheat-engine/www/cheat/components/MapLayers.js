import {
  readMapLayers,
  writeMapLayer,
  resetMapLayers,
} from "../js/panels/map/MapLayersState.js";
export default {
  name: "MapLayers",
  props: { inline: Boolean },
  data() {
    return {
      layers: readMapLayers(),
      toggles: [
        { key: "sprites", label: "Show actual NPC / event sprites" },
        { key: "shadows", label: "Tile shadows / dimming" },
        { key: "upperTiles", label: "Roofs / upper tiles" },
        { key: "background", label: "Map background" },
        { key: "player", label: "Player marker" },
        { key: "npcs", label: "NPCs" },
        { key: "enemies", label: "Enemies" },
        { key: "treasures", label: "Items / treasure" },
        { key: "events", label: "Other events" },
        { key: "labels", label: "Event names / IDs" },
        { key: "grid", label: "Grid" },
      ],
    };
  },
  mounted() {
    this._poll = setInterval(() => {
      this.layers = readMapLayers();
    }, 1000);
  },
  beforeDestroy() {
    clearInterval(this._poll);
  },
  methods: {
    change(key, value) {
      writeMapLayer(key, value);
      this.layers = readMapLayers();
      this.$emit("change");
    },
    reset() {
      resetMapLayers();
      this.layers = readMapLayers();
      this.$emit("change");
    },
  },
  template: `<div class="map-settings map-layer-settings"><component :is="inline ? 'div' : 'details'"><summary v-if="!inline">Map layers</summary><div class="map-layer-settings__toggles"><v-switch v-for="toggle in toggles" :key="toggle.key" :input-value="layers[toggle.key]" :label="toggle.label" :data-layer="toggle.key" dense hide-details class="my-0" @change="change(toggle.key,$event)"/></div><v-slider :value="layers.markerScale" label="Marker size" min="0.5" max="2" step="0.25" thumb-label class="mt-4" @change="change('markerScale',$event)"/><v-btn x-small text @click="reset">Reset map layers</v-btn><p class="caption mb-0">Shared with the floating minimap. Categories are active-event hints, not guaranteed loot. Shadows baked into images and plugin lighting cannot be removed here.</p></component></div>`,
};
