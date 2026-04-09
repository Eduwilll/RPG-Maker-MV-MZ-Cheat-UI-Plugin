import {
  TRANSLATE_SETTINGS,
  TRANSLATE_PROGRESS,
} from "../js/TranslateHelper.js";
import {
  matchesPanelSearch,
  refreshPanelState,
} from "../js/panels/PanelGameState.js";
import {
  attachTranslateRefresh,
  detachTranslateRefresh,
  getTranslatedPanelText,
} from "../js/panels/PanelTranslation.js";

export default {
  name: "VariableSettingPanel",

  template: `
<v-card flat class="ma-0 pa-0">
    <v-data-table
        v-if="tableHeaders"
        dense
        :headers="tableHeaders"
        :items="filteredTableItems"
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
            <v-row
                class="ma-0 pa-0">
                <v-col
                    cols="12"
                    md="12">
                    <v-checkbox
                        v-model="excludeNameless"
                        dense
                        hide-details
                        label="Hide Nameless Items">
                    </v-checkbox>
                </v-col>
            </v-row>
        </template>
        <template
            v-slot:item.value="{ item }">
            <v-text-field
                background-color="grey darken-3"
                class="d-inline-flex"
                height="10"
                style="width: 60px;"
                hide-details
                solo
                v-model="item.value"
                label="Value"
                dense
                @keydown.self.stop
                @change="onItemChange(item)"
                @focus="$event.target.select()">
            </v-text-field>
        </template>
    </v-data-table>
    
    <v-tooltip
        bottom>
        <span>Reload variables and translations</span>
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
      search: "",
      excludeNameless: false,

      // Store original data separately from display data
      originalVariableNames: [],
      isInitialized: false,

      tableHeaders: [
        {
          text: "Name",
          value: "displayName",
        },
        {
          text: "Value",
          value: "value",
        },
      ],
      tableItems: [],
    };
  },

  created() {
    this.initializeVariables();
    attachTranslateRefresh(this, () =>
      TRANSLATE_SETTINGS.isVariableTranslateEnabled(),
    );
  },

  beforeDestroy() {
    detachTranslateRefresh(this);
  },

  computed: {
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
    async initializeVariables() {
      try {
        console.log("Initializing variables...");

        if (
          typeof $dataSystem === "undefined" ||
          !$dataSystem ||
          !$gameVariables
        ) {
          console.warn(
            "Game data not ready yet, skipping variable initialization",
          );
          return;
        }

        this.originalVariableNames = $dataSystem.variables.slice();

        if (
          !this.originalVariableNames ||
          this.originalVariableNames.length === 0
        ) {
          console.warn("No variables found in game data");
          this.tableItems = [];
          return;
        }

        const translateEnabled =
          TRANSLATE_SETTINGS.isVariableTranslateEnabled();

        this.tableItems = this.originalVariableNames
          .map((varName, idx) => {
            let displayName = varName || `Variable ${idx}`;
            let val = 0;
            try {
              val = $gameVariables.value(idx);
            } catch (e) {
              console.warn(`Could not read variable ${idx}:`, e.message);
            }

            if (translateEnabled && varName && varName.trim()) {
              displayName = getTranslatedPanelText(varName, translateEnabled);
            }

            return {
              id: idx,
              originalName: varName || `Variable ${idx}`,
              displayName: displayName,
              value: val,
            };
          })
          .filter((item) => item.id > 0); // Skip index 0 which is usually null

        console.log(`Loaded ${this.tableItems.length} variables.`);
        this.isInitialized = true;
      } catch (error) {
        console.error("Error initializing variables:", error);
        this.tableItems = [];
      }
    },

    onItemChange(item) {
      // modify value
      $gameVariables.setValue(item.id, item.value);

      // refresh
      item.value = $gameVariables.value(item.id);
    },

    async manualRefresh() {
      await refreshPanelState(this, () => {
        this.isInitialized = false;
        this.tableItems = [];
      });
    },

    tableItemFilter(value, search, item) {
      if (search === null || search.trim() === "") {
        return true;
      }

      search = search.toLowerCase();

      return matchesPanelSearch(search, [
        item.displayName,
        item.originalName,
        item.value,
      ]);
    },
  },
};
