import {
  getFeatureRuntime,
  getGameWindow,
} from "../js/runtime/FeatureRuntime.js";
import {
  createDatabaseEditorState,
  selectDatabaseRecord,
  applyDatabaseDraft,
  discardDatabaseDraft,
  resetDatabaseRecord,
  readDatabaseReferences,
} from "../js/panels/database/DatabaseEditorState.js";
import { databaseParamNames } from "../js/ui/DatabaseDetails.js";
import DatabaseRowsEditor from "../components/DatabaseRowsEditor.js";
import DatabaseTooltip from "../components/DatabaseTooltip.js";
import EncounterBrowser from "../components/EncounterBrowser.js";

export default {
  name: "DatabaseEditorPanel",
  components: { DatabaseRowsEditor, DatabaseTooltip, EncounterBrowser },
  props: { kind: { type: String, default: "enemy" } },
  data() {
    return {
      state: null,
      enemyView: "encounters",
      mapEvents: [],
      selectedEvent: null,
      search: "",
      error: "",
      level: 1,
      paramNames: [],
      pending: null,
      confirmation: "",
      roster: [],
      troopId: null,
      availability: {
        start: { allowed: false, reason: "No game" },
        summon: { allowed: false, reason: "No battle" },
      },
    };
  },
  computed: {
    title() {
      return { enemy: "Enemies", skill: "Skills", class: "Classes" }[this.kind];
    },
    rows() {
      const term = this.search.toLowerCase();
      return this.state
        ? this.state.rows.filter((row) =>
            (row.id + " " + row.name).toLowerCase().includes(term),
          )
        : [];
    },
    numericFields() {
      if (this.kind === "enemy")
        return [
          { key: "exp", label: "EXP Reward" },
          { key: "gold", label: "Gold Reward" },
        ];
      return [
        { key: "mpCost", label: "MP Cost" },
        { key: "tpCost", label: "TP Cost" },
        { key: "successRate", label: "Success Rate (%)" },
        { key: "repeats", label: "Repeats" },
        { key: "speed", label: "Speed Modifier" },
        { key: "tpGain", label: "TP Gain" },
      ];
    },
    scopeOptions() {
      return [
        "None",
        "One Enemy",
        "All Enemies",
        "1 Random Enemy",
        "2 Random Enemies",
        "3 Random Enemies",
        "4 Random Enemies",
        "One Ally",
        "All Allies",
        "One Dead Ally",
        "All Dead Allies",
        "User",
        "One Ally (alive or dead)",
        "All Allies (alive or dead)",
        "Everyone",
      ].map((text, value) => ({ text, value }));
    },
    elementOptions() {
      return [
        { text: "Normal attack elements", value: -1 },
        { text: "None", value: 0 },
      ].concat(
        this.state
          ? this.state.references.elements.map((row) => ({
              text: row.name,
              value: row.id,
            }))
          : [],
      );
    },
    maxLevel() {
      return this.state && this.state.draft && this.state.draft.params
        ? Math.max(1, this.state.draft.params[0].length - 1)
        : 99;
    },
  },
  created() {
    this.initialize();
  },
  mounted() {
    this.updateAvailability();
    this._timer = setInterval(this.updateAvailability, 1000);
  },
  beforeDestroy() {
    clearInterval(this._timer);
  },
  template: `<v-card flat class="pa-1">
    <v-btn-toggle v-if="kind === 'enemy'" v-model="enemyView" mandatory class="mb-2" dense><v-btn small value="encounters">Encounters / Roots</v-btn><v-btn small value="records">Individual Enemies / Parts</v-btn></v-btn-toggle>
    <encounter-browser v-if="kind === 'enemy' && enemyView === 'encounters'" @edit="editEncounterPart"/>
    <div v-show="kind !== 'enemy' || enemyView === 'records'">
    <div class="d-flex align-center mb-2"><strong>{{ title }}</strong><v-spacer/><v-btn x-small text @click="reload">Reload</v-btn></div>
    <v-alert v-if="error" type="error" dense dismissible @input="error = ''">{{ error }}</v-alert>
    <v-row dense v-if="state"><v-col cols="12" sm="4">
      <v-text-field v-model="search" label="Search name or ID" dense outlined hide-details @keydown.stop/>
      <v-list dense style="max-height: 330px; overflow-y: auto;"><v-list-item v-for="row in rows" :key="row.id" :input-value="state.selectedId === row.id" @click="choose(row.id)"><v-list-item-content><v-list-item-title><database-tooltip :kind="kind" :record-id="row.id" :label="'#' + row.id + ' ' + row.name"/></v-list-item-title><v-list-item-subtitle v-if="description(row.id)">{{ description(row.id) }}</v-list-item-subtitle><v-list-item-subtitle v-if="row.edited">Save-specific edit</v-list-item-subtitle></v-list-item-content></v-list-item></v-list>
    </v-col><v-col cols="12" sm="8" v-if="state.draft">
      <div class="caption mb-2">{{ state.draft.name }} #{{ state.selectedId }}. Apply changes, then save the game. Original game files are never changed.</div>
      <v-alert v-if="state.status" dense type="info" class="caption">{{ state.status }}</v-alert>
      <div class="mb-2"><v-btn x-small color="primary" @click="apply">Apply</v-btn><v-btn x-small text @click="discard">Discard Draft</v-btn><v-btn x-small text color="orange" @click="confirmAction('Reset this record to its original values?', 'reset')">Reset to Original</v-btn></div>
      <v-row dense v-if="kind !== 'class'"><v-col v-for="field in numericFields" :key="field.key" cols="6"><v-text-field v-model="state.draft[field.key]" :label="field.label" type="number" dense outlined hide-details @keydown.stop/></v-col></v-row>
      <template v-if="kind === 'enemy'"><div class="subtitle-2 mt-3">Base Parameters</div><v-row dense><v-col v-for="(value,i) in state.draft.params" :key="i" cols="6"><v-text-field v-model="state.draft.params[i]" :label="paramNames[i]" type="number" dense outlined hide-details @keydown.stop/></v-col></v-row>
        <div class="subtitle-2 mt-3">Actions</div><database-rows-editor v-model="state.draft.actions" type="actions" :references="state.references"/>
      </template>
      <template v-if="kind === 'skill'"><v-row dense class="mt-1"><v-col cols="6"><v-select v-model="state.draft.scope" :items="scopeOptions" label="Target Scope" dense outlined hide-details/></v-col><v-col cols="6"><v-select v-model="state.draft.hitType" :items="[{text:'Certain Hit',value:0},{text:'Physical',value:1},{text:'Magical',value:2}]" label="Hit Type" dense outlined hide-details/></v-col></v-row>
        <div class="subtitle-2 mt-3">Damage</div><v-row dense v-if="state.draft.damage"><v-col cols="6"><v-select v-model="state.draft.damage.type" :items="[{text:'None',value:0},{text:'HP Damage',value:1},{text:'MP Damage',value:2},{text:'HP Recovery',value:3},{text:'MP Recovery',value:4},{text:'HP Drain',value:5},{text:'MP Drain',value:6}]" label="Damage Type" dense outlined hide-details/></v-col><v-col cols="6"><v-select v-model="state.draft.damage.elementId" :items="elementOptions" label="Element" dense outlined hide-details/></v-col><v-col cols="12"><v-textarea v-model="state.draft.damage.formula" label="Damage Formula (RPG Maker JavaScript)" rows="2" dense outlined hide-details @keydown.stop/><div class="caption orange--text">Formulas are code. They are not executed as a preview; invalid code can fail during battle.</div></v-col><v-col cols="6"><v-text-field v-model="state.draft.damage.variance" label="Variance (%)" type="number" dense outlined hide-details @keydown.stop/></v-col><v-col cols="6"><v-checkbox v-model="state.draft.damage.critical" label="Critical Hits" dense hide-details class="mt-1"/></v-col></v-row>
        <div class="subtitle-2 mt-3">Effects</div><database-rows-editor v-model="state.draft.effects" type="effects" :references="state.references"/>
      </template>
      <template v-if="kind === 'class'"><div class="subtitle-2">Parameter Curves</div><v-text-field v-model.number="level" :min="1" :max="maxLevel" label="Edit values at level" type="number" dense outlined hide-details class="my-2" @change="normalizeLevel" @keydown.stop/>
        <v-row dense><v-col v-for="(curve,i) in state.draft.params" :key="i" cols="6"><v-text-field :value="curve[validLevel()]" @input="setCurve(i,$event)" :label="paramNames[i] + ' at Lv' + validLevel()" type="number" dense outlined hide-details @keydown.stop/></v-col></v-row>
        <div class="subtitle-2 mt-3">EXP Curve</div><v-row dense><v-col v-for="(name,i) in ['Base Value','Extra Value','Acceleration A','Acceleration B']" :key="i" cols="6"><v-text-field v-model="state.draft.expParams[i]" :label="name" type="number" dense outlined hide-details @keydown.stop/></v-col></v-row>
        <div class="subtitle-2 mt-3">Level-up Skills</div><div class="caption">Changes apply to future level-ups, not skills already learned.</div><database-rows-editor v-model="state.draft.learnings" type="learnings" :references="state.references"/>
      </template>
      <template v-if="state.draft.traits"><div class="subtitle-2 mt-3">Traits</div><database-rows-editor v-model="state.draft.traits" type="traits" :references="state.references"/></template>
    </v-col><v-col v-else cols="12" sm="8" class="caption pa-3">Select a record to edit.</v-col></v-row>
    <div v-if="kind === 'enemy' && state" class="mt-3">
      <v-btn small color="primary" :disabled="!availability.start.allowed || !state.selectedId" @click="confirmAction('Start a standalone battle here? Normal defeat and rewards still apply; the original map event will not run.', 'selected-enemy')">Start Battle Here</v-btn>
      <v-btn small text @click="refreshMapEvents">Refresh map events</v-btn>
      <div class="caption mt-1">{{ availability.start.reason }} Standalone fights do not move the player.</div>
      <v-select v-model="selectedEvent" :items="mapEvents" item-text="label" item-value="eventId" label="Original battle events on this map" dense outlined hide-details class="mt-2"/>
      <div v-if="!mapEvents.length" class="caption mt-1">No matching active event found on this map. You can still use Start Battle Here.</div>
      <v-btn small class="mt-1" :disabled="!selectedEvent || !availability.start.allowed" @click="confirmMapEvent">Run Map Event</v-btn>
      <div class="caption">Original events may change quests, flags, items or location. Conditional branches may not enter combat. Script-only battles cannot be matched automatically.</div>
    </div>
    <v-expansion-panels v-if="kind === 'enemy' && state" class="mt-2"><v-expansion-panel><v-expansion-panel-header>Encounters & Reinforcements</v-expansion-panel-header><v-expansion-panel-content>
      <div class="caption mb-2">Custom battle plugins may restrict these actions. Existing enemy definitions use your applied edits.</div>
      <v-select v-model="troopId" :items="state.references.troops" item-text="name" item-value="id" label="Existing Troop" dense outlined hide-details/>
      <v-btn x-small class="my-2" :disabled="!troopId || !availability.start.allowed" @click="confirmAction('Start the selected troop encounter?', 'troop')">Fight Troop</v-btn>
      <div class="caption">{{ availability.start.reason }}</div>
      <v-btn x-small text :disabled="!state.selectedId || roster.length >= 32" @click="roster.push(state.selectedId)">Add selected enemy to roster</v-btn>
      <div><v-chip v-for="(id,i) in roster" :key="i" x-small close @click:close="roster.splice(i,1)">{{ enemyName(id) }}</v-chip></div>
      <v-btn x-small class="my-2" :disabled="!roster.length || !availability.start.allowed" @click="confirmAction('Start a custom encounter with this roster?', 'roster')">Fight Roster</v-btn>
      <v-btn x-small class="ml-1" :disabled="!state.selectedId || !availability.summon.allowed" @click="confirmAction('Add this enemy to the current battle?', 'summon')">Summon Selected</v-btn><div class="caption">{{ availability.summon.reason }}</div>
    </v-expansion-panel-content></v-expansion-panel></v-expansion-panels>
    <v-dialog :value="!!confirmation" @input="!$event && (confirmation = '')" max-width="400"><v-card><v-card-text class="pt-4">{{ confirmation }}</v-card-text><v-card-actions><v-btn text @click="confirmation = ''">Cancel</v-btn><v-btn text color="primary" @click="proceed">Continue</v-btn></v-card-actions></v-card></v-dialog>
    </div>
  </v-card>`,
  methods: {
    editEncounterPart(id) {
      this.enemyView = "records";
      this.state.rows = getFeatureRuntime().database.list(this.kind);
      this.choose(id);
    },
    description(id) {
      const game = getGameWindow();
      const row =
        this.kind === "enemy" && game.$dataEnemies && game.$dataEnemies[id];
      return row ? String(row.description || "").slice(0, 160) : "";
    },
    refreshMapEvents() {
      try {
        this.mapEvents =
          this.kind === "enemy"
            ? getFeatureRuntime()
                .battle.mapEvents(this.state.selectedId)
                .map((row) =>
                  Object.assign({}, row, {
                    label:
                      row.name +
                      " #" +
                      row.eventId +
                      " (troop " +
                      row.troopIds.join(", ") +
                      ")",
                  }),
                )
            : [];
        this.selectedEvent = null;
      } catch (error) {
        this.mapEvents = [];
        this.error = error.message;
      }
    },
    confirmMapEvent() {
      const row = this.mapEvents.find(
        (entry) => entry.eventId === this.selectedEvent,
      );
      if (row)
        this.confirmAction(
          "Run the original event? It may change story flags, quests, items and player location. Save first.",
          { mapEvent: Object.assign({}, row) },
        );
    },
    initialize() {
      try {
        const runtime = getFeatureRuntime();
        if (!runtime)
          throw new Error(
            "Game feature runtime is not ready. Reload this panel after the game starts.",
          );
        this.state = createDatabaseEditorState(
          runtime.database,
          this.kind,
          readDatabaseReferences(getGameWindow()),
        );
        this.paramNames = databaseParamNames(getGameWindow()).slice();
        if (this.state.rows.length)
          selectDatabaseRecord(
            this.state,
            runtime.database,
            this.state.rows[0].id,
          );
        this.refreshMapEvents();
      } catch (error) {
        this.error = error.message;
      }
    },
    reload() {
      if (
        this.state &&
        this.state.draft &&
        JSON.stringify(this.state.draft) !== JSON.stringify(this.state.original)
      )
        this.confirmAction("Discard the current draft and reload?", "reload");
      else this.initialize();
    },
    choose(id) {
      if (this.state.selectedId === id) return;
      if (
        JSON.stringify(this.state.draft) !== JSON.stringify(this.state.original)
      )
        this.confirmAction(
          "Discard the current draft and select another record?",
          { select: id },
        );
      else this.select(id);
    },
    select(id) {
      try {
        selectDatabaseRecord(this.state, getFeatureRuntime().database, id);
        this.level = 1;
        this.refreshMapEvents();
      } catch (error) {
        this.error = error.message;
      }
    },
    apply() {
      try {
        applyDatabaseDraft(this.state, getFeatureRuntime().database);
        this.state.rows = getFeatureRuntime().database.list(this.kind);
        this.error = "";
      } catch (error) {
        this.error = error.message;
      }
    },
    discard() {
      try {
        discardDatabaseDraft(this.state, getFeatureRuntime().database);
        this.error = "";
      } catch (error) {
        this.error = error.message;
      }
    },
    validLevel() {
      return Math.max(
        1,
        Math.min(this.maxLevel, Math.floor(Number(this.level) || 1)),
      );
    },
    normalizeLevel() {
      this.level = this.validLevel();
    },
    setCurve(index, value) {
      this.$set(this.state.draft.params[index], this.validLevel(), value);
    },
    confirmAction(message, action) {
      this.pending = action;
      this.confirmation = message;
    },
    proceed() {
      const action = this.pending;
      this.confirmation = "";
      try {
        const runtime = getFeatureRuntime();
        if (action === "reset") {
          resetDatabaseRecord(this.state, runtime.database);
          this.state.rows = runtime.database.list(this.kind);
        } else if (action === "reload") this.initialize();
        else if (action && action.select) this.select(action.select);
        else if (action && action.mapEvent)
          runtime.battle.startMapEvent(action.mapEvent);
        else if (action === "selected-enemy")
          runtime.battle.startEnemies([this.state.selectedId]);
        else if (action === "troop") runtime.battle.startTroop(this.troopId);
        else if (action === "roster")
          runtime.battle.startEnemies(this.roster.slice());
        else if (action === "summon")
          runtime.battle.summon(this.state.selectedId);
        if (
          action === "selected-enemy" ||
          action === "troop" ||
          action === "roster" ||
          action === "summon" ||
          (action && action.mapEvent)
        ) {
          window.dispatchEvent(new CustomEvent("cheat-return-to-game"));
          const game = getGameWindow();
          if (game !== window)
            game.dispatchEvent(new game.CustomEvent("cheat-return-to-game"));
          if (game.focus) game.focus();
        }
        this.updateAvailability();
      } catch (error) {
        this.error = error.message;
      }
    },
    updateAvailability() {
      const runtime = getFeatureRuntime();
      if (runtime) this.availability = runtime.battle.availability();
    },
    enemyName(id) {
      const row = this.state.rows.find((entry) => entry.id === id);
      return row ? row.name : "#" + id;
    },
  },
};
