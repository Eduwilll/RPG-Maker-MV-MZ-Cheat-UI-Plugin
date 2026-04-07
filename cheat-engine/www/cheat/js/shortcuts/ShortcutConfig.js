// @ts-check

import { Key } from "../KeyCodes.js";
import { cloneObject } from "../Tools.js";
import { SpeedCheat, MessageCheat } from "../CheatSpeed.js";
import { SceneCheat, BattleCheat } from "../CheatBattle.js";
import { GeneralCheat } from "../CheatGeneral.js";
import { isDesktopRuntime } from "../runtime/RuntimeEnv.js";

export const defaultShortcutSettings = {
  toggleCheatModal: {
    shortcut: "ctrl c",
  },

  toggleCheatModalToSaveLocationComponent: {
    shortcut: "ctrl m",
  },

  toggleCheatModalToMapEventComponent: {
    shortcut: "ctrl e",
  },

  quickSave: {
    shortcut: "ctrl s",
    param: {
      slot: 1,
    },
  },

  quickLoad: {
    shortcut: "ctrl q",
    param: {
      slot: 1,
    },
  },

  openSaveScene: {
    shortcut: "ctrl [",
  },

  openLoadScene: {
    shortcut: "ctrl ]",
  },

  gotoTitle: {
    shortcut: "ctrl t",
  },

  forceVictory: {
    shortcut: "ctrl v",
  },

  forceDefeat: {
    shortcut: "ctrl d",
  },

  forceEscape: {
    shortcut: "ctrl e",
  },

  toggleNoClip: {
    shortcut: "alt w",
  },

  toggleMouseTeleport: {
    shortcut: "alt m",
  },

  enemyWound: {
    shortcut: "alt s",
  },

  enemyRecovery: {
    shortcut: "alt a",
  },

  partyWound: {
    shortcut: "alt d",
  },

  partyRecovery: {
    shortcut: "alt z",
  },

  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((obj, speed) => {
    obj[`setSpeed${speed}`] = {
      shortcut: `alt ${speed}`,
    };
    return obj;
  }, {}),

  skipMessage: {
    shortcut: "",
    param: {
      accelerate: 1,
    },
  },

  openDevTool: {
    shortcut: "f12",
  },
};

export function isInValueInRange(value, lowerBound, upperBound) {
  try {
    value = Number(value);
  } catch (err) {
    return "Value must be a number";
  }

  if (isNaN(value) || !Number.isInteger(value)) {
    return "Value must be a number";
  }

  if (value < lowerBound || upperBound < value) {
    return `Value must be between [${lowerBound}, ${upperBound}]`;
  }

  return false;
}

