import GeneralPanel from "./panels/GeneralPanel.js";
import ActorSettingPanel from "./panels/ActorSettingPanel.js";
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
import MinimapPanel from "./panels/MinimapPanel.js";
import ShortcutPanel from "./panels/ShortcutPanel.js";
import TranslateSettingsPanel from "./panels/TranslateSettingsPanel.js";
import AboutPanel from "./panels/AboutPanel.js";
import EventAnalyzerPanel from "./panels/EventAnalyzerPanel.js";
import AppearancePanel from "./panels/AppearancePanel.js";
import DatabaseEditorPanel from "./panels/DatabaseEditorPanel.js";
import MessageLogPanel from "./panels/MessageLogPanel.js";
import LocksPanel from "./panels/LocksPanel.js";
import GameOptionsPanel from "./panels/GameOptionsPanel.js";
import FeatureFinder from "./components/FeatureFinder.js";
import OverlayResize from "./components/OverlayResize.js";
import { boundedSize } from "./js/ui/LayoutGeometry.js";
import { applyGameFont } from "./js/ui/GameFont.js";
import { createFeatureCatalog } from "./js/ui/FeatureCatalog.js";
import { GLOBAL_SHORTCUT } from "./js/shortcuts/GlobalShortcut.js";
import { KEY_VALUE_STORAGE } from "./js/storage/KeyValueStorage.js";
import { getGameWindow } from "./js/runtime/FeatureRuntime.js";
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
    ActorSettingPanel,
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
    MinimapPanel,
    TeleportPanel,
    ShortcutPanel,
    TranslateSettingsPanel,
    AboutPanel,
    EventAnalyzerPanel,
    AppearancePanel,
    DatabaseEditorPanel,
    MessageLogPanel,
    LocksPanel,
    GameOptionsPanel,
    FeatureFinder,
    OverlayResize,
  },

  template: `
<v-card 
    :dark="$vuetify.theme.dark"
    :color="$vuetify.theme.dark ? '#212121' : '#FFFFFF'"
    class="z-index-cheat-0 elevation-12"
    :style="{ position: 'fixed', top: 0, left: 0, opacity: effectiveOpacity, transition: 'opacity 0.2s' }"
    :width="isWindow ? '100vw' : overlaySize.width"
    :height="isWindow ? '100vh' : overlaySize.height"
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
            class="fill-height d-inline pa-2 overflow-y-auto hide-scrollbar">
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
            class="fill-height d-inline pa-2 overflow-y-auto hide-scrollbar">
            <component ref="panel" :is="activePanelComponent" :key="currentComponentName" v-bind="activePanelProps"></component>
        </div>
    </v-row>
    <feature-finder v-model="finderOpen" :catalog="featureCatalog" @navigate="navigateFeature"></feature-finder>
    <overlay-resize v-if="!isWindow" :width="overlaySize.width" :height="overlaySize.height" @resize="resizeOverlay"/>
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
      overlayWidth: readNumberSetting("cheatModal.width", 750),
      overlayHeight: readNumberSetting("cheatModal.height", 450),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      finderOpen: false,
      featureCatalog: [],
      isSidebarVisible: readBooleanSetting(SIDEBAR_VISIBLE_SETTING, true),
      windowOpacity: readNumberSetting(WINDOW_OPACITY_SETTING, 0.3),
      isHovered: false,

      navTreeModel: undefined,

      navTreeItems: [
        {
          name: "Find a Feature",
          icon: "mdi-magnify",
          component: "feature-finder",
        },
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
          name: "Actors",
          icon: "mdi-account-group",
          component: "actor-setting-panel",
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
          name: "Enemies",
          icon: "mdi-skull-outline",
          component: "enemy-editor-panel",
        },
        {
          name: "Skills",
          icon: "mdi-auto-fix",
          component: "skill-editor-panel",
        },
        {
          name: "Classes",
          icon: "mdi-school",
          component: "class-editor-panel",
        },
        {
          name: "Locks & Favorites",
          icon: "mdi-lock-star",
          component: "locks-panel",
        },
        {
          name: "Message Log",
          icon: "mdi-message-text-outline",
          component: "message-log-panel",
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
          name: "Map / Minimap",
          icon: "mdi-map",
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
              name: "Game Options",
              icon: "mdi-tune",
              component: "game-options-panel",
            },
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

  watch: {
    currentComponentName(name) {
      const item = this.componentNameToNavItem[name];
      if (item) this.navTreeModel = [item];
    },
  },

  computed: {
    overlaySize() {
      return boundedSize(
        this.overlayWidth,
        this.overlayHeight,
        this.viewportWidth,
        this.viewportHeight,
      );
    },
    activePanelComponent() {
      return [
        "enemy-editor-panel",
        "skill-editor-panel",
        "class-editor-panel",
      ].includes(this.currentComponentName)
        ? "database-editor-panel"
        : this.currentComponentName;
    },
    activePanelProps() {
      const kinds = {
        "enemy-editor-panel": "enemy",
        "skill-editor-panel": "skill",
        "class-editor-panel": "class",
      };
      return kinds[this.currentComponentName]
        ? { kind: kinds[this.currentComponentName] }
        : {};
    },
    effectiveOpacity() {
      // The separate window is a dedicated cheat window: always fully opaque.
      if (this.isWindow) {
        return 1.0;
      }

      return this.isHovered ? 1.0 : this.windowOpacity;
    },

    contentWidth() {
      if (!this.isSidebarVisible) {
        return "100%";
      }

      return `calc(100% - ${this.navWidth}px - 1px)`;
    },

    componentNameToNavItem() {
      const ret = {};
      this.iterateLeaf(this.navTreeItems, (item) => {
        if (item.component !== "feature-finder") ret[item.component] = item;
      });
      ret["minimap-panel"] = ret["map-event-panel"];
      return ret;
    },
  },

  mounted() {
    this._layoutChanged = () => {
      this.overlayWidth = readNumberSetting("cheatModal.width", 750);
      this.overlayHeight = readNumberSetting("cheatModal.height", 450);
      applyGameFont(
        this.$el,
        getGameWindow(),
        readBooleanSetting("cheatModal.gameFont", false),
      );
    };
    this._viewportChanged = () => {
      this.viewportWidth = window.innerWidth;
      this.viewportHeight = window.innerHeight;
    };
    window.addEventListener("cheat-layout-change", this._layoutChanged);
    window.addEventListener("resize", this._viewportChanged);
    this._layoutChanged();
    this._openFinder = () => {
      this.featureCatalog = createFeatureCatalog(
        GLOBAL_SHORTCUT.shortcutSettings,
        GLOBAL_SHORTCUT.shortcutConfig,
      );
      this.finderOpen = true;
    };
    window.addEventListener("cheat-open-finder", this._openFinder);
    this._navigateActor = (event) => {
      const id = Number(event.detail);
      if (!Number.isInteger(id) || id < 1) return;
      this.navigateFeature({ panel: "actor-setting-panel" });
      this.$nextTick(() => {
        const panel = this.$refs.panel;
        if (panel && panel.selectActor) panel.selectActor(id);
      });
    };
    window.addEventListener("cheat-navigate-actor", this._navigateActor);
    this._profileChanged = () => {
      this.windowOpacity = readNumberSetting(WINDOW_OPACITY_SETTING, 0.3);
      this.isSidebarVisible = readBooleanSetting(SIDEBAR_VISIBLE_SETTING, true);
      this.$vuetify.theme.dark = readBooleanSetting(
        "cheatModal.themeDarkMode",
        true,
      );
      const color = KEY_VALUE_STORAGE.getItem("cheatModal.themePrimaryColor");
      if (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)) {
        this.$vuetify.theme.themes.dark.primary = color;
        this.$vuetify.theme.themes.light.primary = color;
      }
    };
    window.addEventListener("cheat-profile-change", this._profileChanged);
    const gameWindow = getGameWindow();
    if (gameWindow && gameWindow !== window)
      gameWindow.addEventListener("cheat-layout-change", this._layoutChanged);
    if (gameWindow && gameWindow !== window)
      gameWindow.addEventListener("cheat-profile-change", this._profileChanged);
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
    window.removeEventListener("cheat-layout-change", this._layoutChanged);
    window.removeEventListener("resize", this._viewportChanged);
    window.removeEventListener("cheat-navigate-actor", this._navigateActor);
    window.removeEventListener("cheat-open-finder", this._openFinder);
    window.removeEventListener("cheat-profile-change", this._profileChanged);
    const gameWindow = getGameWindow();
    if (gameWindow && gameWindow !== window)
      gameWindow.removeEventListener(
        "cheat-layout-change",
        this._layoutChanged,
      );
    if (gameWindow && gameWindow !== window)
      gameWindow.removeEventListener(
        "cheat-profile-change",
        this._profileChanged,
      );
    if (this._onAppearanceChange) {
      window.removeEventListener(
        "cheat-appearance-change",
        this._onAppearanceChange,
      );
    }
  },

  methods: {
    resizeOverlay(size) {
      const value = boundedSize(
        size.width,
        size.height,
        window.innerWidth,
        window.innerHeight,
      );
      this.overlayWidth = value.width;
      this.overlayHeight = value.height;
      if (size.commit) {
        KEY_VALUE_STORAGE.setItem("cheatModal.width", value.width);
        KEY_VALUE_STORAGE.setItem("cheatModal.height", value.height);
      }
    },
    onNavTreeUpdate(data) {
      if (data && data.length === 1) {
        if (data[0].component === "feature-finder") {
          this._openFinder();
          return;
        }
        this.$emit("change", data[0].component);
      }
    },

    navigateFeature(entry) {
      this.$emit("change", entry.panel);
      const nav = this.componentNameToNavItem[entry.panel];
      if (nav) this.navTreeModel = [nav];
      if (entry.anchor)
        this.$nextTick(() => {
          const panel = this.$refs.panel;
          if (panel && typeof panel.focusFeature === "function")
            panel.focusFeature(entry.anchor);
          this.$nextTick(() => {
            const nodes = this.$el.querySelectorAll("[data-feature]");
            const target = Array.prototype.find.call(
              nodes,
              (node) => node.getAttribute("data-feature") === entry.anchor,
            );
            if (target) {
              target.scrollIntoView({ block: "nearest" });
              target.classList.add("cheat-feature-highlight");
              setTimeout(
                () => target.classList.remove("cheat-feature-highlight"),
                1800,
              );
              const input = target.querySelector("input,button");
              if (input) input.focus();
            }
          });
        });
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
