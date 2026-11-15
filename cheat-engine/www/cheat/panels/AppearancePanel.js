import {
  readNumberSetting,
  writeNumberSetting,
  readBooleanSetting,
  writeBooleanSetting,
} from "../js/ui/CheatUiSettings.js";
import { KEY_VALUE_STORAGE } from "../js/storage/KeyValueStorage.js";
import { getGameWindow } from "../js/runtime/FeatureRuntime.js";
import {
  ACCENT_COLOR_OPTIONS,
  readThemeSelection,
  THEME_DARK_MODE,
  THEME_PRIMARY_COLOR,
  THEME_STYLE,
  readThemeStyle,
} from "../js/ui/CheatTheme.js";

const WINDOW_OPACITY_SETTING = "cheatModal.windowOpacity";
const THEME_DARK_MODE_SETTING = THEME_DARK_MODE;

export default {
  name: "AppearancePanel",

  template: `
<v-card flat class="cheat-panel">
    <div class="cheat-panel__head">
        <div>
            <div class="cheat-panel__title">Appearance</div>
            <div class="cheat-panel__meta">Window size, opacity and color theme</div>
        </div>
    </div>

    <section class="cheat-section">
        <div class="cheat-section__title">Window</div>
        <div class="cheat-grid cheat-grid--two">
            <v-text-field
                v-model="overlayWidth"
                type="number"
                label="Width (px)"
                dense
                outlined
                hide-details
                @keydown.stop
                @change="onLayoutChange" />
            <v-text-field
                v-model="overlayHeight"
                type="number"
                label="Height (px)"
                dense
                outlined
                hide-details
                @keydown.stop
                @change="onLayoutChange" />
        </div>
        <div class="cheat-inline cheat-inline--top">
            <v-btn small outlined @click="resetOverlaySize">Reset to 750 x 450</v-btn>
            <span class="caption">Size is clamped to the game window.</span>
        </div>
    </section>

    <section class="cheat-section">
        <div class="cheat-slider__head">
            <span class="cheat-slider__label">Window opacity</span>
            <span class="cheat-value">{{ Math.round(windowOpacity * 100) }}%</span>
        </div>
        <v-slider
            data-feature="window-opacity"
            v-model="windowOpacity"
            :min="0.1"
            :max="1"
            :step="0.05"
            color="primary"
            hide-details
            @change="onOpacityChange" />
        <div class="caption">The overlay becomes fully opaque while the pointer is over it.</div>
    </section>

    <section class="cheat-section">
        <div class="cheat-section__title">Accent color</div>
        <div class="cheat-swatches" role="radiogroup" aria-label="Accent colors">
            <button
                v-for="option in colorOptions"
                :key="option.value"
                type="button"
                role="radio"
                class="cheat-swatch"
                :class="{ 'is-selected': primaryColor === option.value, 'cheat-swatch--default': option.isDefault }"
                :style="{ backgroundColor: option.value }"
                :aria-label="option.text"
                :aria-checked="primaryColor === option.value ? 'true' : 'false'"
                :title="option.text"
                @click="selectColor(option.value)"><span v-if="option.isDefault">Default</span></button>
        </div>
        <div class="caption mt-1">Used for selection, focus rings and primary actions.</div>
    </section>

    <section class="cheat-section">
        <div class="cheat-section__title">Theme</div>
        <v-select
            v-model="themeStyle"
            :items="themeStyles"
            label="Color theme"
            class="mb-2"
            dense
            outlined
            hide-details
            @change="onStyleChange" />
        <div class="cheat-grid cheat-grid--toggles">
            <v-switch
                v-model="isDarkMode"
                label="Dark mode"
                class="cheat-checkbox"
                hide-details
                dense
                @change="onThemeChange" />
            <v-checkbox
                v-model="useGameFont"
                label="Game font"
                class="cheat-checkbox"
                hide-details
                dense
                @change="onLayoutChange" />
        </div>
        <div class="caption">The game font falls back to a readable system font when unavailable.</div>
    </section>
</v-card>
    `,

  data() {
    const primaryColor = readThemeSelection().primary;
    return {
      useGameFont: readBooleanSetting("cheatModal.gameFont", false),
      overlayWidth: readNumberSetting("cheatModal.width", 750),
      overlayHeight: readNumberSetting("cheatModal.height", 450),
      windowOpacity: readNumberSetting(WINDOW_OPACITY_SETTING, 0.9),
      isDarkMode: readBooleanSetting(THEME_DARK_MODE_SETTING, true),
      primaryColor: primaryColor,
      colorOptions: ACCENT_COLOR_OPTIONS,
      themeStyle: readThemeStyle(),
      themeStyles: [
        { text: "Current", value: "current" },
        { text: "Legacy", value: "legacy" },
      ],
    };
  },

  mounted() {
    this.applyTheme();
  },

  methods: {
    onLayoutChange() {
      writeBooleanSetting("cheatModal.gameFont", this.useGameFont);
      writeNumberSetting(
        "cheatModal.width",
        Math.max(320, Math.min(4096, Number(this.overlayWidth) || 750)),
      );
      writeNumberSetting(
        "cheatModal.height",
        Math.max(240, Math.min(2160, Number(this.overlayHeight) || 450)),
      );
      window.dispatchEvent(new CustomEvent("cheat-layout-change"));
      const game = getGameWindow();
      if (game && game !== window)
        game.dispatchEvent(new game.CustomEvent("cheat-layout-change"));
    },
    resetOverlaySize() {
      this.overlayWidth = 750;
      this.overlayHeight = 450;
      this.onLayoutChange();
    },
    selectColor(value) {
      this.primaryColor = value;
      this.onColorChange();
    },
    onOpacityChange(val) {
      writeNumberSetting(WINDOW_OPACITY_SETTING, val);
      window.dispatchEvent(
        new CustomEvent("cheat-appearance-change", {
          detail: {
            windowOpacity: val,
          },
        }),
      );
    },
    onThemeChange() {
      writeBooleanSetting(THEME_DARK_MODE_SETTING, this.isDarkMode);
      this.applyTheme();
    },
    onStyleChange() {
      KEY_VALUE_STORAGE.setItem(THEME_STYLE, this.themeStyle);
      this.applyTheme();
    },
    onColorChange() {
      KEY_VALUE_STORAGE.setItem(THEME_PRIMARY_COLOR, this.primaryColor);
      this.applyTheme();
    },
    applyTheme() {
      this.$vuetify.theme.dark = this.isDarkMode;

      // Both themes keep the accent so flipping dark mode never changes color.
      this.$vuetify.theme.themes.dark.primary = this.primaryColor;
      this.$vuetify.theme.themes.light.primary = this.primaryColor;

      window.dispatchEvent(
        new CustomEvent("cheat-theme-change", {
          detail: {
            isDarkMode: this.isDarkMode,
            primaryColor: this.primaryColor,
          },
        }),
      );
      // The overlay listens for profile changes to re-apply its CSS accent.
      window.dispatchEvent(new CustomEvent("cheat-profile-change"));
      const game = getGameWindow();
      if (game && game !== window)
        game.dispatchEvent(new game.CustomEvent("cheat-profile-change"));
    },
  },
};
