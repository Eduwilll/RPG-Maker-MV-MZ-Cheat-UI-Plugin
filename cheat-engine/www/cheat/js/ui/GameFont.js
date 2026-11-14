/** Copy game font registration into the popup without changing the game's font. */
export function applyGameFont(root, game, enabled) {
  if (!root || !game) return;
  root.classList.toggle("cheat-game-font", !!enabled);
  if (!enabled) {
    root.style.removeProperty("--cheat-game-font");
    return;
  }
  let family = "GameFont";
  try {
    if (game.$gameSystem && game.$gameSystem.mainFontFace)
      family = game.$gameSystem.mainFontFace();
    else if (game.Window_Base && game.Window_Base.prototype.standardFontFace)
      family = game.Window_Base.prototype.standardFontFace.call({});
  } catch (error) {
    /* Retain the MV standard fallback. */
  }
  root.style.setProperty(
    "--cheat-game-font",
    String(family) + ', "Trebuchet MS", sans-serif',
  );
  const doc = root.ownerDocument;
  if (doc === game.document || doc.getElementById("cheat-game-fonts")) return;
  const rules = [];
  Array.prototype.forEach.call(game.document.styleSheets || [], (sheet) => {
    try {
      Array.prototype.forEach.call(sheet.cssRules || [], (rule) => {
        if (rule.type === 5 && rules.length < 32)
          rules.push(
            rule.cssText.replace(
              /url\((['"]?)([^)'"\s]+)\1\)/gi,
              (match, quote, url) =>
                'url("' +
                new URL(url, sheet.href || game.location.href).href.replace(
                  /"/g,
                  "%22",
                ) +
                '")',
            ),
          );
      });
    } catch (error) {
      /* Cross-origin stylesheets need not be readable. */
    }
  });
  const urls = game.FontManager && game.FontManager._urls;
  Object.keys(urls || {}).forEach((name) => {
    if (/^[\w -]+$/.test(name))
      rules.push(
        '@font-face{font-family:"' +
          name +
          '";src:url("' +
          new URL(urls[name], game.location.href).href.replace(/"/g, "%22") +
          '");}',
      );
  });
  const style = doc.createElement("style");
  style.id = "cheat-game-fonts";
  style.textContent = rules.join("\n");
  doc.head.appendChild(style);
}
