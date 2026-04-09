import { GeneralCheat } from "../js/CheatGeneral.js";
import { SceneCheat } from "../js/cheats/SceneCheat.js";
import { GameSpeedCheat, SpeedCheat } from "../js/CheatSpeed.js";
import {
  coercePanelNumber,
  readGeneralPanelState,
  runPanelMutation,
} from "../js/panels/PanelGameState.js";

export default {
  name: "GeneralPanel",

  template: `
<v-card class="ma-0 pa-0" flat style="position: relative;">
    <v-btn
        style="top: 8px; right: 8px;"
        color="pink"
        dark
        x-small
        absolute
        fab
        title="Reload from game data"
        @click="initializeVariables">
        <v-icon small>mdi-refresh</v-icon>
    </v-btn>

    <!-- Edit Section -->
    <v-card-subtitle class="pb-0 font-weight-bold">Edit</v-card-subtitle>

    <v-card-text class="py-1">
        <v-row no-gutters align="center" justify="start">
            <v-col cols="auto">
                <v-checkbox
                    v-model="noClip"
                    label="No Clip"
                    hide-details
                    dense
                    @change="onNoClipChange" />
            </v-col>
            <v-col cols="auto" class="ml-3">
                <v-checkbox
                    v-model="forceSave"
                    label="Force Save"
                    hide-details
                    dense
                    @change="onForceSaveChange" />
            </v-col>
            <v-col cols="auto" class="ml-3">
                <v-checkbox
                    v-model="mouseTeleport"
                    label="Mouse Tele"
                    hide-details
                    dense
                    @change="onMouseTeleportChange" />
            </v-col>
        </v-row>
    </v-card-text>

    <v-card-text class="py-1">
        <v-text-field
            v-model="gold"
            label="Gold"
            outlined
            dense
            hide-details
            @keydown.self.stop
            @change="onGoldChange"
            @focus="$event.target.select()" />
    </v-card-text>

    <!-- Speed Section -->
    <v-card-text class="pt-3 pb-1">
        <v-slider
            v-model="speed"
            :min="minSpeed"
            :max="maxSpeed"
            :step="stepSpeed"
            thumb-label
            thumb-color="red"
            hide-details
            @change="onSpeedChange">
            <template v-slot:prepend>
                <span class="grey--text text--lighten-1 align-self-center mr-1 body-2" style="white-space: nowrap;">Move Speed</span>
                <v-icon color="grey lighten-3" @click="addSpeed(-stepSpeed)">mdi-chevron-left</v-icon>
            </template>
            <template v-slot:append>
                <v-icon color="grey lighten-3" @click="addSpeed(stepSpeed)">mdi-chevron-right</v-icon>
                <span class="grey--text text--lighten-1 align-self-center ml-2">{{ speed.toFixed(1) }}</span>
            </template>
        </v-slider>
        <v-checkbox
            v-model="fixSpeed"
            class="mt-1 pt-0"
            hide-details
            dense
            label="Fixed"
            @change="onSpeedChange" />

        <v-slider
            v-model="gameSpeed"
            :min="minGameSpeed"
            :max="maxGameSpeed"
            :step="stepGameSpeed"
            class="mt-4"
            thumb-label
            thumb-color="red"
            hide-details
            @change="onGameSpeedChange">
            <template v-slot:prepend>
                <span class="grey--text text--lighten-1 align-self-center mr-1 body-2" style="white-space: nowrap;">Game Speed</span>
                <v-icon color="grey lighten-3" @click="addGameSpeed(-stepGameSpeed)">mdi-chevron-left</v-icon>
            </template>
            <template v-slot:append>
                <v-icon color="grey lighten-3" @click="addGameSpeed(stepGameSpeed)">mdi-chevron-right</v-icon>
                <span class="grey--text text--lighten-1 align-self-center ml-2">x{{ gameSpeed.toFixed(1) }}</span>
                <v-icon size="16" color="grey lighten-3" class="ml-2" @click="setGameSpeed(1)">mdi-restore</v-icon>
            </template>
        </v-slider>

        <v-row no-gutters align="center" class="mt-1">
            <v-col cols="auto">
                <v-checkbox
                    v-model="applyAllForGameSpeed"
                    class="pt-0"
                    hide-details
                    dense
                    label="All"
                    @change="onApplyAllForGameSpeedChange" />
            </v-col>
            <v-col cols="auto" class="ml-3">
                <v-checkbox
                    v-model="applyBattleForGameSpeed"
                    class="pt-0"
                    hide-details
                    dense
                    label="Battle"
                    @change="onApplyBattleForGameSpeedChange" />
            </v-col>
        </v-row>
    </v-card-text>

    <!-- Quick Actions Section -->
    <v-card-subtitle class="mt-1 pb-1 font-weight-bold">Quick Actions</v-card-subtitle>

    <v-card-text class="py-1">
        <v-row no-gutters>
            <v-btn small @click="gotoTitle">To Title</v-btn>
            <v-btn
                v-if="canOpenConsole"
                small
                class="ml-1"
                title="Open NW.js Developer Console"
                @click="openConsole">
                Open Console
            </v-btn>
            <v-btn
                small
                class="ml-1"
                title="Open RPG Maker Debug Menu (F9)"
                @click="openDebugMenu">
                Debug Menu
            </v-btn>
            <v-btn
                v-if="canOpenConsole"
                small
                class="ml-1"
                color="primary"
                title="Pop out Cheat Engine to a separate window"
                @click="openCheatWindow">
                Pop Out
            </v-btn>
        </v-row>
    </v-card-text>

    <v-card-text class="pt-1 pb-3">
        <v-row no-gutters>
            <v-btn small class="mr-1" @click="toggleSaveScene">Open Save</v-btn>
            <v-btn small @click="toggleLoadScene">Open Load</v-btn>
        </v-row>
    </v-card-text>
</v-card>
    `,

  data() {
    return {
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
      mouseTeleport: false,
      canOpenConsole:
        typeof nw !== "undefined" || typeof require === "function",
    };
  },

  created() {
    this.initializeVariables();
  },

  methods: {
    initializeVariables() {
      const state = readGeneralPanelState();

      this.noClip = state.noClip;
      this.speed = state.moveSpeed;
      this.fixSpeed = SpeedCheat.isFixed();
      this.gold = state.gold;

      this.forceSave = state.forceSave;
      this.mouseTeleport = state.mouseTeleport;

      this.gameSpeed = state.gameSpeed;
      this.applyAllForGameSpeed = false;
      this.applyBattleForGameSpeed = false;

      const gameSpeedSceneOption = state.gameSpeedSceneOption;
      if (gameSpeedSceneOption === GameSpeedCheat.sceneOptions().all) {
        this.applyAllForGameSpeed = true;
      } else if (
        gameSpeedSceneOption === GameSpeedCheat.sceneOptions().battle
      ) {
        this.applyBattleForGameSpeed = true;
      }
    },

    onNoClipChange() {
      runPanelMutation(this, () => {
        GeneralCheat.toggleNoClip();
      });
    },

    onSpeedChange() {
      runPanelMutation(this, () => {
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
      this.gold = coercePanelNumber(this.gold, {
        fallback: readGeneralPanelState().gold,
        integer: true,
        min: 0,
      });

      const currentGold = readGeneralPanelState().gold;
      const diff = this.gold - currentGold;

      if (diff < 0) {
        $gameParty.loseGold(-diff);
      } else if (diff > 0) {
        $gameParty.gainGold(diff);
      }

      runPanelMutation(this, () => {
        this.gold = readGeneralPanelState().gold;
      });
    },

    gotoTitle() {
      SceneCheat.gotoTitle();
    },

    toggleSaveScene() {
      SceneCheat.toggleSaveScene();
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

      runPanelMutation(this, () => {
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
        this.applyBattleForGameSpeed = false;
      } else {
        this.applyBattleForGameSpeed = true;
      }

      this.onGameSpeedChange();
    },

    onApplyBattleForGameSpeedChange() {
      if (this.applyBattleForGameSpeed) {
        this.applyAllForGameSpeed = false;
      } else {
        this.applyAllForGameSpeed = true;
      }

      this.onGameSpeedChange();
    },

    onForceSaveChange() {
      runPanelMutation(this, () => {
        GeneralCheat.forceEnableSave(this.forceSave);
      });
    },

    openConsole() {
      GeneralCheat.openConsole();
    },

    onMouseTeleportChange() {
      runPanelMutation(this, () => {
        GeneralCheat.toggleMouseTeleport(this.mouseTeleport);
      });
    },

    openDebugMenu() {
      GeneralCheat.openDebugMenu();
    },

    openCheatWindow() {
      GeneralCheat.openCheatWindow();
    },
  },
};
