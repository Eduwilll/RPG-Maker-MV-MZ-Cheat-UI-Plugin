import { locationStyle } from "./SavedLocationState.js";

/** Shared silhouette with distinct line-art symbols, legible without color. */
export function drawLocationPin(ctx, x, y, flags, scale = 1) {
  const style = locationStyle(flags);
  ctx.save();
  ctx.translate(x, y - 12 * scale);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.moveTo(0, 13);
  ctx.lineTo(-8, 5);
  ctx.quadraticCurveTo(-15, -13, 0, -13);
  ctx.quadraticCurveTo(15, -13, 8, 5);
  ctx.closePath();
  ctx.fillStyle = style.color;
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  const line = (a, b, c, d) => {
    ctx.moveTo(a, b);
    ctx.lineTo(c, d);
  };
  if (style.symbol === "shop") {
    ctx.rect(-6, -4, 12, 9);
    line(-7, -4, -5, -8);
    line(-5, -8, 5, -8);
    line(5, -8, 7, -4);
    ctx.rect(-2, 0, 4, 5);
  } else if (style.symbol === "flag") {
    line(-4, 6, -4, -9);
    line(-4, -9, 6, -9);
    line(6, -9, 3, -5);
    line(3, -5, 6, -2);
    line(6, -2, -4, -2);
  } else if (style.symbol === "boss") {
    line(-6, -8, 6, 5);
    line(6, -8, -6, 5);
    line(-7, 1, -3, 5);
    line(3, 5, 7, 1);
  } else if (style.symbol === "person") {
    ctx.arc(0, -6, 3, 0, Math.PI * 2);
    ctx.moveTo(-6, 5);
    ctx.quadraticCurveTo(-6, -2, 0, -2);
    ctx.quadraticCurveTo(6, -2, 6, 5);
  } else if (style.symbol === "leaf") {
    ctx.moveTo(-5, 4);
    ctx.quadraticCurveTo(-9, -8, 7, -9);
    ctx.quadraticCurveTo(9, 4, -5, 4);
    line(-5, 5, 4, -5);
  } else if (style.symbol === "danger") {
    ctx.moveTo(0, -9);
    ctx.lineTo(7, 4);
    ctx.lineTo(-7, 4);
    ctx.closePath();
    line(0, -5, 0, -1);
    line(0, 1, 0, 2);
  } else {
    ctx.moveTo(-5, 5);
    ctx.lineTo(-5, -9);
    ctx.lineTo(5, -9);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 1);
    ctx.closePath();
  }
  ctx.stroke();
  ctx.restore();
}
