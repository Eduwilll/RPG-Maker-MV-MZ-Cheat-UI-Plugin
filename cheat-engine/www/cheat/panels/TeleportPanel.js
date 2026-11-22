import MapPreview from "../components/MapPreview.js";
import SaveMapPoint from "../components/SaveMapPoint.js";
import VirtualList from "../components/VirtualList.js";
import { TRANSLATE_SETTINGS } from "../js/TranslateHelper.js";
import { Alert } from "../js/AlertHelper.js";
import { SAVED_LOCATIONS } from "../js/runtime/SavedLocations.js";
import {
  getGameWindow,
  getFeatureRuntime,
} from "../js/runtime/FeatureRuntime.js";
import {
  buildMapRows,
  matchesPanelSearch,
} from "../js/panels/PanelGameState.js";
import {
  attachTranslateRefresh,
  detachTranslateRefresh,
  getTranslatedPanelText,
} from "../js/panels/PanelTranslation.js";
import { isDestinationValid } from "../js/panels/map/DestinationState.js";

export default {
  name: "TeleportPanel",
  components: { MapPreview, SaveMapPoint, VirtualList },
  data() {
    return {
      previewMap: null,
      saving: false,
      savedPoints: [],
      inputX: "0",
      inputY: "0",
      search: "",
      maps: [],
      dimensions: null,
      pointTouched: false,
      showPaths: false,
    };
  },
  template: `<section class="destination-workspace" aria-label="Teleport destination">
    <aside class="destination-rail">
      <div class="workspace-rail-heading"><strong>Maps</strong><span>{{maps.length}}</span><button type="button" class="workspace-icon" title="Reload maps and translations" aria-label="Reload maps and translations" @click="manualRefresh"><v-icon small>mdi-refresh</v-icon></button></div>
      <v-text-field v-model="search" label="Find a map" dense outlined hide-details clearable @keydown.stop/>
      <virtual-list v-if="filteredMaps.length" :items="filteredMaps" :item-size="56" :height="330"><template v-slot:default="{item}"><button type="button" class="workspace-choice destination-map-choice" :class="{'is-selected':previewMap && previewMap.id===item.id}" :aria-pressed="String(!!previewMap && previewMap.id===item.id)" @click="selectMap(item)" :title="item.fullPathJoin"><strong>{{item.name || 'Map '+item.id}}</strong><small>#{{item.id}}<template v-if="showPaths"> · {{item.fullPathJoin}}</template></small></button></template></virtual-list>
      <p v-if="!filteredMaps.length" class="workspace-empty">No maps match your search.</p>
      <v-checkbox v-model="showPaths" label="Show map paths" dense hide-details class="workspace-toggle"/>
    </aside>
    <main class="destination-inspector">
      <template v-if="previewMap">
        <header class="workspace-inspector-heading"><div><span class="workspace-eyebrow">Destination · Map #{{previewMap.id}}</span><h3 :title="previewMap.name">{{previewMap.name}}</h3></div><span class="workspace-status">{{dimensions ? 'Choose a point' : 'Loading'}}</span></header>
        <map-preview ref="mapPreview" :map-id="previewMap.id" :x="Number(inputX)" :y="Number(inputY)" :points="savedPoints" interactive @select="choosePoint" @loaded="onPreviewLoaded"/>
        <div class="destination-point-bar">
          <div class="teleport-coordinates"><v-text-field v-model="inputX" label="X" type="number" min="0" :max="dimensions ? dimensions.width-1 : undefined" class="cheat-field-w80" dense outlined hide-details @input="pointTouched=true" @keydown.self.stop @focus="$event.target.select()"/><v-text-field v-model="inputY" label="Y" type="number" min="0" :max="dimensions ? dimensions.height-1 : undefined" class="cheat-field-w80" dense outlined hide-details @input="pointTouched=true" @keydown.self.stop @focus="$event.target.select()"/></div>
          <button type="button" class="workspace-text-action" :disabled="!dimensions" @click="selectMapCenter"><v-icon small>mdi-crosshairs-gps</v-icon>Map center</button>
        </div>
        <div class="workspace-validation" :class="{'workspace-validation--error':dimensions && !validDestination}" role="status">{{dimensions && !validDestination ? 'Choose whole-number X/Y coordinates inside this map.' : 'Select a tile on the map. Nothing moves until you teleport.'}}</div>
        <footer class="destination-actions"><v-btn small color="primary" :disabled="!validDestination" @click="teleportLocation(previewMap.id,Number(inputX),Number(inputY))"><v-icon small left>mdi-map-marker</v-icon>Teleport here</v-btn><v-btn small outlined :disabled="!validDestination" @click="saving=true"><v-icon small left>mdi-map-marker-plus</v-icon>Save point</v-btn></footer>
      </template><div v-else class="workspace-empty"><v-icon>mdi-map-outline</v-icon><h3>Choose a map</h3><p>Select a map from the list to explore its destination.</p></div>
    </main>
    <v-dialog v-model="saving" max-width="460"><v-card><v-card-title class="subtitle-1">Save destination</v-card-title><v-card-text><save-map-point v-if="saving" :point="selectedPoint" @saved="onPointSaved" @cancel="saving=false"/></v-card-text></v-card></v-dialog>
  </section>`,
  created() {
    this.initializeVariables();
    this.savedPoints = SAVED_LOCATIONS.read();
    attachTranslateRefresh(this, () =>
      TRANSLATE_SETTINGS.isMapTranslateEnabled(),
    );
  },
  beforeDestroy() {
    detachTranslateRefresh(this);
  },
  computed: {
    selectedPoint() {
      return {
        mapId: this.previewMap ? this.previewMap.id : 0,
        x: this.inputX === "" ? NaN : Number(this.inputX),
        y: this.inputY === "" ? NaN : Number(this.inputY),
      };
    },
    validDestination() {
      return isDestinationValid(this.selectedPoint, this.dimensions);
    },
    filteredMaps() {
      return this.maps.filter((row) =>
        matchesPanelSearch(this.search, [row.id, row.name, row.fullPathJoin]),
      );
    },
  },
  methods: {
    selectMap(item) {
      const changed = !this.previewMap || this.previewMap.id !== item.id;
      this.previewMap = {
        id: item.id,
        name: item.name || item.fullPathJoin || "Map " + item.id,
      };
      if (changed) {
        this.dimensions = null;
        this.pointTouched = false;
      }
      this.saving = false;
    },
    choosePoint(point) {
      this.inputX = String(point.x);
      this.inputY = String(point.y);
      this.pointTouched = true;
    },
    onPreviewLoaded(dimensions) {
      if (!this.previewMap || dimensions.mapId !== this.previewMap.id) return;
      this.dimensions = dimensions;
      if (!this.pointTouched) {
        const game = getGameWindow(),
          current =
            game.$gameMap &&
            game.$gameMap.mapId() === dimensions.mapId &&
            game.$gamePlayer;
        this.inputX = String(
          current ? current.x : Math.floor(dimensions.width / 2),
        );
        this.inputY = String(
          current ? current.y : Math.floor(dimensions.height / 2),
        );
      }
    },
    selectMapCenter() {
      if (!this.dimensions) return;
      this.choosePoint({
        x: Math.floor(this.dimensions.width / 2),
        y: Math.floor(this.dimensions.height / 2),
      });
      if (this.$refs.mapPreview)
        this.$nextTick(() => this.$refs.mapPreview.focusPoint());
    },
    onPointSaved() {
      this.saving = false;
      this.savedPoints = SAVED_LOCATIONS.read();
      Alert.success("Map point saved");
    },
    initializeVariables() {
      this.maps = buildMapRows(getGameWindow().$dataMapInfos, (name) =>
        getTranslatedPanelText(
          name,
          TRANSLATE_SETTINGS.isMapTranslateEnabled(),
        ),
      );
      if (!this.previewMap) {
        const game = getGameWindow();
        const current =
          this.maps.find(
            (row) => game.$gameMap && row.id === game.$gameMap.mapId(),
          ) || this.maps[0];
        if (current) this.selectMap(current);
      }
    },
    manualRefresh() {
      this.initializeVariables();
      this.savedPoints = SAVED_LOCATIONS.read();
      if (this.$refs.mapPreview) this.$refs.mapPreview.load();
    },
    loadMapData(id) {
      const game = getGameWindow();
      return game.$gameMap && game.$gameMap.mapId() === id && game.$dataMap
        ? Promise.resolve(game.$dataMap)
        : getFeatureRuntime().previews.load(id);
    },
    async teleportLocation(mapId, x, y) {
      try {
        const data = await this.loadMapData(mapId);
        if (
          !isDestinationValid({ mapId, x, y }, Object.assign({ mapId }, data))
        )
          throw Error("Choose a point inside the map.");
        const player = getGameWindow().$gamePlayer;
        if (!player) throw Error("Start or load a game before teleporting.");
        player.reserveTransfer(mapId, x, y, player.direction(), 0);
        Alert.success(`Teleporting to (${x}, ${y})`);
      } catch (error) {
        Alert.error(error.message);
      }
    },
    async teleportMapCenter(id) {
      try {
        const data = await this.loadMapData(id);
        await this.teleportLocation(
          id,
          Math.floor(data.width / 2),
          Math.floor(data.height / 2),
        );
      } catch (error) {
        Alert.error(error.message);
      }
    },
  },
};
