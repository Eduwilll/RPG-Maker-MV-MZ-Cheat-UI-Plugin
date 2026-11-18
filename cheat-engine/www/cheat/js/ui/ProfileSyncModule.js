/**
 * ProfileSyncModule - Deep module for CheatModal profile/theme synchronization
 *
 * Owns: theme color, dark mode, opacity, sidebar visibility, game font,
 * cross-window event listeners, accent color CSS variables.
 *
 * Exposes: apply(theme), onChange(fn), broadcast(), getters for all settings
 */

import {
  accentFocusColor,
  applyThemeStyle,
  readThemeStyle,
} from "./CheatTheme.js";
import {
  readBooleanSetting,
  writeBooleanSetting,
  readNumberSetting,
} from "./CheatUiSettings.js";
import { KEY_VALUE_STORAGE } from "../storage/KeyValueStorage.js";
import { getGameWindow } from "../runtime/FeatureRuntime.js";
import { applyGameFont } from "./GameFont.js";

const SIDEBAR_VISIBLE_SETTING = "cheatModal.sidebarVisible";
const WINDOW_OPACITY_SETTING = "cheatModal.windowOpacity";
const THEME_PRIMARY_COLOR = "cheatModal.themePrimaryColor";
const GAME_FONT_SETTING = "cheatModal.gameFont";
const DARK_MODE_SETTING = "cheatModal.themeDarkMode";
const DEFAULT_PRIMARY_COLOR = "#3f51b5";

/**
 * Create a profile sync module
 * @param {Object} vuetify - Vuetify instance
 * @param {HTMLElement} rootEl - Root element for CSS variable application
 * @param {Object} options - Options
 * @param {boolean} options.isWindow - Whether running in separate window mode
 * @returns {Object} Profile sync module
 */
