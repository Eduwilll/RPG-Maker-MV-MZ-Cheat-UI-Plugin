import { EventDatabase } from "../js/panels/event-analyzer/EventDatabase.js";
import EventContext from "../components/EventContext.js";
import EventReferenceTable from "../components/EventReferenceTable.js";
import VirtualList from "../components/VirtualList.js";
import {
  facingEventId,
  battleConditionLines,
  eventReferencePages,
} from "../js/panels/event-analyzer/EventExplorerState.js";
import { buildDataEventReferenceRows } from "../js/panels/watcher/WatcherPanelState.js";
import { getGameWindow } from "../js/runtime/FeatureRuntime.js";
import { requestMapNavigation } from "../js/ui/RecordNavigation.js";
import { SequenceTracer } from "../js/panels/event-analyzer/SequenceTracer.js";
import {
  getCommandIcon,
  formatPageConditions,
} from "../js/panels/event-analyzer/EventAnalyzerCommands.js";

// ─────────────────────────────────────────────────────────────────────────────
// Vuetify v-treeview icon/colour helpers
// ─────────────────────────────────────────────────────────────────────────────
const KIND_META = {
  "event-ref": { icon: "mdi-link-variant", color: "info" },
  "cycle-ref": { icon: "mdi-sync-alert", color: "warning" },
  "battle-ref": { icon: "mdi-sword-cross", color: "primary" },
  branch: { icon: "mdi-source-branch", color: "warning" },
  "branch-true": { icon: "mdi-check-circle", color: "success" },
  "branch-false": { icon: "mdi-close-circle", color: "error" },
  choices: { icon: "mdi-format-list-bulleted", color: "accent" },
  "choice-branch": { icon: "mdi-menu-right", color: "accent" },
  battle: { icon: "mdi-sword-cross", color: "primary" },
  "battle-section": { icon: "mdi-chevron-right", color: "primary" },
  loop: { icon: "mdi-repeat", color: "info" },
  command: { icon: null /* per-code */, color: "secondary" },
};

const CE_TRIGGER_LABELS = ["None", "Autorun", "Parallel"];

