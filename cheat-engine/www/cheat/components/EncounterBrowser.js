import {
  getFeatureRuntime,
  getGameWindow,
} from "../js/runtime/FeatureRuntime.js";
import { readEnemyEncounters } from "../js/panels/database/EnemyEncounters.js";
import GameAsset from "./GameAsset.js";
import DatabaseTooltip from "./DatabaseTooltip.js";
import VirtualList from "./VirtualList.js";

export default {
  name: "EncounterBrowser",
  inject: { cheatRuntime: { default: null } },
  components: { GameAsset, DatabaseTooltip, VirtualList },
  data() {
    return {
      encounters: [],
      selectedTroopId: null,
      search: "",
      detailView: "members",
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
      const term = String(this.search || "")
        .trim()
        .toLowerCase();
      if (!term) return this.encounters;
      return this.encounters.filter((row) => row.searchText.includes(term));
    },
    selected() {
      return (
        this.encounters.find((row) => row.troopId === this.selectedTroopId) ||
        null
      );
    },
    selectedHidden() {
      return this.selected
        ? this.selected.parts.filter((part) => part.hidden).length
        : 0;
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
    <v-alert v-if="error" type="error" role="alert" dense dismissible @input="error = ''">{{ error }}</v-alert>
    <section class="record-workspace"><aside class="record-finder" aria-label="Troop finder">
      <div class="workspace-rail-heading"><strong>Troops</strong><span>{{ rows.length }}</span><button type="button" class="workspace-icon" title="Reload troops" aria-label="Reload troops" @click="reload"><v-icon small>mdi-refresh</v-icon></button></div>
      <v-text-field v-model="search" label="Search troop, enemy or ID" dense outlined hide-details prepend-inner-icon="mdi-magnify" clearable @keydown.stop/>
      <virtual-list v-if="rows.length" :items="rows" :height="Math.min(350, rows.length * 64)" :item-size="64">
        <template v-slot="{ item: row }">
          <div class="workspace-choice record-choice encounter-row" :class="{ 'is-selected': selectedTroopId === row.troopId }" role="button" tabindex="0" :aria-pressed="selectedTroopId === row.troopId" @click="choose(row.troopId)" @keydown.enter.stop.prevent="choose(row.troopId)" @keydown.space.stop.prevent="choose(row.troopId)">
            <game-asset kind="troop" :record-id="row.troopId" :label="row.displayName" :size="44" :navigate="false" class="encounter-row__art"/>
            <div class="cheat-virtual-row__main">
              <div class="encounter-row__title">{{ row.displayName }}</div>
              <div class="encounter-row__meta">#{{ row.troopId }} / {{ row.memberCount }} members{{ row.hiddenCount ? ' / ' + row.hiddenCount + ' hidden' : '' }}</div>
              <div class="encounter-row__meta">{{ memberSummary(row) }}</div>
            </div>
          </div>
        </template>
      </virtual-list>
      <p v-else class="workspace-empty">No matching troops. Try an enemy name or troop ID.</p>
      <p class="workspace-hint" title="Each authored troop is listed once. Its artwork combines all members at their battle positions, including separate torso, head and limb records.">Complete encounters, not detached parts.</p>
    </aside><div class="record-inspector" v-if="selected">
      <div class="encounter-browser__summary">
        <game-asset kind="troop" :record-id="selected.troopId" :label="selected.displayName" :size="112" :navigate="false" class="encounter-browser__hero"/>
        <div class="encounter-browser__summary-body">
          <strong class="encounter-browser__name">{{ selected.displayName }}</strong>
          <div class="caption cheat-text-wrap">{{ memberSummary(selected, true) }}</div>
          <div class="caption">Troop #{{ selected.troopId }} / {{ selected.pageCount }} battle event pages</div>
          <div v-if="selectedHidden" class="caption">Faded artwork marks {{ selectedHidden === 1 ? 'a member that starts hidden' : selectedHidden + ' members that start hidden' }}.</div>
          <v-btn x-small text @click="editPart(selected.primaryId)">Edit first enemy</v-btn>
        </div>
      </div>
      <div class="record-actions"><v-btn small color="primary" :disabled="!availability.allowed" @click="confirmEncounter">Start Troop</v-btn><span v-if="!availability.allowed" class="workspace-hint">{{ availability.reason }}</span></div>
      <p class="workspace-hint">Authored positions, hidden members and battle event pages are preserved. Normal rewards and defeat apply. Save first.</p>
      <div class="inspector-views" role="group" aria-label="Troop sections"><button type="button" :class="{'is-selected': detailView === 'members'}" :aria-pressed="detailView === 'members'" @click="detailView = 'members'">Members · {{ selected.memberCount }}</button><button type="button" :class="{'is-selected': detailView === 'events'}" :aria-pressed="detailView === 'events'" @click="detailView = 'events'">Map events</button></div>
      <section v-show="detailView === 'members'" aria-label="Troop members">
      <h4 class="record-section-title">Enemies in this troop</h4>
      <div v-for="part in selected.parts" :key="part.index" class="encounter-browser__part">
        <div class="cheat-row__main cheat-break-word"><database-tooltip kind="enemy" :record-id="part.enemyId" :label="part.name"/><span class="caption"> #{{ part.enemyId }}</span><div class="caption">{{ part.enemyId === selected.primaryId ? 'First member. ' : '' }}{{ part.hidden ? 'Initially hidden. ' : '' }}{{ part.encyclopediaHidden ? 'Hidden from encyclopedia. ' : '' }}{{ part.doesntCount ? 'Does not count. ' : '' }}{{ part.missing ? 'Missing enemy definition. ' : '' }}Position: {{ part.x == null ? '?' : part.x }}, {{ part.y == null ? '?' : part.y }}</div></div>
        <v-btn x-small text :disabled="part.missing" @click="editPart(part.enemyId)">Edit enemy</v-btn>
      </div>
      </section><section v-show="detailView === 'events'" aria-label="Original map events">
      <h4 class="record-section-title">Original map events</h4>
      <v-btn x-small text class="mt-2" @click="refreshMapEvents">Refresh map events</v-btn>
      <v-select v-model="selectedEvent" :items="mapEvents" item-text="label" item-value="eventId" label="Matching Original Map Event (exact troop)" dense outlined hide-details/>
      <div v-if="!mapEvents.length" class="caption mt-1">No active map event references this exact troop.</div>
      <v-btn small class="mt-2" :disabled="!selectedEvent || !availability.allowed" @click="confirmMapEvent">Run Map Event</v-btn>
      <div class="caption mt-1">Runs the original event, which may affect story flags, quests, items or location. Conditional branches may skip combat. Script-only battles cannot be matched automatically.</div>
      </section>
    </div><div v-else class="record-inspector workspace-empty">Select a troop to inspect its members and battle actions.</div></section>
    <v-dialog :value="!!confirmation" @input="!$event && cancel()" max-width="440"><v-card><v-card-text class="pt-4">{{ confirmation }}</v-card-text><v-card-actions><v-btn text @click="cancel">Cancel</v-btn><v-btn text color="primary" @click="proceed">Continue</v-btn></v-card-actions></v-card></v-dialog>
  </div>`,
  methods: {
    memberSummary(row, full) {
      const names = row.parts.map((part) => part.name);
      if (full || names.length <= 2) return names.join(" / ");
      return (
        names.slice(0, 2).join(" / ") + " +" + (names.length - 2) + " more"
      );
    },
    reload() {
      this.cancel();
      this.error = "";
      try {
        // Freezing the snapshot array keeps Vue 2 from walking hundreds of
        // troop/member objects while leaving the detached copies mutable.
        this.encounters = Object.freeze(readEnemyEncounters(getGameWindow()));
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
      const runtime = this.cheatRuntime || getFeatureRuntime();
      const next = runtime
        ? JSON.parse(JSON.stringify(runtime.battle.availability().start))
        : { allowed: false, reason: "No active game session." };
      // The timer runs every second; skip the assignment (and the whole panel
      // re-render) unless the battle readiness actually changed.
      if (JSON.stringify(next) === JSON.stringify(this.availability)) return;
      this.availability = next;
    },
    refreshMapEvents() {
      this.selectedEvent = null;
      this.mapEvents = [];
      try {
        const runtime = this.cheatRuntime || getFeatureRuntime();
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
        const runtime = this.cheatRuntime || getFeatureRuntime();
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
