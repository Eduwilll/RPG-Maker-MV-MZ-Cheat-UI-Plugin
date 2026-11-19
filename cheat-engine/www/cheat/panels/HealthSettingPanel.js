import HealthSettingTab from "./HealthSettingTab.js";
import { BattleCheat } from "../js/cheats/BattleCheat.js";
import {
  applyPanelSnapshot,
  coercePanelNumber,
  runPanelMutation,
} from "../js/panels/PanelGameState.js";
import {
  findHealthPanelMember,
  readHealthSettingPanelState,
} from "../js/panels/health/HealthSettingPanelState.js";

export default {
  name: "HealthSettingPanel",

  components: {
    HealthSettingTab,
  },

  template: `
<v-card flat class="cheat-panel">
    <div class="cheat-panel__head">
        <div>
            <div class="cheat-panel__title">HP / MP / Battle</div>
        </div>
        <v-btn small text title="Reload from game data" aria-label="Reload from game data" @click="initializeVariables">
            <v-icon left small>mdi-refresh</v-icon>Refresh
        </v-btn>
    </div>

    <section class="cheat-section">
        <div class="cheat-section__title">Battle</div>
        <div class="cheat-filter-bar">
            <v-checkbox
                data-feature="random-encounters"
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
            <v-checkbox
                data-feature="one-hit-kill"
                v-model="oneHitKill"
                hide-details
                dense
                x-small
                class="my-0 py-0"
                @change="onOneHitKillChange">
                <template v-slot:label>
                    <span class="caption">One-Hit Kill</span>
                </template>
            </v-checkbox>
        </div>
        <div class="cheat-actions">
            <v-btn small @click.prevent="encounterBattle">Encounter</v-btn>
            <v-btn small @click.prevent="victory">Victory</v-btn>
            <v-btn small @click.prevent="defeat">Defeat</v-btn>
            <v-btn small @click.prevent="escape">Escape</v-btn>
            <v-btn small @click.prevent="abort">Abort</v-btn>
        </div>
    </section>

    <section class="cheat-section">
        <div class="cheat-section__title">Enemy</div>
        <div class="cheat-actions">
            <v-btn small @click.prevent="changeAllEnemyHealth(0)">Set 0</v-btn>
            <v-btn small @click.prevent="changeAllEnemyHealth(1)">Set 1</v-btn>
            <v-btn small @click.prevent="recoverAllEnemy">Recovery</v-btn>
            <v-btn small @click.prevent="fillTpAllEnemy">Fill TP</v-btn>
            <v-btn small @click.prevent="clearStatesAllEnemy">Clear States</v-btn>
        </div>
    </section>

    <section class="cheat-section">
        <div class="cheat-section__title">Party</div>
        <div class="cheat-actions">
            <v-btn small @click.prevent="changeAllPartyHealth(0)">Set 0</v-btn>
            <v-btn small @click.prevent="changeAllPartyHealth(1)">Set 1</v-btn>
            <v-btn small @click.prevent="recoverAllParty">Recovery</v-btn>
            <v-btn small @click.prevent="fillTpAllParty">Fill TP</v-btn>
            <v-btn small @click.prevent="clearStatesAllParty">Clear States</v-btn>
        </div>
    </section>

    <template v-if="enemy && enemy.length > 0">
        <section class="cheat-section">
            <div class="cheat-section__title">Enemy Details</div>
            <health-setting-tab
                :items="enemy"
                @change="onDetailChange($event, 'enemy')">
            </health-setting-tab>
        </section>
    </template>

    <template v-if="party && party.length > 0">
        <section class="cheat-section">
            <div class="cheat-section__title">Party Details</div>
            <health-setting-tab
                :items="party"
                @change="onDetailChange($event, 'party')">
            </health-setting-tab>
        </section>
    </template>
</v-card>
    `,

  data() {
    return {
      disableRandomEncounter: false,
      oneHitKill: false,
      enemy: [],
      party: [],
    };
  },

  created() {
    this.initializeVariables();
  },

  methods: {
    initializeVariables() {
      applyPanelSnapshot(this, readHealthSettingPanelState());
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

    onOneHitKillChange() {
      runPanelMutation(this, () =>
        BattleCheat.toggleOneHitKill(this.oneHitKill),
      );
    },

    onDetailChange(items, type) {
      runPanelMutation(this, () => {
        for (const item of items) {
          const member = findHealthPanelMember(type, item.id);
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
