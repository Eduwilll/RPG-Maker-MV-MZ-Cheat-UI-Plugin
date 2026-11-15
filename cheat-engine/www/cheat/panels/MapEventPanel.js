import InteractiveMap from "../components/InteractiveMap.js";

export default {
  name: "MapEventPanel",
  components: { InteractiveMap },
  template: `<interactive-map ref="view"/>`,
  methods: {
    focusFeature(anchor) {
      if (this.$refs.view) this.$refs.view.focusFeature(anchor);
    },
  },
};
