import {
  getFeatureRuntime,
  getGameWindow,
} from "../js/runtime/FeatureRuntime.js";
import { readLocksState } from "../js/panels/locks/LockPanelState.js";
import LockFavoriteControls from "../components/LockFavoriteControls.js";
export default {
  name: "LocksPanel",
  components: { LockFavoriteControls },
  data() {
    return {
      rows: [],
      error: "",
      seconds: 0,
      working: false,
      timer: { frames: 0, working: false },
      actorId: null,
      stateId: null,
      statePresent: true,
      actors: [],
      states: [],
    };
  },
  mounted() {
    this.refresh();
    this._timer = setInterval(this.refresh, 1000);
  },
  beforeDestroy() {
    clearInterval(this._timer);
  },
  template: `<v-card flat class="pa-1"><div class="subtitle-1">Locks & Favorites</div><p class="caption">Stored for this game, across save slots. Not included in portable settings backups. Unlock before loading a save if you do not want its values overridden.</p><v-alert v-if="error" type="error" dense>{{error}}</v-alert>
    <div v-for="row in rows" :key="row.label" class="d-flex align-center py-1" style="border-bottom:1px solid #8884;"><div style="flex:1; min-width:0;"><div class="body-2">{{row.label}}</div><div class="caption">{{row.locked ? ('Locked: ' + display(row.value)) : 'Favorite'}} <span v-if="!row.enabled"> - Disabled: {{row.reason}}</span><span v-else-if="row.locked && !row.active"> - Waiting for active game</span></div></div><lock-favorite-controls :target="row.target" :value="row.value" @change="refresh"/><v-btn icon x-small title="Remove lock and favorite" @click="remove(row)"><v-icon small>mdi-delete</v-icon></v-btn></div><p v-if="!rows.length" class="caption">Use the star and lock buttons next to editable values.</p>
    <v-divider class="my-3"/><div data-feature="timer" class="subtitle-2">Game Timer</div><div class="caption mb-2">Current: {{Math.ceil(timer.frames / 60)}} seconds, {{timer.working ? 'running' : 'stopped'}}</div><v-row dense><v-col cols="6"><v-text-field v-model.number="seconds" type="number" min="0" label="Seconds" dense outlined hide-details @keydown.stop/></v-col><v-col cols="6"><v-checkbox v-model="working" label="Running" dense hide-details class="mt-1"/></v-col></v-row><v-btn small text @click="setTimer">Set Timer</v-btn><lock-favorite-controls :target="{kind:'timer'}" :value="timer" @change="refresh"/>
    <v-divider class="my-3"/><div class="subtitle-2">Status Effect Lock</div><v-row dense><v-col cols="6"><v-select v-model="actorId" :items="actors" item-text="name" item-value="id" label="Actor" dense outlined hide-details/></v-col><v-col cols="6"><v-select v-model="stateId" :items="states" item-text="name" item-value="id" label="Status" dense outlined hide-details/></v-col></v-row><v-checkbox v-model="statePresent" dense hide-details label="Keep present (unchecked: keep absent)"/><lock-favorite-controls v-if="actorId && stateId" :target="{kind:'state',actorId:actorId,id:stateId}" :value="statePresent" @change="refresh"/>
  </v-card>`,
  methods: {
    refresh() {
      this.rows = readLocksState();
      const game = getGameWindow();
      if (!game) return;
      const timer = game.$gameTimer;
      this.timer = {
        frames: timer ? Number(timer._frames) || 0 : 0,
        working: !!(timer && timer._working),
      };
      this.actors = (game.$dataActors || [])
        .filter(Boolean)
        .map((row) => ({ id: row.id, name: row.name || "#" + row.id }));
      this.states = (game.$dataStates || [])
        .filter(Boolean)
        .map((row) => ({ id: row.id, name: row.name || "#" + row.id }));
    },
    display(value) {
      return typeof value === "object" ? JSON.stringify(value) : String(value);
    },
    remove(row) {
      const locks = getFeatureRuntime().locks;
      locks.remove(row.target);
      locks.setFavorite(row.target, false);
      this.refresh();
    },
    setTimer() {
      try {
        const game = getGameWindow();
        if (!game.$gameTimer) throw new Error("Timer is unavailable");
        const seconds = Number(this.seconds);
        if (!Number.isFinite(seconds) || seconds < 0 || seconds > 35791394)
          throw new Error("Invalid timer seconds");
        game.$gameTimer.start(Math.floor(seconds * 60));
        if (!this.working) game.$gameTimer.stop();
        this.refresh();
      } catch (error) {
        this.error = error.message;
      }
    },
  },
};
