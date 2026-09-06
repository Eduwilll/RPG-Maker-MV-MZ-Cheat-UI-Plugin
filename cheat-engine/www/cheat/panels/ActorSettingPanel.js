import { GeneralCheat } from "../js/cheats/GeneralCheat.js";
import {
  coercePanelNumber,
  runPanelMutation,
} from "../js/panels/PanelGameState.js";
import {
  readActorPanelState,
  readActorDetail,
  findLiveActorById,
  changeActorName,
  changeActorNickname,
  changeActorProfile,
} from "../js/panels/actors/ActorPanelState.js";

export default {
  name: "ActorSettingPanel",

  template: `
<v-card flat class="ma-0 pa-0">
    <v-row class="ma-0" dense>
        <v-col cols="12" sm="4" class="pa-1">
            <v-card-subtitle class="pa-1">Actors ({{ actors.length }})</v-card-subtitle>
            <v-list dense class="overflow-y-auto" style="max-height: 380px;">
                <template v-for="group in groupedActors">
                    <v-subheader :key="'h-' + group.key" class="pa-1">{{ group.label }}</v-subheader>
                    <v-list-item
                        v-for="actor in group.items"
                        :key="actor.id"
                        :input-value="actor.id === selectedActorId"
                        @click="selectActor(actor.id)">
                        <v-list-item-content>
                            <v-list-item-title>{{ actor.name }} <span class="caption grey--text">Lv{{ actor.level }}</span></v-list-item-title>
                            <v-list-item-subtitle>{{ actor.className }}<span v-if="actor.nickname"> · {{ actor.nickname }}</span></v-list-item-subtitle>
                        </v-list-item-content>
                        <v-list-item-action v-if="actor.isLeader">
                            <v-icon x-small color="amber">mdi-crown</v-icon>
                        </v-list-item-action>
                        <v-list-item-action v-else-if="actor.isBattleMember">
                            <v-icon x-small color="green">mdi-sword-cross</v-icon>
                        </v-list-item-action>
                        <v-list-item-action v-else-if="actor.isInParty">
                            <v-icon x-small color="blue">mdi-account</v-icon>
                        </v-list-item-action>
                    </v-list-item>
                </template>
            </v-list>
            <v-btn small block class="mt-2" @click="initializeVariables">
                <v-icon x-small left>mdi-refresh</v-icon> Reload
            </v-btn>
        </v-col>
        <v-col cols="12" sm="8" class="pa-1" v-if="detail">
            <v-card-subtitle class="pa-1">Identity — {{ detail.name }}</v-card-subtitle>
            <v-row dense class="ma-0">
                <v-col cols="12" md="6">
                    <v-text-field
                        label="Name"
                        v-model="detail.name"
                        outlined dense hide-details
                        @keydown.self.stop
                        @change="onNameChange"
                        @focus="$event.target.select()"></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                    <v-text-field
                        label="Nickname"
                        v-model="detail.nickname"
                        outlined dense hide-details
                        @keydown.self.stop
                        @change="onNicknameChange"
                        @focus="$event.target.select()"></v-text-field>
                </v-col>
                <v-col cols="6">
                    <v-text-field
                        label="Lv"
                        v-model="detail.level"
                        outlined dense hide-details
                        @keydown.self.stop
                        @change="onLevelChange"
                        @focus="$event.target.select()"></v-text-field>
                </v-col>
                <v-col cols="6">
                    <v-text-field
                        label="EXP"
                        v-model="detail.exp"
                        outlined dense hide-details
                        @keydown.self.stop
                        @change="onExpChange"
                        @focus="$event.target.select()"></v-text-field>
                </v-col>
                <v-col cols="12">
                    <v-select
                        label="Class"
                        v-model="detail.classId"
                        :items="classes"
                        item-text="name"
                        item-value="id"
                        outlined dense hide-details
                        @change="onClassChange"></v-select>
                </v-col>
                <v-col cols="12">
                    <v-checkbox
                        v-model="detail.godMode"
                        label="God Mode"
                        dense hide-details class="my-0"
                        @change="onGodModeChange"></v-checkbox>
                </v-col>
            </v-row>

            <v-card-subtitle class="pa-1 mt-2">Vitals</v-card-subtitle>
            <v-row dense class="ma-0">
                <v-col cols="4">
                    <v-text-field
                        :label="'HP / ' + detail.mhp"
                        v-model="detail.hp"
                        outlined dense hide-details
                        @keydown.self.stop
                        @change="onHpChange"
                        @focus="$event.target.select()"></v-text-field>
                </v-col>
                <v-col cols="4">
                    <v-text-field
                        :label="'MP / ' + detail.mmp"
                        v-model="detail.mp"
                        outlined dense hide-details
                        @keydown.self.stop
                        @change="onMpChange"
                        @focus="$event.target.select()"></v-text-field>
                </v-col>
                <v-col cols="4">
                    <v-text-field
                        label="TP"
                        v-model="detail.tp"
                        outlined dense hide-details
                        @keydown.self.stop
                        @change="onTpChange"
                        @focus="$event.target.select()"></v-text-field>
                </v-col>
                <v-col cols="12">
                    <v-btn x-small @click="onRecoverAll">Recover All</v-btn>
                </v-col>
            </v-row>

            <v-card-subtitle class="pa-1 mt-2">Params</v-card-subtitle>
            <v-row dense class="ma-0">
                <v-col
                    v-for="(_, paramIdx) in detail.param.length"
                    :key="paramIdx"
                    cols="6">
                    <v-text-field
                        :label="paramNames[paramIdx] || ('Param ' + paramIdx)"
                        v-model="detail.param[paramIdx]"
                        outlined dense hide-details
                        @keydown.self.stop
                        @change="onParamChange(paramIdx)"
                        @focus="$event.target.select()"></v-text-field>
                </v-col>
            </v-row>

            <v-card-subtitle class="pa-1 mt-2">Skills ({{ detail.learnedSkills.length }})</v-card-subtitle>
            <div class="d-flex flex-wrap" style="gap: 4px;">
                <v-chip
                    v-for="skill in detail.learnedSkills"
                    :key="skill.id"
                    x-small label close
                    @click:close="onForgetSkill(skill.id)">
                    {{ skill.name }}
                </v-chip>
                <span v-if="detail.learnedSkills.length === 0" class="caption grey--text">No skills learned</span>
            </div>
            <v-row dense class="ma-0 mt-1">
                <v-col cols="12">
                    <v-text-field
                        label="Search skills"
                        v-model="skillSearch"
                        outlined dense hide-details
                        @keydown.self.stop></v-text-field>
                </v-col>
                <v-col cols="12">
                    <v-select
                        label="Learn skill"
                        v-model="skillToLearn"
                        :items="filteredLearnableSkills"
                        item-text="name"
                        item-value="id"
                        outlined dense hide-details></v-select>
                </v-col>
                <v-col cols="12">
                    <v-btn x-small color="primary" :disabled="!skillToLearn" @click="onLearnSkill">Learn</v-btn>
                </v-col>
            </v-row>

            <v-card-subtitle class="pa-1 mt-2">States ({{ detail.activeStates.length }})</v-card-subtitle>
            <div class="d-flex flex-wrap" style="gap: 4px;">
                <v-chip
                    v-for="st in detail.activeStates"
                    :key="st.id"
                    x-small label close color="orange darken-2"
                    @click:close="onRemoveState(st.id)">
                    {{ st.name }}
                </v-chip>
                <span v-if="detail.activeStates.length === 0" class="caption grey--text">No active states</span>
            </div>
            <v-row dense class="ma-0 mt-1">
                <v-col cols="12">
                    <v-select
                        label="Add state"
                        v-model="stateToAdd"
                        :items="allStates"
                        item-text="name"
                        item-value="id"
                        outlined dense hide-details></v-select>
                </v-col>
                <v-col cols="12">
                    <v-btn x-small :disabled="!stateToAdd" @click="onAddState">Add</v-btn>
                    <v-btn x-small class="ml-2" @click="onClearStates">Clear All</v-btn>
                </v-col>
            </v-row>
        </v-col>
        <v-col cols="12" sm="8" class="pa-1" v-else>
            <p class="caption grey--text pa-2">No actor selected. Open a game with a party first.</p>
        </v-col>
    </v-row>
</v-card>
    `,

  data() {
    return {
      actors: [],
      paramNames: [],
      classes: [],
      allSkills: [],
      allStates: [],
      selectedActorId: null,
      detail: null,
      skillSearch: "",
      skillToLearn: null,
      stateToAdd: null,
    };
  },

  computed: {
    groupedActors() {
      var leader = null;
      var party = [];
      var others = [];
      for (var i = 0; i < this.actors.length; i++) {
        var actor = this.actors[i];
        if (actor.isLeader) {
          leader = actor;
        } else if (actor.isInParty) {
          party.push(actor);
        } else {
          others.push(actor);
        }
      }
      var groups = [];
      if (leader) {
        groups.push({
          key: "controlled",
          label: "Controlled",
          items: [leader],
        });
      }
      if (party.length > 0) {
        groups.push({
          key: "party",
          label: "Party (" + party.length + ")",
          items: party,
        });
      }
      if (others.length > 0) {
        groups.push({
          key: "others",
          label: "Other Actors (" + others.length + ")",
          items: others,
        });
      }
      return groups;
    },
    filteredLearnableSkills() {
      var search = String(this.skillSearch || "")
        .trim()
        .toLowerCase();
      var learnedIds = {};
      if (this.detail && this.detail.learnedSkills) {
        for (var i = 0; i < this.detail.learnedSkills.length; i++) {
          learnedIds[this.detail.learnedSkills[i].id] = true;
        }
      }
      var result = [];
      for (var n = 0; n < this.allSkills.length; n++) {
        var skill = this.allSkills[n];
        if (learnedIds[skill.id]) {
          continue;
        }
        if (
          search &&
          String(skill.name || "")
            .toLowerCase()
            .indexOf(search) === -1
        ) {
          continue;
        }
        result.push(skill);
        if (result.length >= 200) {
          break;
        }
      }
      return result;
    },
  },

  created() {
    this.initializeVariables();
  },

  methods: {
    initializeVariables() {
      var keepSelected = this.selectedActorId;
      var state = readActorPanelState();
      this.paramNames = state.paramNames;
      this.actors = state.actors;
      this.classes = state.classes;
      this.allSkills = state.allSkills;
      this.allStates = state.allStates;
      if (this.actors.length > 0) {
        var stillExists = false;
        for (var i = 0; i < this.actors.length; i++) {
          if (this.actors[i].id === keepSelected) {
            stillExists = true;
            break;
          }
        }
        this.selectedActorId = stillExists ? keepSelected : this.actors[0].id;
        this.detail = readActorDetail(this.selectedActorId);
      } else {
        this.selectedActorId = null;
        this.detail = null;
      }
      this.skillToLearn = null;
    },

    selectActor(actorId) {
      this.selectedActorId = actorId;
      this.detail = readActorDetail(actorId);
      this.skillToLearn = null;
      this.stateToAdd = null;
    },

    liveActor() {
      return findLiveActorById(this.selectedActorId);
    },

    onNameChange() {
      var next = String((this.detail && this.detail.name) || "").trim();
      if (next) {
        changeActorName(this.selectedActorId, next);
      }
      runPanelMutation(this, function () {});
    },

    onNicknameChange() {
      changeActorNickname(
        this.selectedActorId,
        String((this.detail && this.detail.nickname) || ""),
      );
      runPanelMutation(this, function () {});
    },

    onLevelChange() {
      var actor = this.liveActor();
      var fallback = actor ? actor.level : 1;
      var next = coercePanelNumber(this.detail.level, {
        fallback: fallback,
        integer: true,
        min: 1,
        max: 99,
      });
      runPanelMutation(
        this,
        function () {
          var live = findLiveActorById(this.selectedActorId);
          if (live) {
            live.changeLevel(next, false);
          }
        }.bind(this),
      );
    },

    onExpChange() {
      var actor = this.liveActor();
      var fallback = actor ? actor.currentExp() : 0;
      var next = coercePanelNumber(this.detail.exp, {
        fallback: fallback,
        integer: true,
        min: 0,
      });
      runPanelMutation(
        this,
        function () {
          var live = findLiveActorById(this.selectedActorId);
          if (live) {
            live.changeExp(next, false);
          }
        }.bind(this),
      );
    },

    onClassChange() {
      var nextClassId = Number(this.detail.classId);
      runPanelMutation(
        this,
        function () {
          var live = findLiveActorById(this.selectedActorId);
          if (live && nextClassId > 0) {
            live.changeClass(nextClassId, true);
          }
        }.bind(this),
      );
    },

    onGodModeChange() {
      runPanelMutation(
        this,
        function () {
          var live = findLiveActorById(this.selectedActorId);
          if (live) {
            GeneralCheat.toggleGodMode(live);
          }
        }.bind(this),
      );
    },

    onHpChange() {
      var actor = this.liveActor();
      var fallback = actor ? actor.hp : 0;
      var next = coercePanelNumber(this.detail.hp, {
        fallback: fallback,
        integer: true,
        min: 0,
      });
      runPanelMutation(
        this,
        function () {
          var live = findLiveActorById(this.selectedActorId);
          if (live && live.setHp) {
            live.setHp(next);
          }
        }.bind(this),
      );
    },

    onMpChange() {
      var actor = this.liveActor();
      var fallback = actor ? actor.mp : 0;
      var next = coercePanelNumber(this.detail.mp, {
        fallback: fallback,
        integer: true,
        min: 0,
      });
      runPanelMutation(
        this,
        function () {
          var live = findLiveActorById(this.selectedActorId);
          if (live && live.setMp) {
            live.setMp(next);
          }
        }.bind(this),
      );
    },

    onTpChange() {
      var actor = this.liveActor();
      var fallback = actor ? actor.tp : 0;
      var next = coercePanelNumber(this.detail.tp, {
        fallback: fallback,
        integer: true,
        min: 0,
        max: 100,
      });
      runPanelMutation(
        this,
        function () {
          var live = findLiveActorById(this.selectedActorId);
          if (live && live.setTp) {
            live.setTp(next);
          }
        }.bind(this),
      );
    },

    onRecoverAll() {
      runPanelMutation(
        this,
        function () {
          var live = findLiveActorById(this.selectedActorId);
          if (live && live.recoverAll) {
            live.recoverAll();
          }
        }.bind(this),
      );
    },

    onParamChange(paramIndex) {
      var actor = this.liveActor();
      var fallback = actor ? actor.param(paramIndex) : 0;
      var next = coercePanelNumber(this.detail.param[paramIndex], {
        fallback: fallback,
        integer: true,
      });
      runPanelMutation(
        this,
        function () {
          var live = findLiveActorById(this.selectedActorId);
          if (live) {
            var diff = next - live.param(paramIndex);
            live.addParam(paramIndex, diff);
          }
        }.bind(this),
      );
    },

    onLearnSkill() {
      var skillId = Number(this.skillToLearn);
      if (!skillId) {
        return;
      }
      runPanelMutation(
        this,
        function () {
          var live = findLiveActorById(this.selectedActorId);
          if (live && live.learnSkill) {
            live.learnSkill(skillId);
          }
        }.bind(this),
      );
    },

    onForgetSkill(skillId) {
      runPanelMutation(
        this,
        function () {
          var live = findLiveActorById(this.selectedActorId);
          if (live && live.forgetSkill) {
            live.forgetSkill(skillId);
          }
        }.bind(this),
      );
    },

    onAddState() {
      var stateId = Number(this.stateToAdd);
      if (!stateId) {
        return;
      }
      runPanelMutation(
        this,
        function () {
          var live = findLiveActorById(this.selectedActorId);
          if (live && live.addState) {
            live.addState(stateId);
          }
        }.bind(this),
      );
    },

    onRemoveState(stateId) {
      runPanelMutation(
        this,
        function () {
          var live = findLiveActorById(this.selectedActorId);
          if (live && live.removeState) {
            live.removeState(stateId);
          }
        }.bind(this),
      );
    },

    onClearStates() {
      runPanelMutation(
        this,
        function () {
          var live = findLiveActorById(this.selectedActorId);
          if (live && live.clearStates) {
            live.clearStates();
          }
        }.bind(this),
      );
    },
  },
};
