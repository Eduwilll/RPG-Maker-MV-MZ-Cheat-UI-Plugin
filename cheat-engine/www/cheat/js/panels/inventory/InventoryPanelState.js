// @ts-check

import { buildTranslatedNameDescRow } from "../PanelTranslation.js";

const DEFAULT_PARAM_NAMES = [
  "MHP",
  "MMP",
  "ATK",
  "DEF",
  "MAT",
  "MDF",
  "AGI",
  "LUK",
];

/**
 * @template T
 * @param {Array<T> | null | undefined} items
 * @returns {Array<T>}
 */
export function readInventoryPanelItems(items) {
  return Array.isArray(items) ? items.slice() : [];
}

/**
 * @param {(DataItem | DataWeapon | DataArmor) & { price?: number, params?: number[], effects?: Array<any> }} item
 * @param {boolean} isTranslated
 */
export function buildInventoryTableRow(item, isTranslated) {
  return {
    ...buildTranslatedNameDescRow(item, isTranslated),
    params: formatInventoryParams(item),
    paramsSort: getInventoryParamSortValue(item),
    effects: formatInventoryEffects(item),
    effectsSort: getInventoryEffectSortValue(item),
    price: typeof item.price === "number" ? item.price : 0,
  };
}

/**
 * @returns {string[]}
 */
function getInventoryParamNames() {
  const names =
    $dataSystem && $dataSystem.terms && Array.isArray($dataSystem.terms.params)
      ? $dataSystem.terms.params
      : null;

  return names && names.length === DEFAULT_PARAM_NAMES.length
    ? names
    : DEFAULT_PARAM_NAMES;
}

/**
 * @param {{ params?: number[] }} item
 * @returns {string}
 */
function formatInventoryParams(item) {
  if (!Array.isArray(item.params)) {
    return "";
  }

  const paramNames = getInventoryParamNames();
  const parts = item.params
    .map((value, index) => {
      if (!value) {
        return "";
      }

      const sign = value > 0 ? "+" : "";
      return `${paramNames[index] || DEFAULT_PARAM_NAMES[index] || `P${index}`}: ${sign}${value}`;
    })
    .filter(Boolean);

  return parts.join(", ");
}

/**
 * @param {{ params?: number[] }} item
 * @returns {number}
 */
function getInventoryParamSortValue(item) {
  if (!Array.isArray(item.params)) {
    return 0;
  }

  return item.params.reduce((maxValue, value) => {
    const numericValue = Math.abs(Number(value) || 0);
    return numericValue > maxValue ? numericValue : maxValue;
  }, 0);
}

/**
 * @param {{ effects?: Array<any> }} item
 * @returns {string}
 */
function formatInventoryEffects(item) {
  if (!Array.isArray(item.effects)) {
    return "";
  }

  const parts = item.effects
    .map((effect) => formatItemEffect(effect))
    .filter(Boolean);

  return parts.join(", ");
}

/**
 * @param {{ effects?: Array<any> }} item
 * @returns {number}
 */
function getInventoryEffectSortValue(item) {
  if (!Array.isArray(item.effects)) {
    return 0;
  }

  return item.effects.reduce((maxValue, effect) => {
    const numericValue = getItemEffectSortValue(effect);
    return numericValue > maxValue ? numericValue : maxValue;
  }, 0);
}

/**
 * @param {{ code?: number, dataId?: number, value1?: number, value2?: number }} effect
 * @returns {string}
 */
