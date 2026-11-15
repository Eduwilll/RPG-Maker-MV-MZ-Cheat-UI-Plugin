import GameAsset from "./GameAsset.js";
import {
  getFeatureRuntime,
  getGameWindow,
} from "../js/runtime/FeatureRuntime.js";

export default {
  name: "PartyRecruitment",
  components: { GameAsset },
  template: `
<div class="stats-party-recruitment" data-testid="stats-party-recruitment">
    <v-menu
        v-model="menuOpen"
        offset-y
        left
        nudge-bottom="4"
        max-height="320"
        :close-on-content-click="false">
        <template v-slot:activator="{ on, attrs }">
            <v-btn
                icon
                small
                class="stats-party-recruitment__add"
                aria-label="Add party member"
                title="Add party member"
                data-testid="stats-recruitment-add"
                v-bind="attrs"
                v-on="on"
                @click="refreshCandidates">
                <v-icon small>mdi-plus</v-icon>
            </v-btn>
        </template>
        <v-list dense class="stats-party-recruitment__menu">
            <v-list-item
                v-for="candidate in candidates"
                :key="candidate.id"
                :data-testid="'stats-recruitment-option-' + candidate.id"
                @click="selectCandidate(candidate.id)">
                <game-asset kind="actor" :record-id="candidate.id" :label="candidate.name" :size="28" :navigate="false" class="mr-2"/>
                <v-list-item-content>
                    <v-list-item-title>{{ candidate.name }}</v-list-item-title>
                    <v-list-item-subtitle>Actor #{{ candidate.id }}</v-list-item-subtitle>
                </v-list-item-content>
            </v-list-item>
            <v-list-item v-if="!candidates.length" disabled>
                <v-list-item-content>
                    <v-list-item-title>All actors are already in the party</v-list-item-title>
                </v-list-item-content>
            </v-list-item>
        </v-list>
    </v-menu>
    <v-snackbar v-model="errorVisible" :timeout="6000" color="error">
        {{ partyError }}
    </v-snackbar>
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
      menuOpen: false,
      errorVisible: false,
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

    selectCandidate(id) {
      this.selectedActorId = id;
      this.menuOpen = false;
      this.requestRecruitment();
    },

    requestRecruitment() {
      this.partyError = "";
      this.errorVisible = false;
      this.refreshCandidates();
      const actor = this.candidates.find(
        (row) => row.id === this.selectedActorId,
      );
      if (!actor) return;
      this.menuOpen = false;
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
        this.errorVisible = true;
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
