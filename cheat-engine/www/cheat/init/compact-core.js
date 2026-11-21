import { startOverlay } from "./setup.js";
import { startSeparateWindow } from "../js/window-init.js";

export function startCompactCore(mode) {
  return mode === "popout" ? startSeparateWindow() : startOverlay();
}
