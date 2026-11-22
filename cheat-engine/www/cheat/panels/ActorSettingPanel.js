import { GeneralCheat } from "../js/cheats/GeneralCheat.js";
import {
  applyPanelSnapshot,
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
import DatabaseTooltip from "../components/DatabaseTooltip.js";
import LockFavoriteControls from "../components/LockFavoriteControls.js";
import { favoriteSort } from "../js/panels/locks/LockPanelState.js";
import GameAsset from "../components/GameAsset.js";
import VirtualList from "../components/VirtualList.js";
import { getFeatureRuntime } from "../js/runtime/FeatureRuntime.js";
import { getGameWindow } from "../js/runtime/FeatureRuntime.js";
import { readMapActors } from "../js/panels/map/MapActors.js";
import { requestMapNavigation } from "../js/ui/RecordNavigation.js";

export default {
  name: "ActorSettingPanel",
  inject: { cheatRuntime: { default: null } },
  components: { DatabaseTooltip, LockFavoriteControls, GameAsset, VirtualList },

  template: `
<v-card flat class="ma-0 pa-0">
    <section class="record-workspace">
        <aside class="record-finder" aria-label="Actor roster">
            <div class="workspace-rail-heading"><strong>Actors</strong><span>{{ actorRows.length }} / {{ actors.length }}</span><button type="button" class="workspace-icon" title="Reload actors" aria-label="Reload actors" @click="initializeVariables"><v-icon small>mdi-refresh</v-icon></button></div>
            <v-text-field v-model="actorSearch" label="Search actors or ID" dense outlined hide-details clearable prepend-inner-icon="mdi-magnify" @keydown.stop/>
            <div class="workspace-segments mt-2" role="group" aria-label="Actor filter"><button type="button" :class="{'is-selected': actorFilter === 'all'}" :aria-pressed="actorFilter === 'all'" @click="actorFilter = 'all'">All</button><button type="button" :class="{'is-selected': actorFilter === 'party'}" :aria-pressed="actorFilter === 'party'" @click="actorFilter = 'party'">Party</button></div>
            <virtual-list v-if="actorRows.length" :items="actorRows" :height="Math.min(350, actorRows.length * 68)" :item-size="68">
              <template v-slot="{item: actor}"><button type="button" class="workspace-choice record-choice" :class="{'is-selected': actor.id === selectedActorId}" :aria-pressed="actor.id === selectedActorId" @click="selectActor(actor.id)">
                <game-asset kind="actor" :record-id="actor.id" :label="actor.name" :size="34" :navigate="false"/>
                <span class="record-choice__body"><strong>{{ actor.name }}</strong><small>#{{ actor.id }} · Lv{{ actor.level }} · {{ actor.className }}</small><small>{{ actor.isLeader ? 'Controlled' : actor.isInParty ? 'Party member' : 'Not in party' }}</small></span>
              </button></template>
            </virtual-list>
            <p v-else class="workspace-empty">{{ actors.length ? 'No matching actors. Try another name or ID.' : 'Load a game to see actors.' }}</p>
        </aside>
        <div class="record-inspector" v-if="detail">
            <header class="record-heading"><game-asset kind="actor" :record-id="detail.id" :label="detail.name" :size="52" :navigate="false"/><div class="record-heading__body"><h3>{{ detail.name }}</h3><small>Actor #{{ detail.id }} · {{ selectedInParty ? 'Party member' : 'Not in party' }}</small></div></header>
            <div class="record-actions"><v-btn small :color="selectedInParty ? undefined : 'primary'" @click="partyConfirmation = true">{{ selectedInParty ? 'Remove from Party' : 'Add to Party' }}</v-btn><v-btn v-if="selectedMapActor" small text @click="showOnMap"><v-icon small left>mdi-map-marker</v-icon>Show on map</v-btn></div>
            <p class="workspace-hint">Changes apply immediately. Save the game to keep them.</p>
            <div class="inspector-views" role="group" aria-label="Actor sections"><button v-for="view in actorViews" :key="view.value" type="button" :class="{'is-selected': detailView === view.value}" :aria-pressed="detailView === view.value" @click="detailView = view.value">{{ view.label }}</button></div>
            <section v-show="detailView === 'overview'" aria-label="Identity and vitals">
            <h4 class="record-section-title">Identity &amp; progression</h4>
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
                        type="number" outlined dense hide-details
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

            </section>
            <section v-show="detailView === 'parameters'" aria-label="Actor parameters">
            <h4 class="record-section-title">Parameters</h4>
            <p class="workspace-hint">Adjust this actor's values, including equipment and bonuses.</p>
            <v-row dense class="ma-0">
                <v-col
                    v-for="(_, paramIdx) in detail.param.length"
                    :key="paramIdx"
                    cols="6">
                    <v-text-field
                        :label="paramNames[paramIdx] || ('Param ' + paramIdx)"
                        v-model="detail.param[paramIdx]"
                        type="number" outlined dense hide-details
                        @keydown.self.stop
                        @change="onParamChange(paramIdx)"
                        @focus="$event.target.select()"></v-text-field>
                </v-col>
            </v-row>

            </section>
            <section v-show="detailView === 'skills'" aria-label="Actor skills">
            <h4 class="record-section-title">Learned skills · {{ detail.learnedSkills.length }}</h4>
            <div class="cheat-chip-row">
                <v-chip
                    v-for="skill in detail.learnedSkills"
                    :key="skill.id"
                    x-small label close
                    @click:close="onForgetSkill(skill.id)">
                    <database-tooltip kind="skill" :record-id="skill.id" :label="skill.name"/>
                </v-chip>
                <span v-if="detail.learnedSkills.length === 0" class="caption cheat-muted">No skills learned</span>
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

            </section>
            <section v-show="detailView === 'status'" aria-label="Actor status effects">
            <h4 class="record-section-title">Active effects · {{ detail.activeStates.length }}</h4>
            <div class="cheat-chip-row">
                <v-chip
                    v-for="st in favoriteStates"
                    :key="st.id"
                    x-small label close color="warning"
                    @click:close="onRemoveState(st.id)">
                    <database-tooltip kind="state" :record-id="st.id" :label="st.name"/>
                    <lock-favorite-controls :target="{kind:'state',actorId:detail.id,id:st.id}" :value="true" @change="initializeVariables"/>
                </v-chip>
                <span v-if="detail.activeStates.length === 0" class="caption cheat-muted">No active states</span>
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
                    <v-btn x-small class="ml-2" @click="clearStatesConfirmation = true">Clear All</v-btn>
                </v-col>
            </v-row>
            </section>
        </div>
        <div class="record-inspector workspace-empty" v-else>No actor selected. Load a game to begin.</div>
    </section>
    <v-alert v-if="partyError" type="error" role="alert" dense>{{ partyError }}</v-alert>
    <v-dialog v-model="partyConfirmation" max-width="400"><v-card><v-card-text class="pt-4">{{ selectedInParty ? 'Remove this actor from your party?' : 'Recruit this actor? This may bypass story progression and does not override battle-party limits.' }}</v-card-text><v-card-actions><v-btn text @click="partyConfirmation = false">Cancel</v-btn><v-btn text @click="changeParty">Confirm</v-btn></v-card-actions></v-card></v-dialog>
    <v-dialog v-model="clearStatesConfirmation" max-width="360"><v-card><v-card-text class="pt-4">Remove all status effects from this actor?</v-card-text><v-card-actions><v-btn text @click="clearStatesConfirmation = false">Cancel</v-btn><v-btn text @click="clearStatesConfirmation = false; onClearStates()">Clear effects</v-btn></v-card-actions></v-card></v-dialog>
</v-card>
    `,

  data() {
    return {
      actors: [],
      actorSearch: "",
      actorFilter: "all",
      detailView: "overview",
      actorViews: [
        { value: "overview", label: "Overview" },
        { value: "parameters", label: "Parameters" },
        { value: "skills", label: "Skills" },
        { value: "status", label: "Status" },
      ],
      paramNames: [],
      classes: [],
      allSkills: [],
      allStates: [],
      selectedActorId: null,
      detail: null,
      skillSearch: "",
      skillToLearn: null,
      stateToAdd: null,
      partyConfirmation: false,
      clearStatesConfirmation: false,
      partyError: "",
    };
  },

  computed: {
    actorRows() {
      const term = String(this.actorSearch || "")
        .trim()
        .toLowerCase();
      return this.groupedActors
        .reduce((rows, group) => rows.concat(group.items), [])
        .filter(
          (actor) =>
            (this.actorFilter !== "party" || actor.isInParty) &&
            (!term ||
              (
                actor.id +
                " " +
                actor.name +
                " " +
                actor.nickname +
                " " +
                actor.className
              )
                .toLowerCase()
                .indexOf(term) >= 0),
        );
    },
    selectedMapActor() {
      const snapshot = this.actors.find(
        (row) => row.id === this.selectedActorId,
      );
      if (!snapshot || !snapshot.isInParty) return null;
      return (
        readMapActors(getGameWindow()).find(
          (row) => row.actorId === this.selectedActorId,
        ) || null
      );
    },
    selectedInParty() {
      const row = this.actors.find(
        (actor) => actor.id === this.selectedActorId,
      );
      return !!(row && row.isInParty);
    },
    favoriteStates() {
      return this.detail
        ? favoriteSort(this.detail.activeStates, (row) => ({
            kind: "state",
            actorId: this.detail.id,
            id: row.id,
          }))
        : [];
    },
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
    showOnMap() {
      const game = getGameWindow(),
        actor = readMapActors(game).find(
          (row) => row.actorId === this.selectedActorId,
        );
      if (actor)
        requestMapNavigation(
          Object.assign({ mapId: game.$gameMap.mapId() }, actor),
        );
    },
    changeParty() {
      this.partyConfirmation = false;
      try {
        (this.cheatRuntime || getFeatureRuntime()).actors.setPartyMember(
          this.selectedActorId,
          !this.selectedInParty,
        );
        this.partyError = "";
        this.initializeVariables();
      } catch (error) {
        this.partyError = error.message;
      }
    },
    initializeVariables() {
      var keepSelected = this.selectedActorId;
      var state = readActorPanelState();
      applyPanelSnapshot(this, state);
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