export default {
  name: "EventAnalyzerPanel",
  components: { EventContext, EventReferenceTable, VirtualList },

  template: `
<section class="event-workspace" aria-label="Event explorer">
  <aside class="event-finder">
    <div class="workspace-rail-heading"><strong>Find an event</strong><button type="button" class="workspace-icon" title="Refresh game data" aria-label="Reload game data" @click="reload"><v-icon small>mdi-refresh</v-icon></button></div>
    <div class="workspace-segments" role="group" aria-label="Event source">
      <button v-for="mode in [{id:'facing',label:'Facing'},{id:'nearby',label:'Nearby'},{id:'browse',label:'Browse'}]" :key="mode.id" type="button" :class="{'is-selected':entryMode===mode.id}" :aria-pressed="String(entryMode===mode.id)" @click="setEntryMode(mode.id)">{{mode.label}}</button>
    </div>
    <event-context v-if="entryMode!=='browse'" :mode="entryMode" :selected-event-id="selectedEventId" :selected-map-id="selectedMapId" @nearby="setEntryMode('nearby')" @inspect="selectEvent($event.mapId,$event.eventId)"/>
    <div v-else class="event-browser">
      <v-select v-model="rootType" :items="[{text:'Map events',value:'map'},{text:'Common events',value:'common'},{text:'Battle events',value:'battle'}]" label="Event type" dense outlined hide-details @keydown.stop/>
      <v-autocomplete v-if="rootType==='map'" v-model="selectedMapId" :items="availableMaps" item-text="name" item-value="id" label="Map" dense outlined hide-details @change="onMapChange" @keydown.stop/>
      <v-text-field v-model="eventSearch" label="Name or event ID" dense outlined hide-details clearable @keydown.stop/>
      <div v-if="loadingMaps" class="workspace-rail-note" role="status">Loading events...</div>
      <virtual-list :items="browseRows" :item-size="56" :height="250"><template v-slot:default="{item}"><button type="button" class="workspace-choice event-choice" :class="{'is-selected':selectedRecordId===item.id}" @click="chooseBrowseRecord(item)"><strong>{{item.name}}</strong><small>#{{item.id}}</small></button></template></virtual-list>
      <p v-if="!loadingMaps && !browseRows.length" class="workspace-empty">No events match this source.</p>
      <details class="workspace-advanced"><summary>Data tools</summary><p class="caption">Other maps load when you select them.</p><v-btn x-small outlined :loading="loadingMaps" @click="loadAllMaps">Preload all maps</v-btn><span v-if="loadProgress.total" class="workspace-rail-note">{{loadProgress.loaded}} / {{loadProgress.total}}</span></details>
    </div>
  </aside>
  <main class="event-inspector">
    <v-alert v-if="traceError" type="error" dense>{{traceError}}</v-alert>
    <template v-if="hasSelection">
      <header class="workspace-inspector-heading"><div><span class="workspace-eyebrow">{{rootType==='map'?'Map event':rootType==='common'?'Common event':'Battle event'}} #{{selectedRecordId}}</span><h3>{{selectedTitle}}</h3></div><button v-if="rootType==='map' && selectedIsLive" type="button" class="workspace-icon" title="Show event on map" aria-label="Show event on map" @click="showOnMap"><v-icon small>mdi-map-outline</v-icon></button></header>
      <div class="event-page-bar"><span>{{rootType==='map'?'Map '+selectedMapId:rootType==='common'?'Reusable event':'Troop event'}}</span><v-select v-if="rootType==='map' && mapPageItems.length>1" v-model="selectedPageIndex" :items="mapPageItems" item-text="label" item-value="value" label="Event page" dense outlined hide-details @keydown.stop/><v-select v-else-if="rootType==='battle' && battlePageItems.length>1" v-model="selectedBattlePageIndex" :items="battlePageItems" item-text="label" item-value="value" label="Battle page" dense outlined hide-details @keydown.stop/><span v-else-if="rootType!=='common'">Page 1</span></div>
      <div class="inspector-views" role="group" aria-label="Event detail view">
        <button type="button" :class="{'is-selected':detailTab==='overview'}" :aria-pressed="String(detailTab==='overview')" @click="openDetail('overview')">Details</button>
        <button type="button" :class="{'is-selected':detailTab==='references'}" :aria-pressed="String(detailTab==='references')" @click="openDetail('references')">Switches &amp; variables</button>
        <button type="button" :class="{'is-selected':detailTab==='tree'}" :aria-pressed="String(detailTab==='tree')" @click="openDetail('tree')">Commands</button>
      </div>
      <section v-if="detailTab==='overview'" class="event-overview">
        <div class="event-facts"><div><span>Starts by</span><strong>{{selectedTrigger}}</strong></div><div><span>Commands</span><strong>{{selectedCommandCount}}</strong></div></div>
        <h4>What makes this event available?</h4>
        <ul v-if="selectedConditions.length" class="event-conditions"><li v-for="(line,i) in selectedConditions" :key="i">{{line}}</li></ul>
        <p v-else class="workspace-secondary">No page conditions. This page does not require a switch or variable to be enabled.</p>
        <button type="button" class="workspace-next-action" @click="openDetail('references')"><span><strong>Inspect its switches and variables</strong><small>See current values and change them here.</small></span><v-icon small>mdi-chevron-right</v-icon></button>
        <p class="workspace-safe-note"><v-icon x-small>mdi-eye-outline</v-icon>Inspecting does not run this event.</p>
      </section>
      <section v-if="detailTab==='references'" class="event-values">
        <p class="workspace-secondary">{{rootType==='map'?'References from all pages of this event.':'References on the selected event page.'}} Edits change the live game values.</p>
        <event-reference-table compact :rows="referenceRows" @change="refreshReferences"/>
      </section>
      <section v-show="detailTab==='tree'" class="event-commands">
        <div class="event-command-tools"><span>{{nodeCount}} commands and branches</span><v-btn x-small text :loading="tracing" @click="trace">Refresh</v-btn><v-btn x-small text :disabled="!treeItems.length" @click="expandAll">Expand</v-btn><v-btn x-small text :disabled="!treeItems.length" @click="collapseAll">Collapse</v-btn></div>
                <v-treeview
            v-if="treeItems.length > 0"
            :items="treeItems"
            :open.sync="openItems"
            item-key="id"
            item-text="name"
            dense
            class="event-analyzer-tree pa-0">

            <template v-slot:prepend="{ item }">
                <v-icon
                    :color="item.color"
                    small
                    class="mr-1">
                    {{ item.icon }}
                </v-icon>
            </template>

            <template v-slot:label="{ item }">
                <div class="d-flex align-center">
                    <span
                        :class="[
                            'caption',
                            item.kind === 'cycle-ref'    ? 'cheat-text-warning font-weight-bold' :
                            item.kind === 'event-ref'    ? 'cheat-text-info' :
                            item.kind === 'event-end'    ? 'cheat-muted font-italic' :
                            item.kind === 'battle-ref'   ? 'cheat-text-primary' :
                            item.kind === 'branch'       ? 'cheat-text-warning' :
                            item.kind === 'branch-true'  ? 'cheat-text-success' :
                            item.kind === 'branch-false' ? 'cheat-text-error' :
                            item.kind === 'choices'      ? 'cheat-text-accent' :
                            item.kind === 'loop'         ? 'cheat-text-info' :
                            ''
                        ]">
                        {{ item.name }}
                    </span>
                    
                    <!-- Run button -->
                    <v-btn
                        v-if="executionUnlocked && item.eventKey && item.commandIndex !== undefined"
                        x-small text class="ml-2 pa-0 cheat-text-success event-analyzer__run"
                        @click.stop="confirmExecution(item)">
                        <v-icon x-small color="success" left>mdi-play</v-icon>
                        <span class="caption">Run</span>
                    </v-btn>

                    <!-- Jump-to button for battle refs -->
                    <v-btn
                        v-if="item.kind === 'battle-ref' && item.troopId"
                        x-small text class="ml-1 pa-0 event-analyzer__run"
                        @click.stop="jumpToBattleEvent(item.troopId)">
                        <v-icon x-small>mdi-arrow-right-circle-outline</v-icon>
                        <span class="caption">Jump →</span>
                    </v-btn>
                </div>
            </template>

        </v-treeview>
        <p v-if="!tracing && !treeItems.length" class="workspace-secondary">No commands on this page.</p>
        <details class="workspace-advanced"><summary>Advanced: run game commands</summary><p class="caption">Running commands can change progress or start a battle. Reading the tree is safe.</p><v-checkbox v-model="executionUnlocked" label="Show Run actions" dense hide-details/></details>
      </section>
    </template>
    <div v-else class="workspace-empty event-inspector-empty" role="status"><v-icon large>mdi-magnify-scan</v-icon><h3>{{selectingEvent?'Loading event...':'Choose an event to understand it'}}</h3><p v-if="!selectingEvent">Face an object in the game, choose a nearby event, or browse another map.</p><v-btn v-if="!selectingEvent" small outlined @click="setEntryMode('nearby')">Explore nearby events</v-btn></div>
  </main>
  <v-dialog :value="!!pendingRun" @input="pendingRun=null" max-width="420"><v-card><v-card-title class="subtitle-1">Run game commands?</v-card-title><v-card-text>This can change game progress, start battles or replace the current event flow. Inspecting the tree does not require running it.</v-card-text><v-card-actions><v-btn text @click="pendingRun=null">Cancel</v-btn><v-btn text color="warning" @click="runConfirmed">Run commands</v-btn></v-card-actions></v-card></v-dialog>
</section>
  `,
  data() {
    return {
      entryMode: "facing",
      eventSearch: "",
      selectingEvent: false,
      executionUnlocked: false,
      detailTab: "overview",
      referenceRows: [],
      pendingRun: null,
      /** @type {import('../js/panels/event-analyzer/EventDatabase.js').EventDatabase | null} */
      db: null,

      /**
       * Incremented whenever the database changes so computed properties
       * that depend on non-reactive db internals are re-evaluated.
       */
      dbVersion: 0,
      liveMapId: 0,

      // Root type
      rootType: "map",

      // Map event
      selectedMapId: 0,
      selectedEventId: 0,
      selectedPageIndex: 0,

      // Common event
      selectedCeId: 0,

      // Battle event
      selectedTroopId: 0,
      selectedBattlePageIndex: 0,

      // Map loading
      loadingMaps: false,
      loadProgress: { loaded: 0, total: 0, current: "" },

      // Trace result
      tracing: false,
      /** @type {any | null} */
      traceTree: null,
      traceError: null,

      // v-treeview state
      treeItems: [],
      openItems: [],
    };
  },

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  created() {
    // Non-reactive counter for treeview item IDs
    this._treeId = 0;

    this.db = new EventDatabase();
    this.db.loadFromGlobals();
    this.dbVersion++;

    // Auto-select sensible defaults
    const mapId = this.db.getCurrentMapId();
    this.liveMapId = mapId;
    this._liveMapData = getGameWindow().$dataMap;
    if (mapId) this.selectedMapId = mapId;

    const ces = this.db.getAllCommonEvents();
    if (ces.length > 0) this.selectedCeId = ces[0].id;

    const troops = this.db.getAllBattleTroops();
    if (troops.length > 0) this.selectedTroopId = troops[0].id;
    const facing = facingEventId(getGameWindow());
    if (facing) this.selectEvent(mapId, facing);
  },
  mounted() {
    this._referenceTimer = setInterval(() => {
      const game = getGameWindow(),
        id = game.$gameMap ? game.$gameMap.mapId() : 0;
      if (id !== this.liveMapId || this._liveMapData !== game.$dataMap) {
        this.liveMapId = id;
        this._liveMapData = game.$dataMap;
        this.db.loadFromGlobals();
        this.dbVersion++;
      }
      if (
        this.detailTab === "references" &&
        (!this.$el.contains(document.activeElement) ||
          !document.activeElement.matches("input,textarea,[contenteditable]"))
      )
        this.refreshReferences();
    }, 750);
  },
  beforeDestroy() {
    clearInterval(this._referenceTimer);
    this._selectionRequest = null;
    this._mapRequest = null;
  },
  watch: {
    rootType() {
      this.eventSearch = "";
      this.detailTab = "overview";
      this.clearTrace();
      this.refreshReferences();
    },
    selectedCeId() {
      this.clearTrace();
      this.refreshReferences();
    },
    selectedTroopId() {
      this.clearTrace();
      this.refreshReferences();
    },
    selectedBattlePageIndex() {
      this.clearTrace();
      this.refreshReferences();
      if (this.detailTab === "tree") this.$nextTick(() => this.trace());
    },
    selectedPageIndex() {
      this.clearTrace();
      this.refreshReferences();
      if (this.detailTab === "tree") this.$nextTick(() => this.trace());
    },
    selectedEventId() {
      this.clearTrace();
      this.refreshReferences();
    },
  },

  // ── Computed ────────────────────────────────────────────────────────────────
  computed: {
    selectedRecordId() {
      return this.rootType === "map"
        ? this.selectedEventId
        : this.rootType === "common"
          ? this.selectedCeId
          : this.selectedTroopId;
    },
    hasSelection() {
      return !!(this.rootType === "map"
        ? this.selectedDataEvent
        : this.rootType === "common"
          ? this.selectedCommon
          : this.selectedTroop);
    },
    selectedTitle() {
      const record =
        this.rootType === "map"
          ? this.selectedDataEvent
          : this.rootType === "common"
            ? this.selectedCommon
            : this.selectedTroop;
      return record ? record.name || "Unnamed event" : "";
    },
    browseRows() {
      const source =
        this.rootType === "map"
          ? this.availableMapEvents
          : this.rootType === "common"
            ? this.availableCommonEvents
            : this.availableBattleTroops;
      const query = String(this.eventSearch || "").toLowerCase();
      return source
        .filter(
          (row) =>
            !query || (row.name + " #" + row.id).toLowerCase().includes(query),
        )
        .map((row) => ({ id: row.id, name: row.name || "Event " + row.id }));
    },
    selectedTrigger() {
      if (this.rootType === "common")
        return this.selectedCommon
          ? this.formatTrigger(this.selectedCommon.trigger)
          : "None";
      if (this.rootType === "battle") return "Battle conditions";
      const event = this.selectedDataEvent,
        page = event && event.pages[this.selectedPageIndex];
      return page
        ? [
            "Action button",
            "Player touch",
            "Event touch",
            "Autorun",
            "Parallel",
          ][page.trigger || 0] || "Game event"
        : "Unavailable";
    },
    selectedCommon() {
      void this.dbVersion;
      return this.db ? this.db.getCommonEvent(this.selectedCeId) : null;
    },
    selectedTroop() {
      void this.dbVersion;
      return this.db ? this.db.getBattleTroop(this.selectedTroopId) : null;
    },
    selectedDataEvent() {
      void this.dbVersion;
      return this.db
        ? this.db.getMapEvent(this.selectedMapId, this.selectedEventId)
        : null;
    },
    selectedIsLive() {
      return this.liveMapId === this.selectedMapId;
    },
    selectedConditions() {
      if (this.rootType === "common") {
        const record = this.selectedCommon;
        return record && record.trigger > 0 && record.switchId
          ? [
              "Switch " +
                record.switchId +
                ": " +
                this.getSwitchName(record.switchId) +
                " must be ON",
            ]
          : [];
      }
      if (this.rootType === "battle") {
        const record = this.selectedTroop,
          page = record && record.pages[this.selectedBattlePageIndex];
        return battleConditionLines(
          page && page.conditions,
          getGameWindow().$dataSystem,
        );
      }
      const event = this.selectedDataEvent,
        page = event && event.pages[this.selectedPageIndex];
      return page
        ? formatPageConditions(page.conditions, getGameWindow().$dataSystem)
        : [];
    },
    selectedCommandCount() {
      if (this.rootType === "common")
        return this.selectedCommon ? this.selectedCommon.list.length : 0;
      const event =
          this.rootType === "map" ? this.selectedDataEvent : this.selectedTroop,
        page =
          event &&
          event.pages[
            this.rootType === "map"
              ? this.selectedPageIndex
              : this.selectedBattlePageIndex
          ];
      return page && page.list ? page.list.length : 0;
    },
    availableMaps() {
      void this.dbVersion;
      return this.db ? this.db.getAllMapInfos() : [];
    },

    availableCommonEvents() {
      void this.dbVersion;
      if (!this.db) return [];
      return this.db.getAllCommonEvents().map((ce) => ({
        ...ce,
        label: `[${ce.id}] ${ce.name}`,
      }));
    },

    availableBattleTroops() {
      void this.dbVersion;
      if (!this.db) return [];
      return this.db.getAllBattleTroops().map((t) => ({
        ...t,
        label: `[${t.id}] ${t.name}`,
      }));
    },

    availableMapEvents() {
      void this.dbVersion;
      if (!this.db || !this.selectedMapId) return [];
      return this.db.getMapEvents(this.selectedMapId);
    },

    mapIsLoaded() {
      void this.dbVersion;
      return this.db ? this.db.isMapLoaded(this.selectedMapId) : false;
    },

    mapPageItems() {
      void this.dbVersion;
      if (!this.db || !this.selectedMapId || !this.selectedEventId) return [];
      const event = this.db.getMapEvent(
        this.selectedMapId,
        this.selectedEventId,
      );
      if (!event || !event.pages) return [];
      return event.pages.map((page, idx) => ({
        label: `Page ${idx + 1}${this._pageCondSummary(page)}`,
        value: idx,
      }));
    },

    battlePageItems() {
      void this.dbVersion;
      if (!this.db || !this.selectedTroopId) return [];
      const troop = this.db.getBattleTroop(this.selectedTroopId);
      if (!troop || !troop.pages) return [];
      return troop.pages.map((_, idx) => ({
        label: `Page ${idx + 1}`,
        value: idx,
      }));
    },

    canTrace() {
      if (this.rootType === "map") {
        return (
          this.selectedMapId > 0 && this.selectedEventId > 0 && this.mapIsLoaded
        );
      }
      if (this.rootType === "common") return this.selectedCeId > 0;
      if (this.rootType === "battle") return this.selectedTroopId > 0;
      return false;
    },

    pageConditionLines() {
      if (!this.traceTree || !this.traceTree.conditions) return [];
      return formatPageConditions(
        this.traceTree.conditions,
        window.$dataSystem,
      );
    },

    nodeCount() {
      return this._countNodes(this.treeItems);
    },

    ceRefCount() {
      return this._countKind(this.treeItems, "event-ref");
    },

    cycleCount() {
      return this._countKind(this.treeItems, "cycle-ref");
    },
  },

  // ── Methods ─────────────────────────────────────────────────────────────────
  methods: {
    setEntryMode(mode) {
      this.entryMode = mode;
      if (mode === "browse") return;
      const game = getGameWindow(),
        mapId = game.$gameMap ? game.$gameMap.mapId() : 0;
      if (mode === "facing") {
        const id = facingEventId(game);
        if (id) {
          this.selectEvent(mapId, id);
          return;
        }
      }
      if (
        this.rootType !== "map" ||
        this.selectedMapId !== mapId ||
        mode === "facing"
      ) {
        this.rootType = "map";
        this.selectedMapId = mapId;
        this.selectedEventId = 0;
        this._selectionRequest = null;
        this.selectingEvent = false;
        this.clearTrace();
      }
    },
    openDetail(tab) {
      this.detailTab = tab;
      if (tab === "references") this.refreshReferences();
      if (tab === "tree" && !this.traceTree) this.trace();
    },
    chooseBrowseRecord(row) {
      if (this.rootType === "map") this.selectEvent(this.selectedMapId, row.id);
      else if (this.rootType === "common") {
        this.selectedCeId = row.id;
        this.detailTab = "overview";
      } else {
        this.selectedTroopId = row.id;
        this.selectedBattlePageIndex = 0;
        this.detailTab = "overview";
      }
    },
    clearTrace() {
      this.executionUnlocked = false;
      this.traceTree = null;
      this.treeItems = [];
      this.openItems = [];
      this.pendingRun = null;
      this.traceError = null;
    },
    async selectEvent(mapId, eventId) {
      if (!this.db || !Number.isInteger(mapId) || !Number.isInteger(eventId))
        return;
      const request = {};
      this._selectionRequest = request;
      this.selectingEvent = true;
      this.rootType = "map";
      this.selectedMapId = mapId;
      this.selectedEventId = 0;
      this.traceTree = null;
      this.treeItems = [];
      this.traceError = null;
      try {
        this.db.loadFromGlobals();
        await this.db.loadMap(mapId);
        if (
          this._selectionRequest !== request ||
          this.selectedMapId !== mapId ||
          this.rootType !== "map"
        )
          return;
        this.dbVersion++;
        this.selectedEventId = eventId;
        const game = getGameWindow(),
          live =
            game.$gameMap &&
            game.$gameMap.mapId() === mapId &&
            game.$gameMap.event(eventId);
        this.selectedPageIndex =
          live && live._pageIndex >= 0 ? live._pageIndex : 0;
        this.detailTab = "overview";
        this.refreshReferences();
      } catch (error) {
        if (this._selectionRequest === request) this.traceError = String(error);
      } finally {
        if (this._selectionRequest === request) this.selectingEvent = false;
      }
    },
    refreshReferences() {
      const event = this.selectedDataEvent;
      if (this.rootType === "map")
        this.referenceRows = event
          ? buildDataEventReferenceRows(
              event,
              "Selected event (all pages)",
              null,
              this.selectedMapId,
            )
          : [];
      else {
        const record =
          this.rootType === "common" ? this.selectedCommon : this.selectedTroop;
        const pages = eventReferencePages(
          record,
          this.rootType,
          this.selectedBattlePageIndex,
        );
        this.referenceRows =
          record && pages[0]
            ? buildDataEventReferenceRows(
                { id: 0, name: record.name, pages },
                "Global reference",
                null,
                0,
              ).filter((row) => row.type !== "selfSwitch")
            : [];
      }
    },
    showOnMap() {
      const game = getGameWindow(),
        event = game.$gameMap.event(this.selectedEventId),
        data = this.selectedDataEvent;
      if (!data) return;
      requestMapNavigation({
        mapId: this.selectedMapId,
        eventId: this.selectedEventId,
        id: this.selectedEventId,
        name: data.name,
        kind: "event",
        x: event ? event.x : data.x,
        y: event ? event.y : data.y,
      });
    },
    // ── Tracing ───────────────────────────────────────────────────────────────

    async trace() {
      if (!this.db || !this.canTrace) return;

      this.tracing = true;
      this.traceTree = null;
      this.traceError = null;
      this.treeItems = [];
      this.openItems = [];
      this._treeId = 0;

      try {
        const tracer = new SequenceTracer(this.db, window.$dataSystem);
        let result = null;

        if (this.rootType === "map") {
          result = tracer.traceMapEvent(
            this.selectedMapId,
            this.selectedEventId,
            this.selectedPageIndex,
          );
        } else if (this.rootType === "common") {
          result = tracer.traceCommonEvent(this.selectedCeId);
        } else if (this.rootType === "battle") {
          result = tracer.traceBattleEvent(
            this.selectedTroopId,
            this.selectedBattlePageIndex,
          );
        }

        if (result) {
          this.traceTree = result;
          this.treeItems = this._toTreeItems(result.nodes);
          // Open just the first level by default
          this.openItems = this.treeItems.map((item) => item.id);
        } else {
          this.traceError =
            "Could not trace — event or page not found. Try loading the map first.";
        }
      } catch (err) {
        console.error("[EventAnalyzer] Trace error", err);
        this.traceError = String(err);
      }

      this.tracing = false;
    },

    // ── Map loading ───────────────────────────────────────────────────────────

    async loadCurrentMap() {
      if (!this.db || !this.selectedMapId) return;
      const request = {};
      this._mapRequest = request;
      const mapId = this.selectedMapId;
      this.loadingMaps = true;
      try {
        await this.db.loadMap(mapId);
        if (this._mapRequest === request) this.dbVersion++;
      } finally {
        if (this._mapRequest === request) this.loadingMaps = false;
      }
    },

    async loadAllMaps() {
      if (!this.db) return;
      this.loadingMaps = true;
      this.loadProgress = { loaded: 0, total: 0, current: "" };
      try {
        await this.db.loadAllMaps((loaded, total, current) => {
          this.loadProgress = { loaded, total, current };
          this.dbVersion++;
        });
        this.dbVersion++;
      } finally {
        this.loadingMaps = false;
      }
    },

    // ── Reload ────────────────────────────────────────────────────────────────

    reload() {
      if (!this.db) return;
      this.db.loadFromGlobals();
      this.dbVersion++;
    },

    // ── Execution ─────────────────────────────────────────────────────────────

    confirmExecution(item) {
      this.pendingRun = item;
    },
    runConfirmed() {
      const item = this.pendingRun;
      this.pendingRun = null;
      if (item) this.executeFromNode(item);
    },

    executeFromNode(item) {
      if (!this.db || !item.eventKey || item.commandIndex === undefined) return;
      const game = getGameWindow();
      if (
        item.eventKey.startsWith("map:") &&
        (!game.$gameMap ||
          Number(item.eventKey.split(":")[1]) !== game.$gameMap.mapId())
      ) {
        this.traceError =
          "This event belongs to another map. Travel there before running its commands.";
        return;
      }

      let list = null;
      let eventIdForInterpreter = 0;

      if (item.eventKey.startsWith("map:")) {
        const parts = item.eventKey.split(":");
        const mapId = parseInt(parts[1]);
        const eventId = parseInt(parts[2]);
        const pageIndex = parseInt(parts[3]);
        const event = this.db.getMapEvent(mapId, eventId);
        if (event && event.pages && event.pages[pageIndex]) {
          list = event.pages[pageIndex].list;
          eventIdForInterpreter = eventId;
        }
      } else if (item.eventKey.startsWith("common:")) {
        const ceId = parseInt(item.eventKey.split(":")[1]);
        const ce = this.db.getCommonEvent(ceId);
        if (ce) list = ce.list;
      } else if (item.eventKey.startsWith("battle:")) {
        const parts = item.eventKey.split(":");
        const troopId = parseInt(parts[1]);
        const pageIndex = parseInt(parts[2]);
        const troop = this.db.getBattleTroop(troopId);
        if (troop && troop.pages && troop.pages[pageIndex]) {
          list = troop.pages[pageIndex].list;
        }
      }

      if (!list || !window.$gameMap) return;

      const commandsToRun = list.slice(item.commandIndex);
      // Ensure the sliced list terminates properly
      commandsToRun.push({
        code: 0,
        indent: commandsToRun.length ? commandsToRun[0].indent : 0,
        parameters: [],
      });

      const inBattle =
        typeof window.$gameParty !== "undefined" &&
        window.$gameParty.inBattle &&
        window.$gameParty.inBattle();
      const interpreter = inBattle
        ? window.$gameTroop._interpreter
        : window.$gameMap._interpreter;

      if (interpreter) {
        if (
          typeof interpreter.isRunning === "function" &&
          !interpreter.isRunning()
        ) {
          interpreter.setup(commandsToRun, eventIdForInterpreter);
        } else if (typeof interpreter.setupChild === "function") {
          interpreter.setupChild(commandsToRun, eventIdForInterpreter);
        }
        console.log(
          `[EventAnalyzer] Forced execution of ${commandsToRun.length} commands from index ${item.commandIndex}.`,
        );
      }
    },

    // ── Selection change handlers ─────────────────────────────────────────────

    async onMapChange() {
      this._selectionRequest = null;
      this.selectingEvent = false;
      this.selectedEventId = 0;
      this.selectedPageIndex = 0;
      this.clearTrace();
      try {
        await this.loadCurrentMap();
      } catch (error) {
        this.traceError = String(error);
      }
    },

    onEventChange() {
      this._selectionRequest = null;
      const game = getGameWindow(),
        live =
          game.$gameMap &&
          game.$gameMap.mapId() === this.selectedMapId &&
          game.$gameMap.event(this.selectedEventId);
      this.selectedPageIndex =
        live && live._pageIndex >= 0 ? live._pageIndex : 0;
      this.refreshReferences();
    },

    onTroopChange() {
      this.selectedBattlePageIndex = 0;
    },

    // ── Tree expand / collapse ────────────────────────────────────────────────

    expandAll() {
      this.openItems = this._collectAllIds(this.treeItems);
    },

    collapseAll() {
      this.openItems = [];
    },

    // ── Jump to battle event ──────────────────────────────────────────────────

    jumpToBattleEvent(troopId) {
      this.entryMode = "browse";
      this.detailTab = "tree";
      this.rootType = "battle";
      this.selectedTroopId = troopId;
      this.selectedBattlePageIndex = 0;
      this.$nextTick(() => {
        this.detailTab = "tree";
        this.trace();
      });
    },

    // ── Treeview item conversion ───────────────────────────────────────────────

    /**
     * Convert an array of SequenceTracer nodes into v-treeview items.
     * @param {any[]} nodes
     * @returns {any[]}
     */
    _toTreeItems(nodes) {
      const items = [];
      for (const node of nodes || []) {
        const item = this._toTreeItem(node);
        if (item) items.push(item);
      }
      return items;
    },

    /**
     * Convert a single SequenceTracer node into a v-treeview item.
     * @param {any} node
     * @returns {any | null}
     */
    _toTreeItem(node) {
      if (!node) return null;
      const id = ++this._treeId;

      switch (node.kind) {
        case "command": {
          const meta = KIND_META.command;
          return {
            id,
            name: node.label,
            kind: "command",
            eventKey: node.eventKey,
            commandIndex: node.commandIndex,
            icon: getCommandIcon(node.code),
            color: meta.color,
            children: [],
          };
        }

        case "branch": {
          const trueId = ++this._treeId;
          const trueChildren = this._toTreeItems(node.trueNodes);
          const children = [
            {
              id: trueId,
              name: "TRUE",
              kind: "branch-true",
              icon: KIND_META["branch-true"].icon,
              color: KIND_META["branch-true"].color,
              children: trueChildren,
            },
          ];

          if (node.falseNodes && node.falseNodes.length > 0) {
            const falseId = ++this._treeId;
            children.push({
              id: falseId,
              name: "FALSE",
              kind: "branch-false",
              icon: KIND_META["branch-false"].icon,
              color: KIND_META["branch-false"].color,
              children: this._toTreeItems(node.falseNodes),
            });
          }

          return {
            id,
            name: `Branch: ${node.condition}`,
            kind: "branch",
            eventKey: node.eventKey,
            commandIndex: node.commandIndex,
            icon: KIND_META.branch.icon,
            color: KIND_META.branch.color,
            children,
          };
        }

        case "choices": {
          const branchItems = node.branches.map((b) => {
            const bId = ++this._treeId;
            return {
              id: bId,
              name: `[${b.label}]`,
              kind: "choice-branch",
              icon: KIND_META["choice-branch"].icon,
              color: KIND_META["choice-branch"].color,
              children: this._toTreeItems(b.nodes),
            };
          });
          return {
            id,
            name: `Show Choices: [${(node.choiceTexts || []).join(" / ")}]`,
            kind: "choices",
            eventKey: node.eventKey,
            commandIndex: node.commandIndex,
            icon: KIND_META.choices.icon,
            color: KIND_META.choices.color,
            children: branchItems,
          };
        }

        case "battle": {
          const battleChildren = node.sections.map((section) => {
            const sectionId = ++this._treeId;
            return {
              id: sectionId,
              name: section.label,
              kind: "battle-section",
              icon: KIND_META["battle-section"].icon,
              color: KIND_META["battle-section"].color,
              children: this._toTreeItems(section.nodes),
            };
          });
          return {
            id,
            name: "Battle Processing",
            kind: "battle",
            eventKey: node.eventKey,
            commandIndex: node.commandIndex,
            icon: KIND_META.battle.icon,
            color: KIND_META.battle.color,
            children: battleChildren,
          };
        }

        case "loop": {
          return {
            id,
            name: "Loop",
            kind: "loop",
            eventKey: node.eventKey,
            commandIndex: node.commandIndex,
            icon: KIND_META.loop.icon,
            color: KIND_META.loop.color,
            children: this._toTreeItems(node.bodyNodes),
          };
        }

        case "event-ref": {
          const meta = KIND_META["event-ref"];
          const children = this._toTreeItems(node.nodes);

          if (node.resolved) {
            children.push({
              id: ++this._treeId,
              name: `(End of ${node.name})`,
              kind: "event-end",
              icon: "mdi-keyboard-return",
              color: "grey",
              children: [],
            });
          }

          return {
            id,
            name: `${node.label} (${node.nodes ? node.nodes.length : 0} root cmds)`,
            kind: "event-ref",
            eventKey: node.eventKey,
            commandIndex: node.commandIndex,
            icon: node.resolved ? meta.icon : "mdi-link-variant-off",
            color: node.resolved ? meta.color : "grey",
            ceId: node.ceId,
            children,
          };
        }

        case "cycle-ref": {
          const meta = KIND_META["cycle-ref"];
          return {
            id,
            name: node.label,
            kind: "cycle-ref",
            icon: meta.icon,
            color: meta.color,
            children: [],
          };
        }

        case "battle-ref": {
          const meta = KIND_META["battle-ref"];
          return {
            id,
            name: node.label,
            kind: "battle-ref",
            eventKey: node.eventKey,
            commandIndex: node.commandIndex,
            icon: meta.icon,
            color: meta.color,
            troopId: node.troopId,
            children: [],
          };
        }

        default:
          return null;
      }
    },

    // ── Stat helpers ──────────────────────────────────────────────────────────

    _collectAllIds(items) {
      const ids = [];
      for (const item of items) {
        ids.push(item.id);
        if (item.children && item.children.length > 0) {
          ids.push(...this._collectAllIds(item.children));
        }
      }
      return ids;
    },

    _countNodes(items) {
      let count = 0;
      for (const item of items) {
        count++;
        if (item.children) count += this._countNodes(item.children);
      }
      return count;
    },

    _countKind(items, kind) {
      let count = 0;
      for (const item of items) {
        if (item.kind === kind) count++;
        if (item.children) count += this._countKind(item.children, kind);
      }
      return count;
    },

    // ── Display helpers ───────────────────────────────────────────────────────

    _pageCondSummary(page) {
      if (!page || !page.conditions) return "";
      const c = page.conditions;
      const parts = [];
      if (c.switch1Valid) parts.push(`S${c.switch1Id}`);
      if (c.switch2Valid) parts.push(`S${c.switch2Id}`);
      if (c.variableValid) parts.push(`V${c.variableId}>=${c.variableValue}`);
      if (c.selfSwitchValid) parts.push(`SS${c.selfSwitchCh}`);
      return parts.length > 0 ? ` (${parts.join(", ")})` : "";
    },

    formatTrigger(trigger) {
      return CE_TRIGGER_LABELS[trigger] || String(trigger);
    },

    getSwitchName(id) {
      const sys = window.$dataSystem;
      return (sys && sys.switches && sys.switches[id]) || `Switch ${id}`;
    },
  },
};
