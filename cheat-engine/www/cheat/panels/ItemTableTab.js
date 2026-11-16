import {
  coercePanelNumber,
  matchesPanelSearch,
} from "../js/panels/PanelGameState.js";
import {
  readItemTableTabState,
  resolveInventoryTableItem,
} from "../js/panels/inventory/ItemTableTabState.js";
import {
  readBooleanSetting,
  writeBooleanSetting,
} from "../js/ui/CheatUiSettings.js";

const HIDE_NAMELESS_ITEMS_SETTING = "itemTable.hideNamelessItems";
import LockFavoriteControls from "../components/LockFavoriteControls.js";
import DatabaseTooltip from "../components/DatabaseTooltip.js";
import { favoriteSort } from "../js/panels/locks/LockPanelState.js";

export default {
  name: "ItemTableTab",
  components: { LockFavoriteControls, DatabaseTooltip },

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
                    <span>Reload from game data</span>
                    <template v-slot:activator="{ on, attrs }">
                        <v-btn
                            small
                            text
                            class="cheat-table-top__action"
                            aria-label="Reload from game data"
                            v-bind="attrs"
                            v-on="on"
                            @click="initializeVariables">
                            <v-icon small left>mdi-refresh</v-icon>
                            Reload
                        </v-btn>
                    </template>
                </v-tooltip>
            </div>
            <div class="cheat-filter-bar" role="group" aria-label="Table display options">
                <v-checkbox
                    v-model="excludeNameless"
                    dense
                    hide-details
                    label="Hide Nameless Items"
                    @change="onTableFilterChange">
                </v-checkbox>
                <v-checkbox
                    v-model="onlyOwnedItems"
                    dense
                    hide-details
                    label="Only Owned Items"
                    @change="onTableFilterChange">
                </v-checkbox>
                <v-checkbox
                    v-if="hasPriceColumn"
                    v-model="showPriceColumn"
                    dense
                    hide-details
                    label="Show Price">
                </v-checkbox>
                <v-checkbox
                    v-if="hasDetailColumn"
                    v-model="showDetailColumn"
                    dense
                    hide-details
                    :label="detailColumnToggleLabel">
                </v-checkbox>
            </div>
        </template>
        <template
            v-slot:item.name="{ item }">
            <div class="cheat-cell-clamp cheat-cell-clamp--sm">
                <database-tooltip :kind="item._itemKind" :record-id="item._itemId" :label="item.name"/>
            </div>
        </template>
        <template
            v-slot:item.desc="{ item }">
            <v-tooltip
                bottom
                max-width="420">
                <template v-slot:activator="{ on, attrs }">
                    <div
                        class="cheat-cell-clamp cheat-cell-clamp--lg"
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
                        class="cheat-cell-clamp cheat-cell-clamp--md"
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
                        class="cheat-cell-clamp cheat-cell-clamp--md"
                        v-bind="attrs"
                        v-on="on">
                        {{ item.params }}
                    </div>
                </template>
                <span>{{ item.params }}</span>
            </v-tooltip>
        </template>
        <template
            v-slot:item.controls="{ item }">
            <lock-favorite-controls :target="{kind:item._itemKind,id:item._itemId}" :value="item.amount" @change="initializeVariables"/>
        </template>
        <template
            v-slot:item.amount="{ item }">
            <v-text-field
                class="d-inline-flex cheat-field-w60"
                height="10"
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
</v-card>
    `,

  data() {
    return {
      search: "",
      excludeNameless: readBooleanSetting(HIDE_NAMELESS_ITEMS_SETTING, true),
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
      const gameItem = resolveInventoryTableItem(item);
      if (!gameItem) {
        return;
      }

      if (newValue !== undefined) {
        item.amount = coercePanelNumber(newValue, {
          fallback: item.amount,
          integer: true,
          min: 0,
        });
      }

      const diff = item.amount - $gameParty.numItems(gameItem);
      if (diff !== 0) {
        $gameParty.gainItem(gameItem, diff);
      }

      item.amount = $gameParty.numItems(gameItem);
    },

    onTableFilterChange() {
      writeBooleanSetting(HIDE_NAMELESS_ITEMS_SETTING, this.excludeNameless);
    },

    tableItemFilter(value, search, item) {
      return matchesPanelSearch(
        search,
        this.searchableAttrs.map((attr) => item[attr]),
      );
    },

    sortTableItems(items, sortBy, sortDesc) {
      if (!Array.isArray(sortBy) || !sortBy.length) {
        return favoriteSort(items, (row) => ({
          kind: row._itemKind,
          id: row._itemId,
        }));
      }

      const sorted = items.slice().sort((leftItem, rightItem) => {
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
      return favoriteSort(sorted, (row) => ({
        kind: row._itemKind,
        id: row._itemId,
      }));
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
