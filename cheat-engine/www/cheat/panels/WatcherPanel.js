import {
  readWatcherTargets,
  buildWatchRows,
  readWatcherOverlayEnabled,
  removeWatcherTarget,
  writeWatcherOverlayEnabled,
  writeTargetValue,
} from "../js/panels/watcher/WatcherPanelState.js";
export default {
  name: "WatcherPanel",
  template: `<v-card flat class="ma-0 pa-0">
    <div class="cheat-panel__head"><div class="cheat-panel__title">Watch list</div><div class="cheat-inline"><v-checkbox v-model="overlayEnabled" label="Overlay" dense hide-details class="ma-0" @change="onOverlayEnabledChange"/><v-checkbox v-model="autoRefresh" label="Live" dense hide-details class="ma-0" @change="onAutoRefreshChange"/><v-btn small text @click="refreshWatchedRows">Reload</v-btn></div></div>
    <v-data-table dense item-key="label" :headers="watchHeaders" :items="watchedRows" :items-per-page="8" no-data-text="No watched values. Add them from Variables or Switches.">
      <template v-slot:item.value="{item}"><v-switch v-if="item.type==='switch'" v-model="item.value" dense hide-details class="ma-0 pa-0" @change="onWatchedValueChange(item)"/><v-text-field v-else v-model="item.value" dense solo hide-details class="cheat-field-max130" @keydown.stop @change="onWatchedValueChange(item)" @focus="$event.target.select()"/></template>
      <template v-slot:item.remove="{item}"><v-btn icon x-small title="Remove from watch list" aria-label="Remove from watch list" @click="removeTarget(item)"><v-icon small>mdi-close</v-icon></v-btn></template>
    </v-data-table>
  </v-card>`,
  data() {
    return {
      autoRefresh: true,
      overlayEnabled: false,
      watchedRows: [],
      refreshIntervalId: null,
      refreshMs: 500,
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
      this.refreshWatchedRows();
      this.overlayEnabled = readWatcherOverlayEnabled();
    },
    refreshWatchedRows() {
      this.watchedRows = buildWatchRows(readWatcherTargets());
    },
    removeTarget(item) {
      removeWatcherTarget(item.type, item.id);
      this.refreshWatchedRows();
    },
    onWatchedValueChange(item) {
      item.value = writeTargetValue(item.type, item.id, item.value);
      this.refreshWatchedRows();
    },
    onOverlayEnabledChange() {
      writeWatcherOverlayEnabled(this.overlayEnabled);
    },
    onAutoRefreshChange() {
      this.startAutoRefresh();
    },
    startAutoRefresh() {
      this.stopAutoRefresh();
      if (this.autoRefresh)
        this.refreshIntervalId = setInterval(() => {
          if (
            !this.$el.contains(document.activeElement) ||
            !document.activeElement.matches("input,textarea,[contenteditable]")
          )
            this.refreshWatchedRows();
        }, this.refreshMs);
    },
    stopAutoRefresh() {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    },
  },
};
