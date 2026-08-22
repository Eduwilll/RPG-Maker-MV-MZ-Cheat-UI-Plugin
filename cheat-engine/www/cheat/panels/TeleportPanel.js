import { TRANSLATE_SETTINGS } from "../js/TranslateHelper.js";
import { Alert } from "../js/AlertHelper.js";
import {
  buildMapRows,
  matchesPanelSearch,
  refreshPanelState,
} from "../js/panels/PanelGameState.js";
import {
  attachTranslateRefresh,
  detachTranslateRefresh,
  getTranslatedPanelText,
} from "../js/panels/PanelTranslation.js";

export default {
  name: "TeleportPanel",

  template: `
<v-card flat class="ma-0 pa-0">
    <v-row>
        <v-col
            cols="12"
            md="6">
            <v-text-field
                v-model="inputX"
                label="X"
                dense
                background-color="grey darken-3"
                hide-details
                outlined
                @keydown.self.stop
                @focus="$event.target.select()">
            </v-text-field>
        </v-col>
        <v-col
            cols="12"
            md="6">
            <v-text-field
                v-model="inputY"
                label="Y"
                dense
                background-color="grey darken-3"
                hide-details
                outlined
                @keydown.self.stop
                @focus="$event.target.select()">
            </v-text-field>
        </v-col>
    </v-row>

    <v-data-table
        v-if="tableHeaders"
        class="mt-2"
        dense
        :headers="filteredTableHeaders"
        :items="maps"
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
            <v-checkbox
                v-model="excludeFullPath"
                label="Hide Full Path Field">
            </v-checkbox>
        </template>
        <template
            v-slot:item.fullPath="{ item }">
            {{item.fullPathJoin}}
        </template>
        <template
            v-slot:item.actions="{ item, index }">
            <div class="d-inline-flex">
                <v-tooltip
                    bottom>
                    <span>Teleport to X/Y</span>
                    <template v-slot:activator="{ on, attrs }">
                    
                        <v-btn
                            color="green"
                            x-small
                            fab
                            v-bind="attrs"
                            v-on="on"
                            @click="teleportLocation(item.id, Number(inputX), Number(inputY))">
                            <v-icon small>mdi-map-marker</v-icon>
                        </v-btn>
                    </template>
                </v-tooltip>
                <v-tooltip
                    bottom>
                    <span>Teleport to Map Center</span>
                    <template v-slot:activator="{ on, attrs }">
                        <v-btn
                            color="blue"
                            x-small
                            fab
                            class="ml-1"
                            v-bind="attrs"
                            v-on="on"
                            @click="teleportMapCenter(item.id)">
                            <v-icon small>mdi-crosshairs-gps</v-icon>
                        </v-btn>
                    </template>
                </v-tooltip>
            </div>
        </template>
    </v-data-table>

    <v-tooltip
        bottom>
        <span>Reload maps and translations</span>
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
                @click="manualRefresh">
                <v-icon>mdi-refresh</v-icon>
            </v-btn>
        </template>
    </v-tooltip>
</v-card>
    `,

  data() {
    return {
      inputX: "0",
      inputY: "0",

      search: "",
      excludeFullPath: false,

      maps: [],

      tableHeaders: [
        {
          text: "Id",
          value: "id",
        },
        {
          text: "Name",
          value: "name",
        },
        {
          text: "FullPath",
          value: "fullPath",
        },
        {
          text: "Actions",
          value: "actions",
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
    filteredTableHeaders() {
      if (this.excludeFullPath) {
        return this.tableHeaders.filter(
          (header) => header.value !== "fullPath",
        );
      }

      return this.tableHeaders;
    },
  },

  methods: {
    initializeVariables() {
      const translateEnabled = TRANSLATE_SETTINGS.isMapTranslateEnabled();
      this.maps = buildMapRows($dataMapInfos, (name) => {
        return getTranslatedPanelText(name, translateEnabled);
      });
    },

    async manualRefresh() {
      await refreshPanelState(this, () => {
        this.maps = [];
      });
    },

    teleportLocation(mapId, x, y) {
      $gamePlayer.reserveTransfer(mapId, x, y, $gamePlayer.direction(), 0);
      $gamePlayer.setPosition(x, y);
    },

    async teleportMapCenter(mapId) {
      try {
        const mapData = await this.loadMapData(mapId);
        const width = Number(mapData && mapData.width ? mapData.width : 0);
        const height = Number(mapData && mapData.height ? mapData.height : 0);
        const x = Math.max(0, Math.floor(width / 2));
        const y = Math.max(0, Math.floor(height / 2));

        this.teleportLocation(mapId, x, y);
        Alert.success(`Teleporting to map center (${x}, ${y})`);
      } catch (error) {
        console.warn("Could not teleport to map center:", error);
        Alert.error("Could not read map center");
      }
    },

    loadMapData(mapId) {
      if (
        typeof $gameMap !== "undefined" &&
        typeof $dataMap !== "undefined" &&
        $gameMap &&
        typeof $gameMap.mapId === "function" &&
        $gameMap.mapId() === mapId &&
        $dataMap
      ) {
        return Promise.resolve($dataMap);
      }

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", this.getMapDataUrl(mapId));
        xhr.overrideMimeType("application/json");
        xhr.onload = function () {
          if (xhr.status < 400) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (error) {
              reject(error);
            }
          } else {
            reject(new Error(`Map ${mapId} failed to load: ${xhr.status}`));
          }
        };
        xhr.onerror = function () {
          reject(new Error(`Map ${mapId} failed to load`));
        };
        xhr.send();
      });
    },

    getMapDataUrl(mapId) {
      const mapIdText = this.formatMapId(mapId);
      const isCheatWindow =
        window.location.pathname.indexOf("/cheat/") >= 0 ||
        window.location.pathname.indexOf("\\cheat\\") >= 0;
      const dataPrefix = isCheatWindow ? "../data/" : "data/";

      return `${dataPrefix}Map${mapIdText}.json`;
    },

    formatMapId(mapId) {
      const text = String(mapId);
      return ("000" + text).slice(-3);
    },

    tableItemFilter(value, search, item) {
      return matchesPanelSearch(search, [
        item.name,
        item.fullPathJoin,
        item.id,
      ]);
    },
  },
};
