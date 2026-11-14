import { startPointerDrag } from "../js/ui/LayoutGeometry.js";
export default {
  name: "OverlayResize",
  props: { width: Number, height: Number },
  template: `<button type="button" aria-label="Resize cheat overlay; arrow keys also resize" title="Drag to resize; use arrow keys for small adjustments" style="position:absolute;right:0;bottom:0;width:28px;height:28px;z-index:4;cursor:nwse-resize;background:#555c;color:white;touch-action:none;" @pointerdown="start" @mousedown.stop.prevent @touchstart.stop @click.stop @keydown="key">&#9698;</button>`,
  beforeDestroy() {
    if (this._stop) this._stop();
  },
  methods: {
    start(event) {
      if (this._stop) this._stop();
      const width = this.width,
        height = this.height;
      let size = { width, height };
      this._stop = startPointerDrag(
        event,
        (dx, dy) => {
          size = { width: width + dx, height: height + dy };
          this.$emit("resize", Object.assign({}, size, { commit: false }));
        },
        () => this.$emit("resize", Object.assign({}, size, { commit: true })),
      );
    },
    key(event) {
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      this.$emit("resize", {
        width:
          this.width +
          (event.key === "ArrowRight"
            ? 16
            : event.key === "ArrowLeft"
              ? -16
              : 0),
        height:
          this.height +
          (event.key === "ArrowDown" ? 16 : event.key === "ArrowUp" ? -16 : 0),
        commit: true,
      });
    },
  },
};
