export function readMapActors(game) {
  const player = game && game.$gamePlayer,
    party = game && game.$gameParty;
  if (!player || !party) return [];
  const rows = [];
  function add(character, actor) {
    if (
      !character ||
      !actor ||
      !actor.actorId ||
      character._transparent ||
      (character.isVisible && !character.isVisible())
    )
      return;
    const id = Number(actor.actorId());
    const x = Number.isFinite(character._realX)
      ? character._realX
      : character.x;
    const y = Number.isFinite(character._realY)
      ? character._realY
      : character.y;
    if (
      !Number.isInteger(id) ||
      id < 1 ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    )
      return;
    rows.push({
      id: "actor-" + id,
      actorId: id,
      name: actor.name ? actor.name() : "Actor " + id,
      x,
      y,
      kind: "actor",
      isPlayer: character === player,
      direction: character.direction ? character.direction() : 2,
    });
  }
  add(player, party.leader && party.leader());
  const followers = player.followers && player.followers();
  const list =
    followers &&
    (followers.visibleFollowers
      ? followers.visibleFollowers()
      : followers._data);
  (list || []).forEach((follower) =>
    add(follower, follower.actor && follower.actor()),
  );
  return rows;
}

/** Event IDs, display names and sprite sheets are not actor identities. */
export function readEventActorId(game, event, data) {
  try {
    const actor =
      event && typeof event.actor === "function" ? event.actor() : null;
    const meta = (data && data.meta) || {};
    const value =
      actor && typeof actor.actorId === "function"
        ? actor.actorId()
        : (event && event._actorId) || meta.ActorId || meta.actorId;
    const id = Number(value);
    return Number.isInteger(id) &&
      id > 0 &&
      game.$dataActors &&
      game.$dataActors[id]
      ? id
      : 0;
  } catch (error) {
    return 0;
  }
}

export function readActorChoices(game) {
  return ((game && game.$dataActors) || [])
    .filter((row) => row && Number.isInteger(row.id) && row.id > 0)
    .map((row) => ({
      id: row.id,
      name: String(row.name || "Actor " + row.id),
    }));
}
