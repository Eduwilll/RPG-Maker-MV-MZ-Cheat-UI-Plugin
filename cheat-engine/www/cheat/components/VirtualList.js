/**
 * Windowed list for database tables. Only the rows inside the viewport (plus a
 * little overscan) exist in the DOM, so a 2,000-record database scrolls without
 * mounting thousands of list items and image canvases.
 *
 * Rows must have a fixed height; that is what makes the scrollbar honest.
 */
export default {
  name: "VirtualList",
  props: {
    items: { type: Array, default: () => [] },
    itemSize: { type: Number, default: 48 },
    height: { type: Number, default: 330 },
    overscan: { type: Number, default: 5 },
    preserveScroll: { type: Boolean, default: false },
  },
  data() {
    return { scroll: 0 };
  },
  computed: {
    count() {
      return this.items.length;
    },
    first() {
      const index = Math.floor(this.scroll / this.itemSize) - this.overscan;
      return Math.max(0, Math.min(index, Math.max(0, this.count - 1)));
    },
    span() {
      return Math.ceil(this.height / this.itemSize) + this.overscan * 2;
    },
    window() {
      const end = Math.min(this.count, this.first + this.span);
      const rows = [];
      for (let index = this.first; index < end; index++)
        rows.push({ index, item: this.items[index] });
      return rows;
    },
    offset() {
      return this.first * this.itemSize;
    },
    total() {
      return this.count * this.itemSize;
    },
  },
  watch: {
    items() {
      const scroller = this.$refs.scroller;
      this.scroll = this.preserveScroll
        ? Math.min(
            this.scroll,
            Math.max(
              0,
              this.total - ((scroller && scroller.clientHeight) || this.height),
            ),
          )
        : 0;
      if (scroller) scroller.scrollTop = this.scroll;
    },
  },
  methods: {
    onScroll(event) {
      this.scroll = event.target.scrollTop || 0;
    },
  },
  template: `<div ref="scroller" class="cheat-virtual" :style="{ height: height + 'px' }" @scroll="onScroll">
    <div class="cheat-virtual__spacer" :style="{ height: total + 'px' }">
      <div class="cheat-virtual__window" :style="{ transform: 'translateY(' + offset + 'px)' }">
        <div v-for="row in window" :key="row.index" class="cheat-virtual__row" :style="{ height: itemSize + 'px' }"><slot :item="row.item" :index="row.index"/></div>
      </div>
    </div>
  </div>`,
};
