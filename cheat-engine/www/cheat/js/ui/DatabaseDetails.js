const TABLES = {
  item: "$dataItems",
  weapon: "$dataWeapons",
  armor: "$dataArmors",
  skill: "$dataSkills",
  class: "$dataClasses",
  state: "$dataStates",
  enemy: "$dataEnemies",
};
export const TRAIT_LABELS = {
  11: "Element Rate",
  12: "Debuff Rate",
  13: "State Rate",
  14: "State Resist",
  21: "Parameter Rate",
  22: "Extra Parameter",
  23: "Special Parameter",
  31: "Attack Element",
  32: "Attack State",
  33: "Attack Speed",
  34: "Attack Times",
  41: "Add Skill Type",
  42: "Seal Skill Type",
  43: "Add Skill",
  44: "Seal Skill",
  51: "Equip Weapon Type",
  52: "Equip Armor Type",
  53: "Lock Equipment",
  54: "Seal Equipment",
  55: "Slot Type",
  61: "Extra Action Chance",
  62: "Special Flag",
  63: "Collapse Type",
  64: "Party Ability",
};
export const EFFECT_LABELS = {
  11: "Recover HP",
  12: "Recover MP",
  13: "Gain TP",
  21: "Add State",
  22: "Remove State",
  31: "Add Buff",
  32: "Add Debuff",
  33: "Remove Buff",
  34: "Remove Debuff",
  41: "Special Effect",
  42: "Grow Parameter",
  43: "Learn Skill",
  44: "Common Event",
};
const PARAMS = [
  "Max HP",
  "Max MP",
  "Attack",
  "Defense",
  "Magic",
  "Magic Defense",
  "Agility",
  "Luck",
];
const XPARAMS = [
  "Hit",
  "Evasion",
  "Critical",
  "Critical Evasion",
  "Magic Evasion",
  "Magic Reflection",
  "Counter",
  "HP Regen",
  "MP Regen",
  "TP Regen",
];
const SPARAMS = [
  "Target Rate",
  "Guard",
  "Recovery",
  "Item Effect",
  "MP Cost",
  "TP Charge",
  "Physical Damage",
  "Magic Damage",
  "Floor Damage",
  "EXP Rate",
];
const percent = (value) => Math.round(Number(value) * 10000) / 100 + "%";
export function databaseParamNames(game) {
  return (
    (game.$dataSystem &&
      game.$dataSystem.terms &&
      game.$dataSystem.terms.params) ||
    PARAMS
  );
}
export function formatTrait(game, row) {
  const system = game.$dataSystem || {};
  let target = "#" + row.dataId;
  const table = {
    13: "$dataStates",
    14: "$dataStates",
    32: "$dataStates",
    43: "$dataSkills",
    44: "$dataSkills",
  }[row.code];
  if (table)
    target =
      game[table] && game[table][row.dataId]
        ? game[table][row.dataId].name
        : target;
  else if ([12, 21].includes(row.code))
    target = databaseParamNames(game)[row.dataId] || target;
  else if (row.code === 22) target = XPARAMS[row.dataId] || target;
  else if (row.code === 23) target = SPARAMS[row.dataId] || target;
  else {
    const names = {
      11: "elements",
      31: "elements",
      41: "skillTypes",
      42: "skillTypes",
      51: "weaponTypes",
      52: "armorTypes",
      53: "equipTypes",
      54: "equipTypes",
    }[row.code];
    if (names && system[names]) target = system[names][row.dataId] || target;
  }
  const rate = [11, 12, 13, 21, 22, 23, 32, 61].includes(row.code);
  return (
    (TRAIT_LABELS[row.code] || "Trait " + row.code) +
    ": " +
    target +
    " = " +
    (rate ? percent(row.value) : row.value)
  );
}
export function formatEffect(game, row) {
  let details = "";
  if ([11, 12].includes(row.code))
    details = percent(row.value1) + (row.value2 ? " + " + row.value2 : "");
  else if ([21, 22].includes(row.code))
    details =
      (game.$dataStates && game.$dataStates[row.dataId]
        ? game.$dataStates[row.dataId].name
        : row.dataId === 0
          ? "Normal attack states"
          : "#" + row.dataId) +
      " " +
      percent(row.value1);
  else if (row.code === 43)
    details =
      game.$dataSkills && game.$dataSkills[row.dataId]
        ? game.$dataSkills[row.dataId].name
        : "#" + row.dataId;
  else if (row.code === 44)
    details =
      game.$dataCommonEvents && game.$dataCommonEvents[row.dataId]
        ? game.$dataCommonEvents[row.dataId].name
        : "#" + row.dataId;
  else if ([31, 32, 33, 34, 42].includes(row.code))
    details =
      (databaseParamNames(game)[row.dataId] || "#" + row.dataId) +
      " " +
      row.value1;
  else details = String(row.value1 || 0);
  return (EFFECT_LABELS[row.code] || "Effect " + row.code) + ": " + details;
}
/** All output is text-only view data; the live record never enters Vue. */
export function readDatabaseDetails(game, kind, id) {
  const table = Object.prototype.hasOwnProperty.call(TABLES, kind)
    ? game[TABLES[kind]]
    : null;
  const record = table && table[id];
  if (!record) return null;
  const sections = [];
  const add = (title, lines) => {
    if (lines.length)
      sections.push({
        title,
        lines: lines.slice(0, 128).map((line) => String(line).slice(0, 8192)),
      });
  };
  if (
    ["item", "weapon", "armor"].includes(kind) &&
    typeof record.price === "number"
  )
    add("Price", [
      record.price +
        " " +
        ((game.$dataSystem && game.$dataSystem.currencyUnit) || "Gold"),
    ]);
  if (Array.isArray(record.params))
    add(
      "Parameters",
      record.params.map((value, i) => {
        const label = databaseParamNames(game)[i] || PARAMS[i];
        return Array.isArray(value)
          ? label +
              ": Lv1 " +
              value[1] +
              " / Lv" +
              (value.length - 1) +
              " " +
              value[value.length - 1]
          : label + ": " + value;
      }),
    );
  if (kind === "skill") {
    add("Skill", [
      "MP " + (record.mpCost || 0) + " / TP " + (record.tpCost || 0),
      "Success " + record.successRate + "% / Repeats " + (record.repeats || 1),
    ]);
    if (record.damage && record.damage.type)
      add("Damage", [
        "Type " +
          record.damage.type +
          " / Element " +
          (game.$dataSystem && game.$dataSystem.elements
            ? game.$dataSystem.elements[record.damage.elementId] ||
              record.damage.elementId
            : record.damage.elementId),
        "Formula: " + record.damage.formula,
        "Variance " + record.damage.variance + "%",
      ]);
  }
  if (record.expParams)
    add("EXP Curve", [
      "Base " +
        record.expParams[0] +
        ", Extra " +
        record.expParams[1] +
        ", Acceleration " +
        record.expParams[2] +
        "/" +
        record.expParams[3],
    ]);
  if (record.learnings)
    add(
      "Level-up Skills",
      record.learnings.map(
        (row) =>
          "Lv" +
          row.level +
          ": " +
          (game.$dataSkills && game.$dataSkills[row.skillId]
            ? game.$dataSkills[row.skillId].name
            : "#" + row.skillId),
      ),
    );
  if (record.traits)
    add(
      "Traits",
      record.traits.map((row) => formatTrait(game, row)),
    );
  if (record.effects)
    add(
      "Effects",
      record.effects.map((row) => formatEffect(game, row)),
    );
  if (kind === "enemy") {
    add("Base Rewards", [
      "EXP " + (record.exp || 0),
      "Gold " + (record.gold || 0),
    ]);
    add(
      "Base Drops",
      (record.dropItems || [])
        .filter((drop) => drop.kind > 0)
        .map((drop) => {
          const tables = {
            1: game.$dataItems,
            2: game.$dataWeapons,
            3: game.$dataArmors,
          };
          const item = tables[drop.kind] && tables[drop.kind][drop.dataId];
          return (
            (item ? item.name : "Unknown #" + drop.dataId) +
            " - " +
            (drop.denominator > 0
              ? (100 / drop.denominator).toFixed(1) + "%"
              : "Unknown chance")
          );
        }),
    );
    if (record.actions)
      add(
        "Actions",
        record.actions.map(
          (row) =>
            (game.$dataSkills && game.$dataSkills[row.skillId]
              ? game.$dataSkills[row.skillId].name
              : "Skill #" + row.skillId) +
            " / Rating " +
            row.rating,
        ),
      );
  }
  if (kind === "state")
    add("Status", [
      "Duration " +
        (record.minTurns || 0) +
        ".." +
        (record.maxTurns || 0) +
        " turns",
      "Restriction " + (record.restriction || 0),
    ]);
  return {
    title: String(record.name || "#" + id),
    id: Number(id),
    kind,
    description: String(
      record.description ||
        (record.meta && typeof record.meta.Description === "string"
          ? record.meta.Description
          : ""),
    ).slice(0, 8192),
    sections,
  };
}