export const shortcutConfig = {
  toggleCheatModal: {
    name: "Toggle cheat window",
    desc: "Key mapping required",
    necessary: true,
    enterAction(param) {
      GeneralCheat.toggleCheatModal();
    },
  },

  toggleCheatModalToSaveLocationComponent: {
    name: 'Toggle "Save Locations" tab',
    desc: "",
    enterAction(param) {
      GeneralCheat.toggleCheatModal("save-recall-panel");
    },
  },

  toggleCheatModalToMapEventComponent: {
    name: 'Toggle "Map Events" tab',
    desc: "",
    enterAction(param) {
      GeneralCheat.toggleCheatModal("map-event-panel");
    },
  },

  quickSave: {
    name: "Quick save",
    desc: "Quick save to certain slot",
    param: {
      slot: {
        name: "Slot",
        desc: "Slot for saved",
        isInvalidValue(value) {
          return isInValueInRange(value, 1, DataManager.maxSavefiles());
        },
        convertValue(value) {
          return Number(value);
        },
      },
    },
    enterAction(param) {
      SceneCheat.quickSave(param.slot);
    },
  },

  quickLoad: {
    name: "Quick load",
    desc: "Quick load from certain slot",
    param: {
      slot: {
        name: "Slot",
        desc: "Slot for loaded",
        isInvalidValue(value) {
          return isInValueInRange(value, 1, DataManager.maxSavefiles());
        },
        convertValue(value) {
          return Number(value);
        },
      },
    },
    enterAction(param) {
      SceneCheat.quickLoad(param.slot);
    },
  },

  openSaveScene: {
    name: "Open save scene",
    desc: "",
    enterAction(param) {
      SceneCheat.toggleSaveScene();
    },
  },

  openLoadScene: {
    name: "Open load scene",
    desc: "",
    enterAction(param) {
      SceneCheat.toggleLoadScene();
    },
  },

  gotoTitle: {
    name: "Go to title",
    desc: "",
    enterAction(param) {
      SceneCheat.gotoTitle();
    },
  },

  forceVictory: {
    name: "Force victory from battle",
    desc: "",
    enterAction(param) {
      BattleCheat.victory();
    },
  },

  forceDefeat: {
    name: "Force defeat from battle",
    desc: "",
    enterAction(param) {
      BattleCheat.defeat();
    },
  },

  forceEscape: {
    name: "Force escape from battle",
    desc: "",
    enterAction(param) {
      BattleCheat.escape();
    },
  },

  toggleNoClip: {
    name: "Toggle no clip",
    desc: "",
    enterAction(param) {
      GeneralCheat.toggleNoClip(true);
    },
  },

  toggleMouseTeleport: {
    name: "Toggle mouse teleport",
    desc: "Teleport to mouse location on click when enabled",
    enterAction(param) {
      GeneralCheat.toggleMouseTeleport();
    },
  },

  enemyWound: {
    name: "Set enemies HP to 1",
    desc: "",
    enterAction(param) {
      BattleCheat.changeAllEnemyHealth(1);
    },
  },

  enemyRecovery: {
    name: "Recover all enemies",
    desc: "Fill HP/MP to max",
    enterAction(param) {
      BattleCheat.recoverAllEnemy();
    },
  },

  partyWound: {
    name: "Set party HP to 1",
    desc: "",
    enterAction(param) {
      BattleCheat.changeAllPartyHealth(1);
    },
  },

  partyRecovery: {
    name: "Recover all party",
    desc: "Fill HP/MP to max",
    enterAction(param) {
      BattleCheat.recoverAllParty();
    },
  },

  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((obj, speed) => {
    obj[`setSpeed${speed}`] = {
      name: `Set speed to ${speed}`,
      desc: `Set move speed to ${speed}`,
      enterAction() {
        SpeedCheat.removeFixSpeedInterval();
        SpeedCheat.setSpeed(speed);
      },
    };
    return obj;
  }, {}),

  skipMessage: {
    name: "Skip Message",
    desc: "",
    combiningKeyAlone: true,
    param: {
      accelerate: {
        name: "Accelerate game speed",
        desc: "Accelerate game speed while skipping message",
        isInvalidValue(value) {
          return isInValueInRange(value, 1, 50);
        },
        convertValue(value) {
          return Number(value);
        },
      },
    },
    enterAction(param) {
      MessageCheat.startSkip(param.accelerate);
    },

    leaveAction(param) {
      MessageCheat.stopSkip();
    },
  },

  openDevTool: {
    name: "Open dev tool",
    desc: "Open Chromium dev tool",
    enterAction(param) {
      if (isDesktopRuntime()) {
        /** @type {any} */ (require("nw.gui")).Window.get().showDevTools();
      }
    },
  },
};

export class ShortcutConfig {
  constructor(id, config) {
    this.id = id;

    const fields = [
      "name",
      "desc",
      "necessary",
      "combiningKeyAlone",
      "param",
      "enterAction",
      "repeatAction",
      "leaveAction",
    ];

    for (const field of fields) {
      this[field] = config[field];
    }

    if (!this.necessary) this.necessary = false;
    if (!this.combiningKeyAlone) this.combiningKeyAlone = false;
    if (!this.param) this.param = {};
    if (!this.enterAction) this.enterAction = (param) => {};
    if (!this.repeatAction) this.repeatAction = (param) => {};
    if (!this.leaveAction) this.leaveAction = (param) => {};
  }

  getEnterAction(shortcutSetting) {
    return () => {
      this.enterAction(shortcutSetting.param);
    };
  }

  getRepeatAction(shortcutSetting) {
    return () => {
      this.repeatAction(shortcutSetting.param);
    };
  }

  getLeaveAction(shortcutSetting) {
    return () => {
      this.leaveAction(shortcutSetting.param);
    };
  }
}

/**
 * @param {Record<string, any>} src
 * @returns {Record<string, any>}
 */
export function parseStringToKeyObject(src) {
  const ret = cloneObject(src);

  for (const key of Object.keys(src)) {
    ret[key].shortcut = Key.fromString(src[key].shortcut);
  }

  return ret;
}

/**
 * @param {Record<string, any>} src
 * @returns {Record<string, any>}
 */
export function parseKeyObjectToString(src) {
  const ret = cloneObject(src);

  for (const key of Object.keys(src)) {
    ret[key].shortcut = src[key].shortcut.asString();
  }

  return ret;
}
