import {
  readNearbyEvents,
  facingEventId,
} from "../js/panels/event-analyzer/EventExplorerState.js";
import { getGameWindow } from "../js/runtime/FeatureRuntime.js";
import VirtualList from "./VirtualList.js";
export default {
  name: "EventContext",
  components: { VirtualList },
  props: { mode: String, selectedEventId: Number, selectedMapId: Number },
  data() {
    return {
      search: "",
      events: [],
      context: {
        facingEvent: null,
        currentMapId: 0,
        mapEventCount: 0,
        mapReady: false,
      },
    };
  },
  computed: {
    filteredEvents() {
      const query = String(this.search || "").toLowerCase();
      return this.events.filter(
        (row) =>
          !query || (row.name + " #" + row.id).toLowerCase().includes(query),
      );
    },
  },
  template: `<section class="event-context">
    <template v-if="mode==='facing'"><div class="workspace-rail-heading"><strong>Facing Event</strong></div><button v-if="context.facingEvent" type="button" class="workspace-choice event-choice event-choice--facing" :class="{'is-selected':selectedMapId===context.currentMapId && selectedEventId===context.facingEvent.id}" @click="inspectFacing"><v-icon small>mdi-crosshairs-gps</v-icon><strong>{{context.facingEvent.name}}</strong><small>Event #{{context.facingEvent.id}} · {{selectedMapId===context.currentMapId && selectedEventId===context.facingEvent.id?'Selected':'Inspect details'}}</small></button><div v-else class="workspace-empty"><v-icon>mdi-crosshairs-gps</v-icon><strong>Nothing in front</strong><p>Face a character or object in the game, or look through nearby events.</p></div><button type="button" class="workspace-text-action" @click="$emit('nearby')">Browse nearby events<v-icon small>mdi-chevron-right</v-icon></button></template>
    <template v-else><div class="workspace-rail-heading"><strong>Nearby events</strong><span>{{events.length}}</span></div><v-text-field v-model="search" label="Find an event" dense outlined hide-details clearable @keydown.stop/><virtual-list :items="filteredEvents" :item-size="58" :height="306"><template v-slot:default="{item}"><button type="button" class="workspace-choice event-choice" :class="{'is-selected':selectedMapId===item.mapId && selectedEventId===item.id}" @click="$emit('inspect',{mapId:item.mapId,eventId:item.id})"><strong>{{item.name}}</strong><small>#{{item.id}} · {{item.distance}} tiles away</small></button></template></virtual-list><p v-if="!filteredEvents.length" class="workspace-empty">No map events found here.</p><span class="workspace-rail-note">Closest first · Select to inspect</span></template>
  </section>`,
  created() {
    this.refresh();
  },
  mounted() {
    this._timer = setInterval(() => {
      if (
        !this.$el.contains(document.activeElement) ||
        !document.activeElement.matches("input,textarea,[contenteditable]")
      )
        this.refresh();
    }, 750);
  },
  beforeDestroy() {
    clearInterval(this._timer);
  },
  methods: {
    refresh() {
      const game = getGameWindow(),
        events = readNearbyEvents(game),
        facing = facingEventId(game);
      const context = {
        facingEvent: events.find((row) => row.id === facing) || null,
        currentMapId: game.$gameMap ? game.$gameMap.mapId() : 0,
        mapEventCount: events.length,
        mapReady: !!game.$dataMap,
      };
      if (JSON.stringify(context) !== JSON.stringify(this.context))
        this.context = context;
      if (JSON.stringify(events) !== JSON.stringify(this.events))
        this.events = events;
    },
    inspectFacing() {
      const event = this.context.facingEvent;
      if (event)
        this.$emit("inspect", {
          mapId: this.context.currentMapId,
          eventId: event.id,
        });
    },
  },
};
