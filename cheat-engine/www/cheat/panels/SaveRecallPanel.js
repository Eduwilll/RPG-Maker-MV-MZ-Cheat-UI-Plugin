import { KEY_VALUE_STORAGE } from "../js/storage/KeyValueStorage.js";
import { TRANSLATE_SETTINGS } from "../js/TranslateHelper.js";
import {
  buildMapPathText,
  matchesPanelSearch,
} from "../js/panels/PanelGameState.js";
import {
  attachTranslateRefresh,
  detachTranslateRefresh,
  getTranslatedPanelText,
} from "../js/panels/PanelTranslation.js";

export default {
  name: "SaveRecallPanel",

  template: `
<v-card flat class="ma-0 pa-0">
    <v-card-subtitle class="ma-0 pa-0">Save Location</v-card-subtitle>
    <span class="body-2 green--text text--darken-1">Map : {{currentMapName}}</span>
    <v-text-field
        ref="locationAliasField"
        label="Location Alias"
        solo
        background-color="grey darken-3"
        v-model="locationAliasInput"
        dense
        hide-details
        @keydown.self.stop="onLocationAliasKeyDown"
        @focus="$event.target.select()">
        <template v-slot:append-outer>
            <v-tooltip
                bottom>
                <span>Save current location</span>
                <template v-slot:activator="{ on, attrs }">
                    <v-btn
                        class="mt-n1"
                        color="teal"
                        x-small
                        fab
                        v-on="on"
                        v-bind="attrs"
                        @click="onAddLocation">
                        <v-icon>mdi-plus</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
        </template>
    </v-text-field>

    <div class="mt-2">
        <div class="caption grey--text mb-1">Flags (optional)</div>
        <div class="d-flex flex-wrap" style="gap: 4px;">
            <v-chip
                v-for="preset in presetFlags"
                :key="preset.value"
                :color="selectedFlags.includes(preset.value) ? preset.color : 'grey darken-2'"
                :outlined="!selectedFlags.includes(preset.value)"
                x-small
                label
                class="cursor-pointer"
                @click="toggleFlag(preset.value)">
                {{ preset.icon }} {{ preset.label }}
            </v-chip>
        </div>
        <v-text-field
            v-model="customFlagInput"
            label="Custom flag (press Enter)"
            solo
            background-color="grey darken-3"
            dense
            hide-details
            class="mt-2"
            @keydown.self.stop="onCustomFlagKeyDown"
            @focus="$event.target.select()">
            <template v-slot:append>
                <v-btn icon x-small @click="addCustomFlag" :disabled="!customFlagInput.trim()">
                    <v-icon small>mdi-plus</v-icon>
                </v-btn>
            </template>
        </v-text-field>
        <div v-if="selectedFlags.length > 0" class="d-flex flex-wrap mt-1" style="gap: 4px;">
            <v-chip
                v-for="flag in selectedFlags"
                :key="flag"
                :color="getFlagColor(flag)"
                x-small
                label
                close
                @click:close="removeSelectedFlag(flag)">
                {{ getFlagIcon(flag) }} {{ flag }}
            </v-chip>
        </div>
    </div>

    <v-card-subtitle class="ma-0 pa-0 mt-5">Recall Location</v-card-subtitle>
    <v-data-table
        v-if="tableHeaders"
        class="mt-2"
        dense
        :headers="tableHeaders"
        :items="tableItems"
        :search="search"
        :custom-filter="tableItemFilter"
        :items-per-page="10">
        <template v-slot:top>
            <v-text-field
                label="Search..."
                solo
                background-color="grey darken-3"
                v-model="search"
                dense
                hide-details
                @keydown.self.stop
                @focus="$event.target.select()">
            </v-text-field>
        </template>
        <template
            v-slot:item.coord="{ item }">
            {{ item.coord.x }}, {{ item.coord.y }}
        </template>
        <template v-slot:item.flags="{ item }">
            <div class="d-flex flex-wrap" style="gap: 2px;">
                <v-chip
                    v-for="flag in (item.flags || [])"
                    :key="flag"
                    :color="getFlagColor(flag)"
                    x-small
                    label>
                    {{ getFlagIcon(flag) }} {{ flag }}
                </v-chip>
                <span v-if="!item.flags || item.flags.length === 0" class="grey--text caption">—</span>
            </div>
        </template>
        <template
            v-slot:item.actions="{ item, index }">
            
            <v-tooltip
                bottom>
                <span>Teleport</span>
                <template v-slot:activator="{ on, attrs }">
                    <v-btn
                        color="green"
                        x-small
                        fab
                        v-bind="attrs"
                        v-on="on"
                        @click="teleportLocation(item.mapId, item.coord.x, item.coord.y)">
                        <v-icon small>mdi-map-marker</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            
            
            <v-tooltip
                bottom>
                <span>Delete location</span>
                <template v-slot:activator="{ on, attrs }">
                    <v-btn
                        color="red"
                        class="ml-2"
                        x-small
                        fab
                        v-bind="attrs"
                        v-on="on"
                        @click="removeLocation(index)">
                        <v-icon small>mdi-delete</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
        </template>
    </v-data-table>
    
    <v-tooltip
        bottom>
        <span>Reload from game data</span>
        <template v-slot:activator="{ on, attrs }">
            <v-btn
                style="top: 0px; right: 0px;"
                color="pink"
                dark
                small
                absolute
                top
                right
                fab
                v-bind="attrs"
                v-on="on"
                @click="initializeVariables">
                <v-icon>mdi-refresh</v-icon>
            </v-btn>
        </template>
    </v-tooltip>
</v-card>
    `,

  data() {
    return {
      locationAliasInput: "",

      customFlagInput: "",

      selectedFlags: [],

      search: "",

      locations: [],

      currentMapName: "",

      presetFlags: [
        {
          value: "Boss Area",
          label: "Boss Area",
          icon: "🔴",
          color: "red darken-2",
        },
        { value: "Shop", label: "Shop", icon: "🛒", color: "blue darken-1" },
        {
          value: "Checkpoint",
          label: "Checkpoint",
          icon: "🚩",
          color: "green darken-1",
        },
        { value: "NPC", label: "NPC", icon: "💬", color: "purple darken-1" },
        {
          value: "Farm Spot",
          label: "Farm Spot",
          icon: "⚡",
          color: "amber darken-2",
        },
        {
          value: "Danger Zone",
          label: "Danger Zone",
          icon: "☠️",
          color: "orange darken-3",
        },
      ],

      tableHeaders: [
        {
          text: "Name",
          value: "name",
        },
        {
          text: "Map",
          value: "mapName",
        },
        {
          text: "Coord",
          value: "coord",
        },
        {
          text: "Flags",
          value: "flags",
          sortable: false,
        },
        {
          text: "Actions",
          value: "actions",
          sortable: false,
        },
      ],
    };
  },

  created() {
    this.initializeVariables();
    attachTranslateRefresh(this, () =>
      TRANSLATE_SETTINGS.isMapTranslateEnabled(),
    );
  },

  beforeDestroy() {
    detachTranslateRefresh(this);
  },

  computed: {
    tableItems() {
      const translateEnabled = TRANSLATE_SETTINGS.isMapTranslateEnabled();

      return this.locations.map((location, idx) => {
        const mapInfo = $dataMapInfos[location.mapId];

        return {
          name: location.name,
          mapName: mapInfo
            ? getTranslatedPanelText(mapInfo.name, translateEnabled)
            : "NULL",
          mapId: location.mapId,
          coord: {
            x: location.x,
            y: location.y,
          },
          flags: location.flags || [],
        };
      });
    },

    filteredTableItems() {
      return this.tableItems.filter((item) => {
        if (this.excludeNameless && !item.name) {
          return false;
        }

        return true;
      });
    },
  },

  methods: {
    initializeVariables() {
      this.loadLocations();
      this.currentMapName = this.getMapFullPath($gameMap.mapId());
    },

    getMapFullPath(id) {
      const translateEnabled = TRANSLATE_SETTINGS.isMapTranslateEnabled();
      return buildMapPathText($dataMapInfos, id, (name) =>
        getTranslatedPanelText(name, translateEnabled),
      );
    },

    saveLocations() {
      KEY_VALUE_STORAGE.setItem(
        "cheat.locations",
        JSON.stringify(this.locations),
      );
    },

    loadLocations() {
      const data = KEY_VALUE_STORAGE.getItem("cheat.locations");

      if (!data) {
        this.locations = [];
        return;
      }

      this.locations = JSON.parse(data);
    },

    onLocationAliasKeyDown(e) {
      if (e.code === "Enter") {
        this.onAddLocation();
      }
    },

    onAddLocation() {
      this.addLocation(this.locationAliasInput);
      this.locationAliasInput = "";
      this.selectedFlags = [];
      this.customFlagInput = "";
      this.$refs.locationAliasField.blur();
    },

    addLocation(locationAlias) {
      this.locations.push({
        name: locationAlias,
        mapId: $gameMap.mapId(),
        x: $gamePlayer.x,
        y: $gamePlayer.y,
        flags: [...this.selectedFlags],
      });
      this.saveLocations();
    },

    removeLocation(index) {
      this.locations.splice(index, 1);
      this.saveLocations();
    },

    teleportLocation(mapId, x, y) {
      $gamePlayer.reserveTransfer(mapId, x, y, $gamePlayer.direction(), 0);
      $gamePlayer.setPosition(x, y);
    },

    toggleFlag(flagValue) {
      const idx = this.selectedFlags.indexOf(flagValue);
      if (idx === -1) {
        this.selectedFlags.push(flagValue);
      } else {
        this.selectedFlags.splice(idx, 1);
      }
    },

    addCustomFlag() {
      const trimmed = this.customFlagInput.trim();
      if (!trimmed) return;
      if (!this.selectedFlags.includes(trimmed)) {
        this.selectedFlags.push(trimmed);
      }
      this.customFlagInput = "";
    },

    onCustomFlagKeyDown(e) {
      if (e.code === "Enter") {
        this.addCustomFlag();
      }
    },

    removeSelectedFlag(flag) {
      const idx = this.selectedFlags.indexOf(flag);
      if (idx !== -1) {
        this.selectedFlags.splice(idx, 1);
      }
    },

    getFlagColor(flag) {
      const preset = this.presetFlags.find((p) => p.value === flag);
      return preset ? preset.color : "teal darken-1";
    },

    getFlagIcon(flag) {
      const preset = this.presetFlags.find((p) => p.value === flag);
      return preset ? preset.icon : "🏷️";
    },

    tableItemFilter(value, search, item) {
      return matchesPanelSearch(search, [
        item.name,
        item.mapName,
        item.coord.x,
        item.coord.y,
        ...(item.flags || []),
      ]);
    },
  },
};
