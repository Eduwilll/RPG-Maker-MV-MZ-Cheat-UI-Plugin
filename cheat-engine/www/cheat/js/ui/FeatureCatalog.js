const PANELS = [
  ["general", "General", "general-panel"],
  ["actors", "Actors", "actor-setting-panel"],
  ["battle", "HP/MP/Battle", "health-setting-panel"],
  ["stats", "Stats/Level", "stats-setting-panel"],
  ["items", "Items", "item-setting-panel"],
  ["weapons", "Weapons", "weapon-setting-panel"],
  ["armor", "Armor", "armor-setting-panel"],
  ["variables", "Variables", "variable-setting-panel"],
  ["switches", "Switches", "switch-setting-panel"],
  ["watch", "Watch", "watcher-panel"],
  ["locations", "Save Locations", "save-recall-panel"],
  ["map-events", "Map / Minimap", "map-event-panel"],
  ["analyzer", "Event Analyzer", "event-analyzer-panel"],
  ["teleport", "Teleport", "teleport-panel"],
  ["shortcuts", "Shortcuts", "shortcut-panel"],
  ["appearance", "Appearance", "appearance-panel"],
  ["translation", "Translation", "translate-settings-panel"],
  ["about", "About / Diagnostics", "about-panel"],
  ["enemy-editor", "Enemies", "enemy-editor-panel", "enemy"],
  ["skill-editor", "Skills", "skill-editor-panel", "skill"],
  ["class-editor", "Classes", "class-editor-panel", "class"],
  ["message-log", "Message Log", "message-log-panel"],
  ["locks", "Locks & Favorites", "locks-panel"],
  ["options", "Game Options", "game-options-panel"],
];
const SETTINGS = [
  [
    "floating-minimap",
    "Floating Minimap",
    "map-event-panel",
    "minimap map events overlay position size zoom",
  ],
  ["gold", "Gold", "general-panel", "money currency inventory lock"],
  ["no-clip", "No Clip", "general-panel", "walk walls collision"],
  [
    "mouse-controls",
    "Enable Mouse Controls",
    "general-panel",
    "click movement",
  ],
  ["mouse-teleport", "Mouse Teleport", "general-panel", "mouse tele"],
  ["game-speed", "Game Speed", "general-panel", "fast forward slow"],
  ["move-speed", "Move Speed", "general-panel", "walk run speed"],
  ["one-hit-kill", "One-Hit Kill", "health-setting-panel", "enemy damage kill"],
  [
    "random-encounters",
    "Disable Random Encounters",
    "health-setting-panel",
    "battle encounter",
  ],
  [
    "window-opacity",
    "Window Opacity",
    "appearance-panel",
    "transparent visibility",
  ],
  ["always-dash", "Always Dash", "game-options-panel", "run sprint options"],
  [
    "command-remember",
    "Remember Commands",
    "game-options-panel",
    "battle options",
  ],
  ["volume", "Volume", "game-options-panel", "music sound bgm bgs me se"],
  [
    "settings-profile",
    "Settings Backup",
    "game-options-panel",
    "profile import export restore",
  ],
  ["timer", "Timer Lock", "locks-panel", "freeze time countdown"],
];
function clone(entry) {
  return Object.assign({}, entry);
}
function normalized(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function createFeatureCatalog(settings, configs) {
  const rows = PANELS.map((entry) => ({
    id: entry[0],
    label: entry[1],
    panel: entry[2],
    kind: entry[3],
    type: "panel",
    description: "Open " + entry[1],
    keywords:
      entry[0] === "map-events"
        ? "map events npc characters realistic minimap"
        : "",
  }));
  SETTINGS.forEach((entry) =>
    rows.push({
      id: entry[0],
      label: entry[1],
      panel: entry[2],
      anchor: entry[0],
      keywords: entry[3],
      type: "setting",
    }),
  );
  Object.keys(configs || {}).forEach((id) => {
    const config = configs[id];
    const value = settings && settings[id] ? settings[id].shortcut : "";
    let shortcut = "";
    if (typeof value === "string") shortcut = value;
    else if (value && typeof value.asString === "function")
      shortcut = value.asString();
    rows.push({
      id: "shortcut-" + id,
      label: String(config.name || id),
      description: String(config.desc || ""),
      shortcut,
      panel: "shortcut-panel",
      anchor: "shortcut-" + id,
      type: "shortcut",
    });
  });
  return rows;
}
export function findFeature(id, entries) {
  const row = (entries || createFeatureCatalog()).find(
    (entry) => entry.id === id,
  );
  return row ? clone(row) : null;
}
export function searchFeatures(query, entries, limit) {
  const value = normalized(query);
  const words = value.split(" ").filter(Boolean);
  const max =
    limit === undefined ? 20 : Math.max(0, Math.min(50, Number(limit) || 0));
  return (entries || createFeatureCatalog())
    .map((row, index) => {
      const label = normalized(row.label);
      const haystack = normalized(
        [row.label, row.keywords, row.description, row.shortcut].join(" "),
      );
      const rank = !value
        ? 0
        : label === value
          ? 0
          : label.indexOf(value) === 0
            ? 1
            : normalized(row.keywords).includes(value) ||
                normalized(row.shortcut) === value
              ? 2
              : 3;
      return {
        row,
        index,
        rank,
        match: words.every((word) => haystack.includes(word)),
      };
    })
    .filter((entry) => entry.match)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, max)
    .map((entry) => clone(entry.row));
}
