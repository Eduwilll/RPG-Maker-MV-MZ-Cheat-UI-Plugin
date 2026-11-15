import { TRAIT_LABELS, EFFECT_LABELS } from "../js/ui/DatabaseDetails.js";
const CONDITIONS = [
  "Always",
  "Turn (first / interval)",
  "HP ratio (min / max)",
  "MP ratio (min / max)",
  "Affected by state",
  "Party level at least",
  "Switch is ON",
];
export default {
  name: "DatabaseRowsEditor",
  props: {
    value: { type: Array, default: () => [] },
    type: { type: String, default: "traits" },
    references: { type: Object, default: () => ({}) },
  },
  template: `<div><div v-for="(row, i) in value" :key="i" class="pa-1 mb-1" style="border: 1px solid #8885; border-radius: 3px;">
    <v-row dense class="ma-0"><v-col v-for="field in fields(row)" :key="field.key" cols="6" sm="4">
      <v-select v-if="field.items" :value="row[field.key]" :items="field.items" item-text="text" item-value="value" :label="field.label" dense outlined hide-details @change="change(i, field.key, $event)"/>
      <v-text-field v-else :value="row[field.key]" :label="field.label" dense outlined hide-details type="number" @keydown.stop @input="change(i, field.key, $event)"/>
    </v-col><v-col cols="auto"><v-btn icon x-small title="Remove row" @click="remove(i)"><v-icon small>mdi-delete</v-icon></v-btn></v-col></v-row>
  </div><v-btn x-small text @click="add"><v-icon x-small left>mdi-plus</v-icon>Add {{ type === 'learnings' ? 'level-up skill' : type.slice(0,-1) }}</v-btn></div>`,
  methods: {
    change(index, field, value) {
      const rows = JSON.parse(JSON.stringify(this.value));
      rows[index][field] = value;
      this.$emit("input", rows);
    },
    remove(index) {
      this.$emit(
        "input",
        this.value
          .filter((row, i) => i !== index)
          .map((row) => JSON.parse(JSON.stringify(row))),
      );
    },
    add() {
      if (this.value.length >= 128) return;
      const skills = this.references.skills || [];
      const id = skills.length ? skills[0].id : 1;
      const defaults = {
        actions: {
          skillId: id,
          rating: 5,
          conditionType: 0,
          conditionParam1: 0,
          conditionParam2: 0,
        },
        learnings: { level: 1, skillId: id, note: "" },
        traits: { code: 21, dataId: 2, value: 1 },
        effects: { code: 11, dataId: 0, value1: 0, value2: 0 },
      };
      this.$emit(
        "input",
        this.value.concat([defaults[this.type] || defaults.traits]),
      );
    },
    fields(row) {
      const refs = (name) =>
        (this.references[name] || []).map((item) => ({
          text: item.name,
          value: item.id,
        }));
      const field = (key, label, items) => ({ key, label, items });
      if (this.type === "learnings")
        return [
          field("level", "Level"),
          field("skillId", "Skill", refs("skills")),
        ];
      if (this.type === "actions") {
        const condition = Number(row.conditionType);
        const firstRefs =
          condition === 4
            ? refs("states")
            : condition === 6
              ? refs("switches")
              : null;
        return [
          field("skillId", "Skill", refs("skills")),
          field("rating", "Rating (1..9)"),
          field(
            "conditionType",
            "Condition",
            CONDITIONS.map((text, value) => ({ text, value })),
          ),
          field(
            "conditionParam1",
            condition === 2 || condition === 3
              ? "Minimum ratio (0..1)"
              : condition === 4
                ? "State"
                : condition === 6
                  ? "Switch"
                  : "First / minimum",
            firstRefs,
          ),
          field(
            "conditionParam2",
            condition === 2 || condition === 3
              ? "Maximum ratio (0..1)"
              : "Interval / second",
          ),
        ];
      }
      const code = Number(row.code);
      const labels = this.type === "traits" ? TRAIT_LABELS : EFFECT_LABELS;
      const traitRefs = {
        11: "elements",
        13: "states",
        14: "states",
        31: "elements",
        32: "states",
        41: "skillTypes",
        42: "skillTypes",
        43: "skills",
        44: "skills",
        51: "weaponTypes",
        52: "armorTypes",
        53: "equipTypes",
        54: "equipTypes",
      };
      const effectRefs = {
        21: "states",
        22: "states",
        43: "skills",
        44: "commonEvents",
      };
      const name = (this.type === "traits" ? traitRefs : effectRefs)[code];
      let choices = name ? refs(name) : null;
      if (this.type === "effects" && code === 21 && choices)
        choices = [{ text: "Normal attack states", value: 0 }].concat(choices);
      const fields = [
        field(
          "code",
          "Type",
          Object.keys(labels).map((value) => ({
            text: labels[value],
            value: Number(value),
          })),
        ),
        field("dataId", name ? "Target" : "Parameter / target ID", choices),
      ];
      if (this.type === "traits")
        fields.push(field("value", "Value (rates: 1 = 100%)"));
      else
        fields.push(
          field("value1", "Value / ratio (1 = 100%)"),
          field("value2", "Flat amount / second value"),
        );
      return fields;
    },
  },
};
