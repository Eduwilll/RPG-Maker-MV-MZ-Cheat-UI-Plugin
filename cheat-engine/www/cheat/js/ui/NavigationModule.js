/**
 * NavigationModule - Deep module for CheatModal navigation state
 *
 * Owns: NAV_GROUPS config, openGroups, navTreeModel, group expansion,
 * active item selection, keyboard navigation.
 *
 * Exposes: select(item), sync(name), getActive(), onChange(fn), getNavGroups()
 */

import { deepFreeze } from "./StaticData.js";

export const NAV_GROUPS = Object.freeze([
  {
    label: "Play",
    items: Object.freeze([
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
        children: Object.freeze([
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
        ]),
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
    ]),
  },
  {
    label: "World",
    items: Object.freeze([
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
    ]),
  },
  {
    label: "Tools",
    items: Object.freeze([
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
    ]),
  },
  {
    label: "System",
    items: Object.freeze([
      {
        name: "Settings",
        icon: "mdi-cog",
        children: Object.freeze([
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
        ]),
      },
    ]),
  },
]);

/**
 * Create a frozen navigation model from NAV_GROUPS
 * @param {Array} navGroups - The navigation groups configuration
 * @returns {Object} Frozen navigation model with helper methods
 */
export function createNavigationModel(navGroups) {
  const groups = deepFreeze(navGroups);

  // Build flat map of componentName -> navItem for O(1) lookup
  const componentMap = {};
  const nameToGroup = new Map();
  const nameToParent = new Map();

  function walk(node, parentGroup, parentItem) {
    if (Array.isArray(node)) {
      for (const item of node) walk(item, parentGroup, parentItem);
    } else if (node && Object.hasOwnProperty.call(node, "items")) {
      walk(node.items, node, parentItem);
    } else if (node && Object.hasOwnProperty.call(node, "children")) {
      walk(node.children, parentGroup, node);
    } else if (node) {
      if (node.component) componentMap[node.component] = node;
      if (parentGroup) nameToGroup.set(node.name, parentGroup);
      if (parentItem) nameToParent.set(node.name, parentItem);
    }
  }

  walk(groups, null, null);

  // Add minimap-panel alias
  if (componentMap["map-event-panel"] && !componentMap["minimap-panel"]) {
    componentMap["minimap-panel"] = componentMap["map-event-panel"];
  }

  return Object.freeze({
    groups,
    componentMap,
    nameToGroup,
    nameToParent,

    /**
     * Get the nav item for a component name
     * @param {string} componentName
     * @returns {Object|null}
     */
    getItem(componentName) {
      return componentMap[componentName] || null;
    },

    /**
     * Get the group for a nav item
     * @param {Object} item
     * @returns {Object|null}
     */
    getGroup(item) {
      if (!item) return null;
      return nameToGroup.get(item.name) || null;
    },

    /**
     * Get the parent item for a nav item (for subgroups)
     * @param {Object} item
     * @returns {Object|null}
     */
    getParent(item) {
      if (!item) return null;
      return nameToParent.get(item.name) || null;
    },

    /**
     * Get default first item
     * @returns {Object}
     */
    getDefaultItem() {
      return (groups[0] && groups[0].items[0]) || null;
    },

    /**
     * Iterate all leaf items
     * @param {Function} fn
     */
    forEachLeaf(fn) {
      function walk(node) {
        if (Array.isArray(node)) {
          for (const item of node) walk(item);
        } else if (node && Object.hasOwnProperty.call(node, "items")) {
          walk(node.items);
        } else if (node && Object.hasOwnProperty.call(node, "children")) {
          walk(node.children);
        } else if (node) {
          fn(node);
        }
      }
      walk(groups);
    },
  });
}

/**
 * Create reactive navigation state
 * @param {Object} model - Navigation model from createNavigationModel
 * @param {Array<string>} initialOpenGroups - Initially expanded group names
 * @returns {Object} Reactive navigation state with methods
 */
