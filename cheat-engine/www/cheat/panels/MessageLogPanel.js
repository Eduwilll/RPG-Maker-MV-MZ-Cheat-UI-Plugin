import {
  readMessageLog,
  readMessageLogPreferences,
  messageLogPreferenceRevision,
  writeMessageLogPreferences,
  resetMessageLogPreferences,
} from "../js/panels/history/MessageLogPanelState.js";
import {
  getFeatureRuntime,
  getGameWindow,
} from "../js/runtime/FeatureRuntime.js";
import { downloadText } from "../js/ui/FileTransfer.js";
import MessagePortrait from "../components/MessagePortrait.js";
import MessageTextContent from "../components/MessageTextContent.js";
import GameAsset from "../components/GameAsset.js";
import { applyGameFont } from "../js/ui/GameFont.js";
import {
  messageLogStyle,
  PLUGIN_LOG_FONT,
} from "../js/panels/history/MessageLogPreferences.js";
import { deepFreeze } from "../js/ui/StaticData.js";

const FONT_MODES = deepFreeze([
  { text: "Game font (default)", value: "game" },
  { text: "Plugin font (fallback)", value: "plugin" },
]);

const SIZE_MODES = deepFreeze([
  { text: "Default (16 px)", value: "default" },
  { text: "Custom", value: "custom" },
]);

export default {
  name: "MessageLogPanel",
  components: { MessagePortrait, MessageTextContent, GameAsset },
  data() {
    return {
      search: "",
      rows: [],
      error: "",
      confirmClear: false,
      preferences: readMessageLogPreferences(),
      fontModes: FONT_MODES,
      sizeModes: SIZE_MODES,
    };
  },
  watch: {
    search() {
      this.refresh();
    },
  },
  mounted() {
    this.applyFontPreference();
    this.refresh();
    this._timer = setInterval(this.refresh, 1000);
  },
  beforeDestroy() {
    clearInterval(this._timer);
  },
  template: `<v-card flat class="cheat-panel message-log">
    <div class="cheat-panel__head message-log__head">
      <div>
        <div class="cheat-panel__title">Message Log</div>
        <div class="cheat-panel__meta">Latest 1,000 entries in this session. Loading or starting a game clears history.</div>
      </div>
      <div class="message-log__actions">
        <v-btn x-small text @click="refresh">Refresh</v-btn>
        <v-btn x-small text @click="exportLog">Export</v-btn>
        <v-btn x-small text @click="confirmClear = true">Clear</v-btn>
      </div>
    </div>
    <div class="message-log__toolbar">
      <v-text-field v-model="search" class="message-log__search" dense outlined hide-details label="Search dialogue, speaker or map" @keydown.stop/>
      <v-select v-model="preferences.fontMode" class="message-log__select" :items="fontModes" label="Log font" dense outlined hide-details data-testid="message-log-font" @change="savePreferences"/>
      <v-select v-model="preferences.sizeMode" class="message-log__select" :items="sizeModes" label="Text size" dense outlined hide-details data-testid="message-log-size-mode" @change="savePreferences"/>
      <v-text-field v-if="preferences.sizeMode === 'custom'" v-model="preferences.fontSize" class="message-log__size" label="Size (px)" type="number" min="12" max="40" step="1" dense outlined hide-details data-testid="message-log-font-size" @keydown.stop @change="savePreferences"/>
      <v-btn x-small text class="message-log__reset" title="Reset text display" aria-label="Reset text display" @click="resetPreferences"><v-icon small>mdi-restore</v-icon></v-btn>
    </div>
    <v-alert v-if="error" type="error" dense>{{ error }}</v-alert>
    <div class="message-log__history">
      <div v-for="row in rows" :key="row.id" :data-message-id="row.id" class="message-log__row">
        <message-portrait v-if="row.faceName || row.speaker || row.pictureName" :face-name="row.faceName" :face-index="row.faceIndex" :speaker="row.speaker" :actor-id="row.actorId" :picture-name="row.pictureName"/>
        <div class="message-log__body">
          <div class="caption cheat-muted">{{ row.timestamp }} | {{ row.mapName }} #{{ row.mapId }}</div>
          <div v-if="row.type === 'choice'" class="caption cheat-muted">Chosen response</div>
          <div class="cheat-message-copy message-log__copy" :style="textStyle(row.textStyle)">
            <div class="font-weight-bold cheat-message-speaker message-log__speaker" v-if="row.speaker" :aria-label="row.speaker" :title="row.speaker"><game-asset v-if="row.speakerIcon && !row.speakerDisplay" :descriptor="{type:'icon',index:row.speakerIcon}" :size="22" :navigate="false"/><message-text-content :text="row.speakerDisplay || row.speaker"/></div>
            <div v-else class="caption cheat-muted">{{ row.type === 'message' ? 'Narration / unknown speaker' : row.type }}</div>
            <message-text-content :text="row.text"/>
          </div>
        </div>
      </div>
      <p v-if="!rows.length" class="pa-2">No dialogue captured yet, or no search matches.</p>
    </div>
    <v-dialog v-model="confirmClear" max-width="360"><v-card><v-card-text class="pt-4">Clear captured dialogue? The game's message is not affected.</v-card-text><v-card-actions><v-btn text @click="confirmClear = false">Cancel</v-btn><v-btn text color="error" @click="clearLog">Clear</v-btn></v-card-actions></v-card></v-dialog>
  </v-card>`,
  methods: {
    textStyle(serialized) {
      return messageLogStyle(serialized, this.preferences);
    },
    applyFontPreference() {
      if (!this.$el) return;
      const useGame = this.preferences.fontMode === "game";
      applyGameFont(this.$el, getGameWindow(), useGame);
      if (useGame) this.$el.style.removeProperty("font-family");
      else {
        // Override inherited Appearance game fonts as well as captured row fonts.
        this.$el.style.fontFamily = PLUGIN_LOG_FONT;
        this.$el.style.setProperty("--cheat-game-font", PLUGIN_LOG_FONT);
      }
    },
    savePreferences() {
      writeMessageLogPreferences(this.preferences);
      this.preferences = readMessageLogPreferences();
      this._preferenceRevision = messageLogPreferenceRevision();
      this.applyFontPreference();
    },
    resetPreferences() {
      resetMessageLogPreferences();
      this._preferenceRevision = null;
      this.refresh();
    },
    refresh() {
      this.rows = readMessageLog(this.search);
      const revision = messageLogPreferenceRevision();
      if (revision !== this._preferenceRevision) {
        this.preferences = readMessageLogPreferences();
        this._preferenceRevision = revision;
        this.applyFontPreference();
      }
    },
    clearLog() {
      const runtime = getFeatureRuntime();
      if (runtime) runtime.history.clear();
      this.confirmClear = false;
      this.refresh();
    },
    exportLog() {
      try {
        const runtime = getFeatureRuntime();
        if (runtime)
          downloadText("cheat-dialogue.txt", runtime.history.exportText());
      } catch (error) {
        this.error = error.message;
      }
    },
  },
};
