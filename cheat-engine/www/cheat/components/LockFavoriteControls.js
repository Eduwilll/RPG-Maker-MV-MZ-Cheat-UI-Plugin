import {
  getFeatureRuntime,
  getGameWindow,
} from "../js/runtime/FeatureRuntime.js";
export default {
  name: "LockFavoriteControls",
  props: { target: Object, value: { default: null } },
  data() {
    return { locked: false, favorite: false, error: "", confirmDeath: false };
  },
  mounted() {
    this.refresh();
  },
  watch: {
    target: {
      deep: true,
      handler() {
        this.refresh();
      },
    },
  },
  template: `<span class="d-inline-flex align-center"><v-btn icon x-small :color="favorite ? 'amber' : undefined" :title="favorite ? 'Remove favorite' : 'Favorite (keep at top)'" @click.stop="toggleFavorite"><v-icon small>{{ favorite ? 'mdi-star' : 'mdi-star-outline' }}</v-icon></v-btn><v-btn icon x-small :color="locked ? 'orange' : undefined" :title="locked ? 'Unlock value' : 'Lock this value'" @click.stop="toggleLock"><v-icon small>{{ locked ? 'mdi-lock' : 'mdi-lock-open-outline' }}</v-icon></v-btn><v-tooltip v-if="error" bottom><template v-slot:activator="{on}"><v-icon small color="red" v-on="on">mdi-alert-circle</v-icon></template><span>{{error}}</span></v-tooltip><v-dialog v-model="confirmDeath" max-width="360"><v-card><v-card-text class="pt-4">Locking the death state can keep an actor dead or prevent normal recovery. Continue?</v-card-text><v-card-actions><v-btn text @click="confirmDeath=false">Cancel</v-btn><v-btn text color="red" @click="applyLock">Lock</v-btn></v-card-actions></v-card></v-dialog></span>`,
  methods: {
    refresh() {
      const runtime = getFeatureRuntime();
      if (runtime && this.target) {
        this.locked = runtime.locks.isLocked(this.target);
        this.favorite = runtime.locks.isFavorite(this.target);
      }
    },
    toggleFavorite() {
      try {
        getFeatureRuntime().locks.setFavorite(this.target, !this.favorite);
        this.changed();
      } catch (error) {
        this.error = error.message;
      }
    },
    toggleLock() {
      try {
        const runtime = getFeatureRuntime();
        const game = getGameWindow();
        const actor =
          this.target.kind === "state" && game.$gameActors
            ? game.$gameActors.actor(this.target.actorId)
            : null;
        if (this.locked) {
          runtime.locks.remove(this.target);
          this.changed();
        } else if (
          actor &&
          actor.deathStateId &&
          this.target.id === actor.deathStateId()
        ) {
          this.confirmDeath = true;
        } else this.applyLock();
      } catch (error) {
        this.error = error.message;
      }
    },
    applyLock() {
      this.confirmDeath = false;
      try {
        const result = getFeatureRuntime().locks.set(this.target, this.value);
        this.error = result.warning || "";
        this.changed();
      } catch (error) {
        this.error = error.message;
      }
    },
    changed() {
      this.refresh();
      this.$emit("change");
    },
  },
};