export function createNavigationState(model, initialOpenGroups = []) {
  // Vue 2 compatible reactive state
  const state = {
    navTreeModel: undefined,
    openGroups: [...initialOpenGroups],
  };

  const listeners = new Set();

  function notify() {
    for (const fn of listeners) fn(state);
  }

  return {
    // State getters
    get navTreeModel() {
      return state.navTreeModel;
    },
    get openGroups() {
      return state.openGroups;
    },
    get activeNavItem() {
      return state.navTreeModel && state.navTreeModel.length
        ? state.navTreeModel[0]
        : null;
    },
    get activePanelLabel() {
      return (this.activeNavItem && this.activeNavItem.name) || "Cheat Engine";
    },
    get activePanelGroupLabel() {
      const group = model.getGroup(this.activeNavItem);
      return group ? group.label : "";
    },

    // Methods
    /**
     * Select a nav item and emit change
     * @param {Object} item - Nav item to select
     * @returns {string|null} Selected component name
     */
    select(item) {
      if (!item || !item.component) return null;
      state.navTreeModel = [item];
      const group = model.getGroup(item);
      if (group) this.openGroup(group);
      notify();
      return item.component;
    },

    /**
     * Sync selection to a component name
     * @param {string} name - Component name
     */
    sync(name) {
      const item = model.getItem(name);
      if (item) {
        state.navTreeModel = [item];
        const group = model.getGroup(item);
        if (group) this.openGroup(group);
        notify();
      }
    },

    /**
     * Check if a group is open
     * @param {Object} item - Group item
     * @returns {boolean}
     */
    isGroupOpen(item) {
      return state.openGroups.indexOf(item.name) !== -1;
    },

    /**
     * Open a group
     * @param {Object} item - Group item
     */
    openGroup(item) {
      if (item && !this.isGroupOpen(item)) {
        state.openGroups.push(item.name);
        notify();
      }
    },

    /**
     * Toggle a group
     * @param {Object} item - Group item
     */
    toggleGroup(item) {
      const index = state.openGroups.indexOf(item.name);
      if (index === -1) {
        state.openGroups.push(item.name);
      } else {
        state.openGroups.splice(index, 1);
      }
      notify();
    },

    /**
     * Check if a nav item is active
     * @param {Object} item - Nav item
     * @returns {boolean}
     */
    isNavItemActive(item) {
      return (
        !!this.activeNavItem && this.activeNavItem.component === item.component
      );
    },

    /**
     * Subscribe to state changes
     * @param {Function} fn - Callback function
     * @returns {Function} Unsubscribe function
     */
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /**
     * Get the navigation groups for rendering
     * @returns {Array}
     */
    getNavGroups() {
      return model.groups;
    },
  };
}

/**
 * Create a navigation module combining model and state
 * @param {Array} navGroups - NAV_GROUPS configuration
 * @param {Array<string>} initialOpenGroups - Initially expanded groups
 * @returns {Object} Navigation module with model and state
 */
export function createNavigationModule(navGroups, initialOpenGroups = []) {
  const model = createNavigationModel(navGroups);
  const state = createNavigationState(model, initialOpenGroups);

  return {
    model,
    state,

    // Convenience methods delegating to state
    select: (item) => state.select(item),
    sync: (name) => state.sync(name),
    getActiveItem: () => state.activeNavItem,
    getActiveLabel: () => state.activePanelLabel,
    getActiveGroupLabel: () => state.activePanelGroupLabel,
    isGroupOpen: (item) => state.isGroupOpen(item),
    openGroup: (item) => state.openGroup(item),
    toggleGroup: (item) => state.toggleGroup(item),
    isNavItemActive: (item) => state.isNavItemActive(item),
    onChange: (fn) => state.onChange(fn),
    getNavGroups: () => state.getNavGroups(),
    getItem: (name) => model.getItem(name),
    getGroup: (item) => model.getGroup(item),
    getParent: (item) => model.getParent(item),
    getDefaultItem: () => model.getDefaultItem(),
  };
}