function formatItemEffect(effect) {
  if (!effect || typeof effect.code !== "number") {
    return "";
  }

  switch (effect.code) {
    case 11:
      return formatRecoveryEffect("HP", effect);
    case 12:
      return formatRecoveryEffect("MP", effect);
    case 13:
      return effect.value1 ? `TP +${Math.round(effect.value1)}` : "";
    case 21:
      return formatStateEffect("Add State", effect.dataId, effect.value1);
    case 22:
      return formatStateEffect("Remove State", effect.dataId, effect.value1);
    case 31:
      return formatParamEffect("Buff", effect.dataId, effect.value1);
    case 32:
      return formatParamEffect("Debuff", effect.dataId, effect.value1);
    case 33:
      return formatParamEffect("Clear Buff", effect.dataId, effect.value1);
    case 34:
      return formatParamEffect("Clear Debuff", effect.dataId, effect.value1);
    case 41:
      return "Special: Escape";
    case 42:
      return formatGrowthEffect(effect.dataId, effect.value1);
    case 43:
      return formatSkillEffect(effect.dataId);
    case 44:
      return effect.dataId ? `Common Event #${effect.dataId}` : "Common Event";
    default:
      return `Effect #${effect.code}`;
  }
}

/**
 * @param {{ code?: number, dataId?: number, value1?: number, value2?: number }} effect
 * @returns {number}
 */
function getItemEffectSortValue(effect) {
  if (!effect || typeof effect.code !== "number") {
    return 0;
  }

  switch (effect.code) {
    case 11:
    case 12:
      return Math.max(
        Math.abs(Math.round((effect.value1 || 0) * 100)),
        Math.abs(Math.round(effect.value2 || 0)),
      );
    case 13:
      return Math.abs(Math.round(effect.value1 || 0));
    case 21:
    case 22:
      return Math.abs(Math.round((effect.value1 || 0) * 100));
    case 31:
    case 32:
    case 33:
    case 34:
      return Math.abs(Math.round(effect.value1 || 0));
    case 42:
      return Math.abs(Math.round(effect.value1 || 0));
    default:
      return 0;
  }
}

/**
 * @param {"HP" | "MP"} label
 * @param {{ value1?: number, value2?: number }} effect
 * @returns {string}
 */
function formatRecoveryEffect(label, effect) {
  const parts = [];
  if (effect.value1) {
    parts.push(`${Math.round(effect.value1 * 100)}%`);
  }
  if (effect.value2) {
    const flatValue = Math.round(effect.value2);
    const sign = flatValue > 0 ? "+" : "";
    parts.push(`${sign}${flatValue}`);
  }

  return parts.length ? `${label} ${parts.join(" + ")}` : "";
}

/**
 * @param {string} prefix
 * @param {number | undefined} stateId
 * @param {number | undefined} chance
 * @returns {string}
 */
function formatStateEffect(prefix, stateId, chance) {
  const stateName =
    stateId && $dataStates && $dataStates[stateId] && $dataStates[stateId].name
      ? $dataStates[stateId].name
      : stateId
        ? `#${stateId}`
        : "";

  const chanceText =
    typeof chance === "number" && chance > 0
      ? ` ${Math.round(chance * 100)}%`
      : "";

  return stateName ? `${prefix}: ${stateName}${chanceText}` : prefix;
}

/**
 * @param {string} prefix
 * @param {number | undefined} paramId
 * @param {number | undefined} turns
 * @returns {string}
 */
function formatParamEffect(prefix, paramId, turns) {
  const paramName =
    getInventoryParamNames()[paramId || 0] || `P${paramId || 0}`;
  const turnText =
    typeof turns === "number" && turns > 0 ? ` ${Math.round(turns)}t` : "";
  return `${prefix}: ${paramName}${turnText}`;
}

/**
 * @param {number | undefined} paramId
 * @param {number | undefined} amount
 * @returns {string}
 */
function formatGrowthEffect(paramId, amount) {
  const paramName =
    getInventoryParamNames()[paramId || 0] || `P${paramId || 0}`;
  const value = Math.round(amount || 0);
  const sign = value > 0 ? "+" : "";
  return `Grow: ${paramName} ${sign}${value}`;
}

/**
 * @param {number | undefined} skillId
 * @returns {string}
 */
function formatSkillEffect(skillId) {
  const skillName =
    skillId && $dataSkills && $dataSkills[skillId] && $dataSkills[skillId].name
      ? $dataSkills[skillId].name
      : skillId
        ? `#${skillId}`
        : "";

  return skillName ? `Learn: ${skillName}` : "Learn Skill";
}
