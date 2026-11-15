import { getMapCharacters } from "./MapCharacters.js";
import { markerVisible } from "./MapMarkers.js";

export const MAP_MARKER_STYLES = {
  npc: { label: "NPC", color: "#38bdf8", glyph: "N" },
  enemy: { label: "Enemy", color: "#fb7185", glyph: "!" },
  treasure: { label: "Treasure", color: "#fbbf24", glyph: "+" },
  event: { label: "Event", color: "#c4b5fd", glyph: "?" },
};

function badge(ctx, x, y, marker, scale) {
  const style = MAP_MARKER_STYLES[marker.kind] || MAP_MARKER_STYLES.event;
  const r = 8 * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, r + 5);
  ctx.lineTo(-r * 0.8, r * 0.6);
  ctx.quadraticCurveTo(-r * 1.5, -r, 0, -r);
  ctx.quadraticCurveTo(r * 1.5, -r, r * 0.8, r * 0.6);
  ctx.closePath();
  ctx.fillStyle = style.color;
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold " + Math.round(10 * scale) + "px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(style.glyph, 0, 0);
  ctx.restore();
}

export function drawPlayerArrow(
  ctx,
  x,
  y,
  direction,
  scale,
  time,
  reducedMotion,
) {
  const r = 9 * scale;
  ctx.save();
  ctx.translate(x, y);
  const pulse = reducedMotion ? 0 : (Math.sin((time || 0) / 350) + 1) / 2;
  ctx.beginPath();
  ctx.arc(0, 0, r + 3 + pulse * 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(56,189,248," + (0.12 + pulse * 0.12) + ")";
  ctx.fill();
  ctx.rotate(
    { 2: Math.PI, 4: -Math.PI / 2, 6: Math.PI / 2, 8: 0 }[direction] || 0,
  );
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.72, r * 0.8);
  ctx.lineTo(0, r * 0.38);
  ctx.lineTo(-r * 0.72, r * 0.8);
  ctx.closePath();
  ctx.fillStyle = "#38bdf8";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Cached static viewport plus inexpensive live sprites, badges and selection. */
export function createMapScene(canvas) {
  const background = canvas.ownerDocument.createElement("canvas");
  let lastBase,
    lastMap,
    lastKey = "";
  function draw(base, options) {
    const view = options.camera,
      layers = options.layers,
      game = options.game;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (canvas.width !== view.width) canvas.width = view.width;
    if (canvas.height !== view.height) canvas.height = view.height;
    const key = [
      view.width,
      view.height,
      view.unit,
      view.ox,
      view.oy,
      options.mode,
      layers.background,
      layers.grid,
      layers.shadows,
      layers.upperTiles,
      Math.floor(((game.Graphics && game.Graphics.frameCount) || 0) / 30),
    ].join("|");
    if (lastKey !== key || lastBase !== base || lastMap !== game.$dataMap) {
      background.width = view.width;
      background.height = view.height;
      const bg = background.getContext("2d");
      bg.fillStyle = "#101923";
      bg.fillRect(0, 0, view.width, view.height);
      bg.imageSmoothingEnabled = false;
      if (layers.background && base) {
        bg.drawImage(
          base,
          view.ox,
          view.oy,
          view.mapWidth * view.unit,
          view.mapHeight * view.unit,
        );
      } else if (layers.background && options.mode === "radar") {
        for (
          let y = Math.max(0, Math.floor(-view.oy / view.unit));
          y <
          Math.min(
            view.mapHeight,
            Math.ceil((view.height - view.oy) / view.unit),
          );
          y++
        ) {
          for (
            let x = Math.max(0, Math.floor(-view.ox / view.unit));
            x <
            Math.min(
              view.mapWidth,
              Math.ceil((view.width - view.ox) / view.unit),
            );
            x++
          ) {
            const map = game.$gameMap;
            const pass =
              map &&
              map.isPassable &&
              [2, 4, 6, 8].some((d) => map.isPassable(x, y, d));
            bg.fillStyle = pass ? "#52647a" : "#1d2838";
            bg.fillRect(
              view.ox + x * view.unit,
              view.oy + y * view.unit,
              view.unit,
              view.unit,
            );
          }
        }
      }
      if (layers.grid && view.unit >= 6) {
        bg.beginPath();
        bg.strokeStyle = "rgba(255,255,255,0.18)";
        bg.lineWidth = 1;
        for (
          let x = Math.max(0, Math.ceil(-view.ox / view.unit));
          x <= Math.min(view.mapWidth, (view.width - view.ox) / view.unit);
          x++
        ) {
          const px = view.ox + x * view.unit;
          bg.moveTo(px, Math.max(0, view.oy));
          bg.lineTo(
            px,
            Math.min(view.height, view.oy + view.mapHeight * view.unit),
          );
        }
        for (
          let y = Math.max(0, Math.ceil(-view.oy / view.unit));
          y <= Math.min(view.mapHeight, (view.height - view.oy) / view.unit);
          y++
        ) {
          const py = view.oy + y * view.unit;
          bg.moveTo(Math.max(0, view.ox), py);
          bg.lineTo(
            Math.min(view.width, view.ox + view.mapWidth * view.unit),
            py,
          );
        }
        bg.stroke();
      }
      lastBase = base;
      lastMap = game.$dataMap;
      lastKey = key;
    }
    ctx.clearRect(0, 0, view.width, view.height);
    ctx.drawImage(background, 0, 0);
    const characters = layers.sprites ? getMapCharacters() : null;
    if (characters) characters.beginFrame();
    (options.markers || []).forEach((marker) => {
      if (!markerVisible(marker, layers)) return;
      const x = view.ox + (marker.x + 0.5) * view.unit,
        y = view.oy + (marker.y + 0.5) * view.unit;
      if (x < -40 || y < -64 || x > view.width + 40 || y > view.height + 64)
        return;
      const drawn =
        characters &&
        characters.draw(ctx, marker, {
          unit: view.unit,
          ox: view.ox,
          oy: view.oy,
          scale: layers.markerScale,
        });
      if (!drawn) badge(ctx, x, y, marker, layers.markerScale || 1);
      if (layers.labels) {
        const text = (marker.name || "Event") + " #" + marker.id;
        ctx.font = "11px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        const width = Math.min(220, ctx.measureText(text).width + 10);
        ctx.fillStyle = "rgba(15,23,42,0.9)";
        ctx.fillRect(x + 10, y - 23, width, 18);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, x + 15, y - 8, 210);
      }
    });
    const selected = options.selection;
    if (selected) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        view.ox + selected.x * view.unit,
        view.oy + selected.y * view.unit,
        view.unit,
        view.unit,
      );
    }
    const player = options.player;
    if (layers.player && player)
      drawPlayerArrow(
        ctx,
        view.ox + (player.x + 0.5) * view.unit,
        view.oy + (player.y + 0.5) * view.unit,
        player.direction,
        layers.markerScale || 1,
        options.time,
        options.reducedMotion,
      );
  }
  return {
    draw,
    invalidate() {
      lastKey = "";
    },
  };
}
