import HealthSettingTab from "./HealthSettingTab.js";
import { BattleCheat } from "../js/CheatHelper.js";
import {
  coercePanelNumber,
  runPanelMutation,
} from "../js/panels/PanelGameState.js";

export default {
  name: "HealthSettingPanel",

  components: {
    HealthSettingTab,
  },

  template: `
<v-card 
    class="ma-0 pa-0"
    flat>
    <v-card-subtitle class="caption pb-0">Battle</v-card-subtitle>
    <v-card-text class="pt-0 pb-0">
        <v-checkbox
            v-model="disableRandomEncounter"
            hide-details
            dense
            x-small
            class="my-0 py-0"
            @change="onDisableRandomEncounterChange">
            <template v-slot:label>
                <span class="caption">Disable Random Encounter</span>
            </template>
        </v-checkbox>
        <v-btn small @click.prevent="encounterBattle">Encounter</v-btn>
        <v-btn small @click.prevent="victory">Victory</v-btn>
        <v-btn small @click.prevent="defeat">Defeat</v-btn>
        <v-btn small @click.prevent="escape">Escape</v-btn>
        <v-btn small @click.prevent="abort">Abort</v-btn>
    </v-card-text>
    
    <v-card-subtitle class="caption pb-1">Enemy</v-card-subtitle>
    <v-card-text class="pt-0 pb-0">
        <v-btn small @click.prevent="changeAllEnemyHealth(0)">Set 0</v-btn>
        <v-btn small @click.prevent="changeAllEnemyHealth(1)">Set 1</v-btn>
        <v-btn small @click.prevent="recoverAllEnemy">Recovery</v-btn>
        <v-btn small @click.prevent="fillTpAllEnemy">Fill TP</v-btn>
        <v-btn small @click.prevent="clearStatesAllEnemy">Clear States</v-btn>
    </v-card-text>
    
    <v-card-subtitle class="caption pb-1">Party</v-card-subtitle>
    <v-card-text class="pt-0 pb-0">
        <v-btn small @click.prevent="changeAllPartyHealth(0)">Set 0</v-btn>
        <v-btn small @click.prevent="changeAllPartyHealth(1)">Set 1</v-btn>
        <v-btn small @click.prevent="recoverAllParty">Recovery</v-btn>
        <v-btn small @click.prevent="fillTpAllParty">Fill TP</v-btn>
        <v-btn small @click.prevent="clearStatesAllParty">Clear States</v-btn>
    </v-card-text>
    
    <template v-if="enemy && enemy.length > 0">
        <v-card-subtitle class="caption pb-1">Enemy Details</v-card-subtitle>
        <v-card-text class="pt-0 pb-0">
            <health-setting-tab
                :items="enemy"
                @change="onDetailChange($event, 'enemy')">
            </health-setting-tab>
        </v-card-text>
    </template>
    
    <template v-if="party && party.length > 0">
        <v-card-subtitle class="caption pb-1">Party Details</v-card-subtitle>
        <v-card-text class="pt-0 pb-0">
            <health-setting-tab
                :items="party"
                @change="onDetailChange($event, 'party')">
            </health-setting-tab>
        </v-card-text>
    </template>
    
    <v-tooltip
        bottom>
        <span>Reload from game data</span>
        <template v-slot:activator="{ on, attrs }">
            <v-btn
                style="top: 0px; right: 0px;"
                color="pink"
                dark
                small
                absolute
                top
                right
                fab
                v-bind="attrs"
                v-on="on"
                @click="initializeVariables">
                <v-icon>mdi-refresh</v-icon>
            </v-btn>
        </template>
    </v-tooltip>
</v-card>
    `,

  data() {
    return {
      disableRandomEncounter: false,
      enemy: [],
      party: [],
    };
  },

  created() {
    this.initializeVariables();
  },

  methods: {
    initializeVariables() {
      this.enemy = $gameTroop.members().map((member, index) => ({
        id: index,
        name: member.name(),
        hp: { hp: member.hp, mhp: member.mhp },
        mp: { mp: member.mp, mmp: member.mmp },
      }));
      this.party = $gameParty.members().map((member) => ({
        id: member.actorId(),
        name: member.name(),
        hp: { hp: member.hp, mhp: member.mhp },
        mp: { mp: member.mp, mmp: member.mmp },
      }));
      this.disableRandomEncounter = BattleCheat.isDisableRandomEncounter();
    },

    recoverAllEnemy() {
      runPanelMutation(this, () => BattleCheat.recoverAllEnemy());
    },

    recoverAllParty() {
      runPanelMutation(this, () => BattleCheat.recoverAllParty());
    },

    fillTpAllEnemy() {
      runPanelMutation(this, () => BattleCheat.fillTpAllEnemy());
    },

    fillTpAllParty() {
      runPanelMutation(this, () => BattleCheat.fillTpAllParty());
    },

    clearStatesAllEnemy() {
      runPanelMutation(this, () => BattleCheat.clearStatesAllEnemy());
    },

    clearStatesAllParty() {
      runPanelMutation(this, () => BattleCheat.clearStatesAllParty());
    },

    changeAllEnemyHealth(newHp) {
      runPanelMutation(this, () => BattleCheat.changeAllEnemyHealth(newHp));
    },

    changeAllPartyHealth(newHp) {
      runPanelMutation(this, () => BattleCheat.changeAllPartyHealth(newHp));
    },

    encounterBattle() {
      BattleCheat.encounterBattle();
    },

    victory() {
      BattleCheat.victory();
    },

    defeat() {
      BattleCheat.defeat();
    },

    escape() {
      BattleCheat.escape();
    },

    abort() {
      BattleCheat.abort();
    },

    onDisableRandomEncounterChange() {
      runPanelMutation(this, () => BattleCheat.toggleDisableRandomEncounter());
    },

    onDetailChange(items, type) {
      runPanelMutation(this, () => {
        for (const item of items) {
          let member = null;
          if (type === "party") {
            member = $gameParty.members().find((a) => a.actorId() === item.id);
          } else if (type === "enemy") {
            member = $gameTroop.members()[item.id];
          }
          if (member) {
            member.setHp(
              coercePanelNumber(item.hp.hp, {
                fallback: member.hp,
                integer: true,
              }),
            );
            member.setMp(
              coercePanelNumber(item.mp.mp, {
                fallback: member.mp,
                integer: true,
              }),
            );
          }
        }
      });
    },
  },
};
