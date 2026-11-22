import {
  getFeatureRuntime,
  getGameWindow,
} from "../js/runtime/FeatureRuntime.js";
import {
  createSkillSwitchTrace,
  setSkillSwitchValue,
} from "../js/panels/actors/SkillSwitchState.js";
import { requestEventNavigation } from "../js/ui/RecordNavigation.js";

export default {
  name: "SkillSwitchInspector",
  inject: { cheatRuntime: { default: null } },
  props: { actorId: Number, skillId: Number },
  data() {
    return {
      rows: [],
      skillName: "",
      error: "",
      scanning: false,
      progress: 0,
      total: 0,
      failed: 0,
      finished: false,
      stopped: false,
      limited: false,
      showOther: false,
      pending: null,
    };
  },
  created() {
    this._generation = 0;
    this.refresh();
  },
  beforeDestroy() {
    this._generation++;
  },
  computed: {
    otherCount() {
      return this.rows.some((row) => row.nameMatch)
        ? this.rows.filter((row) => !row.nameMatch).length
        : 0;
    },
    visibleRows() {
      return this.showOther || !this.otherCount
        ? this.rows
        : this.rows.filter((row) => row.nameMatch);
    },
  },
  template: `<section class="skill-switch-review" aria-label="Skill switch review">
    <div class="workspace-rail-heading"><strong>{{skillName}} · switch review</strong><button type="button" class="workspace-icon" aria-label="Close switch review" title="Close switch review" @click="$emit('close')"><v-icon small>mdi-close</v-icon></button></div>
    <p class="workspace-hint">These are references, not an activation recipe. Switches are global and can affect story progress and other actors. Learning a skill does not change them.</p>
    <v-alert v-if="error" dense type="error" role="alert">{{error}}</v-alert>
    <div class="record-actions"><v-btn x-small outlined :disabled="scanning" @click="refresh">Refresh review</v-btn><v-btn v-if="!scanning" x-small outlined @click="scanAllMaps">{{finished ? 'Scan maps again' : 'Scan all maps'}}</v-btn><v-btn v-else x-small text @click="cancelScan">Stop scan</v-btn></div>
    <p class="workspace-hint" role="status">{{scanning ? 'Scanning maps '+progress+' / '+total : finished ? 'Map scan finished: '+progress+' / '+total : stopped ? 'Scan stopped: '+progress+' / '+total+' maps scanned.' : 'Current map and common events scanned. Other maps have not been scanned.'}}{{failed ? ' · '+failed+' map(s) could not be read.' : ''}}</p>
    <p v-if="limited" class="workspace-hint" role="status">Some results were limited: deep common-event chains and broad switch ranges are bounded for safety.</p>
    <v-progress-linear v-if="scanning" :value="total ? progress/total*100 : 0" height="3" class="mb-2"/>
    <p v-if="!rows.length" class="workspace-empty">No related switches found in this scope. Try scanning other maps. Plugin scripts and dynamically chosen IDs may not be traceable.</p>
    <v-btn v-if="otherCount" x-small text class="mb-2" :aria-expanded="showOther" @click="showOther=!showOther">{{showOther ? 'Hide other event conditions' : 'Show other event conditions'}} ({{otherCount}})</v-btn>
    <article v-for="row in visibleRows" :key="row.id" class="skill-switch-row">
      <header><div><strong>#{{row.id}} {{row.name}}</strong><small>{{row.link==='event' ? 'Linked by event commands; not necessarily required' : 'Name match; relationship is unverified'}}</small></div><v-btn x-small outlined :aria-label="'Change switch '+row.id+', currently '+(row.value ? 'ON' : 'OFF')" @click="reviewChange(row)">{{row.value ? 'ON' : 'OFF'}} · Change</v-btn></header>
      <details v-if="row.evidence.length"><summary>Evidence · {{row.references}} reference{{row.references===1 ? '' : 's'}}</summary><div v-for="(e,i) in row.evidence" :key="i" class="skill-switch-evidence"><strong>{{e.action}}</strong> · {{e.source}}{{e.command ? ' · command '+e.command : ''}}<button v-if="e.mapId && e.eventId" type="button" class="workspace-text-action" @click="inspect(e)">Open in Event Analyzer</button></div><p v-if="row.references>row.evidence.length" class="workspace-hint">Showing {{row.evidence.length}} references, prioritizing event links over name-only matches.</p></details>
    </article>
    <p class="workspace-hint">Scripts and plugin-specific conditions are not executed or inferred. A switch may be intended to stay OFF.</p>
    <v-dialog :value="!!pending" @input="!$event && (pending=null)" max-width="420"><v-card><v-card-title class="subtitle-1">Confirm global switch change</v-card-title><v-card-text v-if="pending">Set #{{pending.id}} {{pending.name}} to {{pending.value ? 'ON' : 'OFF'}}? This may bypass story progression. It affects the game globally, not just this actor. Save a backup first.</v-card-text><v-card-actions><v-btn text @click="pending=null">Cancel</v-btn><v-btn color="warning" text @click="applyChange">Change switch</v-btn></v-card-actions></v-card></v-dialog>
  </section>`,
  methods: {
    refresh() {
      this._generation++;
      this.pending = null;
      this.error = "";
      this.scanning = false;
      this.finished = false;
      this.stopped = false;
      this.progress = 0;
      this.failed = 0;
      try {
        const game = getGameWindow();
        this.skillName = String(
          game.$dataSkills[this.skillId].name || "Skill " + this.skillId,
        );
        this._trace = createSkillSwitchTrace(game, this.skillId);
        this.rows = this._trace.result();
        this.limited = this._trace.isLimited();
      } catch (error) {
        this.rows = [];
        this._trace = null;
        this.error = error.message;
      }
    },
    cancelScan() {
      this._generation++;
      this.scanning = false;
      this.stopped = true;
    },
    async scanAllMaps() {
      if (this.scanning || !this._trace) return;
      const game = getGameWindow(),
        runtime = this.cheatRuntime || getFeatureRuntime(),
        trace = this._trace;
      if (!runtime || !runtime.previews) {
        this.error = "Map loader is not available.";
        return;
      }
      const maps = (game.$dataMapInfos || []).filter(
          (map) => map && map.id > 0,
        ),
        generation = ++this._generation;
      this.pending = null;
      this.error = "";
      this.scanning = true;
      this.progress = 0;
      this.failed = 0;
      this.finished = false;
      this.stopped = false;
      this.total = maps.length;
      for (const map of maps) {
        if (generation !== this._generation) return;
        try {
          const data = await runtime.previews.load(map.id);
          if (generation !== this._generation) return;
          trace.scanMap(data, map.id);
        } catch (error) {
          if (generation !== this._generation) return;
          this.failed++;
        }
        this.progress++;
        this.rows = trace.result();
        this.limited = trace.isLimited();
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      if (generation === this._generation) {
        this.scanning = false;
        this.finished = true;
      }
    },
    reviewChange(row) {
      this._pendingSwitches = getGameWindow().$gameSwitches;
      this.pending = {
        id: row.id,
        name: row.name,
        value: !row.value,
        expected: row.value,
        skillId: this.skillId,
        actorId: this.actorId,
      };
    },
    applyChange() {
      const change = this.pending;
      this.pending = null;
      if (!change) return;
      try {
        if (change.skillId !== this.skillId || change.actorId !== this.actorId)
          throw Error("The selected skill or actor changed. Review again.");
        if (getGameWindow().$gameSwitches !== this._pendingSwitches)
          throw Error("The game session changed. Review again.");
        setSkillSwitchValue(
          getGameWindow(),
          change.id,
          change.value,
          change.expected,
        );
        this.error = "";
      } catch (error) {
        this.error = error.message;
      }
      if (this._trace) this.rows = this._trace.result();
    },
    inspect(evidence) {
      requestEventNavigation(evidence.mapId, evidence.eventId);
    },
  },
};
