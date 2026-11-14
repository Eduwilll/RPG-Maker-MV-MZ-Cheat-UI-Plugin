import { searchFeatures } from "../js/ui/FeatureCatalog.js";
export default {
  name: "FeatureFinder",
  props: { value: Boolean, catalog: { type: Array, default: () => [] } },
  data() {
    return { search: "", selectedIndex: 0 };
  },
  computed: {
    results() {
      return searchFeatures(this.search, this.catalog);
    },
  },
  watch: {
    search() {
      this.selectedIndex = 0;
    },
    value(open) {
      if (open) {
        this.search = "";
        this.selectedIndex = 0;
        this.$nextTick(() => {
          if (this.$refs.search) this.$refs.search.focus();
        });
      }
    },
  },
  template: `<v-dialog :value="value" @input="$emit('input', $event)" max-width="600" @keydown.native.stop="onKeyDown">
    <v-card><v-card-title class="py-2 subtitle-1">Find a Feature <v-spacer/><span class="caption">Ctrl+P</span></v-card-title>
    <v-card-text class="pb-1"><v-text-field ref="search" v-model="search" autofocus dense outlined hide-details label="Panels, settings, shortcuts..." @keydown.stop="onKeyDown"/></v-card-text>
    <v-list dense style="max-height: 320px; overflow-y: auto;">
      <v-list-item v-for="(entry, i) in results" :key="entry.id" :input-value="i === selectedIndex" @click="choose(entry)">
        <v-list-item-content><v-list-item-title>{{ entry.label }}</v-list-item-title><v-list-item-subtitle>{{ entry.description || entry.type }}</v-list-item-subtitle></v-list-item-content>
        <v-list-item-action v-if="entry.shortcut"><kbd>{{ entry.shortcut }}</kbd></v-list-item-action>
      </v-list-item><v-list-item v-if="!results.length">No matching features.</v-list-item>
    </v-list><div class="caption px-4 pb-2">Up/Down to select, Enter to open, Esc to close.</div></v-card>
  </v-dialog>`,
  methods: {
    choose(entry) {
      if (!entry) return;
      this.$emit("navigate", entry);
      this.$emit("input", false);
    },
    onKeyDown(event) {
      if (!["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(event.key))
        return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") this.$emit("input", false);
      else if (event.key === "Enter")
        this.choose(this.results[this.selectedIndex]);
      else if (this.results.length)
        this.selectedIndex =
          (this.selectedIndex +
            (event.key === "ArrowUp" ? -1 : 1) +
            this.results.length) %
          this.results.length;
    },
  },
};
