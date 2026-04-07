import { GeneralCheat } from "../js/CheatHelper.js";
import {
  coercePanelNumber,
  extractActorParamValues,
  findPartyActorById,
  runPanelMutation,
} from "../js/panels/PanelGameState.js";

export default {
  name: "StatsSettingPanel",

  template: `
<v-card flat class="ma-0 pa-0">
    <v-tabs
        v-model="selectedTab"
        dark
        background-color="grey darken-3"
        show-arrows>
        <v-tab
            v-for="actor in actors"
            :key="actor.id">
            {{actor.name}}
        </v-tab>
    </v-tabs>
    <v-tabs-items
        dark
        v-model="selectedTab">
        <v-tab-item
            v-for="actor in actors"
            :key="actor.id">
            <v-card
                flat
                class="ma-0">
                <v-card-actions
                    class="pa-0">
                    <v-checkbox
                        v-model="actor.godMode"
                        label="God Mode"
                        @change="onGodModeChange(actor)">
                    </v-checkbox>
                    <v-spacer></v-spacer>
                    <v-tooltip
                        bottom>
                        <span>Reload from game data</span>
                        <template v-slot:activator="{ on, attrs }">
                            <v-btn
                                color="pink"
                                dark
                                small
                                fab
                                v-bind="attrs"
                                v-on="on"
                                @click="initializeVariables">
                                <v-icon>mdi-refresh</v-icon>
                            </v-btn>
                        </template>
                    </v-tooltip>
                </v-card-actions>
                <v-card-subtitle class="pa-0">Level / EXP</v-card-subtitle>
                <v-row class="mt-0">
                    <v-col>
                        <v-text-field
                            label="Lv"
                            v-model="actor.level"
                            outlined
                            dense
                            hide-details
                            @keydown.self.stop
                            @change="onLevelChange(actor)"
                            @focus="$event.target.select()"></v-text-field>
                    </v-col>
                    <v-col>
                        <v-text-field
                            label="EXP"
                            v-model="actor.exp"
                            outlined
                            dense
                            hide-details
                            @keydown.self.stop
                            @change="onExpChange(actor)"
                            @focus="$event.target.select()"></v-text-field>
                    </v-col>
                </v-row>
                
                <v-card-subtitle class="pa-0 mt-4">Stats</v-card-subtitle>
                <v-row class="mt-0">
                    <v-col
                        v-for="(_, paramIdx) in actor.param.length"
                        :key="paramIdx"
                        cols="12"
                        md="6">
                        <v-text-field
                            :label="paramNames[paramIdx]"
                            v-model="actor.param[paramIdx]"
                            outlined
                            dense
                            hide-details
                            @keydown.self.stop
                            @change="onParamChange(actor, paramIdx)"
                            @focus="$event.target.select()"></v-text-field>
                    </v-col>
                </v-row>
            </v-card>
        </v-tab-item>
    </v-tabs-items>
</v-card>
    `,

  data() {
    return {
      selectedTab: null,
      paramNames: [], // name of stats (Max HP, ATK, ...)
      actors: [],
    };
  },

  created() {
    this.initializeVariables();
  },

  methods: {
    extractActorData(actor) {
      return {
        id: actor._actorId,
        name: actor._name,
        godMode: GeneralCheat.isGodMode(actor),
        level: actor.level,
        exp: actor.currentExp(), // actor._exp contains exp data for each class (_exp[classId] = exp)
        param: extractActorParamValues(actor),
      };
    },

    initializeVariables() {
      this.paramNames = $dataSystem.terms.params;
      this.actors = $gameParty
        .members()
        .map((actor) => this.extractActorData(actor));
    },

    onLevelChange(item) {
      const actor = findPartyActorById(item.id);
      runPanelMutation(this, () => {
        if (actor) {
          actor.changeLevel(
            coercePanelNumber(item.level, {
              fallback: actor.level,
              integer: true,
            }),
            false,
          );
        }
      });
    },

    onExpChange(item) {
      const actor = findPartyActorById(item.id);
      runPanelMutation(this, () => {
        if (actor) {
          actor.changeExp(
            coercePanelNumber(item.exp, {
              fallback: actor.currentExp(),
              integer: true,
            }),
            false,
          );
        }
      });
    },

    onParamChange(item, paramIndex) {
      const actor = findPartyActorById(item.id);
      runPanelMutation(this, () => {
        if (actor) {
          const nextValue = coercePanelNumber(item.param[paramIndex], {
            fallback: actor.param(paramIndex),
            integer: true,
          });
          const diff = nextValue - actor.param(paramIndex);
          actor.addParam(paramIndex, diff);
        }
      });
    },

    onGodModeChange(item) {
      const actor = findPartyActorById(item.id);
      runPanelMutation(this, () => {
        if (actor) GeneralCheat.toggleGodMode(actor);
      });
    },
  },
};
