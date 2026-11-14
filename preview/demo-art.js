/** Original canvas fixtures: no game files or copyrighted sprites are needed. */
export function installDemoArt(game) {
  const canvas = (width, height) => {
    const result = game.document.createElement("canvas");
    result.width = width;
    result.height = height;
    return result;
  };
  const tiles = canvas(384, 48),
    ctx = tiles.getContext("2d");
  const colors = [
    "#284d40",
    "#719953",
    "#b65f42",
    "#406c91",
    "#b7aa81",
    "#6b7774",
    "#72583e",
    "#335c48",
  ];
  colors.forEach((color, id) => {
    ctx.fillStyle = color;
    ctx.fillRect(id * 48, 0, 48, 48);
    ctx.fillStyle = "rgba(255,255,255,.1)";
    for (let y = 4; y < 48; y += 12)
      for (let x = 4; x < 48; x += 12) ctx.fillRect(id * 48 + x, y, 4, 3);
  });
  ctx.fillStyle = "#4b302d";
  for (let y = 7; y < 48; y += 12) ctx.fillRect(96, y, 48, 3);
  ctx.fillStyle = "#152d22";
  ctx.fillRect(7 * 48 + 17, 27, 14, 21);
  ctx.fillStyle = "#427252";
  ctx.beginPath();
  ctx.moveTo(7 * 48 + 24, 1);
  ctx.lineTo(7 * 48 + 3, 34);
  ctx.lineTo(7 * 48 + 45, 34);
  ctx.fill();
  const characters = canvas(384, 256),
    cc = characters.getContext("2d");
  const outfits = [
    "#df8e61",
    "#6ea8c9",
    "#d4bf70",
    "#9d78b5",
    "#79a37b",
    "#d57477",
    "#b89b7b",
    "#ced6d0",
  ];
  for (let actor = 0; actor < 8; actor++)
    for (let direction = 0; direction < 4; direction++)
      for (let pose = 0; pose < 3; pose++) {
        const x = ((actor % 4) * 3 + pose) * 32,
          y = (Math.floor(actor / 4) * 4 + direction) * 32;
        cc.fillStyle = "#1b2b30";
        cc.fillRect(x + 9, y + 26, 5, 5);
        cc.fillRect(x + 18, y + 25 + (pose === 1 ? 0 : 1), 5, 6);
        cc.fillStyle = outfits[actor];
        cc.fillRect(x + 8, y + 12, 16, 15);
        cc.fillStyle = "#edc19a";
        cc.fillRect(x + 10, y + 3, 12, 12);
        cc.fillStyle = "#352d32";
        cc.fillRect(x + 9, y + 1, 14, 5);
        cc.fillStyle = "#20232b";
        cc.fillRect(x + (direction === 1 ? 10 : 17), y + 8, 3, 2);
      }
  const faces = canvas(576, 288),
    fc = faces.getContext("2d");
  outfits.forEach((color, id) => {
    const x = (id % 4) * 144,
      y = Math.floor(id / 4) * 144;
    fc.fillStyle = "#243a40";
    fc.fillRect(x, y, 144, 144);
    fc.fillStyle = color;
    fc.beginPath();
    fc.ellipse(x + 72, y + 137, 52, 45, 0, 0, Math.PI * 2);
    fc.fill();
    fc.fillStyle = "#e8bd99";
    fc.beginPath();
    fc.ellipse(x + 72, y + 66, 31, 42, 0, 0, Math.PI * 2);
    fc.fill();
    fc.fillStyle = "#342b31";
    fc.fillRect(x + 39, y + 21, 66, 23);
    fc.fillStyle = "#273039";
    fc.fillRect(x + 54, y + 62, 7, 5);
    fc.fillRect(x + 83, y + 62, 7, 5);
    fc.fillStyle = "#ac6e68";
    fc.fillRect(x + 65, y + 87, 16, 3);
  });
  const icons = canvas(512, 512),
    ic = icons.getContext("2d");
  for (let id = 0; id < 256; id++) {
    const x = (id % 16) * 32,
      y = Math.floor(id / 16) * 32;
    ic.fillStyle = outfits[id % 8];
    ic.fillRect(x + 5, y + 5, 22, 22);
    ic.strokeStyle = "#f5e7c3";
    ic.strokeRect(x + 9, y + 9, 14, 14);
  }
  ic.clearRect(12 * 32, 4 * 32, 32, 32);
  ic.fillStyle = "#fff1c9";
  ic.font = "bold 32px Georgia";
  ic.fillText("L", 12 * 32, 4 * 32 + 28);
  const enemy = canvas(192, 192),
    ec = enemy.getContext("2d");
  ec.fillStyle = "#8dac70";
  ec.beginPath();
  ec.ellipse(96, 112, 77, 61, 0, 0, Math.PI * 2);
  ec.fill();
  ec.fillStyle = "#213f37";
  ec.fillRect(62, 88, 16, 21);
  ec.fillRect(116, 88, 16, 21);
  ec.fillStyle = "#d5e5a0";
  ec.fillRect(69, 130, 57, 8);
  const bitmap = (image) => ({
    canvas: image,
    isReady: () => true,
    isError: () => false,
    addLoadListener(fn) {
      fn(this);
    },
  });
  game.Bitmap = {
    load(url) {
      return bitmap(
        url.includes("/faces/")
          ? faces
          : url.includes("/characters/")
            ? characters
            : url.includes("/system/")
              ? icons
              : url.includes("/enemies/") || url.includes("/sv_enemies/")
                ? enemy
                : tiles,
      );
    },
  };
  Object.assign(game.ImageManager, {
    faceWidth: 144,
    faceHeight: 144,
    iconWidth: 32,
    iconHeight: 32,
    isBigCharacter: (name) => /\$/.test(name),
    loadTileset: () => bitmap(tiles),
    loadFace: () => bitmap(faces),
    loadCharacter: () => bitmap(characters),
    loadSystem: () => bitmap(icons),
  });
  return { tiles, characters, faces, icons, enemy, bitmap };
}
