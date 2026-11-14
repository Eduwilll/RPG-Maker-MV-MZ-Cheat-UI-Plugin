import {
  getFeatureRuntime,
  getGameWindow,
} from "../js/runtime/FeatureRuntime.js";
import { readEnemyEncounters } from "../js/panels/database/EnemyEncounters.js";
import GameAsset from "./GameAsset.js";
import DatabaseTooltip from "./DatabaseTooltip.js";

export default {
  name: "EncounterBrowser",
  components: { GameAsset, DatabaseTooltip },
  data() {
    return {
      encounters: [],
      selectedTroopId: null,
      search: "",
      mapEvents: [],
      selectedEvent: null,
      availability: { allowed: false, reason: "No active game session." },
      pending: null,
      confirmation: "",
      error: "",
    };
  },
  computed: {
    rows() {
      const term = this.search.trim().toLowerCase();
      return this.encounters.filter((row) =>
        (
          row.troopId +
          " " +
          row.displayName +
          " " +
          row.rootName +
          " " +
          row.parts.map((part) => part.name).join(" ")
        )
          .toLowerCase()
          .includes(term),
      );
    },
    selected() {
      return (
        this.encounters.find((row) => row.troopId === this.selectedTroopId) ||
        null
      );
    },
  },
  created() {
    this.reload();
  },
  mounted() {
    this._timer = setInterval(this.updateAvailability, 1000);
  },
  beforeDestroy() {
    clearInterval(this._timer);
  },
  template: `<div class="encounter-browser">
    <div class="d-flex align-center mb-2"><strong>Encounters</strong><v-spacer/><v-btn x-small text @click="reload">Reload</v-btn></div>
    <div class="caption mb-2">Authored troop variants include every part and initially hidden member. The root artwork is a representative, not a replacement for the troop.</div>
    <v-alert v-if="error" type="error" dense dismissible @input="error = ''">{{ error }}</v-alert>
    <v-row dense><v-col cols="12" sm="4">
      <v-text-field v-model="search" label="Search encounter, root, part or troop ID" dense outlined hide-details @keydown.stop/>
      <v-list dense style="max-height: 360px; overflow-y: auto;">
        <v-list-item v-for="row in rows" :key="row.troopId" :input-value="selectedTroopId === row.troopId" @click="choose(row.troopId)">
          <game-asset kind="enemy" :record-id="row.primaryId" :label="row.rootName" :size="40" :navigate="false" class="mr-2"/>
          <v-list-item-content><v-list-item-title style="white-space: normal;">{{ row.rootName }}</v-list-item-title><v-list-item-subtitle style="white-space: normal;">#{{ row.troopId }} {{ row.displayName }} / {{ row.parts.length }} members</v-list-item-subtitle></v-list-item-content>
        </v-list-item>
      </v-list>
      <div v-if="!rows.length" class="caption pa-2">No matching authored encounters.</div>
    </v-col><v-col cols="12" sm="8" v-if="selected">
      <div class="d-flex align-center mb-2"><game-asset kind="enemy" :record-id="selected.primaryId" :label="selected.rootName" :size="128" :navigate="false" class="mr-2"/><div><strong>{{ selected.rootName }}</strong><div class="caption" style="white-space: pre-wrap; overflow-wrap: break-word;">{{ selected.displayName }}</div><div class="caption">Troop #{{ selected.troopId }} / {{ selected.pageCount }} battle event pages</div><v-btn x-small text @click="editPart(selected.primaryId)">Edit root enemy</v-btn></div></div>
      <div class="subtitle-2">All Authored Members</div>
      <div v-for="part in selected.parts" :key="part.index" class="d-flex align-center py-1" style="border-bottom: 1px solid #8884;">
        <div style="flex: 1; min-width: 0; overflow-wrap: break-word;"><database-tooltip kind="enemy" :record-id="part.enemyId" :label="part.name"/><span class="caption"> #{{ part.enemyId }}</span><div class="caption">{{ part.enemyId === selected.primaryId ? 'Root representative. ' : '' }}{{ part.hidden ? 'Initially hidden. ' : '' }}{{ part.encyclopediaHidden ? 'Hidden from encyclopedia. ' : '' }}{{ part.doesntCount ? 'Does not count. ' : '' }}{{ part.missing ? 'Missing enemy definition. ' : '' }}Position: {{ part.x == null ? '?' : part.x }}, {{ part.y == null ? '?' : part.y }}</div></div>
        <v-btn x-small text :disabled="part.missing" @click="editPart(part.enemyId)">Edit part</v-btn>
      </div>
      <v-btn small color="primary" class="mt-3" :disabled="!availability.allowed" @click="confirmEncounter">Start Encounter</v-btn>
      <div class="caption mt-1">{{ availability.reason }} Uses the authored troop's positions, hidden members and battle event pages. Troop battle events may affect the story even though the map event does not run. Normal rewards and defeat still apply. Save first.</div>
      <v-btn x-small text class="mt-2" @click="refreshMapEvents">Refresh map events</v-btn>
      <v-select v-model="selectedEvent" :items="mapEvents" item-text="label" item-value="eventId" label="Matching Original Map Event (exact troop)" dense outlined hide-details/>
      <div v-if="!mapEvents.length" class="caption mt-1">No active map event references this exact troop.</div>
      <v-btn small class="mt-2" :disabled="!selectedEvent || !availability.allowed" @click="confirmMapEvent">Run Map Event</v-btn>
      <div class="caption mt-1">Runs the original event, which may affect story flags, quests, items or location. Conditional branches may skip combat. Script-only battles cannot be matched automatically.</div>
    </v-col><v-col v-else cols="12" sm="8" class="caption pa-3">Select an encounter.</v-col></v-row>
    <v-dialog :value="!!confirmation" @input="!$event && cancel()" max-width="440"><v-card><v-card-text class="pt-4">{{ confirmation }}</v-card-text><v-card-actions><v-btn text @click="cancel">Cancel</v-btn><v-btn text color="primary" @click="proceed">Continue</v-btn></v-card-actions></v-card></v-dialog>
  </div>`,
  methods: {
    reload() {
      this.cancel();
      this.error = "";
      try {
        this.encounters = readEnemyEncounters(getGameWindow());
        const selected = this.selected || this.encounters[0];
        this.selectedTroopId = selected ? selected.troopId : null;
        this.updateAvailability();
        this.refreshMapEvents();
      } catch (error) {
        this.error = error.message;
      }
    },
    choose(troopId) {
      this.cancel();
      this.selectedTroopId = troopId;
      this.error = "";
      this.updateAvailability();
      this.refreshMapEvents();
    },
    editPart(enemyId) {
      if (
        this.selected &&
        this.selected.parts.some(
          (part) => part.enemyId === enemyId && !part.missing,
        )
      )
        this.$emit("edit", enemyId);
    },
    updateAvailability() {
      const runtime = getFeatureRuntime();
      this.availability = runtime
        ? JSON.parse(JSON.stringify(runtime.battle.availability().start))
        : { allowed: false, reason: "No active game session." };
    },
    refreshMapEvents() {
      this.selectedEvent = null;
      this.mapEvents = [];
      try {
        const runtime = getFeatureRuntime();
        if (!runtime || !this.selected) return;
        this.mapEvents = JSON.parse(
          JSON.stringify(
            runtime.battle.mapEventsForTroop(this.selected.troopId),
          ),
        ).map((row) =>
          Object.assign({}, row, {
            label:
              row.name + " #" + row.eventId + " (troop " + row.troopId + ")",
          }),
        );
      } catch (error) {
        this.error = error.message;
      }
    },
    confirmEncounter() {
      this.updateAvailability();
      if (!this.selected || !this.availability.allowed) return;
      this.pending = { troopId: this.selected.troopId };
      this.confirmation =
        "Start " +
        this.selected.displayName +
        " (troop #" +
        this.selected.troopId +
        ")? Authored positions, hidden members and battle event pages are preserved. Troop battle events may affect the story although the map event will not run. Normal rewards and defeat apply. Save first.";
    },
    confirmMapEvent() {
      this.updateAvailability();
      if (!this.selected || !this.availability.allowed) return;
      const row = this.mapEvents.find(
        (entry) =>
          entry.eventId === this.selectedEvent &&
          entry.troopId === this.selected.troopId,
      );
      if (!row) return;
      this.pending = { mapEvent: JSON.parse(JSON.stringify(row)) };
      this.confirmation =
        "Run the original map event for troop #" +
        row.troopId +
        "? It may change story flags, quests, items and player location. Conditional branches may skip this battle. Save first.";
    },
    cancel() {
      this.pending = null;
      this.confirmation = "";
    },
    proceed() {
      const action = this.pending;
      if (!action || !this.confirmation) return;
      this.cancel();
      this.error = "";
      try {
        const runtime = getFeatureRuntime();
        if (!runtime) throw new Error("No active game session.");
        if (action.mapEvent) runtime.battle.startMapEvent(action.mapEvent);
        else runtime.battle.startTroop(action.troopId);
        window.dispatchEvent(new window.CustomEvent("cheat-return-to-game"));
        const game = getGameWindow();
        if (game !== window)
          game.dispatchEvent(new game.CustomEvent("cheat-return-to-game"));
        if (game.focus) game.focus();
      } catch (error) {
        this.error = error.message;
      }
      this.updateAvailability();
    },
  },
};
