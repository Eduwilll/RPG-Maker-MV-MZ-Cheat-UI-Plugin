import {
  coercePanelNumber,
  matchesPanelSearch,
} from "../js/panels/PanelGameState.js";
import { readItemTableTabState } from "../js/panels/inventory/ItemTableTabState.js";

export default {
  name: "ItemTableTab",

  template: `
<v-card flat class="ma-0 pa-0">
 <v-data-table
        v-if="tableHeaders"
        dense
        :headers="visibleTableHeaders"
        :items="filteredTableItems"
        :search="search"
        :custom-filter="tableItemFilter"
        :custom-sort="sortTableItems"
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
                    md="6">
                    <v-checkbox
                        v-model="excludeNameless"
                        dense
                        hide-details
                        label="Hide Nameless Items"
                        @change="onTableFilterChange">
                    
                    </v-checkbox>
                </v-col>
                <v-col
                    cols="12"
                    md="6">
                    <v-checkbox
                        v-model="onlyOwnedItems"
                        dense
                        hide-details
                        label="Only Owned Items"
                        @change="onTableFilterChange">
                    
                    </v-checkbox>
                </v-col>
                <v-col
                    v-if="hasPriceColumn"
                    cols="12"
                    md="6">
                    <v-checkbox
                        v-model="showPriceColumn"
                        dense
                        hide-details
                        label="Show Price">
                    
                    </v-checkbox>
                </v-col>
                <v-col
                    v-if="hasDetailColumn"
                    cols="12"
                    md="6">
                    <v-checkbox
                        v-model="showDetailColumn"
                        dense
                        hide-details
                        :label="detailColumnToggleLabel">
                    
                    </v-checkbox>
                </v-col>
            </v-row>
        </template>
        <template
            v-slot:item.name="{ item }">
            <v-tooltip
                bottom
                max-width="420">
                <template v-slot:activator="{ on, attrs }">
                    <div
                        style="display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; max-width: 120px; line-height: 1.2; max-height: 2.4em; word-break: break-word;"
                        v-bind="attrs"
                        v-on="on">
                        {{ item.name }}
                    </div>
                </template>
                <span>{{ item.name }}</span>
            </v-tooltip>
        </template>
        <template
            v-slot:item.desc="{ item }">
            <v-tooltip
                bottom
                max-width="420">
                <template v-slot:activator="{ on, attrs }">
                    <div
                        style="display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; max-width: 240px; line-height: 1.2; max-height: 2.4em; word-break: break-word;"
                        v-bind="attrs"
                        v-on="on">
                        {{ item.desc }}
                    </div>
                </template>
                <span>{{ item.desc }}</span>
            </v-tooltip>
        </template>
        <template
            v-slot:item.effects="{ item }">
            <v-tooltip
                bottom
                max-width="420">
                <template v-slot:activator="{ on, attrs }">
                    <div
                        style="display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; max-width: 180px; line-height: 1.2; max-height: 2.4em; word-break: break-word;"
                        v-bind="attrs"
                        v-on="on">
                        {{ item.effects }}
                    </div>
                </template>
                <span>{{ item.effects }}</span>
            </v-tooltip>
        </template>
        <template
            v-slot:item.params="{ item }">
            <v-tooltip
                bottom
                max-width="420">
                <template v-slot:activator="{ on, attrs }">
                    <div
                        style="display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; max-width: 180px; line-height: 1.2; max-height: 2.4em; word-break: break-word;"
                        v-bind="attrs"
                        v-on="on">
                        {{ item.params }}
                    </div>
                </template>
                <span>{{ item.params }}</span>
            </v-tooltip>
        </template>
        <template
            v-slot:item.amount="{ item }">
            <v-text-field
                background-color="grey darken-3"
                class="d-inline-flex"
                height="10"
                style="width: 60px;"
                hide-details
                solo
                :value="item.amount"
                label="Amount"
                dense
                @keydown.self.stop
                @click.native.stop
                @change="onItemChange(item, $event)"
                @focus="$event.target.select()">
            </v-text-field>
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
      search: "",
      excludeNameless: false,
      onlyOwnedItems: false,
      showPriceColumn: false,
      showDetailColumn: false,
      tableHeaders: [],
      tableItems: [],
    };
  },

  props: {
    items: [],
    headers: {
      type: Array,
    },
    asTableData: {
      type: Function,
    },
    searchableAttrs: {
      type: Array,
      default: [],
    },
  },

  created() {},

  watch: {
    items: {
      immediate: true,
      handler() {
        this.initializeVariables();
      },
    },
  },

  computed: {
    filteredTableItems() {
      return this.tableItems.filter((item) => {
        if (this.excludeNameless && !item.name) {
          return false;
        }

        if (this.onlyOwnedItems && item.amount === 0) {
          return false;
        }

        return true;
      });
    },

    hasPriceColumn() {
      return this.tableHeaders.some((header) => header.value === "price");
    },

    hasEffectsColumn() {
      return this.tableHeaders.some((header) => header.value === "effects");
    },

    hasParamsColumn() {
      return this.tableHeaders.some((header) => header.value === "params");
    },

    hasDetailColumn() {
      return this.hasEffectsColumn || this.hasParamsColumn;
    },

    detailColumnToggleLabel() {
      if (this.hasEffectsColumn) {
        return "Show Effects";
      }

      if (this.hasParamsColumn) {
        return "Show Params";
      }

      return "Show Details";
    },

    visibleTableHeaders() {
      return this.tableHeaders.filter((header) => {
        if (header.value === "price") {
          return this.showPriceColumn;
        }

        if (header.value === "effects" || header.value === "params") {
          return this.showDetailColumn;
        }

        return true;
      });
    },
  },

  methods: {
    initializeVariables() {
      const state = readItemTableTabState(
        this.headers,
        this.items,
        this.asTableData,
      );
      this.tableHeaders = state.tableHeaders;
      this.tableItems = state.tableItems;
    },

    onItemChange(item, newValue) {
      // modify amount
      if (newValue !== undefined) {
        item.amount = coercePanelNumber(newValue, {
          fallback: item.amount,
          integer: true,
          min: 0,
        });
      }

      const diff = item.amount - $gameParty.numItems(item._item);
      $gameParty.gainItem(item._item, diff);

      // refresh
      item.amount = $gameParty.numItems(item._item);
    },

    onTableFilterChange() {},

    tableItemFilter(value, search, item) {
      return matchesPanelSearch(
        search,
        this.searchableAttrs.map((attr) => item[attr]),
      );
    },

    sortTableItems(items, sortBy, sortDesc) {
      if (!Array.isArray(sortBy) || !sortBy.length) {
        return items;
      }

      return items.slice().sort((leftItem, rightItem) => {
        for (let index = 0; index < sortBy.length; index += 1) {
          const sortKey = sortBy[index];
          const isDescending = !!sortDesc[index];
          const leftValue = this.getSortableTableValue(leftItem, sortKey);
          const rightValue = this.getSortableTableValue(rightItem, sortKey);
          const compareResult = this.compareTableValues(leftValue, rightValue);

          if (compareResult !== 0) {
            return isDescending ? -compareResult : compareResult;
          }
        }

        return 0;
      });
    },

    getSortableTableValue(item, sortKey) {
      switch (sortKey) {
        case "params":
          return item.paramsSort;
        case "effects":
          return item.effectsSort;
        default:
          return item[sortKey];
      }
    },

    compareTableValues(leftValue, rightValue) {
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return leftValue - rightValue;
      }

      const leftText = String(leftValue || "");
      const rightText = String(rightValue || "");
      return leftText.localeCompare(rightText, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    },
  },
};
