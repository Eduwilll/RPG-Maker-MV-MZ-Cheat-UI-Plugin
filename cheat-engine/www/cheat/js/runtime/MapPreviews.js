import { createMapArtwork } from "../panels/minimap/MapArtwork.js";
import { loadOptionalBitmap } from "./GameAssets.js";
export function createMapPreviews(game) {
  const cache = new Map();
  const artwork = createMapArtwork(game, (name) =>
    loadOptionalBitmap(game, { type: "tileset", name }),
  );
  async function load(id) {
    if (!Number.isInteger(id) || id < 1 || id > 999999)
      throw Error("Invalid map ID.");
    if (!cache.has(id)) {
      if (cache.size >= 4) cache.delete(cache.keys().next().value);
      const request = new Promise((resolve, reject) => {
        const xhr = new game.XMLHttpRequest();
        xhr.open(
          "GET",
          new URL(
            "data/Map" + String(id).padStart(3, "0") + ".json",
            game.location.href,
          ).href,
        );
        xhr.overrideMimeType("application/json");
        xhr.timeout = 10000;
        xhr.onload = () => {
          try {
            if (xhr.status >= 400)
              throw Error("Map file unavailable (" + xhr.status + ").");
            const data = JSON.parse(xhr.responseText);
            if (
              !Number.isInteger(data.width) ||
              !Number.isInteger(data.height) ||
              data.width < 1 ||
              data.height < 1 ||
              !Array.isArray(data.data)
            )
              throw Error("Invalid map data.");
            resolve(data);
          } catch (error) {
            reject(error);
          }
        };
        xhr.onerror = xhr.ontimeout = () =>
          reject(Error("Could not read map preview."));
        xhr.send();
      }).catch((error) => {
        cache.delete(id);
        throw error;
      });
      cache.set(id, request);
    }
    return cache.get(id);
  }
  return {
    load,
    render: (data, id) => artwork.render(data, id),
    status: artwork.status,
  };
}
