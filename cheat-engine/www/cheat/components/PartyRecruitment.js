import GameAsset from "./GameAsset.js";
import {
  getFeatureRuntime,
  getGameWindow,
} from "../js/runtime/FeatureRuntime.js";

export default {
  name: "PartyRecruitment",
  components: { GameAsset },
  template: `
<div class="stats-party-recruitment mb-3" data-testid="stats-party-recruitment">
    <v-row dense align="center" class="ma-0">
        <v-col cols="12" sm="8" class="pa-1">
            <v-autocomplete
                v-model="selectedActorId"
                :items="candidates"
                item-text="name"
                item-value="id"
                label="Add party member"
                placeholder="Search actors by name"
                no-data-text="No actors available to recruit"
                outlined dense hide-details clearable
                data-testid="stats-recruitment-select"
                @focus="refreshCandidates"
                @keydown.stop>
                <template v-slot:item="{ item }">
                    <game-asset kind="actor" :record-id="item.id" :label="item.name" :size="40" :navigate="false" class="mr-2"/>
                    <v-list-item-content>
                        <v-list-item-title>{{ item.name }}</v-list-item-title>
                        <v-list-item-subtitle>Actor #{{ item.id }}</v-list-item-subtitle>
                    </v-list-item-content>
                </template>
                <template v-slot:selection="{ item }">
                    <game-asset kind="actor" :record-id="item.id" :label="item.name" :size="24" :navigate="false" class="mr-2"/>
                    <span>{{ item.name }}</span>
                </template>
            </v-autocomplete>
        </v-col>
        <v-col cols="12" sm="4" class="pa-1">
            <v-btn small block color="primary" :disabled="!selectedActorId" data-testid="stats-recruitment-add" @click="requestRecruitment">Add party member</v-btn>
        </v-col>
    </v-row>
    <v-alert v-if="partyError" type="error" dense class="mt-2 mb-0" role="alert">{{ partyError }}</v-alert>
    <v-dialog v-model="partyConfirmation" max-width="440">
        <v-card>
            <v-card-title>Confirm recruitment</v-card-title>
            <v-card-text>Recruit {{ pendingActorName }}? Forced recruitment bypasses story progression and does not override battle-party limits. Save a backup first.</v-card-text>
            <v-card-actions>
                <v-spacer/>
                <v-btn text @click="cancelRecruitment">Cancel</v-btn>
                <v-btn text color="warning" data-testid="stats-recruitment-confirm" @click="confirmRecruitment">Confirm recruitment</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</div>`,

  data() {
    return {
      candidates: [],
      selectedActorId: null,
      pendingActorId: null,
      pendingActorName: "",
      partyConfirmation: false,
      partyError: "",
    };
  },

  created() {
    this.refreshCandidates();
  },

  methods: {
    refreshCandidates() {
      const game = getGameWindow();
      const party = game && game.$gameParty;
      const database = game && game.$dataActors;
      const rows = [];
      if (party && Array.isArray(party._actors) && Array.isArray(database)) {
        for (let id = 1; id < database.length; id++) {
          const actor = database[id];
          if (actor && party._actors.indexOf(id) < 0) {
            // Never expose engine or database objects to Vue observation.
            rows.push({ id: id, name: actor.name || "Actor " + id });
          }
        }
      }
      this.candidates = rows;
      if (!rows.some((row) => row.id === this.selectedActorId)) {
        this.selectedActorId = null;
      }
    },

    requestRecruitment() {
      this.partyError = "";
      this.refreshCandidates();
      const actor = this.candidates.find(
        (row) => row.id === this.selectedActorId,
      );
      if (!actor) return;
      this.pendingActorId = actor.id;
      this.pendingActorName = actor.name;
      this.partyConfirmation = true;
    },

    cancelRecruitment() {
      this.partyConfirmation = false;
      this.pendingActorId = null;
      this.pendingActorName = "";
    },

    confirmRecruitment() {
      if (!this.partyConfirmation || !this.pendingActorId) return;
      const id = this.pendingActorId;
      this.cancelRecruitment();
      try {
        const runtime = getFeatureRuntime();
        if (!runtime || !runtime.actors) {
          throw Error("Party editing is unavailable. Open a game first.");
        }
        runtime.actors.setPartyMember(id, true);
      } catch (error) {
        this.partyError = error.message || "Unable to recruit this actor.";
        this.refreshCandidates();
        return;
      }
      this.partyError = "";
      this.selectedActorId = null;
      this.refreshCandidates();
      this.$emit("change", id);
    },
  },
};
