/** Discover references without evaluating scripts; run original events through the engine. */
export function createMapBattleEvents(game, availability) {
  function discover(enemyId, troopId) {
    const map = game.$gameMap;
    if (!map || typeof map.events !== "function") return [];
    return map
      .events()
      .filter(Boolean)
      .reduce((rows, event) => {
        if (
          event._erased ||
          event._pageIndex < 0 ||
          typeof event.page !== "function"
        )
          return rows;
        const page = event.page();
        if (!page || !Array.isArray(page.list)) return rows;
        const ids = new Set(),
          visited = new Set(),
          parts = [];
        let budget = 5000;
        function scan(commands, depth) {
          if (depth > 8 || !Array.isArray(commands)) return;
          for (let i = 0; i < commands.length && budget-- > 0; i++) {
            const cmd = commands[i];
            if (!cmd) continue;
            const p = cmd.parameters || [];
            parts.push(cmd.code + ":" + JSON.stringify(p));
            if (cmd.code === 301) {
              const id =
                p[0] === 0
                  ? Number(p[1])
                  : p[0] === 1 && game.$gameVariables
                    ? Number(game.$gameVariables.value(p[1]))
                    : 0;
              const troop = game.$dataTroops && game.$dataTroops[id];
              if (
                Number.isInteger(id) &&
                troop &&
                Array.isArray(troop.members) &&
                (troopId !== undefined
                  ? id === troopId
                  : troop.members.some(
                      (member) => member && member.enemyId === enemyId,
                    ))
              )
                ids.add(id);
            } else if (cmd.code === 117 && !visited.has(p[0])) {
              visited.add(p[0]);
              const common =
                game.$dataCommonEvents && game.$dataCommonEvents[p[0]];
              if (common) scan(common.list, depth + 1);
            }
          }
        }
        scan(page.list, 0);
        if (ids.size) {
          const data = typeof event.event === "function" ? event.event() : null;
          const troopIds = Array.from(ids);
          let hash = 2166136261;
          const input = parts.join("|") + "#" + troopIds.join();
          for (let i = 0; i < input.length; i++)
            hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
          const row = {
            mapId: map.mapId(),
            eventId: event._eventId,
            pageIndex: event._pageIndex,
            name: String((data && data.name) || "Event " + event._eventId),
            troopIds,
            signature: String(hash),
          };
          if (troopId !== undefined) row.troopId = troopId;
          else row.enemyId = enemyId;
          rows.push(row);
        }
        return rows;
      }, []);
  }
  function list(enemyId) {
    return discover(enemyId);
  }
  function listForTroop(troopId) {
    if (!Number.isInteger(troopId) || troopId < 1) return [];
    return discover(undefined, troopId);
  }
  function start(reference) {
    const status = availability();
    if (!status.allowed) throw Error(status.reason || "Map is busy.");
    if (
      !reference ||
      !game.$gameMap ||
      game.$gameMap.mapId() !== reference.mapId
    )
      throw Error("The current map changed.");
    const rows = Object.prototype.hasOwnProperty.call(reference, "troopId")
      ? listForTroop(reference.troopId)
      : list(reference.enemyId);
    const current = rows.find(
      (row) =>
        row.eventId === reference.eventId &&
        row.pageIndex === reference.pageIndex &&
        row.signature === reference.signature,
    );
    if (!current)
      throw Error(
        "The event changed or is no longer available. Refresh the list.",
      );
    const event = game.$gameMap.event
      ? game.$gameMap.event(current.eventId)
      : game.$gameMap._events[current.eventId];
    if (!event || typeof event.start !== "function")
      throw Error("Event starting is unavailable.");
    event.start();
    return { eventId: current.eventId, mapId: current.mapId };
  }
  return { list, listForTroop, start };
}
