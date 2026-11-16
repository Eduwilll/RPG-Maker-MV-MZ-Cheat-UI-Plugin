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
  DEFAULT_PRIMARY_COLOR,
  accentFocusColor,
  applyThemeStyle,
  readThemeStyle,
} from "./js/ui/CheatTheme.js";
import {
  readBooleanSetting,
  writeBooleanSetting,
  readNumberSetting,
} from "./js/ui/CheatUiSettings.js";

const SIDEBAR_VISIBLE_SETTING = "cheatModal.sidebarVisible";
const WINDOW_OPACITY_SETTING = "cheatModal.windowOpacity";
const THEME_PRIMARY_COLOR = "cheatModal.themePrimaryColor";

const NAV_GROUPS = [
  {
    label: "Play",
    items: [
      {
        name: "General",
        icon: "mdi-hammer-screwdriver",
        component: "general-panel",
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
        name: "Actors",
        icon: "mdi-account-group",
        component: "actor-setting-panel",
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
    ],
  },
  {
    label: "World",
    items: [
      {
        name: "Map / Minimap",
        icon: "mdi-map",
        component: "map-event-panel",
      },
      {
        name: "Teleport",
        icon: "mdi-run-fast",
        component: "teleport-panel",
      },
      {
        name: "Save Locations",
        icon: "mdi-map-marker-plus",
        component: "save-recall-panel",
      },
      {
        name: "Message Log",
        icon: "mdi-message-text-outline",
        component: "message-log-panel",
      },
      {
        name: "Event Analyzer",
        icon: "mdi-transit-connection-variant",
        component: "event-analyzer-panel",
      },
      {
        name: "Watch",
        icon: "mdi-eye-outline",
        component: "watcher-panel",
      },
    ],
  },
  {
    label: "Tools",
    items: [
      {
        name: "Shortcuts",
        icon: "mdi-keyboard-outline",
        component: "shortcut-panel",
      },
      {
        name: "Locks & Favorites",
        icon: "mdi-lock-star",
        component: "locks-panel",
      },
    ],
  },
  {
    label: "System",
    items: [
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
  },
];

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
    class="cheat-shell z-index-cheat-0"
    :class="{ 'cheat-shell--window': isWindow }"
    :style="{ position: 'fixed', top: 0, left: 0, opacity: effectiveOpacity, transition: 'opacity 0.2s' }"
    :width="isWindow ? '100vw' : overlaySize.width"
    :height="isWindow ? '100vh' : overlaySize.height"
    role="dialog"
    aria-label="Cheat engine"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
>
    <header class="cheat-shell__bar">
        <button
            type="button"
            class="cheat-icon-button"
            :title="isSidebarVisible ? 'Hide sidebar' : 'Show sidebar'"
            :aria-label="isSidebarVisible ? 'Hide sidebar' : 'Show sidebar'"
            :aria-expanded="isSidebarVisible ? 'true' : 'false'"
            @click="toggleSidebar">
            <v-icon small>{{ isSidebarVisible ? 'mdi-menu-open' : 'mdi-menu' }}</v-icon>
        </button>
        <div class="cheat-shell__titles">
            <div class="cheat-shell__title">{{ activePanelLabel }}</div>
            <div class="cheat-shell__subtitle">{{ activePanelGroupLabel || 'Cheat engine' }}</div>
        </div>
        <span class="cheat-shell__spacer"></span>
        <button
            type="button"
            class="cheat-bar__action"
            title="Find a feature"
            aria-label="Find a feature"
            @click="openFinder">
            <v-icon small>mdi-magnify</v-icon>
            <span>Find</span>
            <kbd v-if="finderShortcut" class="ml-2">{{ finderShortcut }}</kbd>
        </button>
    </header>
    <div class="cheat-body">
        <nav v-if="isSidebarVisible" class="cheat-nav" aria-label="Cheat panels">
            <div v-for="group in navGroups" :key="group.label" class="cheat-nav__group">
                <div class="cheat-nav__heading">{{ group.label }}</div>
                <template v-for="item in group.items">
                    <button
                        v-if="!item.children"
                        :key="item.component"
                        type="button"
                        class="cheat-nav__item"
                        :class="{ 'is-active': isNavItemActive(item) }"
                        :aria-current="isNavItemActive(item) ? 'page' : null"
                        @click="selectNavItem(item)">
                        <v-icon small>{{ item.icon }}</v-icon>
                        <span>{{ item.name }}</span>
                    </button>
                    <div v-else :key="item.name" class="cheat-nav__subgroup">
                        <button
                            type="button"
                            class="cheat-nav__item cheat-nav__parent"
                            :aria-expanded="isGroupOpen(item) ? 'true' : 'false'"
                            @click="toggleGroup(item)">
                            <v-icon small>{{ item.icon }}</v-icon>
                            <span>{{ item.name }}</span>
                            <v-icon small class="cheat-nav__chevron">mdi-chevron-down</v-icon>
                        </button>
                        <div v-show="isGroupOpen(item)" class="cheat-nav__children">
                            <button
                                v-for="child in item.children"
                                :key="child.component"
                                type="button"
                                class="cheat-nav__item"
                                :class="{ 'is-active': isNavItemActive(child) }"
                                :aria-current="isNavItemActive(child) ? 'page' : null"
                                @click="selectNavItem(child)">
                                <v-icon small>{{ child.icon }}</v-icon>
                                <span>{{ child.name }}</span>
                            </button>
                        </div>
                    </div>
                </template>
            </div>
        </nav>
        <main class="cheat-content">
            <component ref="panel" :is="activePanelComponent" :key="currentComponentName" v-bind="activePanelProps"></component>
        </main>
    </div>
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
      navGroups: NAV_GROUPS,
      openGroups: ["Items", "Settings"],
      overlayWidth: readNumberSetting("cheatModal.width", 750),
      overlayHeight: readNumberSetting("cheatModal.height", 450),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      finderOpen: false,
      featureCatalog: [],
      isSidebarVisible: readBooleanSetting(SIDEBAR_VISIBLE_SETTING, true),
      windowOpacity: readNumberSetting(WINDOW_OPACITY_SETTING, 0.9),
      isHovered: false,

      navTreeModel: undefined,
    };
  },

  watch: {
    currentComponentName(name) {
      this.syncNavSelection(name);
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
      if (
        [
          "enemy-editor-panel",
          "skill-editor-panel",
          "class-editor-panel",
        ].includes(this.currentComponentName)
      )
        return "database-editor-panel";
      // Never render an undefined dynamic component on the first tick; the
      // mounted hook emits the resolved panel immediately afterwards.
      return this.currentComponentName || "general-panel";
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

    activeNavItem() {
      return this.navTreeModel && this.navTreeModel.length
        ? this.navTreeModel[0]
        : null;
    },

    activePanelLabel() {
      return (this.activeNavItem && this.activeNavItem.name) || "Cheat Engine";
    },

    activePanelGroupLabel() {
      const group = this.navGroupForItem(this.activeNavItem);
      return group ? group.label : "";
    },

    finderShortcut() {
      try {
        const key = GLOBAL_SHORTCUT.getShortcut("openFeatureFinder");
        return key && !key.isEmpty() ? key.asDisplayString() : "";
      } catch (error) {
        return "";
      }
    },

    componentNameToNavItem() {
      const ret = {};
      this.iterateLeaf(this.navGroups, (item) => {
        ret[item.component] = item;
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

    this._openFinder = () => this.openFinder();
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
      applyThemeStyle(
        this.$vuetify,
        this.$el.closest(".v-application") || this.$el,
        readThemeStyle(),
      );
      this.windowOpacity = readNumberSetting(WINDOW_OPACITY_SETTING, 0.9);
      this.isSidebarVisible = readBooleanSetting(SIDEBAR_VISIBLE_SETTING, true);
      this.$vuetify.theme.dark = readBooleanSetting(
        "cheatModal.themeDarkMode",
        true,
      );
      const storedColor = KEY_VALUE_STORAGE.getItem(THEME_PRIMARY_COLOR);
      const color =
        typeof storedColor === "string" && /^#[0-9a-f]{6}$/i.test(storedColor)
          ? storedColor
          : DEFAULT_PRIMARY_COLOR;
      this.$vuetify.theme.themes.dark.primary = color;
      this.$vuetify.theme.themes.light.primary = color;
      this.applyAccent(color);
    };
    window.addEventListener("cheat-profile-change", this._profileChanged);

    const gameWindow = getGameWindow();
    if (gameWindow && gameWindow !== window)
      gameWindow.addEventListener("cheat-layout-change", this._layoutChanged);
    if (gameWindow && gameWindow !== window)
      gameWindow.addEventListener("cheat-profile-change", this._profileChanged);

    // Keep a pop-out window's colors in sync with the saved profile.
    this._profileChanged();

    let navItem = this.componentNameToNavItem[this.currentComponentName];

    if (!navItem) {
      navItem = this.navGroups[0].items[0];
      this.$emit("change", navItem.component);
    }
    this.setNavSelection(navItem);

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

    openFinder() {
      this.featureCatalog = createFeatureCatalog(
        GLOBAL_SHORTCUT.shortcutSettings,
        GLOBAL_SHORTCUT.shortcutConfig,
      );
      this.finderOpen = true;
    },

    selectNavItem(item) {
      if (!item || !item.component) return;
      this.setNavSelection(item);
      this.$emit("change", item.component);
    },

    setNavSelection(item) {
      if (!item) return;
      this.navTreeModel = [item];
      const group = this.navGroupForItem(item);
      if (group) this.openGroup(group);
    },

    syncNavSelection(name) {
      const item = this.componentNameToNavItem[name];
      if (item) this.setNavSelection(item);
    },

    isNavItemActive(item) {
      return (
        !!this.activeNavItem && this.activeNavItem.component === item.component
      );
    },

    navGroupForItem(item) {
      if (!item) return null;
      for (const group of this.navGroups) {
        for (const entry of group.items) {
          if (entry === item) return group;
          if (entry.children && entry.children.indexOf(item) !== -1)
            return group;
        }
      }
      return null;
    },

    navParentForItem(item) {
      if (!item) return null;
      for (const group of this.navGroups) {
        for (const entry of group.items) {
          if (entry.children && entry.children.indexOf(item) !== -1)
            return entry;
        }
      }
      return null;
    },

    isGroupOpen(item) {
      return this.openGroups.indexOf(item.name) !== -1;
    },

    openGroup(item) {
      if (item && !this.isGroupOpen(item)) this.openGroups.push(item.name);
    },

    toggleGroup(item) {
      const index = this.openGroups.indexOf(item.name);
      if (index === -1) this.openGroups.push(item.name);
      else this.openGroups.splice(index, 1);
    },

    applyAccent(color) {
      if (!this.$el || !this.$el.style) return;
      const dark = !!(this.$vuetify && this.$vuetify.theme.dark);
      const accent = accentFocusColor(color, dark);
      if (!accent) return;
      const targets = [this.$el];
      if (this.$el.closest) {
        const app = this.$el.closest(".v-application");
        if (app && targets.indexOf(app) === -1) targets.push(app);
      }
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        if (!target || !target.style) continue;
        target.style.setProperty("--cheat-primary", accent.primary);
        target.style.setProperty("--cheat-primary-soft", accent.primarySoft);
        target.style.setProperty("--cheat-focus", accent.focus);
        target.style.setProperty("--cheat-focus-soft", accent.focusSoft);
      }
    },

    navigateFeature(entry) {
      this.$emit("change", entry.panel);
      const nav = this.componentNameToNavItem[entry.panel];
      if (nav) this.setNavSelection(nav);
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
      } else if (node && Object.hasOwnProperty.call(node, "items")) {
        this.iterateLeaf(node.items, leafFunc);
      } else if (node && Object.hasOwnProperty.call(node, "children")) {
        this.iterateLeaf(node.children, leafFunc);
      } else if (node) {
        leafFunc(node);
      }
    },
  },
};
