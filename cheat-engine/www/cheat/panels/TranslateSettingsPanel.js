import {
  TRANSLATE_SETTINGS,
  DEFAULT_END_POINTS,
  RECOMMEND_CHUNK_SIZE,
  MAX_CHUNK_SIZE,
  TRANSLATION_BANK,
  TRANSLATE_PROGRESS,
} from "../js/TranslateHelper.js";
import { TRANSLATOR } from "../js/TranslateHelper.js";
import { isInValueInRange } from "../js/GlobalShortcut.js";
import { Alert } from "../js/AlertHelper.js";
import { IN_GAME_TRANSLATOR } from "../js/InGameTranslator.js";

export default {
  name: "TranslateSettingsPanel",

  template: `
<v-card flat class="ma-0 pa-0">
    <v-card-subtitle class="pb-0 font-weight-bold">Usage</v-card-subtitle>
    <v-card-text class="pb-0">
        <span
            v-if="selectedDefaultEndPoint">
            <a 
                v-if="selectedDefaultEndPoint.helpUrl" 
                :href="selectedDefaultEndPoint.helpUrl" 
                target="_blank">
                {{selectedDefaultEndPoint.name}}
            </a>
            <span v-else>{{selectedDefaultEndPoint.name}}</span>
            must be running before translation.
        </span>
        <span
            v-if="isCustomEndPoint">
            Custom translation server must be running before translation.
        </span>
    </v-card-text>
    <v-card-text class="py-0" :class="translatorStatusColor + '--text'">
        {{translatorStatusMessage}}
    </v-card-text>
    <v-card-subtitle class="pb-0 mt-4 font-weight-bold">Translate</v-card-subtitle>
    <v-card-text class="py-0">
        <v-switch
            v-model="enabled"
            label="Enable"
            dense
            hide-details
            @click.self.stop
            @change="onChangeEnabled">
        </v-switch>
    </v-card-text>
    
    <v-card-subtitle class="pb-0 mt-4 font-weight-bold">End Point</v-card-subtitle>
    <v-card-text class="py-0">
        <v-radio-group 
            hide-details
            v-model="endPointSelection" 
            @change="onChangeEndPoint"
            :disabled="!enabled">
            <v-radio
                v-for="item in endPointList"
                :key="item.id"
                :label="item.name"
                :value="item.id">
            </v-radio>
        </v-radio-group>
    </v-card-text>
    
    <v-card-text 
        class="py-0 mt-1 mb-0" 
        v-if="selectedDefaultEndPoint && selectedDefaultEndPoint.helpUrl">
        <a :href="selectedDefaultEndPoint.helpUrl" target="_blank">How to set up "{{selectedDefaultEndPoint.name}}"</a>
    </v-card-text>
    
    <v-card-text 
        class="py-0 mt-4 mb-0"
        v-if="isCustomEndPoint">
        <v-row>
            <v-col
                cols="12"
                md="3">
                <v-select
                    v-model="customEndPointData.method"
                    dense
                    hide-details
                    :items="restApiMethods"
                    item-value="value"
                    item-text="name"
                    background-color="grey darken-3"
                    label="Method"
                    solo
                    :disabled="!enabled"
                    @change="onChangeCustomEndPointMethod">
                    <template v-slot:selection="{ item }">
                        <span class="body-2">{{item.name}}</span>
                    </template>
                </v-select>
            </v-col>
            <v-col
                cols="12"
                md="9">
                <v-text-field
                    class="body-2"
                    v-model="customEndPointData.urlPattern"
                    dense
                    hide-details
                    label="URL Pattern"
                    background-color="grey darken-3"
                    solo
                    :disabled="!enabled"
                    @keydown.self.stop
                    @change="onChangeCustomEndPointUrlPattern">
                </v-text-field>
            </v-col>
        </v-row>
        
        <v-textarea
            class="mt-2"
            v-model="customEndPointData.body"
            solo
            dense
            hide-details
            row-height="1"
            auto-grow
            background-color="grey darken-3"
            label="Body"
            :disabled="!enabled"
            @keydown.self.stop
            @change="onChangeCustomEndPointBody">
        </v-textarea>
    </v-card-text>
    
    <!-- LLM Configuration Panel -->
    <v-card-text 
        class="py-0 mt-4 mb-0"
        v-if="isLLMEndPoint">
        <v-card-subtitle class="pa-0 mb-2 font-weight-bold">🤖 LLM Configuration</v-card-subtitle>
        
        <v-text-field
            class="body-2 mb-2"
            v-model="llmConfig.model"
            dense
            hide-details
            label="Model Name"
            hint="e.g. qwen3:8b, gemma3:12b, gpt-4o-mini, gemini-2.0-flash, deepseek-chat"
            persistent-hint
            background-color="grey darken-3"
            solo
            :disabled="!enabled"
            @keydown.self.stop
            @change="onChangeLLMConfig">
        </v-text-field>

        <v-text-field
            class="body-2 mb-2"
            v-if="selectedDefaultEndPoint && selectedDefaultEndPoint.data.requiresApiKey || llmConfig.apiKey"
            v-model="llmConfig.apiKey"
            dense
            hide-details
            label="API Key"
            type="password"
            background-color="grey darken-3"
            solo
            :disabled="!enabled"
            @keydown.self.stop
            @change="onChangeLLMConfig">
        </v-text-field>

        <v-text-field
            class="body-2 mb-2"
            v-if="endPointSelection === 'llmCustom'"
            v-model="llmConfig.apiUrl"
            dense
            hide-details
            label="API URL (OpenAI-compatible endpoint)"
            hint="e.g. http://localhost:11434/v1/chat/completions"
            persistent-hint
            background-color="grey darken-3"
            solo
            :disabled="!enabled"
            @keydown.self.stop
            @change="onChangeLLMConfig">
        </v-text-field>

        <v-card-text class="pa-0 mt-1 caption grey--text">
            <strong>Recommended models:</strong> qwen3:8b, gemma3:12b (Ollama) · gpt-4o-mini (OpenAI) · gemini-2.0-flash (Google) · deepseek-chat (DeepSeek)
        </v-card-text>
    </v-card-text>
    
    
    <v-card-subtitle class="pb-0 mt-4 font-weight-bold">Bulk translate</v-card-subtitle>
    <v-card-text class="py-0 mt-1">
        <v-text-field
            class="body-2"
            v-model="bulkTranslateChunkSize"
            dense
            hide-details
            label="Chunk size"
            background-color="grey darken-3"
            solo
            :disabled="!enabled"
            @keydown.self.stop
            @change="onChnageBulkTranslateChunkSize">
        </v-text-field>
        <span class="caption grey--text">Number of items to combine into single API requests using delimiters.</span><br/>
        <span class="caption grey--text">Higher values = fewer API calls but longer requests.</span><br/>
        <span v-if="recommendChunkSizeDesc" class="caption font-weight-bold teal--text">{{recommendChunkSizeDesc}}</span><br/>
        <span v-if="chunkSizeWarning.message" :class="chunkSizeWarning.class">{{chunkSizeWarning.message}}</span>

        <v-switch
            v-model="useBatchTranslation"
            label="Use Batch Translation (Combine multiple texts per request)"
            :disabled="!enabled"
            dense
            hide-details
            class="mt-3"
            @change="onChangeBatchTranslation">
        </v-switch>
        <span class="caption grey--text">
            Batch mode combines multiple texts with delimiters, dramatically reducing API calls.<br/>
            Example: 200 variables → 4-8 API calls instead of 200 individual calls.<br/>
            <span v-if="isJpToKrEndpoint" class="orange--text font-weight-bold">
                ⚠️ JP→KR endpoints use original method (batch mode disabled for compatibility)
            </span>
        </span>
    </v-card-text>

    
    <v-card-subtitle class="pb-0 mt-4 font-weight-bold">Targets</v-card-subtitle>
    <v-card-text class="py-0">
        <v-switch
            class="mb-1 mt-4"
            v-model="targets.items"
            label="Translate Items"
            :disabled="!enabled"
            dense
            hide-details
            @click.self.stop
            @change="onChangeTargetsValue">
        </v-switch>
        
        <v-switch
            class="my-1"
            v-model="targets.weapons"
            label="Translate Weapons"
            :disabled="!enabled"
            dense
            hide-details
            @click.self.stop
            @change="onChangeTargetsValue">
        </v-switch>
        
        <v-switch
            class="my-1"
            v-model="targets.armors"
            label="Translate Armors"
            :disabled="!enabled"
            dense
            hide-details
            @click.self.stop
            @change="onChangeTargetsValue">
        </v-switch>
        
        <v-switch
            class="mb-1 mt-4"
            v-model="targets.variables"
            label="Translate Variables"
            :disabled="!enabled"
            dense
            hide-details
            @click.self.stop
            @change="onChangeTargetsValue">
        </v-switch>
        
        <v-switch
            v-model="targets.switches"
            class="my-1"
            label="Translate Switches"
            :disabled="!enabled"
            dense
            hide-details
            @click.self.stop
            @change="onChangeTargetsValue">
        </v-switch>
        
        <v-switch
            v-model="targets.maps"
            class="my-1"
            label="Translate Maps"
            :disabled="!enabled"
            dense
            hide-details
            @click.self.stop
            @change="onChangeTargetsValue">
        </v-switch>

        <v-divider class="my-2"></v-divider>

        <v-switch
            v-model="targets.skills"
            class="my-1"
            label="Translate Skills"
            :disabled="!enabled"
            dense
            hide-details
            @click.self.stop
            @change="onChangeTargetsValue">
        </v-switch>

        <v-switch
            v-model="targets.states"
            class="my-1"
            label="Translate States"
            :disabled="!enabled"
            dense
            hide-details
            @click.self.stop
            @change="onChangeTargetsValue">
        </v-switch>

        <v-switch
            v-model="targets.classes"
            class="my-1"
            label="Translate Classes"
            :disabled="!enabled"
            dense
            hide-details
            @click.self.stop
            @change="onChangeTargetsValue">
        </v-switch>

        <v-switch
            v-model="targets.enemies"
            class="my-1"
            label="Translate Enemies"
            :disabled="!enabled"
            dense
            hide-details
            @click.self.stop
            @change="onChangeTargetsValue">
        </v-switch>

        <v-divider class="my-2"></v-divider>
        <span class="caption font-weight-bold teal--text">🌐 Full Game Translation</span>

        <v-switch
            v-model="targets.actors"
            class="my-1"
            label="Translate Actors (Names, Nicknames, Profiles)"
            :disabled="!enabled"
            dense
            hide-details
            @click.self.stop
            @change="onChangeTargetsValue">
        </v-switch>

        <v-switch
            v-model="targets.system"
            class="my-1"
            label="Translate System Terms (Menus, Battle Messages, Parameters)"
            :disabled="!enabled"
            dense
            hide-details
            @click.self.stop
            @change="onChangeTargetsValue">
        </v-switch>

        <v-switch
            v-model="targets.dialogues"
            class="my-1"
            label="Translate ALL Dialogues (Event Text, Choices, Common Events)"
            :disabled="!enabled"
            dense
            hide-details
            @click.self.stop
            @change="onChangeTargetsValue">
        </v-switch>
        <span class="caption grey--text">
            Scans ALL map files and extracts every dialogue, choice, scroll text,<br/>
            battle event text, and common event text for translation.
        </span>
    </v-card-text>

    <v-card-subtitle class="pb-0 mt-4 font-weight-bold">In-Game Translation Status</v-card-subtitle>
    <v-card-text class="py-0">
        <v-row class="mt-1">
            <v-col cols="12">
                <v-chip small :color="isDataPatched ? 'green' : 'grey'" text-color="white" class="mr-2">
                    <v-icon small left>{{isDataPatched ? 'mdi-check-circle' : 'mdi-close-circle'}}</v-icon>
                    Game Data: {{isDataPatched ? 'Translated' : 'Original'}}
                </v-chip>
                <v-chip small color="blue" text-color="white">
                    <v-icon small left>mdi-translate</v-icon>
                    {{inGamePatchCount}} strings patched
                </v-chip>
            </v-col>
        </v-row>
        <v-btn
            small
            color="teal"
            class="mt-2"
            @click="reapplyInGameTranslation"
            :disabled="!enabled || bankStats.totalEntries === 0">
            <v-icon small left>mdi-refresh</v-icon>
            Re-apply Translation to Game Data
        </v-btn>
        <v-btn
            small
            color="orange"
            class="mt-2 ml-2"
            @click="revertInGameTranslation"
            :disabled="!isDataPatched">
            <v-icon small left>mdi-undo</v-icon>
            Revert to Original
        </v-btn>
        <br/>
        <span class="caption grey--text">
            After running "Start Translation", the plugin automatically applies<br/>
            translations to ALL in-game text (menus, dialogues, battles, shops).<br/>
            Use "Re-apply" if the game reloads data. Use "Revert" to restore Japanese.
        </span>
    </v-card-text>

    <v-card-subtitle class="pb-0 mt-4 font-weight-bold">Translation Bank</v-card-subtitle>
    <v-card-text class="py-0">
        <v-row>
            <v-col cols="12" md="6">
                <v-chip small color="green" text-color="white" class="mr-2">
                    <v-icon small left>mdi-database</v-icon>
                    {{bankStats.totalEntries}} cached
                </v-chip>
                <v-chip small color="blue" text-color="white">
                    <v-icon small left>mdi-clock</v-icon>
                    {{bankStats.ageText}}
                </v-chip>
            </v-col>
            <v-col cols="12" md="6">
                <v-btn
                    small
                    color="orange"
                    @click="clearTranslationBank"
                    :disabled="!enabled">
                    <v-icon small left>mdi-delete</v-icon>
                    Clear Bank
                </v-btn>
                <v-btn
                    small
                    color="blue"
                    class="ml-2"
                    @click="exportTranslationBank"
                    :disabled="!enabled">
                    <v-icon small left>mdi-export</v-icon>
                    Export
                </v-btn>
            </v-col>
        </v-row>
        <span class="caption grey--text">
            Translation bank stores successful translations for instant reuse.<br/>
            Cached translations load instantly without API calls.
        </span>

        <v-divider class="my-4"></v-divider>
        <div class="d-flex align-center mt-2">
            <v-btn
                color="green"
                class="flex-grow-1"
                @click="startGlobalTranslation"
                :disabled="!enabled || isTranslatingGlobals">
                <v-icon left>mdi-translate</v-icon>
                Start {{ isTranslatingGlobals ? 'Translating' : 'Translation' }}
            </v-btn>

            <v-chip
                v-if="isTranslatingGlobals"
                small
                color="orange"
                text-color="white"
                class="ml-3 px-3 py-4 font-weight-bold"
                style="height: 36px">
                <v-icon small left>mdi-translate</v-icon>
                {{globalTranslationText}}... {{Math.round(globalTranslationProgress)}}%
            </v-chip>
        </div>

        <v-btn
            color="primary"
            class="mt-2"
            block
            outlined
            @click="testTranslationEndpoint"
            :loading="isTestingTranslation">
            <v-icon left>mdi-flask</v-icon>
            Test Translation Connection
        </v-btn>
    </v-card-text>
</v-card>
    `,

  data() {
    return {
      translatorStatusChangedTime: 0,
      translatorChecking: false,
      translatorRunning: false,
      enabled: false,
      targets: {},

      endPointSelection: "",

      restApiMethods: [
        {
          name: "GET",
          value: "get",
        },
        {
          name: "POST",
          value: "post",
        },
      ],

      customEndPointData: {},

      llmConfig: {
        apiKey: "",
        model: "",
        apiUrl: "",
        systemPrompt: "",
      },

      bulkTranslateChunkSize: 500,

      // Translation bank stats
      bankStats: {
        totalEntries: 0,
        ageText: "No data",
      },

      // Chunk size warning
      chunkSizeWarning: {
        message: "",
        class: "",
      },

      // Batch translation setting
      useBatchTranslation: true,

      // Testing state
      isTestingTranslation: false,

      // Global Translation Progress
      isTranslatingGlobals: false,
      globalTranslationProgress: 0,
      globalTranslationText: "",

      // In-Game Translation Status
      isDataPatched: false,
      inGamePatchCount: 0,
    };
  },

  created() {
    this.initializeVariables();

    // Listen to global translation progress
    this._progressTracker = (state) => {
      this.isTranslatingGlobals = state.isTranslating;
      this.globalTranslationProgress = state.progress;
      this.globalTranslationText = state.text;
    };
    TRANSLATE_PROGRESS.subscribe(this._progressTracker);

    // Listen for data patching events
    this._dataPatchListener = (e) => {
      this.isDataPatched = IN_GAME_TRANSLATOR.isDataPatched();
      this.inGamePatchCount = e.detail ? e.detail.patchCount : 0;
    };
    window.addEventListener("cheat-data-patched", this._dataPatchListener);
  },

  beforeDestroy() {
    if (this._progressTracker) {
      TRANSLATE_PROGRESS.unsubscribe(this._progressTracker);
    }
    if (this._dataPatchListener) {
      window.removeEventListener("cheat-data-patched", this._dataPatchListener);
    }
  },

  computed: {
    translatorStatusMessage() {
      if (this.translatorChecking) {
        return "Checking translation server...";
      }

      if (this.translatorRunning) {
        const serverName = this.selectedDefaultEndPoint
          ? this.selectedDefaultEndPoint.name
          : "Custom";
        return `Translation server(${serverName}) is now running`;
      }

      return "WARN: Translator server is not running";
    },

    translatorStatusColor() {
      if (this.translatorChecking) {
        return "orange";
      }

      if (this.translatorRunning) {
        return "green";
      }

      return "red";
    },

    endPointList() {
      const ret = Object.values(DEFAULT_END_POINTS).map((ep) => ({
        id: ep.id,
        name: ep.name,
      }));
      ret.push({ id: "custom", name: "Custom" });

      return ret;
    },

    isCustomEndPoint() {
      return this.endPointSelection === "custom";
    },

    isLLMEndPoint() {
      const ep = DEFAULT_END_POINTS[this.endPointSelection];
      return ep && ep.data && ep.data.isLLM;
    },

    selectedDefaultEndPoint() {
      return DEFAULT_END_POINTS[this.endPointSelection];
    },

    recommendChunkSizeDesc() {
      if (
        this.isCustomEndPoint ||
        !RECOMMEND_CHUNK_SIZE[this.endPointSelection]
      ) {
        return null;
      }

      return `Recommended chunk size for ${this.selectedDefaultEndPoint.name} : ${RECOMMEND_CHUNK_SIZE[this.endPointSelection]}`;
    },

    isJpToKrEndpoint() {
      return (
        this.endPointSelection === "ezTransWeb" ||
        this.endPointSelection === "ezTransServer"
      );
    },
  },

  methods: {
    async initializeVariables() {
      this.enabled = TRANSLATE_SETTINGS.isEnabled();

      this.endPointSelection = TRANSLATE_SETTINGS.getEndPointSelection();
      this.customEndPointData = TRANSLATE_SETTINGS.getCustomEndPointData();
      this.llmConfig = TRANSLATE_SETTINGS.getLLMConfig();

      this.targets = TRANSLATE_SETTINGS.getTargets();
      this.bulkTranslateChunkSize =
        TRANSLATE_SETTINGS.getBulkTranslateChunkSize();

      // Load batch translation preference
      this.useBatchTranslation =
        localStorage.getItem("useBatchTranslation") !== "false";

      this.updateBankStats();
      this.checkChunkSize();
      this.checkTranslatorAvailable();
    },

    onChangeEnabled() {
      TRANSLATE_SETTINGS.setEnabled(this.enabled);
    },

    onChangeTargetsValue() {
      TRANSLATE_SETTINGS.setTargets(this.targets);
    },

    async checkTranslatorAvailable() {
      const time = Date.now();

      this.translatorChecking = true;
      const currentRunningState = await TRANSLATOR.isAvailable();

      if (this.translatorStatusChangedTime < time) {
        this.translatorStatusChangedTime = time;
        this.translatorChecking = false;
        this.translatorRunning = currentRunningState;
      }
    },

    onChangeEndPoint() {
      TRANSLATE_SETTINGS.setEndPointSelection(this.endPointSelection);
      this.checkTranslatorAvailable();
    },

    onChangeCustomEndPointMethod() {
      TRANSLATE_SETTINGS.setCustomEndPointMethod(
        this.customEndPointData.method,
      );
      this.checkTranslatorAvailable();
    },

    onChangeCustomEndPointUrlPattern() {
      TRANSLATE_SETTINGS.setCustomEndPointUrlPattern(
        this.customEndPointData.urlPattern,
      );
      this.checkTranslatorAvailable();
    },

    onChangeCustomEndPointBody() {
      TRANSLATE_SETTINGS.setCustomEndPointBody(this.customEndPointData.body);
      this.checkTranslatorAvailable();
    },

    onChangeLLMConfig() {
      TRANSLATE_SETTINGS.setLLMConfig(this.llmConfig);
    },

    checkChunkSize() {
      const chunkSize = Number(this.bulkTranslateChunkSize);
      const endPointId = this.endPointSelection;
      const maxSafe = MAX_CHUNK_SIZE[endPointId] || 50;

      if (chunkSize <= 0) {
        this.chunkSizeWarning = {
          message: "Chunk size must be greater than 0",
          class: "caption font-weight-bold red--text",
        };
      } else if (chunkSize > maxSafe) {
        this.chunkSizeWarning = {
          message: `⚠️ Large chunk size (${chunkSize}) may cause issues with ${endPointId}. Recommended max: ${maxSafe}`,
          class: "caption font-weight-bold orange--text",
        };
      } else if (chunkSize > 100) {
        this.chunkSizeWarning = {
          message: `⚠️ Large chunk size may be slower due to rate limiting`,
          class: "caption font-weight-bold amber--text",
        };
      } else {
        this.chunkSizeWarning = {
          message: "✅ Good chunk size for reliable translation",
          class: "caption font-weight-bold green--text",
        };
      }
    },

    onChnageBulkTranslateChunkSize() {
      const validateMsg = isInValueInRange(
        this.bulkTranslateChunkSize,
        1,
        2000,
      );

      if (validateMsg) {
        Alert.error(validateMsg);
        this.bulkTranslateChunkSize = 500;
        return;
      }

      this.checkChunkSize();
      TRANSLATE_SETTINGS.setBulkTranslateChunkSize(
        Number(this.bulkTranslateChunkSize),
      );
    },

    onChangeBatchTranslation() {
      // Store batch translation preference
      localStorage.setItem(
        "useBatchTranslation",
        this.useBatchTranslation.toString(),
      );
      console.log(
        `Batch translation ${this.useBatchTranslation ? "enabled" : "disabled"}`,
      );
    },

    updateBankStats() {
      const stats = TRANSLATION_BANK.getStats();
      this.bankStats.totalEntries = stats.totalEntries;

      if (stats.newestEntry) {
        const age = Date.now() - stats.newestEntry;
        const days = Math.floor(age / (24 * 60 * 60 * 1000));
        if (days > 0) {
          this.bankStats.ageText = `${days} days old`;
        } else {
          this.bankStats.ageText = "Recent";
        }
      } else {
        this.bankStats.ageText = "No data";
      }
    },

    clearTranslationBank() {
      if (confirm("Clear all cached translations? This cannot be undone.")) {
        TRANSLATION_BANK.cache = {};
        TRANSLATION_BANK.saveCache();
        this.updateBankStats();
        Alert.success("Translation bank cleared");
      }
    },

    exportTranslationBank() {
      try {
        const data = TRANSLATION_BANK.export();
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `translation-bank-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Alert.success("Translation bank exported");
      } catch (error) {
        Alert.error("Failed to export translation bank");
        console.error("Export error:", error);
      }
    },

    async testTranslationEndpoint() {
      this.isTestingTranslation = true;
      try {
        Alert.success("Testing translation... Please wait.");
        const result = await TRANSLATOR.__translate("テスト");
        if (result && result !== "テスト") {
          Alert.success('Success! Translated "テスト" to "' + result + '"');
        } else {
          Alert.error(
            "Failed: End point returned original text or empty. Check F8 console.",
          );
        }
      } catch (err) {
        Alert.error("Connection error: " + err.message);
        console.error("Test Translation Error:", err);
      } finally {
        this.isTestingTranslation = false;
      }
    },

    async startGlobalTranslation() {
      if (!this.enabled) return;
      console.log("Starting global pre-translation module");
      await TRANSLATOR.translateAllGlobals();
      this.updateBankStats();
      this.isDataPatched = IN_GAME_TRANSLATOR.isDataPatched();
    },

    reapplyInGameTranslation() {
      IN_GAME_TRANSLATOR.applyTranslationsToGameData();
      this.isDataPatched = IN_GAME_TRANSLATOR.isDataPatched();
      Alert.success("In-game translation re-applied!");
    },

    revertInGameTranslation() {
      IN_GAME_TRANSLATOR.revertGameData();
      this.isDataPatched = false;
      this.inGamePatchCount = 0;
      Alert.success("Game text reverted to original!");
    },
  },
};
