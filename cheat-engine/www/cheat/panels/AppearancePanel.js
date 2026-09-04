import {
  readNumberSetting,
  writeNumberSetting,
  readBooleanSetting,
  writeBooleanSetting,
} from "../js/ui/CheatUiSettings.js";
import { KEY_VALUE_STORAGE } from "../js/storage/KeyValueStorage.js";

const WINDOW_OPACITY_SETTING = "cheatModal.windowOpacity";
const THEME_DARK_MODE_SETTING = "cheatModal.themeDarkMode";
const THEME_PRIMARY_COLOR = "cheatModal.themePrimaryColor";

export default {
  name: "AppearancePanel",

  template: `
<v-container>
    <v-row class="mb-4">
        <v-col>
            <div class="subtitle-1 mb-2">Window Appearance</div>
            <v-divider></v-divider>
        </v-col>
    </v-row>

    <v-row align="center">
        <v-col cols="12">
            <v-slider
                v-model="windowOpacity"
                label="Window Opacity"
                min="0.1"
                max="1.0"
                step="0.05"
                thumb-label="always"
                @change="onOpacityChange"
            >
                <template v-slot:thumb-label="{ value }">
                    {{ Math.round(value * 100) }}%
                </template>
            </v-slider>
        </v-col>
    </v-row>
    
    <v-row class="mb-4 mt-4">
        <v-col>
            <div class="subtitle-1 mb-2">Theme & Colors</div>
            <v-divider></v-divider>
        </v-col>
    </v-row>

    <v-row align="center">
        <v-col cols="12" md="6">
            <v-switch
                v-model="isDarkMode"
                label="Dark Mode"
                @change="onThemeChange"
                color="primary"
            ></v-switch>
        </v-col>
        <v-col cols="12" md="6">
            <v-select
                v-model="primaryColor"
                :items="colorOptions"
                label="Primary Accent Color"
                @change="onColorChange"
                dense
            >
                <template v-slot:item="{ item }">
                    <v-icon :color="item.value" left>mdi-circle</v-icon>
                    {{ item.text }}
                </template>
                <template v-slot:selection="{ item }">
                    <v-icon :color="item.value" left>mdi-circle</v-icon>
                    {{ item.text }}
                </template>
            </v-select>
        </v-col>
    </v-row>
</v-container>
    `,

  data() {
    return {
      windowOpacity: readNumberSetting(WINDOW_OPACITY_SETTING, 1.0),
      isDarkMode: readBooleanSetting(THEME_DARK_MODE_SETTING, true),
      primaryColor: KEY_VALUE_STORAGE.getItem(THEME_PRIMARY_COLOR) || "#1976D2", // default blue
      colorOptions: [
        { text: "Blue (Default)", value: "#1976D2" },
        { text: "Red", value: "#F44336" },
        { text: "Pink", value: "#E91E63" },
        { text: "Purple", value: "#9C27B0" },
        { text: "Deep Purple", value: "#673AB7" },
        { text: "Indigo", value: "#3F51B5" },
        { text: "Light Blue", value: "#03A9F4" },
        { text: "Cyan", value: "#00BCD4" },
        { text: "Teal", value: "#009688" },
        { text: "Green", value: "#4CAF50" },
        { text: "Light Green", value: "#8BC34A" },
        { text: "Lime", value: "#CDDC39" },
        { text: "Yellow", value: "#FFEB3B" },
        { text: "Amber", value: "#FFC107" },
        { text: "Orange", value: "#FF9800" },
        { text: "Deep Orange", value: "#FF5722" },
      ],
    };
  },

  mounted() {
    this.applyTheme();
  },

  methods: {
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
    onColorChange() {
      KEY_VALUE_STORAGE.setItem(THEME_PRIMARY_COLOR, this.primaryColor);
      this.applyTheme();
    },
    applyTheme() {
      this.$vuetify.theme.dark = this.isDarkMode;

      if (this.isDarkMode) {
        this.$vuetify.theme.themes.dark.primary = this.primaryColor;
      } else {
        this.$vuetify.theme.themes.light.primary = this.primaryColor;
      }

      window.dispatchEvent(
        new CustomEvent("cheat-theme-change", {
          detail: {
            isDarkMode: this.isDarkMode,
            primaryColor: this.primaryColor,
          },
        }),
      );
    },
  },
};
