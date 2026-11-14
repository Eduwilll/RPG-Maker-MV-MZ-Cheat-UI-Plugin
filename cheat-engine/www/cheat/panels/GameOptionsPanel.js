import { getFeatureRuntime } from "../js/runtime/FeatureRuntime.js";
import { readGameOptionsState } from "../js/panels/options/GameOptionsPanelState.js";
import { downloadText } from "../js/ui/FileTransfer.js";
export default {
  name: "GameOptionsPanel",
  data() {
    return {
      rows: [],
      error: "",
      status: "",
      profileText: "",
      preview: null,
      confirmImport: false,
    };
  },
  mounted() {
    this.refresh();
  },
  template: `<v-card flat class="pa-1"><div class="d-flex align-center subtitle-1">Game Options<v-spacer/><v-btn text x-small @click="refresh">Reload</v-btn></div><p class="caption">Game-specific controls appear first when safe to discover. Only options changed here are added to your portable backup.</p><v-alert v-if="error" dense type="error">{{error}}</v-alert><v-alert v-if="status" dense type="info">{{status}}</v-alert>
    <div v-for="row in rows" :key="row.symbol" :data-feature="anchor(row.symbol)" class="py-1"><div class="d-flex align-center"><v-checkbox v-if="row.type==='boolean'" :input-value="row.value" :label="row.label + (row.custom ? ' (game)' : '')" :disabled="!row.supported" dense hide-details class="mt-0" @change="set(row,$event)"/><v-text-field v-else-if="row.type==='number'" :value="row.value" :label="row.label + (row.custom ? ' (game)' : '')" type="number" :min="row.min" :max="row.max" :step="row.step" :disabled="!row.supported" dense outlined hide-details @keydown.stop @change="set(row,Number($event))"/><span v-else class="body-2">{{row.label}}</span><v-btn v-if="row.included" text x-small title="Keep current value, exclude it from future backups" @click="exclude(row)">Exclude from Backup</v-btn></div><div v-if="!row.supported" class="caption grey--text">{{row.reason}}</div></div>
    <v-divider class="my-3"/><div data-feature="settings-profile" class="subtitle-2">Portable Settings Backup</div><p class="caption">Includes changed game options, supported appearance preferences and shortcut bindings. Excludes locks, favorites, dialogue and database edits. Installer recovery backups are separate.</p>
    <v-btn small class="mr-1" @click="exportProfile">Export File</v-btn><v-btn small text @click="$refs.file.click()">Open File</v-btn><input ref="file" type="file" accept=".json,application/json" style="display:none;" @change="readFile"/>
    <v-textarea v-model="profileText" label="Settings JSON (paste or open a file)" rows="4" outlined dense class="mt-2" hide-details @keydown.stop/><v-btn small class="mt-2" :disabled="!profileText.trim()" @click="previewImport">Preview Import</v-btn>
    <v-dialog v-model="confirmImport" max-width="480"><v-card><v-card-title class="subtitle-1">Restore Settings?</v-card-title><v-card-text v-if="preview" style="max-height:300px;overflow-y:auto;"><div v-for="(row,i) in preview.changes" :key="'c'+i">{{row.label}}: {{row.value}}</div><div v-for="(row,i) in preview.ignored" :key="'i'+i" class="orange--text">Skipped {{row.symbol}}: {{row.reason}}</div><p class="caption mt-2">Unlisted game settings are left unchanged.</p></v-card-text><v-card-actions><v-btn text @click="confirmImport=false">Cancel</v-btn><v-btn text color="primary" @click="importProfile">Apply</v-btn></v-card-actions></v-card></v-dialog>
  </v-card>`,
  methods: {
    refresh() {
      this.rows = readGameOptionsState();
    },
    anchor(symbol) {
      return symbol === "alwaysDash"
        ? "always-dash"
        : symbol === "commandRemember"
          ? "command-remember"
          : /Volume$/.test(symbol)
            ? "volume"
            : symbol;
    },
    set(row, value) {
      try {
        getFeatureRuntime().options.set(row.symbol, value);
        this.error = "";
        this.refresh();
      } catch (error) {
        this.error = error.message;
        this.refresh();
      }
    },
    exclude(row) {
      getFeatureRuntime().options.removeFromProfile(row.symbol);
      this.refresh();
    },
    exportProfile() {
      try {
        this.profileText = getFeatureRuntime().options.exportProfile();
        downloadText(
          "cheat-settings-profile.json",
          this.profileText,
          "application/json",
        );
      } catch (error) {
        this.error = error.message;
      }
    },
    readFile(event) {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 1048576) {
        this.error = "Settings profile is too large (maximum 1 MiB)";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.profileText = String(reader.result);
        this.previewImport();
      };
      reader.onerror = () => {
        this.error = "Could not read settings profile";
      };
      reader.readAsText(file);
      event.target.value = "";
    },
    previewImport() {
      try {
        this.preview = getFeatureRuntime().options.previewProfile(
          this.profileText,
        );
        this.confirmImport = true;
        this.error = "";
      } catch (error) {
        this.error = error.message;
      }
    },
    importProfile() {
      try {
        const result = getFeatureRuntime().options.importProfile(
          this.profileText,
        );
        this.status =
          "Applied " +
          result.applied.length +
          " settings; skipped " +
          result.ignored.length +
          "; errors " +
          result.errors.length +
          ".";
        this.error = result.errors
          .map((row) => row.symbol + ": " + row.reason)
          .join("; ");
        this.confirmImport = false;
        this.refresh();
        window.dispatchEvent(new CustomEvent("cheat-profile-change"));
      } catch (error) {
        this.error = error.message;
      }
    },
  },
};
