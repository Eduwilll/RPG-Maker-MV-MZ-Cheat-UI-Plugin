/**
 * PanelRegistryModule - Deep module for CheatModal panel registry
 *
 * Owns: component map (name → component), props resolution for database editors,
 * <component :is> key management.
 *
 * Exposes: resolve(name), propsFor(name), register(name, component), getAll()
 */

import { deepFreeze } from "./StaticData.js";

/**
 * Default panel kinds that map to DatabaseEditorPanel with props
 */
const DEFAULT_DATABASE_KINDS = Object.freeze({
  "enemy-editor-panel": "enemy",
  "skill-editor-panel": "skill",
  "class-editor-panel": "class",
});

/**
 * Create a panel registry from component imports
 * @param {Object} components - Map of component name to component
 * @param {Object} databaseKinds - Optional override for database panel kinds
 * @returns {Object} Frozen panel registry
 */
export function createPanelRegistry(components, databaseKinds = {}) {
  const kinds = Object.freeze({
    ...DEFAULT_DATABASE_KINDS,
    ...databaseKinds,
  });

  const componentMap = Object.freeze({ ...components });

  return Object.freeze({
    componentMap,
    kinds,

    /**
     * Resolve a component by name
     * @param {string} name - Component name
     * @returns {Object|null} Vue component or null
     */
    resolve(name) {
      return componentMap[name] || null;
    },

    /**
     * Get props for a panel (used for database editors)
     * @param {string} name - Component name
     * @returns {Object} Props object
     */
    propsFor(name) {
      const kind = kinds[name];
      return kind ? { kind } : {};
    },

    /**
     * Get the dynamic component key for <component :is>
     * Ensures remount when panel changes
     * @param {string} name - Component name
     * @returns {string}
     */
    getKey(name) {
      return name || "general-panel";
    },

    /**
     * Register a new panel (for dynamic plugins)
     * @param {string} name - Component name
     * @param {Object} component - Vue component
     * @param {string} [kind] - Optional database kind
     * @returns {Object} New registry (immutable)
     */
    register(name, component, kind) {
      const newComponents = { ...componentMap, [name]: component };
      const newKinds = kind ? { ...kinds, [name]: kind } : kinds;
      return createPanelRegistry(newComponents, newKinds);
    },

    /**
     * Get all registered component names
     * @returns {Array<string>}
     */
    getAllNames() {
      return Object.keys(componentMap);
    },

    /**
     * Get all registered components
     * @returns {Object}
     */
    getAll() {
      return componentMap;
    },

    /**
     * Check if a panel is a database editor
     * @param {string} name - Component name
     * @returns {boolean}
     */
    isDatabaseEditor(name) {
      return name in kinds;
    },

    /**
     * Get database kind for a panel
     * @param {string} name - Component name
     * @returns {string|null}
     */
    getDatabaseKind(name) {
      return kinds[name] || null;
    },
  });
}

/**
 * Create a reactive panel registry state for Vue 2
 * @param {Object} registry - Panel registry from createPanelRegistry
 * @param {string} currentComponentName - Currently active component
 * @returns {Object} Reactive state with computed properties
 */
export function createPanelRegistryState(registry, currentComponentName) {
  // Vue 2 reactive state
  const state = {
    currentComponentName: currentComponentName || "general-panel",
  };

  const listeners = new Set();

  function notify() {
    for (const fn of listeners) fn(state);
  }

  return {
    // State
    get currentComponentName() {
      return state.currentComponentName;
    },
    set currentComponentName(value) {
      state.currentComponentName = value;
      notify();
    },

    // Computed
    get activePanelComponent() {
      // Database editors all use the same component with different props
      if (registry.isDatabaseEditor(state.currentComponentName)) {
        return "database-editor-panel";
      }
      // Never render undefined; fallback to general-panel
      return state.currentComponentName || "general-panel";
    },

    get activePanelProps() {
      return registry.propsFor(state.currentComponentName);
    },

    get activePanelKey() {
      return registry.getKey(state.currentComponentName);
    },

    // Methods
    /**
     * Set the current component and notify
     * @param {string} name - Component name
     */
    setComponent(name) {
      state.currentComponentName = name;
      notify();
    },

    /**
     * Subscribe to state changes
     * @param {Function} fn - Callback
     * @returns {Function} Unsubscribe
     */
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    // Direct registry access
    resolve: (name) => registry.resolve(name),
    propsFor: (name) => registry.propsFor(name),
    getKey: (name) => registry.getKey(name),
    isDatabaseEditor: (name) => registry.isDatabaseEditor(name),
    getDatabaseKind: (name) => registry.getDatabaseKind(name),
    getAllNames: () => registry.getAllNames(),
    getAll: () => registry.getAll(),
  };
}

/**
 * Create a complete panel registry module
 * @param {Object} components - Component map
 * @param {string} initialComponent - Initial component name
 * @param {Object} databaseKinds - Database kind overrides
 * @returns {Object} Panel registry module with registry and state
 */
export function createPanelRegistryModule(
  components,
  initialComponent,
  databaseKinds,
) {
  const registry = createPanelRegistry(components, databaseKinds);
  const state = createPanelRegistryState(registry, initialComponent);

  return {
    registry,
    state,

    // Convenience methods
    resolve: (name) => state.resolve(name),
    propsFor: (name) => state.propsFor(name),
    getKey: (name) => state.getKey(name),
    getActiveComponent: () => state.activePanelComponent,
    getActiveProps: () => state.activePanelProps,
    getActiveKey: () => state.activePanelKey,
    setComponent: (name) => state.setComponent(name),
    onChange: (fn) => state.onChange(fn),
    isDatabaseEditor: (name) => state.isDatabaseEditor(name),
    getDatabaseKind: (name) => state.getDatabaseKind(name),
  };
}
