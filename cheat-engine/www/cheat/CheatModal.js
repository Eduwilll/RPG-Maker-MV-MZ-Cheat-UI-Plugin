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
import { createFeatureCatalog } from "./js/ui/FeatureCatalog.js";
import { deepFreeze } from "./js/ui/StaticData.js";
import { GLOBAL_SHORTCUT } from "./js/shortcuts/GlobalShortcut.js";
import { NAV_GROUPS } from "./js/ui/NavigationModule.js";
import { createNavigationModule } from "./js/ui/NavigationModule.js";
import { createPanelRegistryModule } from "./js/ui/PanelRegistryModule.js";
import { createProfileSyncModule } from "./js/ui/ProfileSyncModule.js";
import { readNumberSetting } from "./js/ui/CheatUiSettings.js";
import { KEY_VALUE_STORAGE } from "./js/storage/KeyValueStorage.js";

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
            <div class="cheat-shell__title">{{ navigation.getActiveLabel() }}</div>
            <div class="cheat-shell__subtitle">{{ navigation.getActiveGroupLabel() || 'Cheat engine' }}</div>
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
            <div v-for="group in navigation.getNavGroups()" :key="group.label" class="cheat-nav__group">
                <div class="cheat-nav__heading">{{ group.label }}</div>
                <template v-for="item in group.items">
                    <button
                        v-if="!item.children"
                        :key="item.component"
                        type="button"
                        class="cheat-nav__item"
                        :class="{ 'is-active': navigation.isNavItemActive(item) }"
                        :aria-current="navigation.isNavItemActive(item) ? 'page' : null"
                        @click="selectNavItem(item)">
                        <v-icon small>{{ item.icon }}</v-icon>
                        <span>{{ item.name }}</span>
                    </button>
                    <div v-else :key="item.name" class="cheat-nav__subgroup">
                        <button
                            type="button"
                            class="cheat-nav__item cheat-nav__parent"
                            :aria-expanded="navigation.isGroupOpen(item) ? 'true' : 'false'"
                            @click="navigation.toggleGroup(item)">
                            <v-icon small>{{ item.icon }}</v-icon>
                            <span>{{ item.name }}</span>
                            <v-icon small class="cheat-nav__chevron">mdi-chevron-down</v-icon>
                        </button>
                        <div v-show="navigation.isGroupOpen(item)" class="cheat-nav__children">
                            <button
                                v-for="child in item.children"
                                :key="child.component"
                                type="button"
                                class="cheat-nav__item"
                                :class="{ 'is-active': navigation.isNavItemActive(child) }"
                                :aria-current="navigation.isNavItemActive(child) ? 'page' : null"
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
            <component
                ref="panel"
                :is="panelRegistry.getActiveComponent()"
                :key="panelRegistry.getActiveKey()"
                v-bind="panelRegistry.getActiveProps()"
            ></component>
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
      // Layout state (remains in CheatModal as it's specific to this component)
      overlayWidth: 750,
      overlayHeight: 450,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      finderOpen: false,
      featureCatalog: [],
      isHovered: false,

      // Module instances (created in created()/mounted())
      navigation: null,
      panelRegistry: null,
      profile: null,

      // Unsubscribers
      _unsubNavigation: null,
      _unsubPanelRegistry: null,
      _unsubProfile: null,
    };
  },

  watch: {
    currentComponentName(name) {
      this.panelRegistry.setComponent(name);
      this.navigation.sync(name);
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
    effectiveOpacity() {
      // profile may not be initialized yet (created() runs before mounted())
      if (!this.profile) {
        return this.isWindow ? 1.0 : this.isHovered ? 1.0 : 0.9;
      }
      return this.profile.getEffectiveOpacity(this.isHovered);
    },
    isSidebarVisible() {
      // profile may not be initialized yet (created() runs before mounted())
      if (!this.profile) {
        // Default to true (sidebar visible by default)
        return true;
      }
      return this.profile.isSidebarVisible;
    },
    finderShortcut() {
      try {
        const key = GLOBAL_SHORTCUT.getShortcut("openFeatureFinder");
        return key && !key.isEmpty() ? key.asDisplayString() : "";
      } catch (error) {
        return "";
      }
    },
  },

  created() {
    // Initialize modules that don't need this.$el
    this.navigation = createNavigationModule(NAV_GROUPS, ["Items", "Settings"]);

    const components = {
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
    };
    this.panelRegistry = createPanelRegistryModule(
      components,
      this.currentComponentName,
      {},
    );

    // Subscribe to module changes to trigger Vue reactivity
    this._unsubNavigation = this.navigation.onChange(() => {
      this.$forceUpdate();
    });
    this._unsubPanelRegistry = this.panelRegistry.onChange(() => {
      this.$forceUpdate();
    });
  },

  mounted() {
    // Initialize profile module (needs this.$el)
    this.profile = createProfileSyncModule(this.$vuetify, this.$el, {
      isWindow: this.isWindow,
    });
    this._unsubProfile = this.profile.onChange(() => {
      this.$forceUpdate();
    });

    this._layoutChanged = () => {
      this.overlayWidth = readNumberSetting("cheatModal.width", 750);
      this.overlayHeight = readNumberSetting("cheatModal.height", 450);
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

    // Initialize panel selection
    let navItem = this.navigation.getItem(this.currentComponentName);

    if (!navItem) {
      navItem = this.navigation.getDefaultItem();
      this.$emit("change", navItem.component);
    }
    this.navigation.select(navItem);
    this.panelRegistry.setComponent(navItem.component);

    // Apply initial theme
    this.profile.syncProfile();
  },

  beforeDestroy() {
    window.removeEventListener("cheat-layout-change", this._layoutChanged);
    window.removeEventListener("resize", this._viewportChanged);
    window.removeEventListener("cheat-navigate-actor", this._navigateActor);
    window.removeEventListener("cheat-open-finder", this._openFinder);

    if (this._unsubNavigation) this._unsubNavigation();
    if (this._unsubPanelRegistry) this._unsubPanelRegistry();
    if (this._unsubProfile) this._unsubProfile();

    this.profile.destroy();
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
      this.featureCatalog = deepFreeze(
        createFeatureCatalog(
          GLOBAL_SHORTCUT.shortcutSettings,
          GLOBAL_SHORTCUT.shortcutConfig,
        ),
      );
      this.finderOpen = true;
    },

    selectNavItem(item) {
      if (!item || !item.component) return;
      this.navigation.select(item);
      this.panelRegistry.setComponent(item.component);
      this.$emit("change", item.component);
    },

    navigateFeature(entry) {
      this.$emit("change", entry.panel);
      this.panelRegistry.setComponent(entry.panel);
      this.navigation.sync(entry.panel);
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
      this.profile.toggleSidebar();
    },
  },
};
