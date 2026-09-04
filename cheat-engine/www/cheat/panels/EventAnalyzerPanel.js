import { EventDatabase } from "../js/panels/event-analyzer/EventDatabase.js";
import { SequenceTracer } from "../js/panels/event-analyzer/SequenceTracer.js";
import {
  getCommandIcon,
  formatPageConditions,
} from "../js/panels/event-analyzer/EventAnalyzerCommands.js";

// ─────────────────────────────────────────────────────────────────────────────
// Vuetify v-treeview icon/colour helpers
// ─────────────────────────────────────────────────────────────────────────────
const KIND_META = {
  "event-ref": { icon: "mdi-link-variant", color: "light-blue lighten-1" },
  "cycle-ref": { icon: "mdi-sync-alert", color: "amber darken-1" },
  "battle-ref": { icon: "mdi-sword-cross", color: "purple lighten-1" },
  branch: { icon: "mdi-source-branch", color: "orange" },
  "branch-true": { icon: "mdi-check-circle", color: "green" },
  "branch-false": { icon: "mdi-close-circle", color: "red lighten-1" },
  choices: { icon: "mdi-format-list-bulleted", color: "teal lighten-1" },
  "choice-branch": { icon: "mdi-menu-right", color: "teal lighten-2" },
  loop: { icon: "mdi-repeat", color: "blue lighten-1" },
  command: { icon: null /* per-code */, color: "grey lighten-1" },
};

const CE_TRIGGER_LABELS = ["None", "Autorun", "Parallel"];

