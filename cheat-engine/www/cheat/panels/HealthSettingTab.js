export default {
  name: "HealthSettingTab",

  template: `
<div>
    <v-data-table
        v-if="tableHeaders"
        dense
        hide-default-footer
        :headers="tableHeaders"
        :items="editingItems">
        <template
            v-slot:item.name="{ item }">
            <span class="caption">{{item.name}}</span>
        </template>
        <template
            v-slot:item.hp="{ item }">
            <v-text-field
                background-color="grey darken-3"
                class="d-inline-flex x-small-field caption"
                style="width: 50px;"
                hide-details
                solo
                v-model="item.hp.hp"
                label="Curr Hp"
                dense
                @keydown.self.stop
                @change="onDataChange"
                @focus="$event.target.select()">
            </v-text-field>
            <span class="caption">/ {{item.hp.mhp}}</span>
        </template>
        <template
            v-slot:item.mp="{ item }">
            <v-text-field
                background-color="grey darken-3"
                class="d-inline-flex x-small-field caption"
                style="width: 50px;"
                hide-details
                solo
                v-model="item.mp.mp"
                label="Curr Mp"
                dense
                @keydown.self.stop
                @change="onDataChange"
                @focus="$event.target.select()">
            </v-text-field>
            <span class="caption">/ {{item.mp.mmp}}</span>
        </template>
    </v-data-table>
</div>
    `,

  data() {
    return {
      tableHeaders: [
        {
          text: "Name",
          value: "name",
        },
        {
          text: "Hp",
          value: "hp",
        },
        {
          text: "Mp",
          value: "mp",
        },
      ],

      editingItems: [],
    };
  },

  props: {
    items: {
      type: Array,
      default: [],
    },
  },

  watch: {
    items: {
      immediate: true,
      handler() {
        // Dereference objects to prevent Vue from deeply injecting __ob__ into RPG Maker database/game objects.
        this.editingItems = JSON.parse(JSON.stringify(this.items));
      },
    },
  },

  methods: {
    onDataChange() {
      this.$emit("change", this.editingItems);
    },
  },
};
