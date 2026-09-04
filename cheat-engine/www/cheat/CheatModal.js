import GeneralPanel from "./panels/GeneralPanel.js";
import HealthSettingPanel from "./panels/HealthSettingPanel.js";
import StatsSettingPanel from "./panels/StatsSettingPanel.js";
import ItemSettingPanel from "./panels/ItemSettingPanel.js";
import WeaponSettingPanel from "./panels/WeaponSettingPanel.js";
import ArmorSettingPanel from "./panels/ArmorSettingPanel.js";
import VariableSettingPanel from "./panels/VariableSettingPanel.js";
import SwitchSettingPanel from "./panels/SwitchSettingPanel.js";
import WatcherPanel from "./panels/WatcherPanel.js";
import SaveRecallPanel from "./panels/SaveRecallPanel.js";
import TeleportPanel from "./panels/TeleportPanel.js";
import MapEventPanel from "./panels/MapEventPanel.js";
import ShortcutPanel from "./panels/ShortcutPanel.js";
import TranslateSettingsPanel from "./panels/TranslateSettingsPanel.js";
import AboutPanel from "./panels/AboutPanel.js";
import EventAnalyzerPanel from "./panels/EventAnalyzerPanel.js";
import AppearancePanel from "./panels/AppearancePanel.js";
import {
  readBooleanSetting,
  writeBooleanSetting,
  readNumberSetting,
} from "./js/ui/CheatUiSettings.js";

const SIDEBAR_VISIBLE_SETTING = "cheatModal.sidebarVisible";
const WINDOW_OPACITY_SETTING = "cheatModal.windowOpacity";

