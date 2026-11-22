import MapPreview from "../components/MapPreview.js";
import SaveMapPoint from "../components/SaveMapPoint.js";
import VirtualList from "../components/VirtualList.js";
import { SAVED_LOCATIONS } from "../js/runtime/SavedLocations.js";
import { locationStyle } from "../js/panels/map/SavedLocationState.js";
import { isDestinationValid } from "../js/panels/map/DestinationState.js";
import {
  getGameWindow,
  getFeatureRuntime,
} from "../js/runtime/FeatureRuntime.js";
import { Alert } from "../js/AlertHelper.js";
import { TRANSLATE_SETTINGS } from "../js/TranslateHelper.js";
import { getTranslatedPanelText } from "../js/panels/PanelTranslation.js";
export default {
  name: "SaveRecallPanel",
  components: { MapPreview, SaveMapPoint, VirtualList },
  data() {
    return {
      locations: [],
      selected: null,
      saving: false,
      draft: null,
      currentPosition: null,
      search: "",
      dimensions: null,
      deleteTarget: null,
    };
  },
  template: `<section class="destination-workspace" aria-label="Saved locations">
    <aside class="destination-rail">
      <div class="workspace-rail-heading"><strong>Saved places</strong><span>{{locations.length}}</span></div>
      <v-text-field v-model="search" label="Find a saved place" dense outlined hide-details clearable @keydown.stop/>
      <virtual-list v-if="filteredRows.length" :items="filteredRows" :item-size="64" :height="306"><template v-slot:default="{item}"><button type="button" class="workspace-choice saved-place-choice" :class="{'is-selected':selected && selected.id===item.id}" :aria-pressed="String(!!selected && selected.id===item.id)" @click="select(item)" :title="item.name+' | '+item.mapName"><v-icon small :color="tagStyle(item.flags).color">{{tagStyle(item.flags).icon}}</v-icon><span><strong>{{item.name}}</strong><small>{{item.mapName}} · {{item.x}}, {{item.y}}</small></span></button></template></virtual-list>
      <div v-else class="workspace-empty"><v-icon>mdi-map-marker-plus</v-icon><strong>{{locations.length?'No matching places':'No saved places yet'}}</strong><p>{{locations.length?'Try another name, map or tag.':'Save your position to return to it later.'}}</p></div>
      <v-btn small outlined block :disabled="!currentPosition" @click="saveCurrent"><v-icon small left>mdi-map-marker-plus</v-icon>Save current position</v-btn>
    </aside>
    <main class="destination-inspector">
      <template v-if="selected">
        <header class="workspace-inspector-heading"><div><span class="workspace-eyebrow">{{selected.id?'Saved place':'New point · not saved'}} · Map #{{selected.mapId}}</span><h3>{{selected.name}}</h3></div><button v-if="selected.id" type="button" class="workspace-icon" title="Delete saved place" aria-label="Delete saved place" @click="deleteTarget=selected"><v-icon small>mdi-delete-outline</v-icon></button></header>
        <map-preview ref="mapPreview" :map-id="selected.mapId" :x="selected.x" :y="selected.y" :points="locations" interactive @select="choosePoint" @loaded="dimensions=$event"/>
        <div class="saved-place-summary"><strong>X {{selected.x}} &nbsp; Y {{selected.y}}</strong><span class="workspace-tags"><span v-for="tag in selected.flags || []" :key="tag" :title="tag">{{tag}}</span></span></div>
        <div class="workspace-validation">{{selected.id?'Click another tile to create a new point. Your saved place stays unchanged.':'This point is not saved yet. Save it to return here later.'}}</div>
        <footer class="destination-actions"><v-btn small color="primary" :disabled="!validDestination" @click="teleport(selected)"><v-icon small left>mdi-map-marker</v-icon>Teleport here</v-btn><v-btn small outlined :disabled="!validDestination" @click="saveSelected"><v-icon small left>mdi-map-marker-plus</v-icon>{{selected.id?'Save a copy':'Save point'}}</v-btn></footer>
      </template><div v-else class="workspace-empty"><v-icon>mdi-map-marker-plus</v-icon><h3>Your places, one click away</h3><p>Start or load a game to save your position, or select a saved place from the list.</p></div>
    </main>
    <v-dialog v-model="saving" max-width="460"><v-card><v-card-title class="subtitle-1">Save a place</v-card-title><v-card-text><save-map-point v-if="saving" :point="draft" @saved="onSaved" @cancel="saving=false"/></v-card-text></v-card></v-dialog>
    <v-dialog :value="!!deleteTarget" @input="deleteTarget=null" max-width="380"><v-card><v-card-title class="subtitle-1">Delete saved place?</v-card-title><v-card-text>{{deleteTarget ? deleteTarget.name : ''}} will be removed from your list. Game data is not changed.</v-card-text><v-card-actions><v-btn text @click="deleteTarget=null">Keep place</v-btn><v-btn text color="error" @click="remove(deleteTarget.id);deleteTarget=null">Delete</v-btn></v-card-actions></v-card></v-dialog>
  </section>`,
  created() {
    this.refresh();
    this._refresh = () => this.refresh();
    window.addEventListener("cheat-locations-change", this._refresh);
    this._timer = setInterval(this._refresh, 1000);
  },
  beforeDestroy() {
    window.removeEventListener("cheat-locations-change", this._refresh);
    clearInterval(this._timer);
  },
  computed: {
    rows() {
      const game = getGameWindow();
      return this.locations.map((row) =>
        Object.assign({}, row, {
          mapName: getTranslatedPanelText(
            (game.$dataMapInfos[row.mapId] || {}).name || "Map " + row.mapId,
            TRANSLATE_SETTINGS.isMapTranslateEnabled(),
          ),
        }),
      );
    },
    filteredRows() {
      const query = String(this.search || "")
        .toLowerCase()
        .trim();
      return this.rows.filter(
        (row) =>
          !query ||
          [row.name, row.mapName, row.mapId]
            .concat(row.flags)
            .join(" ")
            .toLowerCase()
            .includes(query),
      );
    },
    validDestination() {
      return isDestinationValid(this.selected, this.dimensions);
    },
  },
  methods: {
    tagStyle: locationStyle,
    refresh() {
      const game = getGameWindow(),
        player = game.$gamePlayer,
        map = game.$gameMap;
      const position =
        player && map && map.mapId()
          ? { mapId: map.mapId(), x: player.x, y: player.y }
          : null;
      if (JSON.stringify(position) !== JSON.stringify(this.currentPosition))
        this.currentPosition = position;
      const rows = SAVED_LOCATIONS.read();
      if (JSON.stringify(rows) !== JSON.stringify(this.locations))
        this.locations = rows;
      if (!this.selected) {
        const row =
          this.locations.find((p) => position && p.mapId === position.mapId) ||
          this.locations[this.locations.length - 1];
        if (row) this.select(row);
        else if (position)
          this.selected = Object.assign({ name: "Current position" }, position);
      }
    },
    select(row) {
      const changed = !this.selected || this.selected.mapId !== row.mapId;
      this.selected = Object.assign({}, row);
      if (changed) this.dimensions = null;
      this.saving = false;
    },
    choosePoint(point) {
      this.selected = Object.assign({}, point, { name: "Selected point" });
      this.saving = false;
    },
    saveCurrent() {
      this.refresh();
      if (!this.currentPosition) return;
      this.select(
        Object.assign({ name: "Current position" }, this.currentPosition),
      );
      this.draft = Object.assign({}, this.currentPosition);
      this.saving = true;
    },
    saveSelected() {
      this.draft = Object.assign({}, this.selected);
      this.saving = true;
    },
    onSaved(row) {
      this.saving = false;
      this.refresh();
      this.select(row);
      Alert.success("Location saved");
    },
    remove(id) {
      SAVED_LOCATIONS.remove(id);
      if (this.selected && this.selected.id === id) this.selected = null;
      this.refresh();
    },
    async teleport(point) {
      try {
        const data = await getFeatureRuntime().previews.load(point.mapId);
        if (
          !isDestinationValid(
            point,
            Object.assign({ mapId: point.mapId }, data),
          )
        )
          throw Error("Saved point is outside this map.");
        const player = getGameWindow().$gamePlayer;
        if (!player) throw Error("Start or load a game before teleporting.");
        player.reserveTransfer(
          point.mapId,
          point.x,
          point.y,
          player.direction(),
          0,
        );
        Alert.success("Teleporting to saved point");
      } catch (error) {
        Alert.error(error.message);
      }
    },
  },
};
