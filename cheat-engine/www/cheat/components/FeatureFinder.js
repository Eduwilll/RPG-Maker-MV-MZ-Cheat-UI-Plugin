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
    resultSummary() {
      const count = this.results.length;
      if (!this.search) return count + " features";
      return count === 1 ? "1 match" : count + " matches";
    },
  },
  watch: {
    search() {
      this.selectedIndex = 0;
    },
    selectedIndex() {
      this.ensureVisible();
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
  template: `<v-dialog :value="value" @input="$emit('input', $event)" max-width="560" @keydown.native.stop="onKeyDown">
    <v-card class="cheat-finder">
      <div class="cheat-finder__head">
        <v-icon small class="cheat-finder__icon">mdi-magnify</v-icon>
        <span class="cheat-finder__title">Find a feature</span>
        <span class="cheat-finder__count">{{ resultSummary }}</span>
        <button type="button" class="cheat-icon-button cheat-finder__close" aria-label="Close feature finder" title="Close" @click="$emit('input', false)">
          <v-icon small>mdi-close</v-icon>
        </button>
      </div>
      <div class="cheat-finder__search">
        <v-text-field
          ref="search"
          v-model="search"
          autofocus
          dense
          outlined
          hide-details
          label="Search panels, settings, shortcuts"
          @keydown.stop="onKeyDown" />
      </div>
      <div class="cheat-finder__results" role="listbox" aria-label="Matching features">
        <button
          v-for="(entry, i) in results"
          :key="entry.id"
          type="button"
          role="option"
          class="cheat-finder__item"
          :class="{ 'is-active': i === selectedIndex }"
          :aria-selected="i === selectedIndex ? 'true' : 'false'"
          @click="choose(entry)"
          @mouseenter="selectedIndex = i">
          <span class="cheat-finder__label">{{ entry.label }}</span>
          <span class="cheat-finder__type">{{ entry.type }}</span>
          <kbd v-if="entry.shortcut">{{ entry.shortcut }}</kbd>
        </button>
        <div v-if="!results.length" class="cheat-finder__empty">
          No matching features. Try a shorter word.
        </div>
      </div>
      <div class="cheat-finder__foot">
        <span><kbd>Up</kbd> <kbd>Down</kbd> to move</span>
        <span><kbd>Enter</kbd> to open</span>
        <span><kbd>Esc</kbd> to close</span>
      </div>
    </v-card>
  </v-dialog>`,
  methods: {
    choose(entry) {
      if (!entry) return;
      this.$emit("navigate", entry);
      this.$emit("input", false);
    },
    ensureVisible() {
      this.$nextTick(() => {
        const active =
          this.$el && this.$el.querySelector
            ? this.$el.querySelector(".cheat-finder__item.is-active")
            : null;
        if (active && active.scrollIntoView)
          active.scrollIntoView({ block: "nearest" });
      });
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
