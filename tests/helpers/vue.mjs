import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

export function loadVue() {
  const context = { console, setTimeout, clearTimeout };
  runInNewContext(
    readFileSync(
      new URL("../../cheat-engine/www/cheat/libs/vue.js", import.meta.url),
      "utf8",
    ),
    context,
  );
  return context.Vue;
}
