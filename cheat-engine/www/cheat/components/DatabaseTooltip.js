import { getGameWindow } from "../js/runtime/FeatureRuntime.js";
import { readDatabaseDetails } from "../js/ui/DatabaseDetails.js";
import GameAsset from "./GameAsset.js";
export default {
  name: "DatabaseTooltip",
  components: { GameAsset },
  props: { kind: String, recordId: Number, label: String },
  data() {
    return { open: false, details: null };
  },
  watch: {
    open(value) {
      if (value) {
        try {
          this.details = readDatabaseDetails(
            getGameWindow(),
            this.kind,
            this.recordId,
          );
        } catch (error) {
          this.details = null;
        }
      }
    },
  },
  template: `<v-menu v-model="open" open-on-hover :open-delay="200" :close-on-content-click="false" offset-y max-width="360" :z-index="2500">
    <template v-slot:activator="{ on, attrs }"><span tabindex="0" class="database-detail-label" v-bind="attrs" v-on="on" @focus="open = true" @keydown.enter.stop.prevent="open = !open" @keydown.esc.stop="open = false"><game-asset v-if="kind !== 'class'" :kind="kind" :record-id="recordId" :label="label" :size="kind === 'enemy' ? 32 : 20" :navigate="false"/><slot>{{ label }}</slot></span></template>
    <v-card v-if="details" class="pa-3" style="width: 360px; max-width: 90vw; max-height: 300px; overflow-y: auto; overflow-wrap: break-word;">
      <div class="subtitle-2">{{ details.title }} <span class="caption grey--text">#{{ details.id }} {{ details.kind }}</span></div>
      <game-asset v-if="kind === 'enemy'" kind="enemy" :record-id="recordId" :label="details.title" :size="128" :navigate="false"/>
      <div v-if="details.description" class="caption mt-1" style="white-space: pre-wrap;">{{ details.description }}</div>
      <div v-for="section in details.sections" :key="section.title" class="mt-2"><strong class="caption">{{ section.title }}</strong><div v-for="(line, i) in section.lines" :key="i" class="caption">{{ line }}</div></div>
    </v-card>
  </v-menu>`,
};