export default {
  name: "CheatModal",

  components: {
    GeneralPanel,
    HealthSettingPanel,
    StatsSettingPanel,
    ItemSettingPanel,
    WeaponSettingPanel,
    ArmorSettingPanel,
    VariableSettingPanel,
    SwitchSettingPanel,
    WatcherPanel,
    SaveRecallPanel,
    MapEventPanel,
    TeleportPanel,
    ShortcutPanel,
    TranslateSettingsPanel,
    AboutPanel,
    EventAnalyzerPanel,
    AppearancePanel,
  },

  template: `
<v-card 
    :dark="$vuetify.theme.dark"
    :color="$vuetify.theme.dark ? '#212121' : '#FFFFFF'"
    class="z-index-cheat-0 elevation-12"
    :style="{ position: 'fixed', top: 0, left: 0, opacity: isHovered ? 1.0 : windowOpacity, transition: 'opacity 0.2s' }"
    :width="isWindow ? '100vw' : '750'" 
    :height="isWindow ? '100vh' : '450'"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
>
    <v-btn
        style="top: 4px; left: 4px; z-index: 3;"
        color="grey darken-2"
        dark
        x-small
        absolute
        fab
        :title="isSidebarVisible ? 'Hide sidebar' : 'Show sidebar'"
        @click="toggleSidebar">
        <v-icon small>{{ isSidebarVisible ? 'mdi-menu-open' : 'mdi-menu' }}</v-icon>
    </v-btn>
    <v-row 
        class="fill-height ma-0 pa-0">
        <div
            v-if="isSidebarVisible"
            :style="'width: ' + navWidth + 'px;'"
            class="fill-height d-inline pa-2 overflow-y-auto">
            <v-treeview
                :active.sync="navTreeModel"
                transition
                return-object
                open-all
                dense
                :items="navTreeItems"
                activatable
                item-key="name"
                open-on-click
                @update:active="onNavTreeUpdate">
                <template v-slot:label="{item}">
                    <v-icon v-text="item.icon" small class="mx-0 px-0 align-self-center"></v-icon>
                    <span class="subtitle-2">{{item.name}}</span>
                </template>
            </v-treeview>
        </div>
        <v-divider v-if="isSidebarVisible" vertical></v-divider>
        <div
            :style="'width: ' + contentWidth + ';'"
            class="fill-height d-inline pa-2 overflow-y-auto">
            <component :is="currentComponentName"></component>
        </div>
    </v-row>
</v-card>
    `,

  model: {
    prop: "currentComponentName",
    event: "change",
  },

  props: {
    currentComponentName: {
      type: String,
    },
    isWindow: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      navWidth: 200,
      isSidebarVisible: readBooleanSetting(SIDEBAR_VISIBLE_SETTING, true),
      windowOpacity: readNumberSetting(WINDOW_OPACITY_SETTING, 1.0),
      isHovered: false,

      navTreeModel: undefined,

      navTreeItems: [
        {
          name: "General",
          icon: "mdi-hammer-screwdriver",
          component: "general-panel",
        },
        {
          name: "Shortcuts",
          icon: "mdi-keyboard-outline",
          component: "shortcut-panel",
        },
        {
          name: "HP/MP/Battle",
          icon: "mdi-battery-70",
          component: "health-setting-panel",
        },
        {
          name: "Stats/Level",
          icon: "mdi-sword-cross",
          component: "stats-setting-panel",
        },
        {
          name: "Items",
          icon: "mdi-bag-personal-outline",
          children: [
            {
              name: "Item",
              icon: "mdi-flask-empty-plus",
              component: "item-setting-panel",
            },
            {
              name: "Weapon",
              icon: "mdi-sword",
              component: "weapon-setting-panel",
            },
            {
              name: "Armor",
              icon: "mdi-shield-plus",
              component: "armor-setting-panel",
            },
          ],
        },
        {
          name: "Variables",
          icon: "mdi-variable",
          component: "variable-setting-panel",
        },
        {
          name: "Switches",
          icon: "mdi-toggle-switch",
          component: "switch-setting-panel",
        },
        {
          name: "Watch",
          icon: "mdi-eye-outline",
          component: "watcher-panel",
        },
        {
          name: "Save Locations",
          icon: "mdi-map-marker-plus",
          component: "save-recall-panel",
        },
        {
          name: "Map Events",
          icon: "mdi-map-marker-plus",
          component: "map-event-panel",
        },
        {
          name: "Event Analyzer",
          icon: "mdi-transit-connection-variant",
          component: "event-analyzer-panel",
        },
        {
          name: "Teleport",
          icon: "mdi-run-fast",
          component: "teleport-panel",
        },
        {
          name: "Settings",
          icon: "mdi-cog",
          children: [
            {
              name: "Appearance",
              icon: "mdi-palette",
              component: "appearance-panel",
            },
            {
              name: "Translate",
              icon: "mdi-google-translate",
              component: "translate-settings-panel",
            },
            {
              name: "About",
              icon: "mdi-information-outline",
              component: "about-panel",
            },
          ],
        },
      ],
    };
  },

  computed: {
    contentWidth() {
      if (!this.isSidebarVisible) {
        return "100%";
      }

      return `calc(100% - ${this.navWidth}px - 1px)`;
    },

    componentNameToNavItem() {
      const ret = {};
      this.iterateLeaf(this.navTreeItems, (item) => {
        ret[item.component] = item;
      });
      return ret;
    },
  },

  mounted() {
    let navItem = this.componentNameToNavItem[this.currentComponentName];

    if (!navItem) {
      navItem = Object.values(this.componentNameToNavItem)[0];
      this.$emit("change", navItem.component);
    }
    this.navTreeModel = [navItem];

    this._onAppearanceChange = (e) => {
      this.windowOpacity = e.detail.windowOpacity;
    };
    window.addEventListener(
      "cheat-appearance-change",
      this._onAppearanceChange,
    );
  },

  beforeDestroy() {
    if (this._onAppearanceChange) {
      window.removeEventListener(
        "cheat-appearance-change",
        this._onAppearanceChange,
      );
    }
  },

  methods: {
    onNavTreeUpdate(data) {
      if (data && data.length === 1) {
        this.$emit("change", data[0].component);
      }
    },

    toggleSidebar() {
      this.isSidebarVisible = !this.isSidebarVisible;
      writeBooleanSetting(SIDEBAR_VISIBLE_SETTING, this.isSidebarVisible);
    },

    iterateLeaf(node, leafFunc) {
      if (Array.isArray(node)) {
        for (const item of node) {
          this.iterateLeaf(item, leafFunc);
        }
      } else if (Object.hasOwnProperty.call(node, "children")) {
        this.iterateLeaf(node.children, leafFunc);
      } else {
        leafFunc(node);
      }
    },
  },
};
