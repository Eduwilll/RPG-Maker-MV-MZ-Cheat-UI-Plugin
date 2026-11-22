export function requestActorNavigation(id, view) {
  const target = view || window;
  if (!Number.isInteger(Number(id)) || Number(id) < 1) return;
  target.dispatchEvent(
    new target.CustomEvent("cheat-navigate-actor", { detail: Number(id) }),
  );
}

export function requestEventNavigation(mapId, eventId, view) {
  const target = view || window;
  if (![mapId, eventId].every((id) => Number.isInteger(id) && id > 0)) return;
  target.dispatchEvent(
    new target.CustomEvent("cheat-navigate-event", {
      detail: { mapId, eventId },
    }),
  );
}

export function requestMapNavigation(point, view) {
  const target = view || window;
  if (!point || !Number.isInteger(point.mapId) || point.mapId < 1) return;
  target.dispatchEvent(
    new target.CustomEvent("cheat-navigate-map", { detail: point }),
  );
}
