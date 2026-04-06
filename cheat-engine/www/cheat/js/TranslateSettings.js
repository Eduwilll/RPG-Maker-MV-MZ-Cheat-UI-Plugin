// @ts-check

import { KeyValueStorage } from "./KeyValueStorage.js";
import {
  DEFAULT_END_POINTS,
  END_POINT_URL_PATTERN_TEXT_SYMBOL,
} from "./TranslationConfig.js";

export class TranslateSettings {
  constructor() {
    /** @type {KeyValueStorage} */
    this.kvStorage = new KeyValueStorage("./www/cheat-settings/translate.json");
    /** @type {any} */
    this.data = null;
    this.__readSettings();
  }

  __readSettings() {
    const json = this.kvStorage.getItem("data");

    if (!json) {
      this.data = {
        enabled: false,
        endPointSelection: "lingva",
        customEndPointData: {
          method: "get",
          urlPattern: `http://localhost:5000/translate?text=${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
          body: "",
        },
        targets: {
          items: true,
          weapons: true,
          armors: true,
          skills: true,
          states: true,
          classes: true,
          enemies: true,
          variables: true,
          switches: true,
          maps: true,
          actors: true,
          system: true,
          dialogues: true,
        },
        bulkTranslateChunkSize: 10,
        llmConfig: {
          apiKey: "",
          model: "",
          apiUrl: "",
          systemPrompt: "",
        },
      };
      return;
    }

    this.data = JSON.parse(json);

    if (this.data.targets) {
      if (this.data.targets.actors === undefined)
        this.data.targets.actors = true;
      if (this.data.targets.system === undefined)
        this.data.targets.system = true;
      if (this.data.targets.dialogues === undefined) {
        this.data.targets.dialogues = true;
      }
    }

    if (!this.data.llmConfig) {
      this.data.llmConfig = {
        apiKey: "",
        model: "",
        apiUrl: "",
        systemPrompt: "",
      };
    }
  }

  __writeSettings() {
    this.kvStorage.setItem("data", JSON.stringify(this.data));
  }

  getEndPointData() {
    if (this.getEndPointSelection() === "custom") {
      return this.getCustomEndPointData();
    }

    const epData = DEFAULT_END_POINTS[this.getEndPointSelection()].data;

    if (epData.isLLM) {
      const llm = this.getLLMConfig();
      return {
        ...epData,
        model: llm.model || epData.model,
        apiUrl: llm.apiUrl || epData.apiUrl,
        apiKey: llm.apiKey || "",
      };
    }

    return epData;
  }

  setEnabled(flag) {
    this.data.enabled = flag;
    this.__writeSettings();
  }

  isEnabled() {
    return this.data.enabled;
  }

  getEndPointSelection() {
    return this.data.endPointSelection;
  }

  setEndPointSelection(endPointId) {
    this.data.endPointSelection = endPointId;
    this.__writeSettings();
  }

  getCustomEndPointData() {
    return this.data.customEndPointData;
  }

  setCustomEndPointMethod(method) {
    this.data.customEndPointData.method = method;
    this.__writeSettings();
  }

  setCustomEndPointUrlPattern(urlPattern) {
    this.data.customEndPointData.urlPattern = urlPattern;
    this.__writeSettings();
  }

  setCustomEndPointBody(body) {
    this.data.customEndPointData.body = body;
    this.__writeSettings();
  }

  getLLMConfig() {
    return (
      this.data.llmConfig || {
        apiKey: "",
        model: "",
        apiUrl: "",
        systemPrompt: "",
      }
    );
  }

  setLLMConfig(config) {
    this.data.llmConfig = { ...this.data.llmConfig, ...config };
    this.__writeSettings();
  }

  getBulkTranslateChunkSize() {
    return this.data.bulkTranslateChunkSize;
  }

  setBulkTranslateChunkSize(chunkSize) {
    this.data.bulkTranslateChunkSize = chunkSize;
    this.__writeSettings();
  }

  getTargets() {
    return this.data.targets;
  }

  setTargets(targets) {
    this.data.targets = targets;
    this.__writeSettings();
  }

  isItemTranslateEnabled() {
    return this.isEnabled() && this.getTargets().items;
  }

  isWeaponTranslateEnabled() {
    return this.isEnabled() && this.getTargets().weapons;
  }

  isArmorTranslateEnabled() {
    return this.isEnabled() && this.getTargets().armors;
  }

  isSkillTranslateEnabled() {
    return this.isEnabled() && this.getTargets().skills;
  }

  isStateTranslateEnabled() {
    return this.isEnabled() && this.getTargets().states;
  }

  isClassTranslateEnabled() {
    return this.isEnabled() && this.getTargets().classes;
  }

  isEnemyTranslateEnabled() {
    return this.isEnabled() && this.getTargets().enemies;
  }

  isVariableTranslateEnabled() {
    return this.isEnabled() && this.getTargets().variables;
  }

  isSwitchTranslateEnabled() {
    return this.isEnabled() && this.getTargets().switches;
  }

  isMapTranslateEnabled() {
    return this.isEnabled() && this.getTargets().maps;
  }

  isActorTranslateEnabled() {
    return this.isEnabled() && this.getTargets().actors;
  }

  isSystemTranslateEnabled() {
    return this.isEnabled() && this.getTargets().system;
  }

  isDialogueTranslateEnabled() {
    return this.isEnabled() && this.getTargets().dialogues;
  }
}

export const TRANSLATE_SETTINGS = new TranslateSettings();
