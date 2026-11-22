import DatabaseTooltip from "./DatabaseTooltip.js";
import VirtualList from "./VirtualList.js";
import SkillSwitchInspector from "./SkillSwitchInspector.js";

export default {
  name: "ActorSkillsEditor",
  components: { DatabaseTooltip, VirtualList, SkillSwitchInspector },
  props: { actorId: Number, skills: Array, learned: Array },
  data() {
    return { search: "", filter: "all", inspectedId: null };
  },
  computed: {
    learnedIds() {
      return new Set((this.learned || []).map((skill) => skill.id));
    },
    rows() {
      const term = String(this.search || "")
        .trim()
        .toLowerCase();
      return (this.skills || []).filter(
        (skill) =>
          (!term ||
            (skill.id + " " + skill.name).toLowerCase().indexOf(term) >= 0) &&
          (this.filter === "all" ||
            this.learnedIds.has(skill.id) === (this.filter === "learned")),
      );
    },
  },
  watch: {
    actorId() {
      this.inspectedId = null;
    },
  },
  template: `<section class="actor-skills-editor">
    <div class="workspace-rail-heading"><strong>Skills</strong><span>{{ (learned || []).length }} learned</span></div>
    <v-text-field v-model="search" label="Search skills by name or ID" dense outlined hide-details clearable prepend-inner-icon="mdi-magnify" @keydown.stop/>
    <div class="workspace-segments my-2" role="group" aria-label="Skill filter"><button v-for="option in [{value:'all',label:'All'},{value:'available',label:'Available'},{value:'learned',label:'Learned'}]" :key="option.value" type="button" :class="{'is-selected':filter===option.value}" :aria-pressed="filter===option.value" @click="filter=option.value">{{option.label}}</button></div>
    <virtual-list v-if="rows.length" :key="filter+':'+search" :items="rows" :height="Math.min(288,rows.length*72)" :item-size="72" preserve-scroll>
      <template v-slot="{item:skill}"><div class="skill-picker-row" :class="{'is-inspected':inspectedId===skill.id}">
        <div class="skill-picker-row__identity"><database-tooltip kind="skill" :record-id="skill.id" :label="skill.name"/><small>#{{skill.id}} · {{learnedIds.has(skill.id) ? 'Learned' : 'Not learned'}}</small></div>
        <div class="skill-picker-row__actions"><v-btn v-if="!learnedIds.has(skill.id)" x-small color="primary" :aria-label="'Learn '+skill.name" @click="$emit('learn',skill.id)">Learn</v-btn><v-btn v-else x-small text :aria-label="'Forget '+skill.name" @click="$emit('forget',skill.id)">Forget</v-btn><button type="button" class="workspace-text-action" :aria-label="'Review switches for '+skill.name" :aria-expanded="inspectedId===skill.id" @click="reviewSkill(skill.id)">Review switches</button></div>
      </div></template>
    </virtual-list>
    <p v-else class="workspace-empty">No matching skills. Try another name, ID, or filter.</p>
    <skill-switch-inspector v-if="inspectedId" ref="review" :key="actorId+':'+inspectedId" :actor-id="actorId" :skill-id="inspectedId" @close="inspectedId=null"/>
  </section>`,
  methods: {
    reviewSkill(id) {
      this.inspectedId = this.inspectedId === id ? null : id;
      if (this.inspectedId)
        this.$nextTick(() => {
          if (this.$refs.review)
            this.$refs.review.$el.scrollIntoView({ block: "nearest" });
        });
    },
  },
};
