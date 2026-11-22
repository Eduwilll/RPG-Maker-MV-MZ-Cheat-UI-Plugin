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
import VirtualList from "../components/VirtualList.js";
import GameAsset from "../components/GameAsset.js";

export default {
  name: "DatabaseEditorPanel",
  inject: { cheatRuntime: { default: null } },
  components: {
    DatabaseRowsEditor,
    DatabaseTooltip,
    EncounterBrowser,
    VirtualList,
    GameAsset,
  },
  props: { kind: { type: String, default: "enemy" } },
  data() {
    return {
      state: null,
      enemyView: "encounters",
      detailView: "overview",
      mapEvents: [],
      selectedEvent: null,
      search: "",
      descriptions: {},
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
    hasDraftChanges() {
      return !!(
        this.state &&
        this.state.draft &&
        JSON.stringify(this.state.draft) !== JSON.stringify(this.state.original)
      );
    },
    inspectorViews() {
      if (this.kind === "enemy")
        return [
          { value: "overview", label: "Parameters" },
          { value: "behavior", label: "Actions & traits" },
          { value: "battle", label: "Battle" },
        ];
      if (this.kind === "skill")
        return [
          { value: "overview", label: "Costs & targeting" },
          { value: "damage", label: "Damage" },
          { value: "effects", label: "Effects" },
        ];
      return [
        { value: "overview", label: "Parameters" },
        { value: "progression", label: "Progression" },
        { value: "traits", label: "Traits" },
      ];
    },
    title() {
      return { enemy: "Enemies", skill: "Skills", class: "Classes" }[this.kind];
    },
    rows() {
      const term = String(this.search || "")
        .trim()
        .toLowerCase();
      if (!this.state) return [];
      if (!term) return this.state.rows;
      return this.state.rows.filter((row) =>
        (row.id + " " + row.name).toLowerCase().includes(term),
      );
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
  watch: {
    enemyView(value) {
      // Troops is the default view, so the record editor is loaded on demand.
      if (value === "records" && !this.state) this.initialize();
    },
  },
  created() {
    if (this.kind !== "enemy") this.initialize();
  },
  mounted() {
    this.updateAvailability();
    this._timer = setInterval(this.updateAvailability, 1000);
  },
  beforeDestroy() {
    clearInterval(this._timer);
  },
  template: `<v-card flat class="pa-1">
    <div v-if="kind === 'enemy'" class="workspace-segments record-mode" role="group" aria-label="Enemy view"><button type="button" :class="{'is-selected': enemyView === 'encounters'}" :aria-pressed="enemyView === 'encounters'" @click="enemyView = 'encounters'">Troops</button><button type="button" :class="{'is-selected': enemyView === 'records'}" :aria-pressed="enemyView === 'records'" @click="enemyView = 'records'">Enemy records</button></div>
    <encounter-browser v-if="kind === 'enemy' && enemyView === 'encounters'" @edit="editEncounterPart"/>
    <div v-if="kind !== 'enemy' || enemyView === 'records'">
    <v-alert v-if="error" type="error" role="alert" dense dismissible @input="error = ''">{{ error }}</v-alert>
    <div v-if="!state" class="workspace-empty"><p>Records are not available yet. Load a game, then try again.</p><v-btn small outlined @click="initialize">Retry loading</v-btn></div>
    <section class="record-workspace" v-if="state"><aside class="record-finder" :aria-label="title + ' records'">
      <div class="workspace-rail-heading"><strong>{{ title }}</strong><span>{{ rows.length }} / {{ state.rows.length }}</span><button type="button" class="workspace-icon" :aria-label="'Reload ' + title" :title="'Reload ' + title" @click="reload"><v-icon small>mdi-refresh</v-icon></button></div>
      <v-text-field v-model="search" label="Search name or ID" dense outlined hide-details prepend-inner-icon="mdi-magnify" clearable @keydown.stop/>
      <virtual-list v-if="rows.length" :items="rows" :height="Math.min(350, rows.length * 60)" :item-size="60">
        <template v-slot="{ item: row }">
          <div class="workspace-choice record-choice" :class="{ 'is-selected': state.selectedId === row.id }" role="button" tabindex="0" :aria-pressed="state.selectedId === row.id" :title="descriptions[row.id] || null" @click="choose(row.id)" @keydown.enter.stop.prevent="choose(row.id)" @keydown.space.stop.prevent="choose(row.id)">
            <span class="record-choice__body"><strong><database-tooltip :kind="kind" :record-id="row.id" :label="row.name"/></strong><small>#{{ row.id }}{{ row.edited ? ' · Edited' : '' }}</small></span>
          </div>
        </template>
      </virtual-list>
      <p v-else class="workspace-empty">No matching records. Try another name or ID.</p>
    </aside><div class="record-inspector" v-if="state.draft">
      <header class="record-heading"><game-asset v-if="kind !== 'class'" :kind="kind" :record-id="state.selectedId" :label="state.draft.name" :size="52" :navigate="false"/><div class="record-heading__body"><h3>{{ state.draft.name }}</h3><small>{{ kind === 'class' ? 'Class' : kind === 'skill' ? 'Skill' : 'Enemy' }} #{{ state.selectedId }}{{ state.edited ? ' · Edited in this save' : '' }}</small></div></header>
      <div class="record-apply-bar"><v-btn small color="primary" :disabled="!hasDraftChanges" @click="apply">Apply</v-btn><v-btn small text :disabled="!hasDraftChanges" @click="discard">Discard Draft</v-btn><span class="record-draft-status" role="status">{{ hasDraftChanges ? 'Unapplied changes' : state.status || 'No pending changes' }}</span></div>
      <p class="workspace-hint">Apply changes, then save the game. Original game files are never changed.</p>
      <div class="inspector-views" role="group" :aria-label="title + ' sections'"><button v-for="view in inspectorViews" :key="view.value" type="button" :class="{'is-selected': detailView === view.value}" :aria-pressed="detailView === view.value" @click="detailView = view.value">{{ view.label }}</button></div>
      <section v-show="detailView === 'overview'">
      <h4 class="record-section-title">{{ kind === 'enemy' ? 'Rewards' : kind === 'skill' ? 'Costs & performance' : 'Parameter curves' }}</h4>
      <v-row dense v-if="kind !== 'class'"><v-col v-for="field in numericFields" :key="field.key" cols="6"><v-text-field v-model="state.draft[field.key]" :label="field.label" type="number" dense outlined hide-details @keydown.stop/></v-col></v-row>
      </section>
      <template v-if="kind === 'enemy'"><section v-show="detailView === 'overview'"><h4 class="record-section-title">Base parameters</h4><v-row dense><v-col v-for="(value,i) in state.draft.params" :key="i" cols="6"><v-text-field v-model="state.draft.params[i]" :label="paramNames[i]" type="number" dense outlined hide-details @keydown.stop/></v-col></v-row></section>
        <section v-show="detailView === 'behavior'"><h4 class="record-section-title">Actions</h4><database-rows-editor v-model="state.draft.actions" type="actions" :references="state.references"/></section>
      </template>
      <template v-if="kind === 'skill'"><section v-show="detailView === 'overview'"><h4 class="record-section-title">Targeting</h4><v-row dense><v-col cols="6"><v-select v-model="state.draft.scope" :items="scopeOptions" label="Target Scope" dense outlined hide-details/></v-col><v-col cols="6"><v-select v-model="state.draft.hitType" :items="[{text:'Certain Hit',value:0},{text:'Physical',value:1},{text:'Magical',value:2}]" label="Hit Type" dense outlined hide-details/></v-col></v-row></section>
        <section v-show="detailView === 'damage'"><h4 class="record-section-title">Damage</h4><v-row dense v-if="state.draft.damage"><v-col cols="6"><v-select v-model="state.draft.damage.type" :items="[{text:'None',value:0},{text:'HP Damage',value:1},{text:'MP Damage',value:2},{text:'HP Recovery',value:3},{text:'MP Recovery',value:4},{text:'HP Drain',value:5},{text:'MP Drain',value:6}]" label="Damage Type" dense outlined hide-details/></v-col><v-col cols="6"><v-select v-model="state.draft.damage.elementId" :items="elementOptions" label="Element" dense outlined hide-details/></v-col><v-col cols="12"><v-textarea v-model="state.draft.damage.formula" label="Damage Formula (RPG Maker JavaScript)" rows="2" dense outlined hide-details @keydown.stop/><div class="caption cheat-text-warning">Formulas are code. They are not executed as a preview; invalid code can fail during battle.</div></v-col><v-col cols="6"><v-text-field v-model="state.draft.damage.variance" label="Variance (%)" type="number" dense outlined hide-details @keydown.stop/></v-col><v-col cols="6"><v-checkbox v-model="state.draft.damage.critical" label="Critical Hits" dense hide-details class="mt-1"/></v-col></v-row></section>
        <section v-show="detailView === 'effects'"><h4 class="record-section-title">Effects</h4><database-rows-editor v-model="state.draft.effects" type="effects" :references="state.references"/></section>
      </template>
      <template v-if="kind === 'class'"><section v-show="detailView === 'overview'"><v-text-field v-model.number="level" :min="1" :max="maxLevel" label="Edit values at level" type="number" dense outlined hide-details class="my-2 record-level" @change="normalizeLevel" @keydown.stop/>
        <v-row dense><v-col v-for="(curve,i) in state.draft.params" :key="i" cols="6"><v-text-field :value="curve[validLevel()]" @input="setCurve(i,$event)" :label="paramNames[i] + ' at Lv' + validLevel()" type="number" dense outlined hide-details @keydown.stop/></v-col></v-row>
        </section><section v-show="detailView === 'progression'"><h4 class="record-section-title">EXP curve</h4><v-row dense><v-col v-for="(name,i) in ['Base Value','Extra Value','Acceleration A','Acceleration B']" :key="i" cols="6"><v-text-field v-model="state.draft.expParams[i]" :label="name" type="number" dense outlined hide-details @keydown.stop/></v-col></v-row>
        <h4 class="record-section-title">Level-up skills</h4><p class="workspace-hint">Changes apply to future level-ups, not skills already learned.</p><database-rows-editor v-model="state.draft.learnings" type="learnings" :references="state.references"/></section>
      </template>
      <section v-if="state.draft.traits" v-show="detailView === (kind === 'enemy' ? 'behavior' : kind === 'skill' ? 'effects' : 'traits')"><h4 class="record-section-title">Traits</h4><database-rows-editor v-model="state.draft.traits" type="traits" :references="state.references"/></section>
    <div v-if="kind === 'enemy' && state" v-show="detailView === 'battle'" class="mt-3">
      <v-btn small color="primary" :disabled="!availability.start.allowed || !state.selectedId" @click="confirmAction('Start a standalone battle here? Normal defeat and rewards still apply; the original map event will not run.', 'selected-enemy')">Start Battle Here</v-btn>
      <v-btn small text @click="refreshMapEvents">Refresh map events</v-btn>
      <div class="caption mt-1">{{ availability.start.reason }} Standalone fights do not move the player.</div>
      <v-select v-model="selectedEvent" :items="mapEvents" item-text="label" item-value="eventId" label="Original battle events on this map" dense outlined hide-details class="mt-2"/>
      <div v-if="!mapEvents.length" class="caption mt-1">No matching active event found on this map. You can still use Start Battle Here.</div>
      <v-btn small class="mt-1" :disabled="!selectedEvent || !availability.start.allowed" @click="confirmMapEvent">Run Map Event</v-btn>
      <div class="caption">Original events may change quests, flags, items or location. Conditional branches may not enter combat. Script-only battles cannot be matched automatically.</div>
    </div>
    <v-expansion-panels v-if="kind === 'enemy' && state" v-show="detailView === 'battle'" class="mt-2"><v-expansion-panel><v-expansion-panel-header>Troops & Reinforcements</v-expansion-panel-header><v-expansion-panel-content>
      <div class="caption mb-2">Custom battle plugins may restrict these actions. Existing enemy definitions use your applied edits.</div>
      <v-select v-model="troopId" :items="state.references.troops" item-text="name" item-value="id" label="Existing Troop" dense outlined hide-details/>
      <v-btn x-small class="my-2" :disabled="!troopId || !availability.start.allowed" @click="confirmAction('Start the selected troop encounter?', 'troop')">Fight Troop</v-btn>
      <div class="caption">{{ availability.start.reason }}</div>
      <v-btn x-small text :disabled="!state.selectedId || roster.length >= 32" @click="roster.push(state.selectedId)">Add selected enemy to roster</v-btn>
      <div><v-chip v-for="(id,i) in roster" :key="i" x-small close @click:close="roster.splice(i,1)">{{ enemyName(id) }}</v-chip></div>
      <v-btn x-small class="my-2" :disabled="!roster.length || !availability.start.allowed" @click="confirmAction('Start a custom encounter with this roster?', 'roster')">Fight Roster</v-btn>
      <v-btn x-small class="ml-1" :disabled="!state.selectedId || !availability.summon.allowed" @click="confirmAction('Add this enemy to the current battle?', 'summon')">Summon Selected</v-btn><div class="caption">{{ availability.summon.reason }}</div>
    </v-expansion-panel-content></v-expansion-panel></v-expansion-panels>
    <details class="workspace-advanced mt-3"><summary>Original values</summary><p class="workspace-hint">Revert this record's saved overrides, not just the current draft.</p><v-btn x-small text color="warning" @click="confirmAction('Reset this record to its original values?', 'reset')">Reset to Original</v-btn></details>
    </div><div v-else class="record-inspector workspace-empty">Select a record to edit.</div></section>
    <v-dialog :value="!!confirmation" @input="!$event && (confirmation = '')" max-width="400"><v-card><v-card-text class="pt-4">{{ confirmation }}</v-card-text><v-card-actions><v-btn text @click="confirmation = ''">Cancel</v-btn><v-btn text color="primary" @click="proceed">Continue</v-btn></v-card-actions></v-card></v-dialog>
    </div>
  </v-card>`,
  methods: {
    editEncounterPart(id) {
      this.enemyView = "records";
      if (!this.state) this.initialize();
      if (!this.state) return;
      this.state.rows = Object.freeze(
        (this.cheatRuntime || getFeatureRuntime()).database.list(this.kind),
      );
      this.cacheDescriptions();
      this.choose(id);
    },
    cacheDescriptions() {
      const descriptions = {};
      const game = getGameWindow();
      if (this.kind === "enemy" && this.state && game && game.$dataEnemies)
        this.state.rows.forEach((row) => {
          const record = game.$dataEnemies[row.id];
          if (record && record.description)
            descriptions[row.id] = String(record.description).slice(0, 160);
        });
      this.descriptions = descriptions;
    },
    refreshMapEvents() {
      try {
        this.mapEvents =
          this.kind === "enemy"
            ? (this.cheatRuntime || getFeatureRuntime()).battle
                .mapEvents(this.state.selectedId)
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
      this.error = "";
      try {
        const runtime = this.cheatRuntime || getFeatureRuntime();
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
        this.cacheDescriptions();
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
        const runtime = this.cheatRuntime || getFeatureRuntime();
        selectDatabaseRecord(this.state, runtime.database, id);
        this.level = 1;
        this.refreshMapEvents();
      } catch (error) {
        this.error = error.message;
      }
    },
    apply() {
      try {
        const runtime = this.cheatRuntime || getFeatureRuntime();
        applyDatabaseDraft(this.state, runtime.database);
        this.state.rows = Object.freeze(runtime.database.list(this.kind));
        this.cacheDescriptions();
        this.error = "";
      } catch (error) {
        this.error = error.message;
      }
    },
    discard() {
      try {
        const runtime = this.cheatRuntime || getFeatureRuntime();
        discardDatabaseDraft(this.state, runtime.database);
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
        const runtime = this.cheatRuntime || getFeatureRuntime();
        if (action === "reset") {
          resetDatabaseRecord(this.state, runtime.database);
          this.state.rows = Object.freeze(runtime.database.list(this.kind));
          this.cacheDescriptions();
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
      const runtime = this.cheatRuntime || getFeatureRuntime();
      if (!runtime) return;
      const next = runtime.battle.availability();
      // Availability is polled every second. Only assign when it changes so
      // large record lists are not re-rendered on every tick.
      if (JSON.stringify(next) === JSON.stringify(this.availability)) return;
      this.availability = next;
    },
    enemyName(id) {
      const row = this.state.rows.find((entry) => entry.id === id);
      return row ? row.name : "#" + id;
    },
  },
};
