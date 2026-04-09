// @ts-check

import { TRANSLATION_BANK, TRANSLATE_SETTINGS } from "../../TranslateHelper.js";

/**
 * @param {Array<CheatDataEntry | null> | undefined} dataArray
 * @param {string} targetKey
 * @param {Record<string, boolean>} targets
 * @returns {number}
 */
function patchDataArray(dataArray, targetKey, targets) {
  if (!targets[targetKey] || !dataArray) return 0;
  let count = 0;
  for (const item of dataArray) {
    if (!item) continue;

    if (item.name && typeof item.name === "string" && item.name.trim()) {
      const cached = TRANSLATION_BANK.get(item.name);
      if (cached) {
        if (!item._originalName) {
          item._originalName = item.name;
        }
        item.name = cached.translated;
        count++;
      }
    }

    if (
      item.description &&
      typeof item.description === "string" &&
      item.description.trim()
    ) {
      const cached = TRANSLATION_BANK.get(item.description);
      if (cached) {
        if (!item._originalDescription) {
          item._originalDescription = item.description;
        }
        item.description = cached.translated;
        count++;
      }
    }

    if (
      item.nickname &&
      typeof item.nickname === "string" &&
      item.nickname.trim()
    ) {
      const cached = TRANSLATION_BANK.get(item.nickname);
      if (cached) {
        if (!item._originalNickname) {
          item._originalNickname = item.nickname;
        }
        item.nickname = cached.translated;
        count++;
      }
    }

    if (
      item.profile &&
      typeof item.profile === "string" &&
      item.profile.trim()
    ) {
      const cached = TRANSLATION_BANK.get(item.profile);
      if (cached) {
        if (!item._originalProfile) {
          item._originalProfile = item.profile;
        }
        item.profile = cached.translated;
        count++;
      }
    }

    for (let m = 1; m <= 4; m++) {
      const msgKey = `message${m}`;
      if (
        item[msgKey] &&
        typeof item[msgKey] === "string" &&
        item[msgKey].trim()
      ) {
        const cached = TRANSLATION_BANK.get(item[msgKey]);
        if (cached) {
          if (!item[`_original_${msgKey}`]) {
            item[`_original_${msgKey}`] = item[msgKey];
          }
          item[msgKey] = cached.translated;
          count++;
        }
      }
    }
  }

  return count;
}

/**
 * @returns {number}
 */
function patchSystemTerms() {
  let count = 0;
  const sys = window.$dataSystem;
  if (!sys) {
    return count;
  }

  if (sys.terms && sys.terms.basic) {
    if (!sys._originalTermsBasic) {
      sys._originalTermsBasic = sys.terms.basic.slice();
    }
    for (let i = 0; i < sys.terms.basic.length; i++) {
      const text = sys.terms.basic[i];
      if (text && typeof text === "string" && text.trim()) {
        const cached = TRANSLATION_BANK.get(text);
        if (cached) {
          sys.terms.basic[i] = cached.translated;
          count++;
        }
      }
    }
  }

  if (sys.terms && sys.terms.commands) {
    if (!sys._originalTermsCommands) {
      sys._originalTermsCommands = sys.terms.commands.slice();
    }
    for (let i = 0; i < sys.terms.commands.length; i++) {
      const text = sys.terms.commands[i];
      if (text && typeof text === "string" && text.trim()) {
        const cached = TRANSLATION_BANK.get(text);
        if (cached) {
          sys.terms.commands[i] = cached.translated;
          count++;
        }
      }
    }
  }

  if (sys.terms && sys.terms.params) {
    if (!sys._originalTermsParams) {
      sys._originalTermsParams = sys.terms.params.slice();
    }
    for (let i = 0; i < sys.terms.params.length; i++) {
      const text = sys.terms.params[i];
      if (text && typeof text === "string" && text.trim()) {
        const cached = TRANSLATION_BANK.get(text);
        if (cached) {
          sys.terms.params[i] = cached.translated;
          count++;
        }
      }
    }
  }

  if (sys.terms && sys.terms.messages) {
    if (!sys._originalTermsMessages) {
      sys._originalTermsMessages = Object.assign({}, sys.terms.messages);
    }
    for (const key in sys.terms.messages) {
      const text = sys.terms.messages[key];
      if (text && typeof text === "string" && text.trim()) {
        const cached = TRANSLATION_BANK.get(text);
        if (cached) {
          sys.terms.messages[key] = cached.translated;
          count++;
        }
      }
    }
  }

  if (sys.gameTitle) {
    const cached = TRANSLATION_BANK.get(sys.gameTitle);
    if (cached) {
      if (!sys._originalGameTitle) sys._originalGameTitle = sys.gameTitle;
      sys.gameTitle = cached.translated;
      count++;
    }
  }

  const typeArrays = ["armorTypes", "weaponTypes", "skillTypes", "elements"];
  for (const arrayName of typeArrays) {
    if (sys[arrayName]) {
      if (!sys[`_original_${arrayName}`]) {
        sys[`_original_${arrayName}`] = sys[arrayName].slice();
      }
      for (let i = 0; i < sys[arrayName].length; i++) {
        const text = sys[arrayName][i];
        if (text && typeof text === "string" && text.trim()) {
          const cached = TRANSLATION_BANK.get(text);
          if (cached) {
            sys[arrayName][i] = cached.translated;
            count++;
          }
        }
      }
    }
  }

  return count;
}

