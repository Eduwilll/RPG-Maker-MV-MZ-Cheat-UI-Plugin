import {
  readMapLayers,
  writeMapLayer,
  resetMapLayers,
} from "../js/panels/map/MapLayersState.js";
export default {
  name: "MapLayers",
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
  template: `<v-expansion-panels flat class="my-2"><v-expansion-panel><v-expansion-panel-header>Map layers</v-expansion-panel-header><v-expansion-panel-content><v-row dense><v-col v-for="toggle in toggles" :key="toggle.key" cols="12" sm="6"><v-switch :input-value="layers[toggle.key]" :label="toggle.label" :data-layer="toggle.key" dense hide-details class="my-0" @change="change(toggle.key,$event)"/></v-col></v-row><v-slider :value="layers.markerScale" label="Character / marker size" min="0.5" max="2" step="0.25" thumb-label class="mt-4" @change="change('markerScale',$event)"/><v-btn x-small text @click="reset">Reset map layers</v-btn><p class="caption mb-0">Shared by the full map and floating minimap. In floating minimap settings, enable Show characters and event markers too. Shadows painted into tileset images and custom plugin lighting cannot be removed here. NPC/item categories are active-event hints, not guaranteed loot.</p></v-expansion-panel-content></v-expansion-panel></v-expansion-panels>`,
};
