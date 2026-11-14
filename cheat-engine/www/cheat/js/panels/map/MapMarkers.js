const COLORS = {
  npc: "#ffd700",
  enemy: "#ff8c00",
  treasure: "#0066ff",
  event: "#ffd700",
};

function kind(game, page, characterName) {
  const lists = [(page && page.list) || []],
    visited = new Set();
  let reward = false,
    budget = 2048;
  for (let i = 0; i < lists.length && budget > 0; i++) {
    const list = lists[i];
    for (let j = 0; j < list.length && budget-- > 0; j++) {
      const command = list[j];
      if (!command) continue;
      const args = command.parameters || [];
      if (command.code === 301) return "enemy";
      if (
        command.code >= 125 &&
        command.code <= 128 &&
        args[command.code === 125 ? 0 : 1] === 0
      )
        reward = true;
      if (command.code === 117 && !visited.has(args[0]) && visited.size < 64) {
        visited.add(args[0]);
        const common =
          game.$dataCommonEvents && game.$dataCommonEvents[args[0]];
        if (common && Array.isArray(common.list)) lists.push(common.list);
      }
    }
  }
  return reward ? "treasure" : characterName ? "npc" : "event";
}

/** Active-page hints only; do not guess that every moving person is an enemy. */
export function readMapMarkers(game) {
  const map = game && game.$gameMap;
  if (!map) return [];
  const source =
    typeof map.events === "function" ? map.events() : map._events || [];
  return source.reduce((rows, event) => {
    if (!event || event._erased || event._pageIndex === -1) return rows;
    try {
      const id =
        Number(event._eventId || (event.eventId && event.eventId())) || 0;
      const data =
        game.$dataMap && game.$dataMap.events && game.$dataMap.events[id];
      const page =
        typeof event.page === "function"
          ? event.page()
          : data && data.pages && data.pages[event._pageIndex || 0];
      const image = page && page.image;
      const name = String((data && data.name) || "Event " + id);
      const characterName = String(
        typeof event.characterName === "function"
          ? event.characterName()
          : event._characterName !== undefined
            ? event._characterName
            : (image && image.characterName) || "",
      );
      const category = kind(game, page, characterName);
      const x = Number.isFinite(event._realX)
        ? event._realX
        : event.x !== undefined
          ? event.x
          : event._x;
      const y = Number.isFinite(event._realY)
        ? event._realY
        : event.y !== undefined
          ? event.y
          : event._y;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return rows;
      rows.push({
        id,
        name,
        x,
        y,
        kind: category,
        color: COLORS[category],
        erased: false,
        characterName,
        tileId:
          Number(
            typeof event.tileId === "function"
              ? event.tileId()
              : event._tileId || (image && image.tileId),
          ) || 0,
        characterIndex:
          Number(
            typeof event.characterIndex === "function"
              ? event.characterIndex()
              : event._characterIndex !== undefined
                ? event._characterIndex
                : image && image.characterIndex,
          ) || 0,
        pattern: Number(
          typeof event.pattern === "function"
            ? event.pattern()
            : event._pattern === undefined
              ? 1
              : event._pattern,
        ),
        opacity: Number(
          typeof event.opacity === "function"
            ? event.opacity()
            : event._opacity === undefined
              ? 255
              : event._opacity,
        ),
        transparent: !!(typeof event.isTransparent === "function"
          ? event.isTransparent()
          : event._transparent),
        shiftY:
          Number(typeof event.shiftY === "function" ? event.shiftY() : 0) || 0,
        jumpHeight:
          Number(
            typeof event.jumpHeight === "function" ? event.jumpHeight() : 0,
          ) || 0,
        direction: event._direction || 2,
        moving: event._moveType > 0,
      });
    } catch (error) {
      /* A nonstandard event must not hide the rest of the map. */
    }
    return rows;
  }, []);
}

export function markerVisible(marker, layers) {
  const key =
    { npc: "npcs", enemy: "enemies", treasure: "treasures", event: "events" }[
      marker.kind
    ] || "events";
  return (
    !marker.erased &&
    !marker.transparent &&
    marker.opacity !== 0 &&
    layers[key] !== false
  );
}

export function drawMapGrid(ctx, width, height, unit, ox, oy) {
  // Dense full maps use a coarser grid to avoid millions of tiny lines.
  const step = Math.max(1, Math.ceil(6 / unit));
  ctx.beginPath();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += step) {
    ctx.moveTo(ox + x * unit, oy);
    ctx.lineTo(ox + x * unit, oy + height * unit);
  }
  for (let y = 0; y <= height; y += step) {
    ctx.moveTo(ox, oy + y * unit);
    ctx.lineTo(ox + width * unit, oy + y * unit);
  }
  ctx.stroke();
}
