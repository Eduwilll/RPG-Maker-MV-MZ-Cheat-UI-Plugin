export function readNearbyEvents(game) {
  const map = game && game.$gameMap,
    player = game && game.$gamePlayer,
    data = game && game.$dataMap;
  if (!map || !player || !data || !Array.isArray(data.events)) return [];
  return data.events
    .filter(Boolean)
    .map((event) => {
      const live = map.event ? map.event(event.id) : null;
      const x = live && Number.isFinite(live.x) ? live.x : event.x;
      const y = live && Number.isFinite(live.y) ? live.y : event.y;
      return {
        id: event.id,
        mapId: map.mapId(),
        name: event.name || "Event " + event.id,
        x,
        y,
        distance: Math.abs(player.x - x) + Math.abs(player.y - y),
        page: live && live._pageIndex >= 0 ? live._pageIndex + 1 : 0,
      };
    })
    .sort((a, b) => a.distance - b.distance || a.id - b.id);
}
export function facingEventId(game) {
  try {
    const map = game.$gameMap,
      player = game.$gamePlayer,
      direction = player.direction();
    const rows = map.eventsXy(
      map.roundXWithDirection(player.x, direction),
      map.roundYWithDirection(player.y, direction),
    );
    const event = rows && rows[0];
    return event ? Number(event._eventId || event.eventId()) : 0;
  } catch (error) {
    return 0;
  }
}

export function battleConditionLines(conditions, system) {
  const c = conditions || {},
    rows = [];
  if (c.turnEnding) rows.push("At the end of a turn");
  if (c.turnValid)
    rows.push(
      c.turnB
        ? "Turn " + c.turnA + ", then every " + c.turnB + " turns"
        : "Turn " + c.turnA,
    );
  if (c.enemyValid)
    rows.push(
      "Enemy slot " + (c.enemyIndex + 1) + " HP is " + c.enemyHp + "% or lower",
    );
  if (c.actorValid)
    rows.push("Actor #" + c.actorId + " HP is " + c.actorHp + "% or lower");
  if (c.switchValid)
    rows.push(
      "Switch #" +
        c.switchId +
        ": " +
        ((system && system.switches && system.switches[c.switchId]) || "") +
        " must be ON",
    );
  return rows;
}

export function eventReferencePages(record, kind, pageIndex) {
  if (!record) return [];
  if (kind === "common")
    return [
      {
        list: record.list || [],
        conditions: {
          switch1Valid: record.trigger > 0 && record.switchId > 0,
          switch1Id: record.switchId,
        },
      },
    ];
  const page = record.pages && record.pages[pageIndex];
  if (!page) return [];
  const conditions = page.conditions || {};
  return [
    Object.assign({}, page, {
      conditions: Object.assign({}, conditions, {
        switch1Valid: !!conditions.switchValid,
        switch1Id: conditions.switchId,
      }),
    }),
  ];
}
