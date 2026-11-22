import InteractiveMap from "../components/InteractiveMap.js";

export default {
  name: "MapEventPanel",
  components: { InteractiveMap },
  template: `<interactive-map ref="view"/>`,
  methods: {
    focusPoint(point) {
      if (this.$refs.view) this.$refs.view.focusPoint(point);
    },
    focusFeature(anchor) {
      if (this.$refs.view) this.$refs.view.focusFeature(anchor);
    },
  },
};
