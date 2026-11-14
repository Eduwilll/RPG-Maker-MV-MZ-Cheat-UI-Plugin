export function requestActorNavigation(id, view) {
  const target = view || window;
  if (!Number.isInteger(Number(id)) || Number(id) < 1) return;
  target.dispatchEvent(
    new target.CustomEvent("cheat-navigate-actor", { detail: Number(id) }),
  );
}
