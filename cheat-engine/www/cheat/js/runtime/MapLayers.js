export const MAP_LAYER_DEFAULTS = {
  sprites: true,
  shadows: true,
  upperTiles: true,
  background: true,
  npcs: true,
  enemies: true,
  treasures: true,
  events: true,
  player: true,
  labels: false,
  grid: false,
  markerScale: 1,
};

function normalize(value) {
  const next = Object.assign({}, MAP_LAYER_DEFAULTS);
  Object.keys(next).forEach((key) => {
    if (key === "markerScale") {
      if (
        value &&
        typeof value[key] === "number" &&
        Number.isFinite(value[key])
      )
        next[key] = Math.max(0.5, Math.min(2, value[key]));
    } else if (value && typeof value[key] === "boolean") next[key] = value[key];
  });
  return next;
}

/** Game-owned cached preferences avoid disk reads during map rendering. */
export function createMapLayers(storage) {
  let value = normalize(null);
  try {
    value = normalize(JSON.parse(storage.getItem("map.layers") || "null"));
  } catch (error) {
    /* Keep old-safe defaults. */
  }
  return {
    read: () => Object.assign({}, value),
    write(key, next) {
      if (!Object.prototype.hasOwnProperty.call(MAP_LAYER_DEFAULTS, key))
        return;
      value = normalize(Object.assign({}, value, { [key]: next }));
      try {
        storage.setItem("map.layers", JSON.stringify(value));
      } catch (error) {
        /* Keep the current session usable. */
      }
    },
    reset() {
      value = normalize(null);
      try {
        storage.setItem("map.layers", JSON.stringify(value));
      } catch (error) {
        /* Keep session defaults. */
      }
    },
  };
}
