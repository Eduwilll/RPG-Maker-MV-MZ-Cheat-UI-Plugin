function normalized(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s_-]+/g, " ");
}
/** Match authored picture path segments to the actual speaker, not any visible picture. */
export function speakerPicture(game, speaker) {
  const screen = game.$gameScreen;
  if (!screen || !speaker || typeof screen.picture !== "function") return "";
  const matches = [];
  for (
    let id = 1,
      limit = Math.min(200, screen.maxPictures ? screen.maxPictures() : 100);
    id <= limit;
    id++
  ) {
    const pic = screen.picture(id);
    if (!pic || pic._actorPortraitId) continue;
    const name = String(
      typeof pic.name === "function" ? pic.name() : pic._name || "",
    );
    const opacity =
      typeof pic.opacity === "function" ? pic.opacity() : pic._opacity;
    if (!(Number(opacity) > 0 || Number(pic._targetOpacity) > 0)) continue;
    const parts = name.split("/");
    if (
      parts.some((part) => normalized(part) === normalized(speaker)) &&
      /portrait|bust|face/i.test(parts.slice(0, -1).join("/"))
    )
      matches.push(name);
  }
  const distinct = Array.from(new Set(matches));
  return distinct.length === 1 ? distinct[0] : "";
}
