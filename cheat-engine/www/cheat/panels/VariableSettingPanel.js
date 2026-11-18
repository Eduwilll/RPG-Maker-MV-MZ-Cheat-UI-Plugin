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
import {
  addWatcherTarget,
  coerceVariableValue,
} from "../js/panels/watcher/WatcherPanelState.js";
import LockFavoriteControls from "../components/LockFavoriteControls.js";
import { sortWithFavorites } from "../js/panels/locks/LockPanelState.js";
import { deepFreeze } from "../js/ui/StaticData.js";

const VALUE_FILTER_OPTIONS = deepFreeze([
  { text: "All Values", value: "all" },
  { text: "Positive", value: "positive" },
  { text: "Negative", value: "negative" },
  { text: "Zero / Empty", value: "empty" },
  { text: "Non-zero", value: "nonZero" },
  { text: "Text / Other", value: "other" },
]);

const TABLE_HEADERS = deepFreeze([
  { text: "", value: "controls", sortable: false, width: 76 },
  {
    text: "Name",
    value: "displayName",
  },
  {
    text: "Value",
    value: "value",
  },
  {
    text: "",
    value: "watch",
    sortable: false,
    width: 36,
  },
]);

export default {
  name: "VariableSettingPanel",
  components: { LockFavoriteControls },

  template: `
<v-card flat class="ma-0 pa-0">
    <v-data-table
        v-if="tableHeaders"
        dense
        :headers="tableHeaders"
        :items="filteredTableItems"
        :search="search"
        :custom-filter="tableItemFilter"
        :custom-sort="sortRows"
        :items-per-page="10">
        <template v-slot:top>
            <div class="cheat-table-top">
                <v-text-field
                    label="Search..."
                    solo
                    v-model="search"
                    dense
                    hide-details
                    @keydown.self.stop
                    @focus="$event.target.select()">
                </v-text-field>
                <v-tooltip bottom>
                    <span>Reload variables and translations</span>
                    <template v-slot:activator="{ on, attrs }">
                        <v-btn
                            small
                            text
                            class="cheat-table-top__action"
                            aria-label="Reload variables and translations"
                            v-bind="attrs"
                            v-on="on"
                            @click="manualRefresh">
                            <v-icon small left>mdi-refresh</v-icon>
                            Reload
                        </v-btn>
                    </template>
                </v-tooltip>
            </div>
              <div class="d-flex px-3 pt-3 pb-3">
                  <v-checkbox
                      v-model="excludeNameless"
                      dense
                      hide-details
                      label="Hide Nameless Variables">
                  </v-checkbox>
                  <v-spacer></v-spacer>
                  <v-select
                      v-model="valueFilter"
                      :items="valueFilterOptions"
                      dense
                      hide-details
                      solo
                      class="cheat-field-filter"
                      label="Value Filter">
                  </v-select>
                </div>
        </template>
        <template
            v-slot:item.value="{ item }">
            <v-text-field
                class="d-inline-flex cheat-field-w60"
                height="10"
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
        <template
            v-slot:item.controls="{ item }">
            <lock-favorite-controls :target="{kind:'variable',id:item.id}" :value="item.value" @change="initializeVariables"/>
        </template>
        <template
            v-slot:item.watch="{ item }">
            <v-btn
                x-small
                icon
                title="Add variable to Watch"
                @click="addToWatchList(item)">
                <v-icon small>mdi-eye-plus</v-icon>
            </v-btn>
        </template>
    </v-data-table>
</v-card>
    `,

  data() {
    return {
      search: "",
      excludeNameless: false,
      valueFilter: "all",
      valueFilterOptions: VALUE_FILTER_OPTIONS,

      // Store original data separately from display data
      originalVariableNames: [],
      isInitialized: false,

      tableHeaders: TABLE_HEADERS,
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
        if (this.excludeNameless && !item.hasName) {
          return false;
        }

        return this.matchesValueFilter(item.value);
      });
    },
  },

  methods: {
    sortRows(items, sortBy, sortDesc) {
      return sortWithFavorites(items, sortBy, sortDesc, (row) => ({
        kind: "variable",
        id: row.id,
      }));
    },
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
            const hasName = !!(varName && varName.trim());
            let displayName = hasName ? varName : `Variable ${idx}`;
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
              originalName: varName || "",
              displayName: displayName,
              hasName,
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
      const value = coerceVariableValue(item.value);
      $gameVariables.setValue(item.id, value);

      item.value = $gameVariables.value(item.id);
    },

    addToWatchList(item) {
      addWatcherTarget("variable", item.id);
    },

    matchesValueFilter(value) {
      const numberValue =
        typeof value === "number"
          ? value
          : typeof value === "string" && value.trim() !== ""
            ? Number(value)
            : NaN;
      const isNumeric = Number.isFinite(numberValue);
      const isEmpty =
        value === null ||
        value === undefined ||
        value === "" ||
        (isNumeric && numberValue === 0) ||
        value === false;

      switch (this.valueFilter) {
        case "positive":
          return isNumeric && numberValue > 0;
        case "negative":
          return isNumeric && numberValue < 0;
        case "empty":
          return isEmpty;
        case "nonZero":
          return !isEmpty;
        case "other":
          return !isNumeric && !isEmpty;
        default:
          return true;
      }
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
