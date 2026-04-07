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
                        @click="teleportLocation(item.id, Number(inputX), Number(inputY))">
                        <v-icon small>mdi-map-marker</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
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

    tableItemFilter(value, search, item) {
      return matchesPanelSearch(search, [
        item.name,
        item.fullPathJoin,
        item.id,
      ]);
    },
  },
};