export function createProfileSyncModule(vuetify, rootEl, options = {}) {
  const { isWindow = false } = options;

  // Reactive state
  const state = {
    windowOpacity: readNumberSetting(WINDOW_OPACITY_SETTING, 0.9),
    isSidebarVisible: readBooleanSetting(SIDEBAR_VISIBLE_SETTING, true),
    primaryColor: null, // Will be loaded from storage
    darkMode: readBooleanSetting(DARK_MODE_SETTING, true),
    gameFont: readBooleanSetting(GAME_FONT_SETTING, false),
  };

  const listeners = new Set();
  let boundEvents = false;

  function notify() {
    for (const fn of listeners) fn(state);
  }

  /**
   * Load primary color from storage
   */
  function loadPrimaryColor() {
    const storedColor = KEY_VALUE_STORAGE.getItem(THEME_PRIMARY_COLOR);
    const color =
      typeof storedColor === "string" && /^#[0-9a-f]{6}$/i.test(storedColor)
        ? storedColor
        : DEFAULT_PRIMARY_COLOR;
    state.primaryColor = color;
    return color;
  }

  /**
   * Apply theme to Vuetify and CSS variables
   * @param {string} color - Primary color hex
   */
  function applyTheme(color) {
    if (!color) return;

    // Apply to Vuetify themes
    vuetify.theme.themes.dark.primary = color;
    vuetify.theme.themes.light.primary = color;
    vuetify.theme.dark = state.darkMode;

    // Apply accent CSS variables
    applyAccentToElements(color, rootEl);
  }

  /**
   * Apply accent CSS variables to element and its v-application ancestor
   * @param {string} color - Primary color hex
   * @param {HTMLElement} el - Root element
   */
  function applyAccentToElements(color, el) {
    if (!el || !el.style) return;
    const dark = !!(vuetify && vuetify.theme.dark);
    const accent = accentFocusColor(color, dark);
    if (!accent) return;

    const targets = [el];
    if (el.closest) {
      const app = el.closest(".v-application");
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
  }

  /**
   * Full profile sync - called on profile change event
   */
  function syncProfile() {
    const themeStyle = readThemeStyle();
    applyThemeStyle(
      vuetify,
      rootEl.closest(".v-application") || rootEl,
      themeStyle,
    );

    state.windowOpacity = readNumberSetting(WINDOW_OPACITY_SETTING, 0.9);
    state.isSidebarVisible = readBooleanSetting(SIDEBAR_VISIBLE_SETTING, true);
    state.darkMode = readBooleanSetting(DARK_MODE_SETTING, true);
    state.gameFont = readBooleanSetting(GAME_FONT_SETTING, false);

    vuetify.theme.dark = state.darkMode;

    const color = loadPrimaryColor();
    applyTheme(color);

    notify();
  }

  /**
   * Initialize event listeners
   */
  function initEvents() {
    if (boundEvents) return;
    boundEvents = true;

    // Profile change event (from AppearancePanel or separate window)
    window.addEventListener("cheat-profile-change", syncProfile);

    // Appearance change event (opacity only)
    window.addEventListener("cheat-appearance-change", (e) => {
      const detail = e && e.detail;
      state.windowOpacity =
        (detail && detail.windowOpacity) !== undefined
          ? detail.windowOpacity
          : state.windowOpacity;
      notify();
    });

    // Cross-window sync
    const gameWindow = getGameWindow();
    if (gameWindow && gameWindow !== window) {
      gameWindow.addEventListener("cheat-profile-change", syncProfile);
      gameWindow.addEventListener("cheat-appearance-change", (e) => {
        const detail = e && e.detail;
        state.windowOpacity =
          (detail && detail.windowOpacity) !== undefined
            ? detail.windowOpacity
            : state.windowOpacity;
        notify();
      });
    }
  }

  /**
   * Cleanup event listeners
   */
  function destroy() {
    window.removeEventListener("cheat-profile-change", syncProfile);
    window.removeEventListener("cheat-appearance-change", () => {});

    const gameWindow = getGameWindow();
    if (gameWindow && gameWindow !== window) {
      gameWindow.removeEventListener("cheat-profile-change", syncProfile);
      gameWindow.removeEventListener("cheat-appearance-change", () => {});
    }
    boundEvents = false;
  }

  /**
   * Toggle sidebar visibility
   * @returns {boolean} New visibility state
   */
  function toggleSidebar() {
    state.isSidebarVisible = !state.isSidebarVisible;
    writeBooleanSetting(SIDEBAR_VISIBLE_SETTING, state.isSidebarVisible);
    notify();
    return state.isSidebarVisible;
  }

  /**
   * Set window opacity
   * @param {number} opacity - Opacity value (0-1)
   */
  function setWindowOpacity(opacity) {
    state.windowOpacity = Math.max(0, Math.min(1, opacity));
    notify();
  }

  /**
   * Set primary color
   * @param {string} color - Hex color
   */
  function setPrimaryColor(color) {
    if (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)) {
      state.primaryColor = color;
      KEY_VALUE_STORAGE.setItem(THEME_PRIMARY_COLOR, color);
      applyTheme(color);
      notify();
    }
  }

  /**
   * Set dark mode
   * @param {boolean} dark - Dark mode enabled
   */
  function setDarkMode(dark) {
    state.darkMode = !!dark;
    vuetify.theme.dark = state.darkMode;
    const color = state.primaryColor || loadPrimaryColor();
    applyTheme(color);
    notify();
  }

  /**
   * Set game font
   * @param {boolean} enabled - Use game font
   */
  function setGameFont(enabled) {
    state.gameFont = !!enabled;
    writeBooleanSetting(GAME_FONT_SETTING, state.gameFont);
    applyGameFont(rootEl, getGameWindow(), state.gameFont);
    notify();
  }

  // Initial load
  loadPrimaryColor();
  applyTheme(state.primaryColor);
  // getGameWindow() may return null in test/preview environments; applyGameFont handles null gracefully
  const gameWindow = getGameWindow();
  if (gameWindow) {
    applyGameFont(rootEl, gameWindow, state.gameFont);
  }
  initEvents();

  // Initial sync
  syncProfile();

  return {
    // State getters
    get windowOpacity() {
      return isWindow ? 1.0 : state.windowOpacity;
    },
    get isSidebarVisible() {
      return state.isSidebarVisible;
    },
    get primaryColor() {
      return state.primaryColor;
    },
    get darkMode() {
      return state.darkMode;
    },
    get gameFont() {
      return state.gameFont;
    },
    get isWindow() {
      return isWindow;
    },

    // Effective opacity (1.0 for window mode, or 1.0 on hover)
    getEffectiveOpacity(isHovered) {
      if (isWindow) return 1.0;
      return isHovered ? 1.0 : state.windowOpacity;
    },

    // Methods
    toggleSidebar,
    setWindowOpacity,
    setPrimaryColor,
    setDarkMode,
    setGameFont,
    syncProfile,
    applyTheme,
    destroy,

    // Subscription
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
