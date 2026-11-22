export const LOCATION_TAGS = Object.freeze([
  {
    value: "Boss Area",
    icon: "mdi-sword-cross",
    color: "#fb7185",
    symbol: "boss",
  },
  { value: "Shop", icon: "mdi-shopping", color: "#38bdf8", symbol: "shop" },
  {
    value: "Checkpoint",
    icon: "mdi-map-marker",
    color: "#34d399",
    symbol: "flag",
  },
  { value: "NPC", icon: "mdi-account", color: "#a5b4fc", symbol: "person" },
  { value: "Farm Spot", icon: "mdi-cached", color: "#a3e635", symbol: "leaf" },
  {
    value: "Danger Zone",
    icon: "mdi-alert",
    color: "#fb923c",
    symbol: "danger",
  },
]);
export function locationStyle(flags) {
  return (
    LOCATION_TAGS.find((tag) => (flags || []).includes(tag.value)) || {
      value: "Saved point",
      icon: "mdi-tag-outline",
      color: "#fbbf24",
      symbol: "bookmark",
    }
  );
}

function normalized(row, index) {
  if (
    !row ||
    !Number.isInteger(row.mapId) ||
    row.mapId < 1 ||
    !Number.isInteger(row.x) ||
    !Number.isInteger(row.y) ||
    row.x < 0 ||
    row.y < 0
  )
    return null;
  return {
    id: typeof row.id === "string" && row.id ? row.id : "legacy-" + index,
    name: String(row.name || "Saved point"),
    mapId: row.mapId,
    x: row.x,
    y: row.y,
    flags: Array.isArray(row.flags)
      ? row.flags.filter((flag) => typeof flag === "string")
      : [],
  };
}

export function createLocationStore(storage, notify = () => {}) {
  const key = "cheat.locations";
  function read() {
    try {
      const rows = JSON.parse(storage.getItem(key) || "[]");
      return Array.isArray(rows) ? rows.map(normalized).filter(Boolean) : [];
    } catch (error) {
      return [];
    }
  }
  function write(rows) {
    storage.setItem(key, JSON.stringify(rows));
    notify();
  }
  return {
    read,
    add(input, dimensions) {
      const rows = read();
      let id =
        "point-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 9);
      while (rows.some((row) => row.id === id)) id += "x";
      const row = normalized(Object.assign({}, input, { id }), rows.length);
      if (!row) throw Error("Invalid saved location.");
      if (
        dimensions &&
        (!Number.isInteger(dimensions.width) ||
          !Number.isInteger(dimensions.height) ||
          dimensions.width < 1 ||
          dimensions.height < 1 ||
          row.x >= dimensions.width ||
          row.y >= dimensions.height)
      ) {
        throw Error("Choose a point inside the map.");
      }
      write(rows.concat([row]));
      return row;
    },
    remove(id) {
      write(read().filter((row) => row.id !== id));
    },
  };
}