export default {
  name: "EventAnalyzerPanel",

  template: `
<v-card flat class="ma-0 pa-0" color="transparent">

    <!-- ══════════════════════════════════════════════════════
         ROOT SELECTOR
    ══════════════════════════════════════════════════════ -->
    <v-card-subtitle class="ma-0 pa-1 pb-0 font-weight-bold">
        Event Sequence Analyzer
    </v-card-subtitle>

    <!-- Type picker -->
    <v-radio-group v-model="rootType" row dense hide-details class="ma-1 mt-0">
        <v-radio label="Common Event" value="common" color="teal" />
        <v-radio label="Map Event"    value="map"    color="blue" />
        <v-radio label="Battle Event" value="battle" color="red" />
    </v-radio-group>

    <!-- ── Common Event selectors ── -->
    <template v-if="rootType === 'common'">
        <v-select
            v-model="selectedCeId"
            :items="availableCommonEvents"
            item-text="label"
            item-value="id"
            label="Common Event"
            dense outlined hide-details
            class="ma-1"
            @keydown.self.stop />
    </template>

    <!-- ── Map Event selectors ── -->
    <template v-if="rootType === 'map'">
        <v-row class="ma-0" dense>
            <v-col cols="12" sm="6" class="pa-1">
                <v-select
                    v-model="selectedMapId"
                    :items="availableMaps"
                    item-text="name"
                    item-value="id"
                    label="Map"
                    dense outlined hide-details
                    @change="onMapChange"
                    @keydown.self.stop />
            </v-col>
            <v-col cols="12" sm="6" class="pa-1">
                <v-select
                    v-model="selectedEventId"
                    :items="availableMapEvents"
                    item-value="id"
                    label="Event"
                    dense outlined hide-details
                    no-data-text="No events (map not loaded)"
                    @change="onEventChange"
                    @keydown.self.stop>
                    <template v-slot:item="{ item }">
                        <span class="caption">#{{ item.id }} {{ item.name || '(Unnamed)' }}</span>
                    </template>
                    <template v-slot:selection="{ item }">
                        <span class="caption">#{{ item.id }} {{ item.name || '(Unnamed)' }}</span>
                    </template>
                </v-select>
            </v-col>
            <v-col cols="12" sm="6" class="pa-1">
                <v-select
                    v-model="selectedPageIndex"
                    :items="mapPageItems"
                    item-text="label"
                    item-value="value"
                    label="Page"
                    dense outlined hide-details
                    no-data-text="Select an event first"
                    @keydown.self.stop />
            </v-col>
        </v-row>

        <!-- Map loading controls -->
        <div class="d-flex align-center flex-wrap ma-1" style="gap: 6px;">
            <v-btn
                x-small color="blue darken-2"
                :disabled="!selectedMapId || mapIsLoaded || loadingMaps"
                @click="loadCurrentMap">
                Load This Map
            </v-btn>
            <v-btn
                x-small color="blue darken-3"
                :loading="loadingMaps"
                :disabled="loadingMaps"
                @click="loadAllMaps">
                Load All Maps
            </v-btn>
            <span v-if="loadingMaps" class="caption grey--text">
                {{ loadProgress.loaded }}/{{ loadProgress.total }}
                <template v-if="loadProgress.current"> — {{ loadProgress.current }}</template>
            </span>
            <span v-else-if="dbVersion > 0" class="caption grey--text">
                {{ availableMaps.length }} map(s) loaded
            </span>
        </div>
    </template>

    <!-- ── Battle Event selectors ── -->
    <template v-if="rootType === 'battle'">
        <v-row class="ma-0" dense>
            <v-col cols="12" sm="7" class="pa-1">
                <v-select
                    v-model="selectedTroopId"
                    :items="availableBattleTroops"
                    item-text="label"
                    item-value="id"
                    label="Troop"
                    dense outlined hide-details
                    @change="onTroopChange"
                    @keydown.self.stop />
            </v-col>
            <v-col cols="12" sm="5" class="pa-1">
                <v-select
                    v-model="selectedBattlePageIndex"
                    :items="battlePageItems"
                    item-text="label"
                    item-value="value"
                    label="Page"
                    dense outlined hide-details
                    no-data-text="Select a troop first"
                    @keydown.self.stop />
            </v-col>
        </v-row>
    </template>

    <!-- Trace button -->
    <div class="ma-1">
        <v-btn
            color="teal" small
            :disabled="!canTrace || tracing"
            :loading="tracing"
            @click="trace">
            <v-icon left small>mdi-magnify-scan</v-icon>
            Trace Execution
        </v-btn>
        <v-btn
            v-if="treeItems.length > 0"
            x-small text class="ml-2"
            @click="expandAll">
            <v-icon x-small left>mdi-unfold-more-horizontal</v-icon>Expand All
        </v-btn>
        <v-btn
            v-if="treeItems.length > 0"
            x-small text
            @click="collapseAll">
            <v-icon x-small left>mdi-unfold-less-horizontal</v-icon>Collapse All
        </v-btn>
    </div>

    <v-divider class="mb-1" />

    <!-- Error -->
    <v-alert v-if="traceError" type="error" dense class="ma-1 mb-1">
        {{ traceError }}
    </v-alert>

    <!-- ══════════════════════════════════════════════════════
         TRACE RESULT
    ══════════════════════════════════════════════════════ -->
    <template v-if="traceTree">

        <!-- Root header -->
        <div class="ma-1 pa-2 grey darken-3" style="border-radius:4px;">
            <div class="subtitle-2 white--text">{{ traceTree.name }}</div>

            <!-- Common Event trigger -->
            <div v-if="traceTree.eventKind === 'common'" class="caption grey--text mt-1">
                Trigger: {{ formatTrigger(traceTree.trigger) }}
                <template v-if="traceTree.trigger > 0 && traceTree.switchId">
                    &nbsp;|&nbsp; Switch: [{{ traceTree.switchId }}: {{ getSwitchName(traceTree.switchId) }}]
                </template>
            </div>

            <!-- Page conditions -->
            <template v-if="pageConditionLines.length > 0">
                <div class="caption green--text font-weight-bold mt-1">Page Conditions:</div>
                <div
                    v-for="(line, i) in pageConditionLines"
                    :key="'cond-' + i"
                    class="caption ml-1">
                    ▸ {{ line }}
                </div>
            </template>
            <div v-else-if="traceTree.eventKind !== 'common'" class="caption grey--text mt-1">
                No page conditions.
            </div>
        </div>

        <!-- Stats -->
        <div class="caption grey--text mx-2 mb-1">
            {{ nodeCount }} node(s)
            <template v-if="ceRefCount > 0"> · {{ ceRefCount }} CE reference(s)</template>
            <template v-if="cycleCount > 0"> · <span class="amber--text font-weight-bold">{{ cycleCount }} cycle(s)</span></template>
        </div>

        <!-- Tree -->
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
                            item.kind === 'cycle-ref'    ? 'amber--text font-weight-bold' :
                            item.kind === 'event-ref'    ? 'light-blue--text text--lighten-1' :
                            item.kind === 'event-end'    ? 'grey--text font-italic' :
                            item.kind === 'battle-ref'   ? 'purple--text text--lighten-1' :
                            item.kind === 'branch'       ? 'orange--text' :
                            item.kind === 'branch-true'  ? 'green--text' :
                            item.kind === 'branch-false' ? 'red--text text--lighten-1' :
                            item.kind === 'choices'      ? 'teal--text text--lighten-1' :
                            item.kind === 'loop'         ? 'blue--text text--lighten-1' :
                            ''
                        ]">
                        {{ item.name }}
                    </span>
                    
                    <!-- Run button -->
                    <v-btn
                        v-if="item.eventKey && item.commandIndex !== undefined"
                        x-small text class="ml-2 pa-0 green--text"
                        style="min-width:0;height:16px;"
                        @click.stop="executeFromNode(item)">
                        <v-icon x-small color="green" left>mdi-play</v-icon>
                        <span class="caption">Run</span>
                    </v-btn>

                    <!-- Jump-to button for battle refs -->
                    <v-btn
                        v-if="item.kind === 'battle-ref' && item.troopId"
                        x-small text class="ml-1 pa-0"
                        style="min-width:0;height:16px;"
                        @click.stop="jumpToBattleEvent(item.troopId)">
                        <v-icon x-small>mdi-arrow-right-circle-outline</v-icon>
                        <span class="caption">Jump →</span>
                    </v-btn>
                </div>
            </template>

        </v-treeview>

        <div v-if="treeItems.length === 0" class="caption grey--text ma-2">
            No commands to display in this page.
        </div>
    </template>

    <!-- Reload button (top-right) -->
    <v-tooltip bottom>
        <span>Reload game data</span>
        <template v-slot:activator="{ on, attrs }">
            <v-btn
                style="top:0;right:0;"
                color="pink" dark small absolute top right fab
                v-bind="attrs" v-on="on"
                @click="reload">
                <v-icon>mdi-refresh</v-icon>
            </v-btn>
        </template>
    </v-tooltip>

</v-card>
  `,

  // ── Component data ──────────────────────────────────────────────────────────
  data() {
    return {
      /** @type {import('../js/panels/event-analyzer/EventDatabase.js').EventDatabase | null} */
      db: null,

      /**
       * Incremented whenever the database changes so computed properties
       * that depend on non-reactive db internals are re-evaluated.
       */
      dbVersion: 0,

      // Root type
      rootType: "common",

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
    if (mapId) this.selectedMapId = mapId;

    const ces = this.db.getAllCommonEvents();
    if (ces.length > 0) this.selectedCeId = ces[0].id;

    const troops = this.db.getAllBattleTroops();
    if (troops.length > 0) this.selectedTroopId = troops[0].id;
  },

  // ── Computed ────────────────────────────────────────────────────────────────
  computed: {
    availableMaps() {
      void this.dbVersion;
      return this.db ? this.db.getAllLoadedMaps() : [];
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
      this.loadingMaps = true;
      try {
        await this.db.loadMap(this.selectedMapId);
        this.dbVersion++;
      } finally {
        this.loadingMaps = false;
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

    executeFromNode(item) {
      if (!this.db || !item.eventKey || item.commandIndex === undefined) return;

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

    onMapChange() {
      this.selectedEventId = 0;
      this.selectedPageIndex = 0;
    },

    onEventChange() {
      this.selectedPageIndex = 0;
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
      this.rootType = "battle";
      this.selectedTroopId = troopId;
      this.selectedBattlePageIndex = 0;
      this.$nextTick(() => this.trace());
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
