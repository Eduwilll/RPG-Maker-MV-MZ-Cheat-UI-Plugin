import {
  coercePanelNumber,
  runPanelMutation,
} from "../js/panels/PanelGameState.js";
import {
  readMinimapSettings,
  writeMinimapEnabled,
  writeMinimapPosition,
  writeMinimapCustomX,
  writeMinimapCustomY,
  writeMinimapSize,
  writeMinimapZoom,
  writeMinimapMode,
  writeMinimapOpacity,
  writeMinimapShowEvents,
  MINIMAP_POSITIONS,
  MINIMAP_MODES,
} from "../js/panels/minimap/MinimapPanelState.js";
import { getMinimapStatus } from "../js/panels/minimap/MinimapRenderer.js";

export default {
  name: "MinimapPanel",

  template: `
<v-card flat class="ma-0 pa-0">
    <v-card-subtitle class="pa-1">Realistic Minimap</v-card-subtitle>
    <v-row dense class="ma-0">
        <v-col cols="12">
            <v-switch
                v-model="settings.enabled"
                label="Show minimap"
                dense hide-details class="my-0"
                @change="onEnabledChange"></v-switch>
        </v-col>
        <v-col cols="12">
            <v-switch
                v-model="settings.showEvents"
                label="Show event markers"
                dense hide-details class="my-0"
                @change="onShowEventsChange"></v-switch>
        </v-col>
        <v-col cols="12" md="6">
            <v-select
                label="Position"
                v-model="settings.position"
                :items="positions"
                outlined dense hide-details
                @change="onPositionChange"></v-select>
        </v-col>
        <v-col cols="12" md="6">
            <v-select
                label="Mode"
                v-model="settings.mode"
                :items="modes"
                outlined dense hide-details
                @change="onModeChange"></v-select>
        </v-col>
        <v-col cols="6" v-if="settings.position === 'custom'">
            <v-text-field
                label="X (px)"
                v-model="settings.customX"
                outlined dense hide-details
                @keydown.self.stop
                @change="onCustomXChange"
                @focus="$event.target.select()"></v-text-field>
        </v-col>
        <v-col cols="6" v-if="settings.position === 'custom'">
            <v-text-field
                label="Y (px)"
                v-model="settings.customY"
                outlined dense hide-details
                @keydown.self.stop
                @change="onCustomYChange"
                @focus="$event.target.select()"></v-text-field>
        </v-col>
        <v-col cols="12">
            <v-slider
                v-model="settings.size"
                label="Size"
                min="96"
                max="320"
                step="8"
                thumb-label="always"
                @change="onSizeChange">
            </v-slider>
        </v-col>
        <v-col cols="12">
            <v-slider
                v-model="settings.zoom"
                label="Zoom"
                min="0.5"
                max="4"
                step="0.25"
                thumb-label="always"
                @change="onZoomChange">
                <template v-slot:thumb-label="{ value }">
                    {{ Math.round(value * 100) }}%
                </template>
            </v-slider>
        </v-col>
        <v-col cols="12">
            <v-slider
                v-model="settings.opacity"
                label="Opacity"
                min="0.2"
                max="1.0"
                step="0.05"
                thumb-label="always"
                @change="onOpacityChange">
                <template v-slot:thumb-label="{ value }">
                    {{ Math.round(value * 100) }}%
                </template>
            </v-slider>
        </v-col>
        <v-col cols="12">
            <p class="caption grey--text mb-0">Follow centers the map on your character. Full fits the whole map. White dot is you, orange dots are events. Toggle anytime with Alt+N.</p>
            <p class="caption mb-0">Status: {{ statusText }}</p>
        </v-col>
    </v-row>
</v-card>
    `,

  data() {
    return {
      settings: readMinimapSettings(),
      positions: MINIMAP_POSITIONS,
      modes: MINIMAP_MODES,
      statusText: "unknown",
    };
  },

  created() {
    this.initializeVariables();
  },

  mounted() {
    var self = this;
    this.statusIntervalId = setInterval(function () {
      self.refreshStatus();
    }, 1000);
  },

  beforeDestroy() {
    if (this.statusIntervalId) {
      clearInterval(this.statusIntervalId);
      this.statusIntervalId = null;
    }
  },

  methods: {
    initializeVariables() {
      this.settings = readMinimapSettings();
      this.refreshStatus();
    },

    refreshStatus() {
      try {
        var status = getMinimapStatus();
        this.statusText =
          status.stage + (status.detail ? " - " + status.detail : "");
      } catch (e) {
        this.statusText = "unavailable";
      }
    },

    onEnabledChange() {
      writeMinimapEnabled(this.settings.enabled);
      runPanelMutation(this, function () {});
    },

    onShowEventsChange() {
      writeMinimapShowEvents(this.settings.showEvents);
      runPanelMutation(this, function () {});
    },

    onPositionChange() {
      writeMinimapPosition(this.settings.position);
      runPanelMutation(this, function () {});
    },

    onModeChange() {
      writeMinimapMode(this.settings.mode);
      runPanelMutation(this, function () {});
    },

    onCustomXChange() {
      var next = coercePanelNumber(this.settings.customX, {
        fallback: 8,
        integer: true,
        min: 0,
      });
      this.settings.customX = next;
      writeMinimapCustomX(next);
    },

    onCustomYChange() {
      var next = coercePanelNumber(this.settings.customY, {
        fallback: 8,
        integer: true,
        min: 0,
      });
      this.settings.customY = next;
      writeMinimapCustomY(next);
    },

    onSizeChange() {
      var next = coercePanelNumber(this.settings.size, {
        fallback: 176,
        integer: true,
        min: 96,
        max: 320,
      });
      this.settings.size = next;
      writeMinimapSize(next);
    },

    onZoomChange() {
      var next = coercePanelNumber(this.settings.zoom, {
        fallback: 1,
        min: 0.5,
        max: 4,
      });
      this.settings.zoom = next;
      writeMinimapZoom(next);
    },

    onOpacityChange() {
      var next = coercePanelNumber(this.settings.opacity, {
        fallback: 0.85,
        min: 0.2,
        max: 1.0,
      });
      this.settings.opacity = next;
      writeMinimapOpacity(next);
    },
  },
};
