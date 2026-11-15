import { Key } from "../shortcuts/KeyCodes.js";
/** The two UI shortcuts work in text fields but never steal shortcut recording. */
export function handleFeatureShortcut(event, manager, actions) {
  if (
    event.target &&
    event.target.closest &&
    event.target.closest(".cheat-shortcut-input")
  )
    return false;
  const key = Key.fromEvent(event);
  for (const id of ["openFeatureFinder", "openMessageLog"]) {
    const assigned = manager.getShortcut(id);
    // Key.equals intentionally checks constructor identity; pop-out Keys have
    // a different constructor even though their key/modifier values match.
    if (
      assigned &&
      !assigned.isEmpty() &&
      assigned.asString() === key.asString()
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      if (!event.repeat && actions[id]) actions[id]();
      return true;
    }
  }
  return false;
}
