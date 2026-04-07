import {
  TRANSLATE_SETTINGS,
  TRANSLATOR,
  TRANSLATION_BANK,
} from "../js/TranslateHelper.js";
import { Alert } from "../js/AlertHelper.js";

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

    this._translateListener = () => {
      if (TRANSLATE_SETTINGS.isMapTranslateEnabled()) {
        this.manualRefresh();
      }
    };
    window.addEventListener("cheat-translate-finish", this._translateListener);
  },

  beforeDestroy() {
    if (this._translateListener) {
      window.removeEventListener(
        "cheat-translate-finish",
        this._translateListener,
      );
    }
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
      const dataMapInfos = Array.isArray($dataMapInfos) ? $dataMapInfos : [];
      const mapNames = this.getMapNames(dataMapInfos);

      this.maps = dataMapInfos
        .filter((mapInfo) => !!mapInfo)
        .map((mapInfo) => {
          let fullPath = [];

          this.getMapAncestors(mapInfo.id, fullPath);
          fullPath = fullPath.map((id) => mapNames[id]);

          return {
            _mapInfo: mapInfo,
            id: mapInfo.id,
            fullPath: fullPath,
            fullPathJoin: fullPath.join(" / "),
            name: mapNames[mapInfo.id],
          };
        });
    },

    getMapNames(dataMapInfos) {
      const translateEnabled = TRANSLATE_SETTINGS.isMapTranslateEnabled();

      return dataMapInfos.map((m) => {
        const name = m ? m.name : "";
        if (translateEnabled && name && name.trim()) {
          const cached = TRANSLATION_BANK.get(name);
          if (cached) {
            return cached.translated;
          }
        }
        return name;
      });
    },

    getMapAncestors(id, path) {
      const mapInfo =
        Array.isArray($dataMapInfos) && id >= 0 ? $dataMapInfos[id] : null;

      if (!mapInfo) {
        path.reverse();
        return;
      }

      path.push(id);

      if (!mapInfo.parentId) {
        path.reverse();
        return;
      }

      if (path.includes(mapInfo.parentId)) {
        console.warn(
          `[TeleportPanel] Circular map parent chain detected for map ${id}`,
        );
        path.reverse();
        return;
      }

      this.getMapAncestors(mapInfo.parentId, path);
    },

    async manualRefresh() {
      console.log(
        "🔄 Manual refresh triggered - reloading maps and translations",
      );
      this.maps = [];
      await this.initializeVariables();
      console.log("✅ Map refresh completed");
    },

    teleportLocation(mapId, x, y) {
      $gamePlayer.reserveTransfer(mapId, x, y, $gamePlayer.direction(), 0);
      $gamePlayer.setPosition(x, y);
    },

    tableItemFilter(value, search, item) {
      if (search === null || search.trim() === "") {
        return true;
      }

      search = search.toLowerCase();

      return (
        item.name.toLowerCase().contains(search) ||
        item.fullPathJoin.toLowerCase().contains(search) ||
        String(item.id).toLowerCase().contains(search)
      );
    },
  },
};
