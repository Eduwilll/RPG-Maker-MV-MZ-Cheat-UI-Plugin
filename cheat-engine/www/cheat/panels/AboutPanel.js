import { Alert } from "../js/AlertHelper.js";
import {
  buildAboutPanelSummary,
  readAboutPanelState,
} from "../js/panels/AboutPanelState.js";

export default {
  name: "AboutPanel",

  template: `
<v-card flat class="ma-0 pa-0" style="position: relative;">
    <v-btn
        style="top: 8px; right: 8px;"
        color="pink"
        dark
        x-small
        absolute
        fab
        title="Refresh environment info"
        @click="initializeVariables">
        <v-icon small>mdi-refresh</v-icon>
    </v-btn>

    <v-card-subtitle class="pb-0 font-weight-bold">Overview</v-card-subtitle>
    <v-card-text class="pt-0 pb-2">
        <v-chip small color="teal" text-color="white" class="mr-2 mb-2">
            <v-icon small left>mdi-information-outline</v-icon>
            Cheat {{ info.cheatVersion }}
        </v-chip>
        <v-chip small color="blue" text-color="white" class="mr-2 mb-2">
            <v-icon small left>mdi-controller-classic-outline</v-icon>
            {{ info.engineName }}
        </v-chip>
        <v-chip small color="indigo" text-color="white" class="mr-2 mb-2">
            <v-icon small left>mdi-monitor-dashboard</v-icon>
            {{ info.viewMode }}
        </v-chip>
        <v-chip small color="green" text-color="white" class="mb-2">
            <v-icon small left>mdi-translate</v-icon>
            {{ info.translationEndpointName }}
        </v-chip>
    </v-card-text>

    <v-card-text class="pt-0 pb-2">
        <v-btn small color="primary" @click="copySummary">
            <v-icon small left>mdi-content-copy</v-icon>
            Copy Summary
        </v-btn>
    </v-card-text>

    <v-card-subtitle class="pb-0 font-weight-bold">Cheat</v-card-subtitle>
    <v-card-text class="pt-0 pb-2">
        <v-simple-table dense>
            <tbody>
                <tr v-for="row in cheatRows" :key="'cheat-' + row.label">
                    <td class="caption font-weight-bold pr-4" style="width: 180px;">{{row.label}}</td>
                    <td class="caption" style="word-break: break-word;">{{row.value}}</td>
                </tr>
            </tbody>
        </v-simple-table>
    </v-card-text>

    <v-card-subtitle class="pb-0 font-weight-bold">Game</v-card-subtitle>
    <v-card-text class="pt-0 pb-2">
        <v-simple-table dense>
            <tbody>
                <tr v-for="row in gameRows" :key="'game-' + row.label">
                    <td class="caption font-weight-bold pr-4" style="width: 180px;">{{row.label}}</td>
                    <td class="caption" style="word-break: break-word;">{{row.value}}</td>
                </tr>
            </tbody>
        </v-simple-table>
    </v-card-text>

    <v-card-subtitle class="pb-0 font-weight-bold">Runtime</v-card-subtitle>
    <v-card-text class="pt-0 pb-2">
        <v-simple-table dense>
            <tbody>
                <tr v-for="row in runtimeRows" :key="'runtime-' + row.label">
                    <td class="caption font-weight-bold pr-4" style="width: 180px;">{{row.label}}</td>
                    <td class="caption" style="word-break: break-word;">{{row.value}}</td>
                </tr>
            </tbody>
        </v-simple-table>
    </v-card-text>

    <v-card-subtitle class="pb-0 font-weight-bold">Translation</v-card-subtitle>
    <v-card-text class="pt-0 pb-2">
        <v-simple-table dense>
            <tbody>
                <tr v-for="row in translationRows" :key="'translation-' + row.label">
                    <td class="caption font-weight-bold pr-4" style="width: 180px;">{{row.label}}</td>
                    <td class="caption" style="word-break: break-word;">{{row.value}}</td>
                </tr>
            </tbody>
        </v-simple-table>
    </v-card-text>

    <v-card-subtitle class="pb-0 font-weight-bold">Paths</v-card-subtitle>
    <v-card-text class="pt-0 pb-2">
        <v-simple-table dense>
            <tbody>
                <tr v-for="row in pathRows" :key="'path-' + row.label">
                    <td class="caption font-weight-bold pr-4" style="width: 180px;">{{row.label}}</td>
                    <td class="caption" style="word-break: break-word;">{{row.value}}</td>
                </tr>
            </tbody>
        </v-simple-table>
    </v-card-text>

    <v-card-subtitle class="pb-0 font-weight-bold">Summary</v-card-subtitle>
    <v-card-text class="pt-0">
        <v-textarea
            :value="summaryText"
            readonly
            auto-grow
            solo
            dense
            hide-details
            background-color="grey darken-3">
        </v-textarea>
    </v-card-text>
</v-card>
    `,

  data() {
    return {
      info: readAboutPanelState(),
    };
  },

  created() {
    this.initializeVariables();
  },

  computed: {
    cheatRows() {
      return [
        { label: "Cheat Version", value: this.info.cheatVersion },
        { label: "View Mode", value: this.info.viewMode },
        { label: "Runtime Mode", value: this.info.runtimeMode },
      ];
    },

    gameRows() {
      return [
        { label: "Game Title", value: this.info.gameTitle },
        { label: "Engine", value: this.info.engineName },
        { label: "Current Scene", value: this.info.currentScene },
        { label: "Current Map", value: this.info.currentMapText },
        { label: "Playtest", value: this.info.isPlaytest ? "Yes" : "No" },
      ];
    },

    runtimeRows() {
      return [
        { label: "Language", value: this.info.language },
        { label: "NW.js", value: this.info.nwjsVersion },
        { label: "Chromium", value: this.info.chromiumVersion },
        { label: "Node", value: this.info.nodeVersion },
        { label: "Executable", value: this.info.executablePath },
        { label: "Working Directory", value: this.info.workingDirectory },
        { label: "User Agent", value: this.info.userAgent },
      ];
    },

    translationRows() {
      return [
        {
          label: "Translation Enabled",
          value: this.info.translationEnabled ? "Yes" : "No",
        },
        { label: "Endpoint", value: this.info.translationEndpointName },
        {
          label: "Endpoint Id",
          value: this.info.translationEndpointSelection,
        },
        { label: "Chunk Size", value: String(this.info.translationChunkSize) },
        {
          label: "Cache Entries",
          value: String(this.info.translationBankEntries),
        },
        {
          label: "Enabled Targets",
          value: this.info.enabledTranslationTargets.join(", ") || "None",
        },
      ];
    },

    pathRows() {
      return [
        { label: "Cheat Root", value: this.info.cheatRootDir },
        { label: "Game Root", value: this.info.gameRootDir },
        { label: "Game Data", value: this.info.gameDataDir },
        { label: "Version File", value: this.info.cheatVersionPath },
        { label: "Settings Directory", value: this.info.settingsDir },
        {
          label: "Translate Settings",
          value: this.info.translateSettingsPath,
        },
        { label: "Translation Bank", value: this.info.translationBankPath },
        { label: "Shortcut Settings", value: this.info.shortcutSettingsPath },
      ];
    },

    summaryText() {
      return buildAboutPanelSummary(this.info);
    },
  },

  methods: {
    initializeVariables() {
      this.info = readAboutPanelState();
    },

    copySummary() {
      const text = this.summaryText;

      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            Alert.success("About summary copied");
          })
          .catch(() => {
            this.copySummaryLegacy(text);
          });
        return;
      }

      this.copySummaryLegacy(text);
    },

    copySummaryLegacy(text) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "readonly");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        document.execCommand("copy");
        Alert.success("About summary copied");
      } catch (error) {
        Alert.error("Failed to copy about summary");
      }

      document.body.removeChild(textarea);
    },
  },
};
