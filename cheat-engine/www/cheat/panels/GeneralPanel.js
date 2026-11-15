import { GeneralCheat } from "../js/cheats/GeneralCheat.js";
import { SceneCheat } from "../js/cheats/SceneCheat.js";
import { GameSpeedCheat, SpeedCheat } from "../js/cheats/SpeedCheat.js";
import {
  coercePanelNumber,
  runPanelMutation,
} from "../js/panels/PanelGameState.js";
import {
  readGeneralGold,
  readGeneralPanelState,
  isGeneralGameReady,
} from "../js/panels/general/GeneralPanelState.js";
import LockFavoriteControls from "../components/LockFavoriteControls.js";

export default {
  name: "GeneralPanel",
  components: { LockFavoriteControls },

  template: `
<v-card flat class="cheat-panel">
    <div class="cheat-panel__head">
        <div>
            <div class="cheat-panel__title">Gameplay</div>
            <div class="cheat-panel__meta">{{ gameReady ? 'Changes apply to the running game immediately' : 'Waiting for a game session' }}</div>
        </div>
        <v-btn
            small
            text
            title="Reload values from game data"
            aria-label="Reload values from game data"
            @click="initializeVariables">
            <v-icon left small>mdi-refresh</v-icon>
            Refresh
        </v-btn>
    </div>

    <v-alert v-if="!gameReady" dense text type="info" class="mb-3">
        Start or load a game to use gameplay controls. Other cheat panels remain available.
    </v-alert>

    <section class="cheat-section">
        <div class="cheat-section__title">Toggles</div>
        <div class="cheat-filter-bar">
            <v-checkbox
                data-feature="no-clip"
                v-model="noClip"
                :disabled="!gameReady"
                label="No clip"
                hide-details
                dense
                @change="onNoClipChange" />
            <v-checkbox
                v-model="forceSave"
                :disabled="!gameReady"
                label="Force save"
                hide-details
                dense
                @change="onForceSaveChange" />
            <v-checkbox
                data-feature="mouse-controls"
                v-model="mouseMove"
                :disabled="!gameReady"
                label="Mouse controls"
                hide-details
                dense
                @change="onMouseMoveChange" />
            <v-checkbox
                data-feature="mouse-teleport"
                v-model="mouseTeleport"
                :disabled="!gameReady"
                label="Click to teleport"
                hide-details
                dense
                @change="onMouseTeleportChange" />
        </div>
    </section>

    <section class="cheat-section">
        <div class="cheat-section__title">Gold</div>
        <div class="cheat-inline">
            <v-text-field
                data-feature="gold"
                v-model="gold"
                :disabled="!gameReady"
                label="Party gold"
                outlined
                dense
                hide-details
                class="cheat-field-gold"
                @keydown.self.stop
                @change="onGoldChange"
                @focus="$event.target.select()" />
            <lock-favorite-controls v-if="gameReady" :target="{kind:'gold'}" :value="Number(gold)" @change="initializeVariables"/>
        </div>
    </section>

    <section class="cheat-section">
        <div class="cheat-section__title">Speeds</div>

        <div class="cheat-slider__head">
            <span class="cheat-slider__label">Move speed</span>
            <span class="cheat-stepper-group">
                <button type="button" class="cheat-stepper" aria-label="Decrease move speed" @click="addSpeed(-stepSpeed)">
                    <v-icon small>mdi-minus</v-icon>
                </button>
                <span class="cheat-value cheat-value--centre">{{ speed.toFixed(1) }}</span>
                <button type="button" class="cheat-stepper" aria-label="Increase move speed" @click="addSpeed(stepSpeed)">
                    <v-icon small>mdi-plus</v-icon>
                </button>
            </span>
        </div>
        <v-slider
            data-feature="move-speed"
            v-model="speed"
            :disabled="!gameReady"
            :min="minSpeed"
            :max="maxSpeed"
            :step="stepSpeed"
            color="primary"
            hide-details
            class="cheat-slider"
            @change="onSpeedChange" />
        <v-checkbox
            v-model="fixSpeed"
            :disabled="!gameReady"
            class="cheat-checkbox"
            hide-details
            dense
            label="Keep move speed fixed"
            @change="onSpeedChange" />

        <div class="cheat-slider__head cheat-slider__head--spaced">
            <span class="cheat-slider__label">Game speed</span>
            <span class="cheat-stepper-group">
                <button type="button" class="cheat-stepper" aria-label="Decrease game speed" @click="addGameSpeed(-stepGameSpeed)">
                    <v-icon small>mdi-minus</v-icon>
                </button>
                <span class="cheat-value cheat-value--centre">x{{ gameSpeed.toFixed(1) }}</span>
                <button type="button" class="cheat-stepper" aria-label="Increase game speed" @click="addGameSpeed(stepGameSpeed)">
                    <v-icon small>mdi-plus</v-icon>
                </button>
                <button type="button" class="cheat-stepper cheat-stepper--reset" aria-label="Reset game speed to normal" title="Reset to normal speed" @click="setGameSpeed(1)">
                    <v-icon small>mdi-restore</v-icon>
                </button>
            </span>
        </div>
        <v-slider
            data-feature="game-speed"
            v-model="gameSpeed"
            :disabled="!gameReady"
            :min="minGameSpeed"
            :max="maxGameSpeed"
            :step="stepGameSpeed"
            color="primary"
            hide-details
            class="cheat-slider"
            @change="onGameSpeedChange" />
        <div class="cheat-grid cheat-grid--toggles">
            <v-checkbox
                v-model="applyAllForGameSpeed"
                :disabled="!gameReady"
                class="cheat-checkbox"
                hide-details
                dense
                label="All scenes"
                @change="onApplyAllForGameSpeedChange" />
            <v-checkbox
                v-model="applyBattleForGameSpeed"
                :disabled="!gameReady"
                class="cheat-checkbox"
                hide-details
                dense
                label="Battle scenes"
                @change="onApplyBattleForGameSpeedChange" />
        </div>
    </section>

    <section class="cheat-section">
        <div class="cheat-section__title">Screens</div>
        <div class="cheat-actions">
            <v-btn small outlined :disabled="!gameReady" @click="toggleSaveScene">Open Save</v-btn>
            <v-btn small outlined @click="toggleLoadScene">Open Load</v-btn>
            <v-btn small outlined @click="gotoTitle">To Title</v-btn>
        </div>
    </section>

    <section class="cheat-section">
        <div class="cheat-section__title">Developer</div>
        <div class="cheat-actions">
            <v-btn
                small
                outlined
                :disabled="!gameReady"
                title="Open RPG Maker Debug Menu (F9)"
                @click="openDebugMenu">
                Debug Menu
            </v-btn>
            <v-btn
                v-if="canOpenConsole"
                small
                outlined
                title="Open NW.js Developer Console"
                @click="openConsole">
                Open Console
            </v-btn>
            <v-btn
                v-if="canOpenConsole"
                small
                color="primary"
                title="Pop out Cheat Engine to a separate window"
                @click="openCheatWindow">
                Pop Out
            </v-btn>
        </div>
    </section>
</v-card>
    `,

  data() {
    return {
      gameReady: false,
      godMode: false,
      noClip: false,
      gold: 0,
      speed: 0,
      fixSpeed: false,

      minSpeed: 1,
      maxSpeed: 10,
      stepSpeed: 0.5,

      gameSpeed: 1,
      minGameSpeed: 0.1,
      maxGameSpeed: 10,
      stepGameSpeed: 0.1,
      applyAllForGameSpeed: false,
      applyBattleForGameSpeed: false,
      forceSave: false,
      mouseMove: false,
      mouseTeleport: false,
      canOpenConsole:
        typeof nw !== "undefined" || typeof require === "function",
    };
  },

  created() {
    this.initializeVariables();
  },

  mounted() {
    this._sessionCheck = setInterval(() => {
      if (isGeneralGameReady() !== this.gameReady) this.initializeVariables();
    }, 500);
    window.addEventListener(
      "cheat-move-speed-change",
      this.initializeVariables,
    );
    window.addEventListener(
      "cheat-game-speed-change",
      this.initializeVariables,
    );
  },

  beforeDestroy() {
    clearInterval(this._sessionCheck);
    window.removeEventListener(
      "cheat-move-speed-change",
      this.initializeVariables,
    );
    window.removeEventListener(
      "cheat-game-speed-change",
      this.initializeVariables,
    );
  },

  methods: {
    initializeVariables() {
      const state = readGeneralPanelState();

      this.gameReady = state.gameReady;
      this.noClip = state.noClip;
      this.speed = state.moveSpeed;
      this.fixSpeed = state.fixSpeed;
      this.gold = state.gold;

      this.forceSave = state.forceSave;
      this.mouseMove = state.mouseMove;
      this.mouseTeleport = state.mouseTeleport;

      this.gameSpeed = state.gameSpeed;
      this.applyAllForGameSpeed = state.applyAllForGameSpeed;
      this.applyBattleForGameSpeed = state.applyBattleForGameSpeed;
    },

    runGameMutation(mutate) {
      if (!isGeneralGameReady()) {
        this.initializeVariables();
        return;
      }
      return runPanelMutation(this, mutate);
    },

    onNoClipChange() {
      this.runGameMutation(() => {
        GeneralCheat.toggleNoClip();
      });
    },

    onSpeedChange() {
      this.runGameMutation(() => {
        SpeedCheat.setSpeed(this.speed, this.fixSpeed);
        SpeedCheat.__writeSettings(this.speed, this.fixSpeed);
      });
    },

    addSpeed(amount) {
      this.speed = Math.min(
        Math.max(this.speed + amount, this.minSpeed),
        this.maxSpeed,
      );
      this.onSpeedChange();
    },

    onGoldChange() {
      if (!isGeneralGameReady()) {
        this.initializeVariables();
        return;
      }
      this.gold = coercePanelNumber(this.gold, {
        fallback: readGeneralGold(),
        integer: true,
        min: 0,
      });

      const currentGold = readGeneralGold();
      const diff = this.gold - currentGold;

      if (diff < 0) {
        $gameParty.loseGold(-diff);
      } else if (diff > 0) {
        $gameParty.gainGold(diff);
      }

      runPanelMutation(this, () => {
        this.gold = readGeneralGold();
      });
    },

    gotoTitle() {
      SceneCheat.gotoTitle();
    },

    toggleSaveScene() {
      this.runGameMutation(() => SceneCheat.toggleSaveScene());
    },

    toggleLoadScene() {
      SceneCheat.toggleLoadScene();
    },

    onGameSpeedChange() {
      let sceneOption = null;
      if (this.applyAllForGameSpeed) {
        sceneOption = GameSpeedCheat.sceneOptions().all;
      } else if (this.applyBattleForGameSpeed) {
        sceneOption = GameSpeedCheat.sceneOptions().battle;
      }

      this.runGameMutation(() => {
        GameSpeedCheat.setGameSpeed(this.gameSpeed, sceneOption);
        GameSpeedCheat.__writeSettings(this.gameSpeed, sceneOption);
      });
    },

    addGameSpeed(amount) {
      this.gameSpeed = Math.min(
        Math.max(this.gameSpeed + amount, this.minGameSpeed),
        this.maxGameSpeed,
      );
      this.onGameSpeedChange();
    },

    setGameSpeed(amount) {
      this.gameSpeed = 1;
      this.onGameSpeedChange();
    },

    onApplyAllForGameSpeedChange() {
      if (this.applyAllForGameSpeed) {
        this.applyBattleForGameSpeed = true;
      } else {
        this.applyBattleForGameSpeed = true;
      }

      this.onGameSpeedChange();
    },

    onApplyBattleForGameSpeedChange() {
      if (this.applyBattleForGameSpeed) {
        return this.onGameSpeedChange();
      }

      if (this.applyAllForGameSpeed) {
        this.applyAllForGameSpeed = false;
        this.applyBattleForGameSpeed = true;
      } else {
        this.applyAllForGameSpeed = true;
        this.applyBattleForGameSpeed = true;
      }

      this.onGameSpeedChange();
    },

    onForceSaveChange() {
      this.runGameMutation(() => {
        GeneralCheat.forceEnableSave(this.forceSave);
      });
    },

    openConsole() {
      GeneralCheat.openConsole();
    },

    onMouseTeleportChange() {
      this.runGameMutation(() => {
        GeneralCheat.toggleMouseTeleport(this.mouseTeleport);
        this.mouseMove = GeneralCheat.isMouseMoveEnabled();
      });
    },

    onMouseMoveChange() {
      this.runGameMutation(() => {
        GeneralCheat.toggleMouseMove(this.mouseMove);
        this.mouseTeleport = GeneralCheat.isMouseTeleportEnabled();
      });
    },

    openDebugMenu() {
      this.runGameMutation(() => GeneralCheat.openDebugMenu());
    },

    openCheatWindow() {
      GeneralCheat.openCheatWindow();
    },
  },
};
