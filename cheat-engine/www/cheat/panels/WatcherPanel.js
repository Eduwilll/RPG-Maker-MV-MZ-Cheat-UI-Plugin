import {
  readWatcherPanelState,
  removeWatcherTarget,
  writeWatchRowValue,
  writeWatcherOverlayEnabled,
  writeTargetValue,
} from "../js/panels/watcher/WatcherPanelState.js";

export default {
  name: "WatcherPanel",

  template: `
<v-card flat class="ma-0 pa-0">
    <v-card-subtitle class="pa-0 pb-1 font-weight-bold">
        Context Watch
    </v-card-subtitle>

    <v-expansion-panels
        dark
        accordion
        multiple
        class="mb-2"
        v-model="openContextPanels">
        <v-expansion-panel>
            <v-expansion-panel-header class="py-1 px-3" style="min-height: 34px;">
                Facing Event
                <span class="caption grey--text text--lighten-1 ml-2">
                    {{ facingEvent ? facingEvent.label : 'No event in front' }}
                </span>
            </v-expansion-panel-header>
            <v-expansion-panel-content class="watcher-compact-panel">
                <v-data-table
                    class="watcher-context-table"
                    dense
                    hide-default-footer
                    :headers="contextHeaders"
                    :items="facingRows"
                    :items-per-page="-1"
                    :no-data-text="'No switches or variables detected for the event in front.'">
                    <template v-slot:item.label="{ item }">
                        <div class="watcher-cell watcher-name-cell" :title="item.label">
                            {{ item.label }}
                        </div>
                    </template>
                    <template v-slot:item.value="{ item }">
                        <v-switch
                            v-if="item.type === 'switch' || item.type === 'selfSwitch'"
                            v-model="item.value"
                            dense
                            hide-details
                            class="ma-0 pa-0"
                            @change="onContextValueChange(item)">
                        </v-switch>
                        <v-text-field
                            v-else
                            v-model="item.value"
                            dense
                            solo
                            hide-details
                            background-color="grey darken-3"
                            style="max-width: 92px;"
                            @keydown.self.stop
                            @change="onContextValueChange(item)"
                            @focus="$event.target.select()">
                        </v-text-field>
                    </template>
                    <template v-slot:item.distance="{ item }">
                        <span class="caption">{{ formatDistanceCell(item.distance) }}</span>
                    </template>
                    <template v-slot:item.source="{ item }">
                        <div class="watcher-cell watcher-source-cell" :title="item.source">
                            {{ item.source }}
                        </div>
                    </template>
                </v-data-table>
            </v-expansion-panel-content>
        </v-expansion-panel>

        <v-expansion-panel>
            <v-expansion-panel-header class="py-1 px-3" style="min-height: 34px;">
                Nearby Map References
                <span class="caption grey--text text--lighten-1 ml-2">
                    Map {{ currentMapId }} - {{ mapEventCount }} events - {{ mapRows.length }} refs
                </span>
            </v-expansion-panel-header>
            <v-expansion-panel-content class="watcher-compact-panel">
                <v-data-table
                    class="watcher-context-table"
                    dense
                    :headers="contextHeaders"
                    :items="mapRows"
                    :items-per-page="12"
                    :footer-props="contextFooterProps"
                    :no-data-text="mapReady ? 'No RPG Maker switch/variable references detected on this map.' : 'Map data is not ready yet.'">
                    <template v-slot:item.label="{ item }">
                        <div class="watcher-cell watcher-name-cell" :title="item.label">
                            {{ item.label }}
                        </div>
                    </template>
                    <template v-slot:item.value="{ item }">
                        <v-switch
                            v-if="item.type === 'switch' || item.type === 'selfSwitch'"
                            v-model="item.value"
                            dense
                            hide-details
                            class="ma-0 pa-0"
                            @change="onContextValueChange(item)">
                        </v-switch>
                        <v-text-field
                            v-else
                            v-model="item.value"
                            dense
                            solo
                            hide-details
                            background-color="grey darken-3"
                            style="max-width: 92px;"
                            @keydown.self.stop
                            @change="onContextValueChange(item)"
                            @focus="$event.target.select()">
                        </v-text-field>
                    </template>
                    <template v-slot:item.distance="{ item }">
                        <span class="caption">{{ formatDistanceCell(item.distance) }}</span>
                    </template>
                    <template v-slot:item.source="{ item }">
                        <div class="watcher-cell watcher-source-cell" :title="item.source">
                            {{ item.source }}
                        </div>
                    </template>
                </v-data-table>
            </v-expansion-panel-content>
        </v-expansion-panel>
    </v-expansion-panels>

    <v-row no-gutters align="center" class="mb-2">
        <v-col>
            <v-card-subtitle class="pa-0 font-weight-bold">
                Watch List
            </v-card-subtitle>
        </v-col>
        <v-col cols="auto">
            <v-checkbox
                v-model="overlayEnabled"
                label="Overlay"
                dense
                hide-details
                class="ma-0 mr-3"
                @change="onOverlayEnabledChange">
            </v-checkbox>
        </v-col>
        <v-col cols="auto">
            <v-checkbox
                v-model="autoRefresh"
                label="Live"
                dense
                hide-details
                class="ma-0"
                @change="onAutoRefreshChange">
            </v-checkbox>
        </v-col>
        <v-col cols="auto" class="ml-2">
            <v-btn
                x-small
                fab
                color="pink"
                dark
                title="Refresh watched values"
                @click="refreshWatchedRows">
                <v-icon small>mdi-refresh</v-icon>
            </v-btn>
        </v-col>
    </v-row>

    <v-data-table
        dense
        :headers="watchHeaders"
        :items="watchedRows"
        :items-per-page="8"
        :no-data-text="'No watched variables or switches yet.'">
        <template v-slot:item.value="{ item }">
            <v-switch
                v-if="item.type === 'switch'"
                v-model="item.value"
                dense
                hide-details
                @change="onWatchedValueChange(item)">
            </v-switch>
            <v-text-field
                v-else
                v-model="item.value"
                dense
                solo
                hide-details
                background-color="grey darken-3"
                style="max-width: 130px;"
                @keydown.self.stop
                @change="onWatchedValueChange(item)"
                @focus="$event.target.select()">
            </v-text-field>
        </template>
        <template v-slot:item.remove="{ item }">
            <v-btn
                x-small
                icon
                title="Remove from watch list"
                @click="removeTarget(item)">
                <v-icon small>mdi-close</v-icon>
            </v-btn>
        </template>
    </v-data-table>
</v-card>
    `,

  data() {
    return {
      autoRefresh: true,
      overlayEnabled: false,
      openContextPanels: [0],
      currentMapId: 0,
      mapReady: false,
      mapEventCount: 0,
      facingEvent: null,
      facingRows: [],
      mapRows: [],
      refreshIntervalId: null,
      refreshMs: 500,
      watchedRows: [],
      contextFooterProps: {
        "items-per-page-options": [12, 25, 50],
      },
      contextHeaders: [
        { text: "Ref", value: "label", width: 170 },
        { text: "Value", value: "value", width: 100 },
        { text: "Dist", value: "distance", width: 54 },
        { text: "Source", value: "source", sortable: false },
      ],
      watchHeaders: [
        { text: "Name", value: "label" },
        { text: "Value", value: "value", width: 150 },
        { text: "", value: "remove", sortable: false, width: 36 },
      ],
    };
  },

  created() {
    this.initializeVariables();
  },

  mounted() {
    this.startAutoRefresh();
  },

  beforeDestroy() {
    this.stopAutoRefresh();
  },

  methods: {
    initializeVariables() {
      const state = readWatcherPanelState();
      this.watchedRows = state.watchedRows;
      this.overlayEnabled = state.overlayEnabled;
      this.applyContextState(state.context);
    },

    refreshWatchedRows() {
      this.watchedRows = readWatcherPanelState().watchedRows;
    },

    refreshContextRows() {
      const state = readWatcherPanelState();
      this.applyContextState(state.context);
    },

    applyContextState(context) {
      this.currentMapId = context.currentMapId;
      this.mapReady = context.mapReady;
      this.mapEventCount = context.mapEventCount;
      this.facingEvent = context.facingEvent;
      this.facingRows = context.facingRows;
      this.mapRows = context.mapRows;
    },

    removeTarget(item) {
      removeWatcherTarget(item.type, item.id);
      this.refreshWatchedRows();
    },

    onWatchedValueChange(item) {
      item.value = writeTargetValue(item.type, item.id, item.value);
      this.refreshWatchedRows();
    },

    onContextValueChange(item) {
      item.value = writeWatchRowValue(item, item.value);
      this.refreshContextRows();
      this.refreshWatchedRows();
    },

    formatDistanceCell(distance) {
      return typeof distance === "number" && Number.isFinite(distance)
        ? String(distance)
        : "";
    },

    onOverlayEnabledChange() {
      writeWatcherOverlayEnabled(this.overlayEnabled);
    },

    onAutoRefreshChange() {
      if (this.autoRefresh) {
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    },

    startAutoRefresh() {
      this.stopAutoRefresh();
      if (!this.autoRefresh) return;

      this.refreshIntervalId = setInterval(() => {
        this.refreshContextRows();
        this.refreshWatchedRows();
      }, this.refreshMs);
    },

    stopAutoRefresh() {
      if (this.refreshIntervalId) {
        clearInterval(this.refreshIntervalId);
        this.refreshIntervalId = null;
      }
    },
  },
};
