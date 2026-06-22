import {
  readWatcherOverlayEnabled,
  readWatcherOverlayRows,
} from "../js/panels/watcher/WatcherPanelState.js";

export default {
  name: "WatcherOverlay",

  props: {
    hideWhileModal: {
      type: Boolean,
      default: false,
    },
  },

  template: `
<v-card
    v-if="visible"
    dark
    dense
    class="pa-2"
    style="position: fixed; right: 8px; bottom: 8px; z-index: 8; width: 280px; max-height: 220px; overflow: hidden; pointer-events: none; background: rgba(20, 20, 20, 0.78); border: 1px solid rgba(255,255,255,0.12);">
    <div class="caption font-weight-bold mb-1">
        Watch List
    </div>
    <div
        v-for="item in rows"
        :key="item.type + '-' + item.id"
        class="d-flex caption">
        <span class="text-truncate pr-2">{{ item.label }}</span>
        <v-spacer></v-spacer>
        <span class="font-weight-bold">{{ item.valueText }}</span>
    </div>
</v-card>
    `,

  data() {
    return {
      overlayEnabled: true,
      rows: [],
      refreshIntervalId: null,
      refreshMs: 500,
    };
  },

  computed: {
    visible() {
      return (
        this.overlayEnabled && !this.hideWhileModal && this.rows.length > 0
      );
    },
  },

  mounted() {
    this.refreshRows();
    this.refreshIntervalId = setInterval(() => {
      this.refreshRows();
    }, this.refreshMs);
  },

  beforeDestroy() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  },

  methods: {
    refreshRows() {
      this.overlayEnabled = readWatcherOverlayEnabled();
      this.rows = readWatcherOverlayRows();
    },
  },
};
