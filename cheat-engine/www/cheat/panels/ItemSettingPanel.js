import ItemTableTab from "./ItemTableTab.js";
import { TRANSLATE_SETTINGS } from "../js/TranslateHelper.js";
import {
  attachTranslateRefresh,
  detachTranslateRefresh,
} from "../js/panels/PanelTranslation.js";
import {
  buildInventoryTableRow,
  readInventoryPanelItems,
} from "../js/panels/inventory/InventoryPanelState.js";

export default {
  name: "ItemSettingPanel",

  components: {
    ItemTableTab,
  },

  template: `
<v-card flat class="ma-0 pa-0">
    <item-table-tab
        :items="items"
        :headers="headers"
        :as-table-data="convertToTableData"
        :searchable-attrs="['name', 'desc']">
        
    </item-table-tab>
</v-card>
    `,

  data() {
    return {
      items: [],

      headers: [
        {
          text: "Name",
          value: "name",
        },
        {
          text: "Description",
          value: "desc",
        },
      ],
    };
  },

  created() {
    this.initializeVariables();
    attachTranslateRefresh(this, () =>
      TRANSLATE_SETTINGS.isItemTranslateEnabled(),
    );
  },

  beforeDestroy() {
    detachTranslateRefresh(this);
  },

  methods: {
    initializeVariables() {
      this.items = readInventoryPanelItems($dataItems);
    },

    convertToTableData(item) {
      return buildInventoryTableRow(
        item,
        !!TRANSLATE_SETTINGS.getTargets().items,
      );
    },
  },
};
