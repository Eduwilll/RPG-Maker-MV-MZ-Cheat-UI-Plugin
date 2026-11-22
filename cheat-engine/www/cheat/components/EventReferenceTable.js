import { writeWatchRowValue } from "../js/panels/watcher/WatcherPanelState.js";
export default {
  name: "EventReferenceTable",
  props: { rows: Array, compact: Boolean },
  data() {
    return {
      headers: [
        { text: "Reference", value: "label" },
        { text: "Value", value: "value", width: 100 },
        { text: "Dist.", value: "distance", width: 68 },
        { text: "Source", value: "source", sortable: false },
      ],
    };
  },
  computed: {
    visibleHeaders() {
      return this.compact
        ? this.headers.filter(
            (row) => row.value === "label" || row.value === "value",
          )
        : this.headers;
    },
  },
  template: `<v-data-table class="watcher-context-table event-reference-table" :class="{'event-reference-table--compact':compact}" dense item-key="label" :headers="visibleHeaders" :items="rows || []" :items-per-page="8" :footer-props="{'items-per-page-options':[8,16,32]}" no-data-text="No switch or variable references detected.">
    <template v-slot:item.label="{item}"><span class="watcher-cell watcher-name-cell" :title="item.label">{{item.label}}</span></template>
    <template v-slot:item.value="{item}"><v-switch v-if="item.type==='switch' || item.type==='selfSwitch'" v-model="item.value" class="ma-0 pa-0" dense hide-details @change="change(item)"/><v-text-field v-else v-model="item.value" dense outlined hide-details class="cheat-field-watcher" @keydown.stop @change="change(item)" @focus="$event.target.select()"/></template>
    <template v-slot:item.source="{item}"><button v-if="item.eventId" type="button" class="event-reference-source" :title="item.source" @click="$emit('inspect',{mapId:item.mapId,eventId:item.eventId})">{{item.source}}</button><span v-else class="watcher-cell" :title="item.source">{{item.source}}</span></template>
  </v-data-table>`,
  methods: {
    change(item) {
      item.value = writeWatchRowValue(item, item.value);
      this.$emit("change");
    },
  },
};