export function applyTranslationsToGameData() {
  if (!TRANSLATE_SETTINGS.isEnabled()) return 0;

  const targets = TRANSLATE_SETTINGS.getTargets();
  let patchCount = 0;

  if (window.$dataItems)
    patchCount += patchDataArray(window.$dataItems, "items", targets);
  if (window.$dataWeapons)
    patchCount += patchDataArray(window.$dataWeapons, "weapons", targets);
  if (window.$dataArmors)
    patchCount += patchDataArray(window.$dataArmors, "armors", targets);
  if (window.$dataSkills)
    patchCount += patchDataArray(window.$dataSkills, "skills", targets);
  if (window.$dataStates)
    patchCount += patchDataArray(window.$dataStates, "states", targets);
  if (window.$dataClasses)
    patchCount += patchDataArray(window.$dataClasses, "classes", targets);
  if (window.$dataEnemies)
    patchCount += patchDataArray(window.$dataEnemies, "enemies", targets);

  if (window.$dataActors && targets.actors) {
    patchCount += patchDataArray(window.$dataActors, "actors", targets);
  }

  if (window.$dataMapInfos && targets.maps) {
    for (const mapInfo of window.$dataMapInfos) {
      if (!mapInfo || !mapInfo.name) continue;
      const cached = TRANSLATION_BANK.get(mapInfo.name);
      if (cached) {
        if (!mapInfo._originalName) {
          mapInfo._originalName = mapInfo.name;
        }
        mapInfo.name = cached.translated;
        patchCount++;
      }
    }
  }

  if (window.$dataSystem && targets.system) {
    patchCount += patchSystemTerms();
  }

  if (window.$dataSystem) {
    if (targets.variables && window.$dataSystem.variables) {
      for (let i = 0; i < window.$dataSystem.variables.length; i++) {
        const name = window.$dataSystem.variables[i];
        if (name && typeof name === "string" && name.trim()) {
          const cached = TRANSLATION_BANK.get(name);
          if (cached) {
            if (!window.$dataSystem._originalVariables) {
              window.$dataSystem._originalVariables =
                window.$dataSystem.variables.slice();
            }
            window.$dataSystem.variables[i] = cached.translated;
            patchCount++;
          }
        }
      }
    }

    if (targets.switches && window.$dataSystem.switches) {
      for (let i = 0; i < window.$dataSystem.switches.length; i++) {
        const name = window.$dataSystem.switches[i];
        if (name && typeof name === "string" && name.trim()) {
          const cached = TRANSLATION_BANK.get(name);
          if (cached) {
            if (!window.$dataSystem._originalSwitches) {
              window.$dataSystem._originalSwitches =
                window.$dataSystem.switches.slice();
            }
            window.$dataSystem.switches[i] = cached.translated;
            patchCount++;
          }
        }
      }
    }
  }

  window.dispatchEvent(
    new CustomEvent("cheat-data-patched", { detail: { patchCount } }),
  );
  return patchCount;
}

/**
 * @param {Array<CheatDataEntry | null> | undefined} dataArray
 * @returns {void}
 */
function revertDataArray(dataArray) {
  if (!dataArray) return;
  for (const item of dataArray) {
    if (!item) continue;
    if (item._originalName) {
      item.name = item._originalName;
      delete item._originalName;
    }
    if (item._originalDescription) {
      item.description = item._originalDescription;
      delete item._originalDescription;
    }
    if (item._originalNickname) {
      item.nickname = item._originalNickname;
      delete item._originalNickname;
    }
    if (item._originalProfile) {
      item.profile = item._originalProfile;
      delete item._originalProfile;
    }
    for (let m = 1; m <= 4; m++) {
      const key = `_original_message${m}`;
      if (item[key]) {
        item[`message${m}`] = item[key];
        delete item[key];
      }
    }
  }
}

export function revertGameData() {
  revertDataArray(window.$dataItems);
  revertDataArray(window.$dataWeapons);
  revertDataArray(window.$dataArmors);
  revertDataArray(window.$dataSkills);
  revertDataArray(window.$dataStates);
  revertDataArray(window.$dataClasses);
  revertDataArray(window.$dataEnemies);
  revertDataArray(window.$dataActors);

  if (window.$dataMapInfos) {
    for (const mapInfo of window.$dataMapInfos) {
      if (mapInfo && mapInfo._originalName) {
        mapInfo.name = mapInfo._originalName;
        delete mapInfo._originalName;
      }
    }
  }

  if (window.$dataSystem) {
    const sys = window.$dataSystem;
    if (sys._originalTermsBasic) {
      sys.terms.basic = sys._originalTermsBasic;
      delete sys._originalTermsBasic;
    }
    if (sys._originalTermsCommands) {
      sys.terms.commands = sys._originalTermsCommands;
      delete sys._originalTermsCommands;
    }
    if (sys._originalTermsParams) {
      sys.terms.params = sys._originalTermsParams;
      delete sys._originalTermsParams;
    }
    if (sys._originalTermsMessages) {
      sys.terms.messages = sys._originalTermsMessages;
      delete sys._originalTermsMessages;
    }
    if (sys._originalGameTitle) {
      sys.gameTitle = sys._originalGameTitle;
      delete sys._originalGameTitle;
    }
    if (sys._originalVariables) {
      sys.variables = sys._originalVariables;
      delete sys._originalVariables;
    }
    if (sys._originalSwitches) {
      sys.switches = sys._originalSwitches;
      delete sys._originalSwitches;
    }

    const typeArrays = ["armorTypes", "weaponTypes", "skillTypes", "elements"];
    for (const arrayName of typeArrays) {
      if (sys[`_original_${arrayName}`]) {
        sys[arrayName] = sys[`_original_${arrayName}`];
        delete sys[`_original_${arrayName}`];
      }
    }
  }
}
